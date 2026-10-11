-- Idempotent schema changes, applied automatically on every PRODUCTION deploy
-- (see scripts/ensure-schema.mjs). Every statement must be safe to run again.
-- Add new changes at the bottom.

-- 2026-10-10: user blocking + auto-hide for reported posts (App Store Guideline 1.2)
CREATE TABLE IF NOT EXISTS "user_blocks" (
    "id"         UUID           NOT NULL DEFAULT gen_random_uuid(),
    "blocker_id" TEXT           NOT NULL,
    "blocked_id" TEXT           NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_blocks_blocker_id_blocked_id_key"
    ON "user_blocks"("blocker_id", "blocked_id");
CREATE INDEX IF NOT EXISTS "user_blocks_blocked_id_idx" ON "user_blocks"("blocked_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_blocks_blocker_id_fkey') THEN
    ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_fkey"
      FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_blocks_blocked_id_fkey') THEN
    ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_id_fkey"
      FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "hidden_at" TIMESTAMPTZ(6);

-- Calendar / weekly / today queries filter meals by user and date range.
CREATE INDEX IF NOT EXISTS "meals_user_id_created_at_idx" ON "meals"("user_id", "created_at");

-- Free plan: one AI diet review per local day, tracked separately from scans.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_diet_analysis_at" TIMESTAMPTZ(6);
-- Switching app language allows one more review that day, in the new language.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "diet_analysis_langs" TEXT;

-- Invite rewards: bonus scans for the inviter, paid once per invited account.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bonus_ai_calls" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "invite_rewards" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referred_by_id" TEXT;
