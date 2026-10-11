import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Serverless: every function instance opens its own pool, so keep each pool to
 * one connection through Supabase's pooler (Supabase's Prisma guidance).
 * Adds connection_limit=1 unless the URL already sets one.
 */
function datasourceUrl(): string | undefined {
  const raw = process.env.POSTGRES_PRISMA_URL;
  if (!raw) return undefined;
  if (/[?&]connection_limit=/.test(raw)) return raw;
  return raw + (raw.includes('?') ? '&' : '?') + 'connection_limit=1';
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: datasourceUrl(),
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

