// Applies prisma/sql/ensure-schema.sql to the database in DATABASE_URL during
// production builds on Vercel, so the live database can never lag behind the
// code that is about to be deployed. The SQL is idempotent.
//
// Runs only when VERCEL_ENV === 'production' (previews have no DATABASE_URL).
// A failure fails the build, which keeps the previous working deployment live.
import { execFileSync } from 'node:child_process';

if (process.env.VERCEL_ENV !== 'production') {
  console.log('[ensure-schema] skipped (not a production build)');
  process.exit(0);
}
if (!process.env.DATABASE_URL) {
  console.error('[ensure-schema] DATABASE_URL is not set');
  process.exit(1);
}

console.log('[ensure-schema] applying prisma/sql/ensure-schema.sql');
execFileSync(
  'npx',
  ['prisma', 'db', 'execute', '--file', 'prisma/sql/ensure-schema.sql', '--schema', 'prisma/schema.prisma'],
  { stdio: 'inherit' }
);
console.log('[ensure-schema] done');
