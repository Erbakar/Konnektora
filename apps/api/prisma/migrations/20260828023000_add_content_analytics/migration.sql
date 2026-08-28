ALTER TABLE "content_views" ADD COLUMN "source" TEXT;
ALTER TABLE "content_views" ADD COLUMN "referrer" TEXT;
ALTER TABLE "content_views" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'detail';
ALTER TABLE "users" ADD COLUMN "preferred_language" TEXT NOT NULL DEFAULT 'tr';
ALTER TABLE "event_ticket_orders" ADD COLUMN "event_starts_at_snapshot" TIMESTAMP(3);
ALTER TABLE "event_ticket_orders" ADD COLUMN "event_ends_at_snapshot" TIMESTAMP(3);
ALTER TABLE "event_ticket_orders" ADD COLUMN "event_location_snapshot" TEXT;

CREATE INDEX "content_views_target_type_target_id_source_idx"
ON "content_views"("target_type", "target_id", "source");
CREATE INDEX "content_views_target_type_target_id_kind_idx"
ON "content_views"("target_type", "target_id", "kind");

CREATE TABLE "content_shares" (
  "id" TEXT NOT NULL,
  "target_type" "ReportTargetType" NOT NULL,
  "target_id" TEXT NOT NULL,
  "user_id" TEXT,
  "channel" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "content_shares_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "content_shares_target_type_target_id_created_at_idx"
ON "content_shares"("target_type", "target_id", "created_at");
CREATE INDEX "content_shares_target_type_target_id_channel_idx"
ON "content_shares"("target_type", "target_id", "channel");
CREATE INDEX "content_shares_user_id_created_at_idx"
ON "content_shares"("user_id", "created_at");

ALTER TABLE "content_shares"
ADD CONSTRAINT "content_shares_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "content_actions" (
  "id" TEXT NOT NULL,
  "target_type" "ReportTargetType" NOT NULL,
  "target_id" TEXT NOT NULL,
  "user_id" TEXT,
  "action" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "content_actions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "content_actions_target_type_target_id_action_idx"
ON "content_actions"("target_type", "target_id", "action");
CREATE INDEX "content_actions_user_id_created_at_idx"
ON "content_actions"("user_id", "created_at");
ALTER TABLE "content_actions" ADD CONSTRAINT "content_actions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
