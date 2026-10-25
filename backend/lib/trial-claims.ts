import { createHmac } from 'node:crypto';
import { prisma } from '@/lib/prisma';

/**
 * The free first week (Pro for PRO_TRIAL_DAYS after users.created_at) is once
 * per email address. Without this, deleting the account and signing up again
 * (the same Apple ID gets a new Clerk user) or using a "+tag" alias gave a new
 * free week every time.
 *
 * trial_claims keeps, per normalized email, when it was first seen. It survives
 * account deletion and holds only a keyed one-way hash (HMAC-SHA256), never the
 * address. When a returning email signs up, the new account's created_at is set
 * back to that first date, so the first week is already over for it.
 *
 * Key: TRIAL_CLAIM_SECRET (falls back to CLERK_WEBHOOK_SECRET). Changing the key
 * forgets every claim, so set it once.
 */
function secret(): string | null {
  return process.env.TRIAL_CLAIM_SECRET?.trim() || process.env.CLERK_WEBHOOK_SECRET?.trim() || null;
}

/** Lowercase, no "+tag"; Gmail also ignores dots and googlemail.com. */
export function normalizeEmail(email: string): string | null {
  const at = email.trim().toLowerCase().lastIndexOf('@');
  if (at <= 0) return null;
  const raw = email.trim().toLowerCase();
  let local = raw.slice(0, at).split('+')[0];
  let domain = raw.slice(at + 1);
  if (!local || !domain) return null;
  if (domain === 'googlemail.com') domain = 'gmail.com';
  if (domain === 'gmail.com') local = local.replace(/\./g, '');
  return `${local}@${domain}`;
}

function emailHash(email: string | null | undefined): string | null {
  const key = secret();
  const normalized = email ? normalizeEmail(email) : null;
  if (!key || !normalized) return null;
  return createHmac('sha256', key).update(normalized).digest('hex');
}

/** Remembers that this email had an account since `since` (keeps the earliest date). */
export async function recordTrialClaim(email: string | null | undefined, since: Date): Promise<void> {
  const hash = emailHash(email);
  if (!hash) return;
  await prisma.trialClaim.createMany({ data: [{ emailHash: hash, firstSeenAt: since }], skipDuplicates: true });
  await prisma.trialClaim.updateMany({ where: { emailHash: hash, firstSeenAt: { gt: since } }, data: { firstSeenAt: since } });
}

/**
 * Call when an account's email becomes known (Clerk user.created / user.updated).
 * Records the claim and, if the email was seen before, moves the account's
 * created_at back to that date so it doesn't get a second free week.
 */
export async function applyTrialHistory(userId: string, email: string | null | undefined): Promise<void> {
  const hash = emailHash(email);
  if (!hash) return;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } });
  if (!user) return;

  await recordTrialClaim(email, user.createdAt);
  const claim = await prisma.trialClaim.findUnique({ where: { emailHash: hash } });
  // A minute of slack so the account's own claim never rewrites itself.
  if (claim && claim.firstSeenAt.getTime() < user.createdAt.getTime() - 60_000) {
    await prisma.user.update({ where: { id: userId }, data: { createdAt: claim.firstSeenAt } });
  }
}
