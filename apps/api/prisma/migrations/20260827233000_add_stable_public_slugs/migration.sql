ALTER TABLE "events"
ADD COLUMN "legacy_slugs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "places"
ADD COLUMN "legacy_slugs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

WITH known(old_slug, public_code) AS (
  VALUES
    ('global-startup-demo-night', '420001'),
    ('ai-product-builders-breakfast', '420002'),
    ('saas-growth-office-hours', '420003'),
    ('climate-tech-founder-roundtable', '420004'),
    ('founders-operators-mixer', '420005'),
    ('remote-builders-social', '420006'),
    ('investor-coffee-chats', '420007'),
    ('community-leaders-dinner', '420008'),
    ('seed-funding-readiness-clinic', '420009'),
    ('angel-investor-ama', '420010'),
    ('vc-reverse-pitch', '420011'),
    ('impact-capital-roundtable', '420012'),
    ('solo-founder-accountability-sprint', '420013'),
    ('founder-mental-load-circle', '420014'),
    ('co-founder-matching-lab', '420015'),
    ('founder-story-night', '420016')
)
UPDATE "events" AS event
SET "legacy_slugs" = ARRAY[event."slug"],
    "slug" = event."slug" || '-' || known.public_code
FROM known
WHERE event."slug" = known.old_slug;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS public_number
  FROM "events"
  WHERE "slug" !~ '-[0-9]{6,}$'
)
UPDATE "events" AS event
SET "legacy_slugs" = ARRAY[event."slug"],
    "slug" = event."slug" || '-' || LPAD((500000 + numbered.public_number)::TEXT, 6, '0')
FROM numbered
WHERE event.id = numbered.id;

WITH known(old_slug, public_code) AS (
  VALUES
    ('konnektora-hub-berlin', '310001'),
    ('galata-product-house', '310002'),
    ('amsterdam-founder-loft', '310003'),
    ('london-community-studio', '310004')
)
UPDATE "places" AS place
SET "legacy_slugs" = ARRAY[place."slug"],
    "slug" = place."slug" || '-' || known.public_code
FROM known
WHERE place."slug" = known.old_slug;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS public_number
  FROM "places"
  WHERE "slug" !~ '-[0-9]{6,}$'
)
UPDATE "places" AS place
SET "legacy_slugs" = ARRAY[place."slug"],
    "slug" = place."slug" || '-' || LPAD((600000 + numbered.public_number)::TEXT, 6, '0')
FROM numbered
WHERE place.id = numbered.id;
