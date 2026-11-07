ALTER TABLE "users" ADD COLUMN "plan_gifts" JSONB;
CREATE TABLE "plan_configurations" ("id" TEXT PRIMARY KEY, "data" JSONB NOT NULL, "revision" INTEGER NOT NULL DEFAULT 1, "updated_at" TIMESTAMP(3) NOT NULL);
CREATE TABLE "plan_audits" ("id" TEXT PRIMARY KEY, "actor_id" TEXT NOT NULL, "user_id" TEXT, "action" TEXT NOT NULL, "data" JSONB NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);

ALTER TABLE "users" ADD COLUMN "region" TEXT, ADD COLUMN "postal_code" TEXT;
ALTER TABLE "places" ADD COLUMN "region" TEXT, ADD COLUMN "postal_code" TEXT;
ALTER TABLE "events" ADD COLUMN "postal_code" TEXT;
