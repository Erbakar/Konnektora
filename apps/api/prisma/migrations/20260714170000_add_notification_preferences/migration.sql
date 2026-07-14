CREATE TYPE "NotificationTopic" AS ENUM (
  'tag_request', 'private_message', 'mention', 'comment',
  'password_changed', 'email_changed', 'phone_changed', 'login',
  'admin_message', 'event_invite', 'event_manager', 'place_invite', 'place_manager'
);

CREATE TYPE "DeliveryChannel" AS ENUM ('none', 'both', 'email', 'push');

CREATE TABLE "notification_preferences" (
  "user_id" TEXT NOT NULL,
  "topic" "NotificationTopic" NOT NULL,
  "channel" "DeliveryChannel" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id", "topic")
);

ALTER TABLE "notification_preferences"
ADD CONSTRAINT "notification_preferences_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
