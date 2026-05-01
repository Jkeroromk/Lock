-- Full schema initialization
-- Run this once in Supabase SQL Editor if starting from an empty database

-- 1. users
CREATE TABLE IF NOT EXISTS "users" (
    "id"                      TEXT        NOT NULL,
    "email"                   TEXT,
    "name"                    TEXT,
    "username"                TEXT,
    "bio"                     TEXT,
    "avatar_emoji"            TEXT,
    "avatar_image"            TEXT,
    "show_gender"             BOOLEAN     NOT NULL DEFAULT false,
    "invite_code"             TEXT,
    "streak"                  INTEGER     NOT NULL DEFAULT 0,
    "height"                  INTEGER,
    "age"                     INTEGER,
    "weight"                  DECIMAL(5,2),
    "gender"                  TEXT,
    "goal"                    TEXT,
    "exercise_frequency"      TEXT,
    "expected_timeframe"      TEXT,
    "has_completed_onboarding" BOOLEAN    NOT NULL DEFAULT false,
    "plan"                    TEXT        NOT NULL DEFAULT 'FREE',
    "subscription"            TEXT,
    "ai_calls_today"          INTEGER     NOT NULL DEFAULT 0,
    "ai_calls_reset_at"       TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "push_token"              TEXT,
    "created_at"              TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"              TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key"       ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key"    ON "users"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "users_invite_code_key" ON "users"("invite_code");

-- 2. meals
CREATE TABLE IF NOT EXISTS "meals" (
    "id"         UUID           NOT NULL DEFAULT gen_random_uuid(),
    "user_id"    TEXT           NOT NULL,
    "food_name"  TEXT           NOT NULL,
    "calories"   DECIMAL(10,2)  NOT NULL DEFAULT 0,
    "protein"    DECIMAL(10,2)           DEFAULT 0,
    "carbs"      DECIMAL(10,2)           DEFAULT 0,
    "fat"        DECIMAL(10,2)           DEFAULT 0,
    "image_url"  TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "meals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "meals_user_id_idx"   ON "meals"("user_id");
CREATE INDEX IF NOT EXISTS "meals_created_at_idx" ON "meals"("created_at");
ALTER TABLE "meals" ADD CONSTRAINT "meals_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. health_sync
CREATE TABLE IF NOT EXISTS "health_sync" (
    "id"            UUID           NOT NULL DEFAULT gen_random_uuid(),
    "user_id"       TEXT           NOT NULL,
    "date"          DATE           NOT NULL,
    "steps"         INTEGER        NOT NULL DEFAULT 0,
    "active_energy" DECIMAL(10,2)  NOT NULL DEFAULT 0,
    "heart_rate"    INTEGER        NOT NULL DEFAULT 0,
    "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "health_sync_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "health_sync_user_id_date_key" ON "health_sync"("user_id", "date");
CREATE INDEX IF NOT EXISTS "health_sync_user_id_idx" ON "health_sync"("user_id");
CREATE INDEX IF NOT EXISTS "health_sync_date_idx"    ON "health_sync"("date");
ALTER TABLE "health_sync" ADD CONSTRAINT "health_sync_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. friendships
CREATE TABLE IF NOT EXISTS "friendships" (
    "id"           UUID           NOT NULL DEFAULT gen_random_uuid(),
    "requester_id" TEXT           NOT NULL,
    "addressee_id" TEXT           NOT NULL,
    "status"       TEXT           NOT NULL DEFAULT 'PENDING',
    "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "friendships_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "friendships_requester_id_addressee_id_key"
    ON "friendships"("requester_id", "addressee_id");
CREATE INDEX IF NOT EXISTS "friendships_requester_id_idx" ON "friendships"("requester_id");
CREATE INDEX IF NOT EXISTS "friendships_addressee_id_idx" ON "friendships"("addressee_id");
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requester_id_fkey"
    FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_addressee_id_fkey"
    FOREIGN KEY ("addressee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. challenges
CREATE TABLE IF NOT EXISTS "challenges" (
    "id"          UUID           NOT NULL DEFAULT gen_random_uuid(),
    "creator_id"  TEXT           NOT NULL,
    "title"       TEXT           NOT NULL,
    "description" TEXT,
    "type"        TEXT           NOT NULL DEFAULT 'CALORIES',
    "goal_value"  INTEGER        NOT NULL,
    "start_date"  DATE           NOT NULL,
    "end_date"    DATE           NOT NULL,
    "status"      TEXT           NOT NULL DEFAULT 'ACTIVE',
    "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "challenges_creator_id_idx" ON "challenges"("creator_id");
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_creator_id_fkey"
    FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. challenge_participants
CREATE TABLE IF NOT EXISTS "challenge_participants" (
    "id"           UUID           NOT NULL DEFAULT gen_random_uuid(),
    "challenge_id" UUID           NOT NULL,
    "user_id"      TEXT           NOT NULL,
    "progress"     INTEGER        NOT NULL DEFAULT 0,
    "joined_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "challenge_participants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "challenge_participants_challenge_id_user_id_key"
    ON "challenge_participants"("challenge_id", "user_id");
CREATE INDEX IF NOT EXISTS "challenge_participants_challenge_id_idx" ON "challenge_participants"("challenge_id");
CREATE INDEX IF NOT EXISTS "challenge_participants_user_id_idx"      ON "challenge_participants"("user_id");
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_challenge_id_fkey"
    FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. activity_feed
CREATE TABLE IF NOT EXISTS "activity_feed" (
    "id"         UUID           NOT NULL DEFAULT gen_random_uuid(),
    "user_id"    TEXT           NOT NULL,
    "type"       TEXT           NOT NULL,
    "metadata"   JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_feed_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "activity_feed_user_id_idx"   ON "activity_feed"("user_id");
CREATE INDEX IF NOT EXISTS "activity_feed_created_at_idx" ON "activity_feed"("created_at");
ALTER TABLE "activity_feed" ADD CONSTRAINT "activity_feed_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. weight_records
CREATE TABLE IF NOT EXISTS "weight_records" (
    "id"          UUID           NOT NULL DEFAULT gen_random_uuid(),
    "user_id"     TEXT           NOT NULL,
    "weight"      DECIMAL(5,2)   NOT NULL,
    "note"        TEXT,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "weight_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "weight_records_user_id_idx"    ON "weight_records"("user_id");
CREATE INDEX IF NOT EXISTS "weight_records_recorded_at_idx" ON "weight_records"("recorded_at");
ALTER TABLE "weight_records" ADD CONSTRAINT "weight_records_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 9. foods
CREATE TABLE IF NOT EXISTS "foods" (
    "id"         UUID           NOT NULL DEFAULT gen_random_uuid(),
    "name"       TEXT           NOT NULL,
    "name_en"    TEXT,
    "calories"   DECIMAL(10,2)  NOT NULL,
    "protein"    DECIMAL(10,2)  NOT NULL DEFAULT 0,
    "carbs"      DECIMAL(10,2)  NOT NULL DEFAULT 0,
    "fat"        DECIMAL(10,2)  NOT NULL DEFAULT 0,
    "source"     TEXT           NOT NULL DEFAULT 'LOCAL',
    "fdc_id"     TEXT,
    "cached_at"  TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "foods_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "foods_fdc_id_key" ON "foods"("fdc_id") WHERE "fdc_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "foods_name_idx"   ON "foods"("name");
CREATE INDEX IF NOT EXISTS "foods_source_idx" ON "foods"("source");

-- 10. posts
CREATE TABLE IF NOT EXISTS "posts" (
    "id"         UUID           NOT NULL DEFAULT gen_random_uuid(),
    "user_id"    TEXT           NOT NULL,
    "content"    TEXT           NOT NULL,
    "media_url"  TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "posts_user_id_idx"   ON "posts"("user_id");
CREATE INDEX IF NOT EXISTS "posts_created_at_idx" ON "posts"("created_at");
ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 11. post_likes
CREATE TABLE IF NOT EXISTS "post_likes" (
    "id"         UUID           NOT NULL DEFAULT gen_random_uuid(),
    "post_id"    UUID           NOT NULL,
    "user_id"    TEXT           NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "post_likes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "post_likes_post_id_user_id_key" ON "post_likes"("post_id", "user_id");
CREATE INDEX IF NOT EXISTS "post_likes_post_id_idx" ON "post_likes"("post_id");
CREATE INDEX IF NOT EXISTS "post_likes_user_id_idx" ON "post_likes"("user_id");
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_fkey"
    FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 12. post_comments
CREATE TABLE IF NOT EXISTS "post_comments" (
    "id"         UUID           NOT NULL DEFAULT gen_random_uuid(),
    "post_id"    UUID           NOT NULL,
    "user_id"    TEXT           NOT NULL,
    "content"    TEXT           NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "post_comments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "post_comments_post_id_idx" ON "post_comments"("post_id");
CREATE INDEX IF NOT EXISTS "post_comments_user_id_idx" ON "post_comments"("user_id");
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_post_id_fkey"
    FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 13. post_reports
CREATE TABLE IF NOT EXISTS "post_reports" (
    "id"          UUID           NOT NULL DEFAULT gen_random_uuid(),
    "post_id"     UUID           NOT NULL,
    "reporter_id" TEXT           NOT NULL,
    "reason"      TEXT           NOT NULL,
    "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "post_reports_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "post_reports_post_id_reporter_id_key"
    ON "post_reports"("post_id", "reporter_id");
CREATE INDEX IF NOT EXISTS "post_reports_post_id_idx"    ON "post_reports"("post_id");
CREATE INDEX IF NOT EXISTS "post_reports_reporter_id_idx" ON "post_reports"("reporter_id");
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_post_id_fkey"
    FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_reporter_id_fkey"
    FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
