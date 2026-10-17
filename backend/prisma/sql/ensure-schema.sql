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

-- Friend ID: 8 digits for adding friends, separate from the invite code
-- (which only pays the sign-up reward). Existing accounts get one here.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "friend_code" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "users_friend_code_key" ON "users"("friend_code");
DO $$
DECLARE r RECORD; c TEXT;
BEGIN
  FOR r IN SELECT "id" FROM "users" WHERE "friend_code" IS NULL LOOP
    LOOP
      c := (10000000 + floor(random() * 90000000))::BIGINT::TEXT;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM "users" WHERE "friend_code" = c);
    END LOOP;
    UPDATE "users" SET "friend_code" = c WHERE "id" = r."id";
  END LOOP;
END $$;

-- Lockling (game): partner profile, caught creatures, encounters waiting to be caught.
CREATE TABLE IF NOT EXISTS "game_profiles" (
  "user_id" TEXT PRIMARY KEY,
  "stage_seen" INTEGER NOT NULL DEFAULT 1,
  "egg_baseline" INTEGER NOT NULL DEFAULT 0,
  "eggs_hatched" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "creatures" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" TEXT NOT NULL,
  "species" TEXT NOT NULL,
  "shiny" BOOLEAN NOT NULL DEFAULT false,
  "origin" TEXT NOT NULL,
  "caught_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "creatures_user_id_idx" ON "creatures"("user_id");
CREATE TABLE IF NOT EXISTS "encounters" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" TEXT NOT NULL,
  "species" TEXT NOT NULL,
  "shiny" BOOLEAN NOT NULL DEFAULT false,
  "origin" TEXT NOT NULL,
  "ref_key" TEXT NOT NULL,
  "day_key" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "caught_at" TIMESTAMPTZ(6)
);
CREATE UNIQUE INDEX IF NOT EXISTS "encounters_ref_key_key" ON "encounters"("ref_key");
CREATE INDEX IF NOT EXISTS "encounters_user_id_day_key_idx" ON "encounters"("user_id", "day_key");
CREATE INDEX IF NOT EXISTS "encounters_user_id_status_idx" ON "encounters"("user_id", "status");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'game_profiles_user_id_fkey') THEN
    ALTER TABLE "game_profiles" ADD CONSTRAINT "game_profiles_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'creatures_user_id_fkey') THEN
    ALTER TABLE "creatures" ADD CONSTRAINT "creatures_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'encounters_user_id_fkey') THEN
    ALTER TABLE "encounters" ADD CONSTRAINT "encounters_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
