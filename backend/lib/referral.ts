import { prisma } from '@/lib/prisma';
import { sendPushToUser } from '@/lib/notify';
import { getMaxFriends, isInTrialWeek, INVITE_BONUS_AI_CALLS, INVITEE_BONUS_AI_CALLS, MAX_INVITE_REWARDS } from '@/lib/plans';

export type RedeemError = 'INVALID_CODE' | 'SELF' | 'NOT_NEW' | 'ALREADY_REDEEMED';
export type RedeemResult =
  | { ok: true; inviterName: string; bonus: number; friends: boolean }
  | { ok: false; error: RedeemError };

/**
 * A new account (first week) joins through someone's invite code:
 * - the new account gets INVITEE_BONUS_AI_CALLS bonus scans,
 * - the inviter gets INVITE_BONUS_AI_CALLS (capped at MAX_INVITE_REWARDS invites),
 * - with `makeFriends`, the two become friends right away when the inviter has room.
 * Each account can be referred once; a repeat does nothing.
 */
export async function redeemReferral(
  newUserId: string,
  inviterId: string,
  { makeFriends = false }: { makeFriends?: boolean } = {},
): Promise<RedeemResult> {
  if (newUserId === inviterId) return { ok: false, error: 'SELF' };

  const [newUser, inviter] = await Promise.all([
    prisma.user.findUnique({ where: { id: newUserId }, select: { createdAt: true, referredById: true, name: true, username: true } }),
    prisma.user.findUnique({ where: { id: inviterId }, select: { name: true, username: true, plan: true } }),
  ]);
  if (!newUser || !inviter) return { ok: false, error: 'INVALID_CODE' };
  if (newUser.referredById) return { ok: false, error: 'ALREADY_REDEEMED' };
  if (!isInTrialWeek(newUser.createdAt)) return { ok: false, error: 'NOT_NEW' };

  // Claim the referral first; a second request from the same account does nothing.
  const claimed = await prisma.user.updateMany({
    where: { id: newUserId, referredById: null },
    data: { referredById: inviterId, bonusAiCalls: { increment: INVITEE_BONUS_AI_CALLS } },
  });
  if (claimed.count === 0) return { ok: false, error: 'ALREADY_REDEEMED' };

  const paid = await prisma.user.updateMany({
    where: { id: inviterId, inviteRewards: { lt: MAX_INVITE_REWARDS } },
    data: { bonusAiCalls: { increment: INVITE_BONUS_AI_CALLS }, inviteRewards: { increment: 1 } },
  });

  let friends = false;
  if (makeFriends) {
    friends = await befriend(newUserId, inviterId, inviter.plan);
  }

  const who = newUser.name || newUser.username || '你的好友';
  if (paid.count > 0) {
    // Awaited: a serverless function may be frozen once the response is sent.
    await sendPushToUser(inviterId, `+${INVITE_BONUS_AI_CALLS} 次 AI 识别 🎁`, `${who} 通过你的邀请加入了 Lock`, { type: 'INVITE_REWARD' })
      .catch(() => {});
  }

  return { ok: true, inviterName: inviter.name || inviter.username || '', bonus: INVITEE_BONUS_AI_CALLS, friends };
}

/** Accepted friendship between the two, unless one exists or the inviter is at their friend limit. */
async function befriend(newUserId: string, inviterId: string, inviterPlan: string): Promise<boolean> {
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: newUserId, addresseeId: inviterId },
        { requesterId: inviterId, addresseeId: newUserId },
      ],
    },
  });
  if (existing) {
    if (existing.status === 'ACCEPTED') return true;
    await prisma.friendship.update({ where: { id: existing.id }, data: { status: 'ACCEPTED' } });
    return true;
  }
  const max = getMaxFriends(inviterPlan as any);
  if (max !== -1) {
    const count = await prisma.friendship.count({
      where: { status: 'ACCEPTED', OR: [{ requesterId: inviterId }, { addresseeId: inviterId }] },
    });
    if (count >= max) return false;
  }
  await prisma.friendship.create({ data: { requesterId: newUserId, addresseeId: inviterId, status: 'ACCEPTED' } });
  return true;
}
