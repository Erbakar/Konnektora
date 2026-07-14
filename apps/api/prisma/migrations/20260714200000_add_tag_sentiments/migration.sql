CREATE TYPE "TagSentiment" AS ENUM ('like', 'ok', 'dislike');

ALTER TABLE "user_interest_tags"
ADD COLUMN "sentiment" "TagSentiment" NOT NULL DEFAULT 'like',
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "tags" AS tag
SET "usage_count" = tag."usage_count" + affinity.total
FROM (
  SELECT "tag_id", COUNT(*)::INTEGER AS total
  FROM "user_interest_tags"
  GROUP BY "tag_id"
) AS affinity
WHERE tag.id = affinity."tag_id";
