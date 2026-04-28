import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// DELETE /api/user/delete — permanently delete all user data from the database.
// Called by the client before Clerk user deletion; the Clerk webhook fires
// afterwards as a secondary cleanup, but this ensures immediate removal.
export async function DELETE() {
  const auth = await authenticateRequest();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    // Cascade deletes handle: meals, posts, likes, comments, friendships,
    // activity feed, weight records, challenges, push tokens, etc.
    await prisma.user.deleteMany({ where: { id: userId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[DELETE /api/user/delete]', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
