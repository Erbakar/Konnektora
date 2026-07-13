ALTER TABLE "announcements"
ADD COLUMN "target_last_login_from" TIMESTAMP(3),
ADD COLUMN "target_last_login_to" TIMESTAMP(3),
ADD COLUMN "target_joined_from" TIMESTAMP(3),
ADD COLUMN "target_joined_to" TIMESTAMP(3),
ADD COLUMN "target_app_version" TEXT,
ADD COLUMN "publish_mode" TEXT NOT NULL DEFAULT 'scheduled';
