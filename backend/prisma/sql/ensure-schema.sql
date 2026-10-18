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

-- The Lockling game was removed from Lock (Oct 2026); drop its tables.
DROP TABLE IF EXISTS "encounters";
DROP TABLE IF EXISTS "creatures";
DROP TABLE IF EXISTS "game_profiles";

-- Training tab (Oct 2026): weekly plan, finished workouts and their sets.
CREATE TABLE IF NOT EXISTS "workout_plans" (
  "user_id" TEXT PRIMARY KEY,
  "days" JSONB NOT NULL DEFAULT '{}',
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "workout_sessions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" TEXT NOT NULL,
  "day_key" TEXT NOT NULL,
  "plan_day" INTEGER,
  "title" TEXT,
  "started_at" TIMESTAMPTZ(6) NOT NULL,
  "finished_at" TIMESTAMPTZ(6) NOT NULL,
  "duration_sec" INTEGER NOT NULL DEFAULT 0,
  "volume" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "set_count" INTEGER NOT NULL DEFAULT 0,
  "pr_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "workout_sessions_user_id_day_key_idx" ON "workout_sessions"("user_id", "day_key");
CREATE TABLE IF NOT EXISTS "workout_sets" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" UUID NOT NULL,
  "user_id" TEXT NOT NULL,
  "exercise_id" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "weight" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "reps" INTEGER NOT NULL,
  "is_pr" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "workout_sets_user_id_exercise_id_idx" ON "workout_sets"("user_id", "exercise_id");
CREATE INDEX IF NOT EXISTS "workout_sets_session_id_idx" ON "workout_sets"("session_id");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workout_plans_user_id_fkey') THEN
    ALTER TABLE "workout_plans" ADD CONSTRAINT "workout_plans_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workout_sessions_user_id_fkey') THEN
    ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workout_sets_session_id_fkey') THEN
    ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_session_id_fkey"
      FOREIGN KEY ("session_id") REFERENCES "workout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
-- Like every other table: no direct access through Supabase's public API
-- (the backend connects as the owner, which RLS doesn't restrict).
ALTER TABLE "workout_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workout_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workout_sets" ENABLE ROW LEVEL SECURITY;
