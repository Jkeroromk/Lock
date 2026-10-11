// Applies prisma/sql/ensure-schema.sql to the database in POSTGRES_PRISMA_URL during
// production builds on Vercel, so the live database can never lag behind the
// code that is about to be deployed. The SQL is idempotent.
//
// Runs only when VERCEL_ENV === 'production' (previews have no database URL).
// A failure fails the build, which keeps the previous working deployment live.
import { execFileSync } from 'node:child_process';

if (process.env.VERCEL_ENV !== 'production') {
  console.log('[ensure-schema] skipped (not a production build)');
  process.exit(0);
}
if (!process.env.POSTGRES_PRISMA_URL) {
  console.error('[ensure-schema] POSTGRES_PRISMA_URL is not set (Supabase ↔ Vercel integration)');
  process.exit(1);
}

// `prisma db execute` hangs on Supabase's *transaction* pooler (port 6543,
// pgbouncer=true). Run the DDL through the *session* pooler instead: same
// host, port 5432, no pgbouncer flag. It speaks full Postgres and is IPv4.
function sessionPoolerUrl(raw) {
  const url = new URL(raw);
  if (url.port === '6543') url.port = '5432';
  for (const key of ['pgbouncer', 'connection_limit']) url.searchParams.delete(key);
  return url.toString();
}

console.log('[ensure-schema] applying prisma/sql/ensure-schema.sql (session pooler)');
execFileSync(
  'npx',
  ['prisma', 'db', 'execute', '--file', 'prisma/sql/ensure-schema.sql', '--url', sessionPoolerUrl(process.env.POSTGRES_PRISMA_URL)],
  // Never let a stuck connection hold the build for 45 minutes; failing the
  // build keeps the previous deployment live.
  { stdio: 'inherit', timeout: 120_000 }
);
console.log('[ensure-schema] done');
