CREATE TABLE "places" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "cover_image_url" TEXT,
  "country" TEXT,
  "city" TEXT,
  "address" TEXT,
  "follower_count" INTEGER NOT NULL DEFAULT 0,
  "invite_count" INTEGER NOT NULL DEFAULT 0,
  "created_by" TEXT,
  "updated_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "media_files" (
  "id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'image',
  "status" TEXT NOT NULL DEFAULT 'active',
  "content_type" "ReportTargetType" NOT NULL,
  "content_id" TEXT NOT NULL,
  "uploaded_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "media_files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "content_comments" (
  "id" TEXT NOT NULL,
  "target_type" "ReportTargetType" NOT NULL,
  "target_id" TEXT NOT NULL,
  "parent_id" TEXT,
  "author_id" TEXT,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "like_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "content_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "private_messages" (
  "id" TEXT NOT NULL,
  "sender_id" TEXT,
  "recipient_id" TEXT,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "private_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "content_reactions" (
  "id" TEXT NOT NULL,
  "target_type" "ReportTargetType" NOT NULL,
  "target_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "reaction" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "content_reactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "content_views" (
  "id" TEXT NOT NULL,
  "target_type" "ReportTargetType" NOT NULL,
  "target_id" TEXT NOT NULL,
  "user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "content_views_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "places_slug_key" ON "places"("slug");
CREATE INDEX "places_status_created_at_idx" ON "places"("status", "created_at");
CREATE INDEX "places_country_city_idx" ON "places"("country", "city");
CREATE INDEX "media_files_content_type_content_id_idx" ON "media_files"("content_type", "content_id");
CREATE INDEX "media_files_status_created_at_idx" ON "media_files"("status", "created_at");
CREATE INDEX "content_comments_target_type_target_id_idx" ON "content_comments"("target_type", "target_id");
CREATE INDEX "content_comments_parent_id_idx" ON "content_comments"("parent_id");
CREATE INDEX "content_comments_status_created_at_idx" ON "content_comments"("status", "created_at");
CREATE INDEX "private_messages_sender_id_recipient_id_idx" ON "private_messages"("sender_id", "recipient_id");
CREATE INDEX "private_messages_status_created_at_idx" ON "private_messages"("status", "created_at");
CREATE UNIQUE INDEX "content_reactions_target_type_target_id_user_id_reaction_key" ON "content_reactions"("target_type", "target_id", "user_id", "reaction");
CREATE INDEX "content_reactions_target_type_target_id_idx" ON "content_reactions"("target_type", "target_id");
CREATE INDEX "content_views_target_type_target_id_idx" ON "content_views"("target_type", "target_id");
CREATE INDEX "content_views_user_id_idx" ON "content_views"("user_id");

ALTER TABLE "places" ADD CONSTRAINT "places_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "places" ADD CONSTRAINT "places_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "content_comments" ADD CONSTRAINT "content_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "content_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_comments" ADD CONSTRAINT "content_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "private_messages" ADD CONSTRAINT "private_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "private_messages" ADD CONSTRAINT "private_messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "content_reactions" ADD CONSTRAINT "content_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_views" ADD CONSTRAINT "content_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
