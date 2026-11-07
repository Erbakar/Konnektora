-- 07/11 #40: Albümünde fotoğraf olduğu hâlde kapak/avatarı boş kalan mekân ve etkinliklere ilk fotoğrafı kapak yap.
UPDATE "places" p
SET "cover_image_url" = m."url"
FROM (
  SELECT DISTINCT ON ("content_id") "content_id", "url"
  FROM "media_files"
  WHERE "content_type" = 'place' AND "status" = 'active' AND "type" = 'image'
  ORDER BY "content_id", "sort_order" ASC, "created_at" ASC
) m
WHERE p."id"::text = m."content_id" AND p."cover_image_url" IS NULL;

UPDATE "events" e
SET "cover_image_url" = m."url"
FROM (
  SELECT DISTINCT ON ("content_id") "content_id", "url"
  FROM "media_files"
  WHERE "content_type" = 'event' AND "status" = 'active' AND "type" = 'image'
  ORDER BY "content_id", "sort_order" ASC, "created_at" ASC
) m
WHERE e."id"::text = m."content_id" AND e."cover_image_url" IS NULL;
