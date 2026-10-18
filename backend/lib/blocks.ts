import { prisma } from '@/lib/prisma';

/**
 * Blocking + content-visibility helpers (App Store Guideline 1.2).
 *
 * Blocks are symmetric for visibility: if A blocks B, neither sees the other's
 * profile search result, leaderboard row, buddy or challenge participation,
 * and neither can send the other a friend request. Only A can undo it.
 */

/** IDs of every user the given user has blocked or been blocked by. */
export async function getBlockedUserIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.userBlock.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return new Set(rows.map((r) => (r.blockerId === userId ? r.blockedId : r.blockerId)));
}

/** True if either user has blocked the other. */
export async function isBlockedEitherWay(a: string, b: string): Promise<boolean> {
  const row = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { id: true },
  });
  return !!row;
}

/** IDs of the user's accepted friends. */
export async function getFriendIds(userId: string): Promise<string[]> {
  const friendships = await prisma.friendship.findMany({
    where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
    select: { requesterId: true, addresseeId: true },
  });
  return friendships.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId));
}
