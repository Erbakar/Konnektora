ALTER TABLE "media_files"
ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "is_profile_picture" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "media_files_uploaded_by_content_type_content_id_sort_order_idx"
ON "media_files"("uploaded_by", "content_type", "content_id", "sort_order");

CREATE UNIQUE INDEX "media_files_one_active_profile_picture_per_user"
ON "media_files"("uploaded_by")
WHERE "is_profile_picture" = true AND "status" = 'active' AND "content_type" = 'user';
