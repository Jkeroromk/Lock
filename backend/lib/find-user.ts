import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

/**
 * Who someone means when adding a friend: an 8-digit Friend ID, else a username
 * (any case, optional @). Invite codes are deliberately not accepted here; they
 * only pay the sign-up reward.
 */
export async function findUserByHandle<S extends Prisma.UserSelect>(raw: string, select: S) {
  const handle = raw.trim().replace(/^@/, '');
  if (!handle) return null;
  if (/^\d{8}$/.test(handle)) {
    const byId = await prisma.user.findUnique({ where: { friendCode: handle }, select });
    if (byId) return byId;
  }
  return prisma.user.findFirst({ where: { username: { equals: handle, mode: 'insensitive' } }, select });
}
