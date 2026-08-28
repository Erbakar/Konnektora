UPDATE "places" AS place
SET "invite_count" = COALESCE(invited."count", 0)
FROM (
  SELECT "place_id", COUNT(*)::integer AS "count"
  FROM "place_members"
  WHERE "status" = 'invited'
  GROUP BY "place_id"
) AS invited
WHERE place."id" = invited."place_id";

UPDATE "places" AS place
SET "invite_count" = 0
WHERE NOT EXISTS (
  SELECT 1
  FROM "place_members" AS member
  WHERE member."place_id" = place."id"
    AND member."status" = 'invited'
);
