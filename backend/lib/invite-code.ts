import { prisma } from '@/lib/prisma';

// No 0/O/1/I so codes are easy to read aloud and type.
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}

/** A 6-character invite code no other user has. */
export async function getUniqueInviteCode(): Promise<string> {
  let code = generateInviteCode();
  while (await prisma.user.findUnique({ where: { inviteCode: code } })) {
    code = generateInviteCode();
  }
  return code;
}
