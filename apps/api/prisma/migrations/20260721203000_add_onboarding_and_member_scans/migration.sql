ALTER TABLE "users"
ADD COLUMN "onboarding_completed_at" TIMESTAMP(3),
ADD COLUMN "member_pass_version" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "member_scans" (
  "id" TEXT NOT NULL,
  "scanner_id" TEXT NOT NULL,
  "member_id" TEXT NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'qr',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "member_scans_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "member_scans_scanner_id_created_at_idx" ON "member_scans"("scanner_id", "created_at");
CREATE INDEX "member_scans_member_id_created_at_idx" ON "member_scans"("member_id", "created_at");
ALTER TABLE "member_scans" ADD CONSTRAINT "member_scans_scanner_id_fkey" FOREIGN KEY ("scanner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_scans" ADD CONSTRAINT "member_scans_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
