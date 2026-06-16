CREATE TABLE "moderation_decisions" (
  "id" TEXT NOT NULL,
  "target_type" "ReportTargetType" NOT NULL,
  "target_id" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "penalty_score" INTEGER NOT NULL DEFAULT 0,
  "note" TEXT,
  "user_id" TEXT,
  "issued_by" TEXT,
  "suspension_ends_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "moderation_decisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "moderation_decisions_target_type_target_id_idx" ON "moderation_decisions"("target_type", "target_id");
CREATE INDEX "moderation_decisions_user_id_idx" ON "moderation_decisions"("user_id");

ALTER TABLE "moderation_decisions" ADD CONSTRAINT "moderation_decisions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "moderation_decisions" ADD CONSTRAINT "moderation_decisions_issued_by_fkey"
  FOREIGN KEY ("issued_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
