CREATE TABLE "automated_message_deliveries" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id" TEXT NOT NULL,
  "message_type" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'sent',
  "provider_id" TEXT,
  "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "automated_message_deliveries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "automated_message_deliveries_user_id_target_type_target_id_message_type_channel_key" ON "automated_message_deliveries"("user_id", "target_type", "target_id", "message_type", "channel");
CREATE INDEX "automated_message_deliveries_status_sent_at_idx" ON "automated_message_deliveries"("status", "sent_at");
