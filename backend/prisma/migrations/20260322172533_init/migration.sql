-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "height" INTEGER,
    "age" INTEGER,
    "weight" DECIMAL(5,2),
    "gender" TEXT,
    "goal" TEXT,
    "exercise_frequency" TEXT,
    "expected_timeframe" TEXT,
    "has_completed_onboarding" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meals" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "food_name" TEXT NOT NULL,
    "calories" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "protein" DECIMAL(10,2) DEFAULT 0,
    "carbs" DECIMAL(10,2) DEFAULT 0,
    "fat" DECIMAL(10,2) DEFAULT 0,
    "image_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_sync" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "steps" INTEGER NOT NULL DEFAULT 0,
    "active_energy" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "heart_rate" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_sync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "meals_user_id_idx" ON "meals"("user_id");

-- CreateIndex
CREATE INDEX "meals_created_at_idx" ON "meals"("created_at");

-- CreateIndex
CREATE INDEX "health_sync_user_id_idx" ON "health_sync"("user_id");

-- CreateIndex
CREATE INDEX "health_sync_date_idx" ON "health_sync"("date");

-- CreateIndex
CREATE UNIQUE INDEX "health_sync_user_id_date_key" ON "health_sync"("user_id", "date");

-- AddForeignKey
ALTER TABLE "meals" ADD CONSTRAINT "meals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_sync" ADD CONSTRAINT "health_sync_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
