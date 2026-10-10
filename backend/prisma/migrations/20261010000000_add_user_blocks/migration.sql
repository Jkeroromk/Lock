-- User blocking + auto-hide for heavily reported posts (App Store Guideline 1.2)

-- 1. user_blocks
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
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_fkey"
    FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_id_fkey"
    FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. posts.hidden_at
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "hidden_at" TIMESTAMPTZ(6);
