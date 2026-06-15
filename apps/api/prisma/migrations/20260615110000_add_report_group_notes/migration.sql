CREATE TABLE "report_group_notes" (
  "id" TEXT NOT NULL,
  "target_type" "ReportTargetType" NOT NULL,
  "target_id" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "updated_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "report_group_notes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "report_group_notes_target_type_target_id_key" ON "report_group_notes"("target_type", "target_id");

ALTER TABLE "report_group_notes" ADD CONSTRAINT "report_group_notes_updated_by_fkey"
  FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
