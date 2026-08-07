ALTER TABLE "users"
ADD COLUMN "member_plan" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN "member_plan_started_at" TIMESTAMP(3);
