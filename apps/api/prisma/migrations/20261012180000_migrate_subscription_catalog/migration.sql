-- One-time, auditable mapping approved on 2026-10-12. Preserve all timestamps and ledger rows.
CREATE TABLE "subscription_catalog_migration_backup" AS
SELECT "id" AS "user_id", "member_plan", "business_plan", "member_plan_started_at", "business_plan_started_at", CURRENT_TIMESTAMP AS "migrated_at"
FROM "users";
ALTER TABLE "subscription_catalog_migration_backup" ADD PRIMARY KEY ("user_id");
UPDATE "users" SET "member_plan" = CASE "member_plan" WHEN 'plus' THEN 'premium' WHEN 'premium' THEN 'platinum' ELSE "member_plan" END,
"business_plan" = CASE "business_plan" WHEN 'starter' THEN 'free' WHEN 'growth' THEN 'pro' WHEN 'scale' THEN 'venue' ELSE "business_plan" END;
ALTER TABLE "users" ALTER COLUMN "business_plan" SET DEFAULT 'free';
