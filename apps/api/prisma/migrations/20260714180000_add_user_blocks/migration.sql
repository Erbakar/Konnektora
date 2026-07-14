CREATE TYPE "BlockedTargetType" AS ENUM ('user', 'tag', 'event', 'place');

CREATE TABLE "user_blocks" (
  "user_id" TEXT NOT NULL,
  "target_type" "BlockedTargetType" NOT NULL,
  "target_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("user_id", "target_type", "target_id")
);

CREATE INDEX "user_blocks_target_type_target_id_idx" ON "user_blocks"("target_type", "target_id");

ALTER TABLE "user_blocks"
ADD CONSTRAINT "user_blocks_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
