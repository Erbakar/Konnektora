CREATE TYPE "ReportTargetType" AS ENUM ('event', 'tag', 'user');
CREATE TYPE "ReportStatus" AS ENUM ('open', 'reviewing', 'resolved', 'dismissed');

CREATE TABLE "content_reports" (
    "id" TEXT NOT NULL,
    "target_type" "ReportTargetType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'open',
    "resolution_note" TEXT,
    "reporter_id" TEXT NOT NULL,
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "content_reports_target_type_target_id_idx" ON "content_reports"("target_type", "target_id");
CREATE INDEX "content_reports_status_created_at_idx" ON "content_reports"("status", "created_at");

ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
