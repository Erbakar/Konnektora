CREATE TABLE "report_rules" (
  "id" TEXT NOT NULL,
  "target_type" "ReportTargetType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "violation_score" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "report_rules_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "content_reports" ADD COLUMN "rule_id" TEXT;

CREATE INDEX "report_rules_target_type_status_idx" ON "report_rules"("target_type", "status");
CREATE INDEX "content_reports_rule_id_idx" ON "content_reports"("rule_id");

ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_rule_id_fkey"
  FOREIGN KEY ("rule_id") REFERENCES "report_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
