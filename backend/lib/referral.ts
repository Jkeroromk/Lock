import { prisma } from '@/lib/prisma';
import { sendPushToUser } from '@/lib/notify';
import { isInProTrial, INVITE_BONUS_AI_CALLS, INVITEE_BONUS_AI_CALLS, MAX_INVITE_REWARDS } from '@/lib/plans';
import { pushName } from '@/lib/sanitize';

export type RedeemError = 'INVALID_CODE' | 'SELF' | 'NOT_NEW' | 'ALREADY_REDEEMED';
export type RedeemResult =
  | { ok: true; inviterName: string; inviterFriendCode: string | null; bonus: number }
  | { ok: false; error: RedeemError };

/**
 * A new account (first week) enters the invite code of whoever invited it:
 * - the new account gets INVITEE_BONUS_AI_CALLS bonus scans,
 * - the inviter gets INVITE_BONUS_AI_CALLS (capped at MAX_INVITE_REWARDS invites).
 * It never makes them friends: that is a separate request the other side accepts.
 * Each account can be referred once; a repeat does nothing.
 */
export async function redeemReferral(newUserId: string, inviterId: string): Promise<RedeemResult> {
  if (newUserId === inviterId) return { ok: false, error: 'SELF' };

  const [newUser, inviter] = await Promise.all([
    prisma.user.findUnique({ where: { id: newUserId }, select: { createdAt: true, referredById: true, name: true, username: true } }),
    prisma.user.findUnique({ where: { id: inviterId }, select: { name: true, username: true, friendCode: true } }),
  ]);
  if (!newUser || !inviter) return { ok: false, error: 'INVALID_CODE' };
  if (newUser.referredById) return { ok: false, error: 'ALREADY_REDEEMED' };
  if (!isInProTrial(newUser.createdAt)) return { ok: false, error: 'NOT_NEW' };

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

  const who = pushName(newUser, '你的好友');
  if (paid.count > 0) {
    // Awaited: a serverless function may be frozen once the response is sent.
    await sendPushToUser(inviterId, `+${INVITE_BONUS_AI_CALLS} 次 AI 识别 🎁`, `${who} 通过你的邀请加入了 Lock`, { type: 'INVITE_REWARD' })
      .catch(() => {});
  }

  return { ok: true, inviterName: inviter.name || inviter.username || '', inviterFriendCode: inviter.friendCode, bonus: INVITEE_BONUS_AI_CALLS };
}
