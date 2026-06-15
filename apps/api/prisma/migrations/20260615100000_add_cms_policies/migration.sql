CREATE TABLE "cms_policies" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "cms_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cms_policies_type_key" ON "cms_policies"("type");
CREATE INDEX "cms_policies_status_idx" ON "cms_policies"("status");
