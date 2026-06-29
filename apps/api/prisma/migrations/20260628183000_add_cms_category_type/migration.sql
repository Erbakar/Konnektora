CREATE TYPE "CmsCategoryType" AS ENUM ('faq', 'write_to_us');

ALTER TABLE "cms_categories"
ADD COLUMN "type" "CmsCategoryType" NOT NULL DEFAULT 'faq';

CREATE INDEX "cms_categories_type_status_idx" ON "cms_categories"("type", "status");
