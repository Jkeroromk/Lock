import { prisma } from '@/lib/prisma';

/**
 * Blocking + content-visibility helpers (App Store Guideline 1.2).
 *
 * Blocks are symmetric for visibility: if A blocks B, neither sees the other's
 * posts, comments, profile search result or challenge participation, and
 * neither can send the other a friend request. Only A can undo it.
 */

/** Number of distinct reports after which a post is hidden from everyone but its author. */
export const AUTO_HIDE_REPORT_THRESHOLD = 3;

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

/**
 * Whether `userId` may see (and therefore like / comment on) a post.
 * Visible = your own post, or a friend's post that isn't auto-hidden and
 * that you haven't reported. Blocking always removes the friendship, so a
 * blocked user's posts are never visible.
 */
export async function canViewPost(
  userId: string,
  post: { id: string; userId: string; hiddenAt: Date | null }
): Promise<boolean> {
  if (post.userId === userId) return true;
  if (post.hiddenAt) return false;

  const [friendship, report] = await Promise.all([
    prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: userId, addresseeId: post.userId },
          { requesterId: post.userId, addresseeId: userId },
        ],
      },
      select: { id: true },
    }),
    prisma.postReport.findUnique({
      where: { postId_reporterId: { postId: post.id, reporterId: userId } },
      select: { id: true },
    }),
  ]);
  return !!friendship && !report;
}
