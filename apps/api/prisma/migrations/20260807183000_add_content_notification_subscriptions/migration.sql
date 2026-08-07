CREATE TABLE "content_notification_subscriptions" (
  "user_id" TEXT NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "content_notification_subscriptions_pkey" PRIMARY KEY ("user_id", "target_type", "target_id"),
  CONSTRAINT "content_notification_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "content_notification_subscriptions_target_type_target_id_enabled_idx" ON "content_notification_subscriptions"("target_type", "target_id", "enabled");
