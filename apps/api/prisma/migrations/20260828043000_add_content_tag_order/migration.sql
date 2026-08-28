ALTER TABLE "event_tags" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "place_tags" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

-- These join tables predate an explicit ordering column. PostgreSQL keeps the
-- current physical row order during this migration, which is the closest
-- recoverable representation of the original insertion order for existing
-- content. New writes persist an exact, explicit order from this point on.
WITH ranked_event_tags AS (
  SELECT "event_id", "tag_id",
         (ROW_NUMBER() OVER (PARTITION BY "event_id" ORDER BY ctid) - 1)::INTEGER AS position
  FROM "event_tags"
)
UPDATE "event_tags" AS target
SET "sort_order" = ranked.position
FROM ranked_event_tags AS ranked
WHERE target."event_id" = ranked."event_id"
  AND target."tag_id" = ranked."tag_id";

WITH ranked_place_tags AS (
  SELECT "place_id", "tag_id",
         (ROW_NUMBER() OVER (PARTITION BY "place_id" ORDER BY ctid) - 1)::INTEGER AS position
  FROM "place_tags"
)
UPDATE "place_tags" AS target
SET "sort_order" = ranked.position
FROM ranked_place_tags AS ranked
WHERE target."place_id" = ranked."place_id"
  AND target."tag_id" = ranked."tag_id";

CREATE INDEX "event_tags_event_id_sort_order_idx" ON "event_tags"("event_id", "sort_order");
CREATE INDEX "place_tags_place_id_sort_order_idx" ON "place_tags"("place_id", "sort_order");
