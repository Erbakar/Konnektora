ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'frozen';
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'deleted';
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'suspended';
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'banned';

ALTER TABLE "users"
ADD COLUMN "username" TEXT,
ADD COLUMN "account_type" TEXT NOT NULL DEFAULT 'individual',
ADD COLUMN "phone" TEXT,
ADD COLUMN "country" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "district" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "gender" TEXT,
ADD COLUMN "birth_date" TIMESTAMP(3),
ADD COLUMN "website" TEXT,
ADD COLUMN "company_name" TEXT,
ADD COLUMN "trade_name" TEXT,
ADD COLUMN "company_type" TEXT,
ADD COLUMN "business_category" TEXT,
ADD COLUMN "follower_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "following_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "last_online_at" TIMESTAMP(3),
ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "invited_by" TEXT,
ADD COLUMN "penalty_score_last_year" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "penalty_score_all_time" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE INDEX "users_account_type_status_idx" ON "users"("account_type", "status");
CREATE INDEX "users_country_city_idx" ON "users"("country", "city");
CREATE INDEX "users_last_online_at_idx" ON "users"("last_online_at");

ALTER TABLE "users"
ADD CONSTRAINT "users_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
