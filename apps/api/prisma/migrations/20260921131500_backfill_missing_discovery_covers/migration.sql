UPDATE "events"
SET "cover_image_url" = CASE "slug"
  WHEN 'date-aksam-yemegi-169703' THEN 'https://konnektora.com/media/covers/event-date-aksam-yemegi.webp'
  WHEN 'pazar-kahvaltisi-140754' THEN 'https://konnektora.com/media/covers/event-pazar-kahvaltisi.webp'
  WHEN 'mangal-284630' THEN 'https://konnektora.com/media/covers/event-mangal.webp'
  WHEN 'paintball-turnuvasi-754179' THEN 'https://konnektora.com/media/covers/event-paintball-turnuvasi.webp'
  ELSE "cover_image_url"
END,
"updated_at" = CURRENT_TIMESTAMP
WHERE "cover_image_url" IS NULL
  AND "slug" IN (
    'date-aksam-yemegi-169703',
    'pazar-kahvaltisi-140754',
    'mangal-284630',
    'paintball-turnuvasi-754179'
  );

UPDATE "places"
SET "cover_image_url" = CASE "slug"
  WHEN 'test-mekani-956198' THEN 'https://konnektora.com/media/covers/place-test-mekani.webp'
  WHEN 'hosbes-394577' THEN 'https://konnektora.com/media/covers/place-hosbes.webp'
  WHEN 'konnektora-hub-berlin-310001' THEN 'https://konnektora.com/media/covers/place-konnektora-hub-berlin.webp'
  ELSE "cover_image_url"
END,
"updated_at" = CURRENT_TIMESTAMP
WHERE "cover_image_url" IS NULL
  AND "slug" IN (
    'test-mekani-956198',
    'hosbes-394577',
    'konnektora-hub-berlin-310001'
  );
