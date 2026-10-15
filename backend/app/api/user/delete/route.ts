import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { deleteAllMealPhotos } from '@/lib/meal-photos';
import { revokeAppleAuthorization } from '@/lib/apple-revoke';

// DELETE /api/user/delete — permanently delete the account:
//   1. all app data (cascade) and meal photos
//   2. the Sign in with Apple grant, when the app sends a fresh authorization code
//   3. the Clerk user (server-side, so it doesn't depend on a client setting)
// The Clerk user.deleted webhook still runs afterwards as a secondary cleanup.
export async function DELETE(req: Request) {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  let appleAuthorizationCode: string | undefined;
  try {
    const body = (await req.json()) as { appleAuthorizationCode?: unknown };
    if (typeof body?.appleAuthorizationCode === 'string') appleAuthorizationCode = body.appleAuthorizationCode;
  } catch {
    // no body
  }

  try {
    // Cascade deletes handle: meals, posts, likes, comments, friendships,
    // activity feed, weight records, challenges, push tokens, etc.
    await prisma.user.deleteMany({ where: { id: userId } });
    await deleteAllMealPhotos(userId);
  } catch (error) {
    console.error('[DELETE /api/user/delete]', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }

  const appleRevoked = appleAuthorizationCode ? await revokeAppleAuthorization(appleAuthorizationCode) : false;

  let clerkDeleted = false;
  try {
    const client = await clerkClient();
    await client.users.deleteUser(userId);
    clerkDeleted = true;
  } catch (error) {
    console.error('[DELETE /api/user/delete] Clerk deletion failed', error);
  }

  return NextResponse.json({ ok: true, appleRevoked, clerkDeleted });
}
