CREATE TABLE "user_follows" (
  "follower_id" TEXT NOT NULL,
  "following_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_follows_pkey" PRIMARY KEY ("follower_id", "following_id")
);

CREATE INDEX "user_follows_following_id_idx" ON "user_follows"("following_id");

ALTER TABLE "user_follows"
ADD CONSTRAINT "user_follows_follower_id_fkey"
FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_follows"
ADD CONSTRAINT "user_follows_following_id_fkey"
FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_follows"
ADD CONSTRAINT "user_follows_no_self_check" CHECK ("follower_id" <> "following_id");
