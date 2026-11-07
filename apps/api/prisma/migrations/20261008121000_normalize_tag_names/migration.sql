-- Match the application's Turkish lowercase rule for existing display names.
-- Slugs and all relationships remain unchanged.
UPDATE "tags"
SET "name" = lower(replace(replace("name", 'I', 'ı'), 'İ', 'i'))
WHERE "name" <> lower(replace(replace("name", 'I', 'ı'), 'İ', 'i'));
