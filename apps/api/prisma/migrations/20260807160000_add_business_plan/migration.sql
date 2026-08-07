ALTER TABLE "users"
ADD COLUMN "business_plan" TEXT NOT NULL DEFAULT 'starter',
ADD COLUMN "business_plan_started_at" TIMESTAMP(3);
