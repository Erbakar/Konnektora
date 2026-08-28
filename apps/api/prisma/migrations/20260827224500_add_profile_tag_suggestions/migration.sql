CREATE TABLE "profile_tag_suggestions" (
  "id" TEXT NOT NULL,
  "target_user_id" TEXT NOT NULL,
  "suggested_by_id" TEXT NOT NULL,
  "tag_id" TEXT NOT NULL,
  "sentiment" "TagSentiment" NOT NULL DEFAULT 'like',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "profile_tag_suggestions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "profile_tag_suggestions_target_user_id_suggested_by_id_tag_id_status_key" ON "profile_tag_suggestions"("target_user_id", "suggested_by_id", "tag_id", "status");
CREATE INDEX "profile_tag_suggestions_target_user_id_status_created_at_idx" ON "profile_tag_suggestions"("target_user_id", "status", "created_at");
CREATE INDEX "profile_tag_suggestions_suggested_by_id_status_created_at_idx" ON "profile_tag_suggestions"("suggested_by_id", "status", "created_at");
ALTER TABLE "profile_tag_suggestions" ADD CONSTRAINT "profile_tag_suggestions_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "profile_tag_suggestions" ADD CONSTRAINT "profile_tag_suggestions_suggested_by_id_fkey" FOREIGN KEY ("suggested_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "profile_tag_suggestions" ADD CONSTRAINT "profile_tag_suggestions_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
