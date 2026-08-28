UPDATE "Place"
SET "latitude" = 52.5208, "longitude" = 13.4095
WHERE "slug" = 'konnektora-hub-berlin-310001'
  AND ("latitude" IS NULL OR "longitude" IS NULL);

UPDATE "Place"
SET "latitude" = 41.0256, "longitude" = 28.9744
WHERE "slug" = 'galata-product-house-310002'
  AND ("latitude" IS NULL OR "longitude" IS NULL);

UPDATE "Place"
SET "latitude" = 52.3547, "longitude" = 4.8936
WHERE "slug" = 'amsterdam-founder-loft-310003'
  AND ("latitude" IS NULL OR "longitude" IS NULL);

UPDATE "Place"
SET "latitude" = 51.5255, "longitude" = -0.0786
WHERE "slug" = 'london-community-studio-310004'
  AND ("latitude" IS NULL OR "longitude" IS NULL);
