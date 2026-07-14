CREATE TYPE "PrivacyAudience" AS ENUM ('everybody', 'following', 'network');

CREATE TABLE "privacy_settings" (
  "user_id" TEXT NOT NULL,
  "message_audience" "PrivacyAudience" NOT NULL DEFAULT 'everybody',
  "directory_discoverable" BOOLEAN NOT NULL DEFAULT false,
  "event_audience" "PrivacyAudience" NOT NULL DEFAULT 'everybody',
  "event_invite_audience" "PrivacyAudience" NOT NULL DEFAULT 'everybody',
  "place_audience" "PrivacyAudience" NOT NULL DEFAULT 'everybody',
  "place_invite_audience" "PrivacyAudience" NOT NULL DEFAULT 'everybody',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "privacy_settings_pkey" PRIMARY KEY ("user_id")
);

ALTER TABLE "privacy_settings"
ADD CONSTRAINT "privacy_settings_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
