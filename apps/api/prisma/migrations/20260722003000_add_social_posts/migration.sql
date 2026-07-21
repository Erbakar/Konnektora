ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'post';
ALTER TYPE "ReportTargetType" ADD VALUE IF NOT EXISTS 'post_comment';

CREATE TYPE "PostVisibility" AS ENUM ('everybody', 'following', 'network');

CREATE TABLE "posts" (
  "id" TEXT NOT NULL,
  "author_id" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "visibility" "PostVisibility" NOT NULL DEFAULT 'everybody',
  "status" TEXT NOT NULL DEFAULT 'active',
  "like_count" INTEGER NOT NULL DEFAULT 0,
  "comment_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "post_media" (
  "id" TEXT NOT NULL,
  "post_id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "post_media_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "post_likes" (
  "post_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "post_likes_pkey" PRIMARY KEY ("post_id", "user_id")
);

CREATE TABLE "post_comments" (
  "id" TEXT NOT NULL,
  "post_id" TEXT NOT NULL,
  "author_id" TEXT NOT NULL,
  "parent_id" TEXT,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "post_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "posts_status_created_at_idx" ON "posts"("status", "created_at");
CREATE INDEX "posts_author_id_created_at_idx" ON "posts"("author_id", "created_at");
CREATE INDEX "post_media_post_id_sort_order_idx" ON "post_media"("post_id", "sort_order");
CREATE INDEX "post_likes_user_id_created_at_idx" ON "post_likes"("user_id", "created_at");
CREATE INDEX "post_comments_post_id_status_created_at_idx" ON "post_comments"("post_id", "status", "created_at");
CREATE INDEX "post_comments_author_id_created_at_idx" ON "post_comments"("author_id", "created_at");

ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "post_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
