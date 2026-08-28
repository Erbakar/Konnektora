ALTER TABLE "announcements"
  ADD COLUMN "title_en" TEXT,
  ADD COLUMN "body_en" TEXT;

UPDATE "announcements"
SET
  "title" = 'Şehrindeki doğru etkinlikleri daha kolay keşfet',
  "body" = 'Etkinlikler sayfasını daha düzenli ve hızlı bir keşif deneyimi sunacak şekilde yeniledik. Sana uygun buluşmaları artık tek bakışta inceleyebilirsin.',
  "title_en" = 'Discover the right events in your city, faster',
  "body_en" = 'We redesigned the Events page to make discovery clearer and faster. You can now review the most relevant gatherings at a glance.'
WHERE LOWER("title") LIKE '%ikinci bir duyuru%'
   OR LOWER("title") LIKE '%bir duyuru basligidir%';

UPDATE "announcements"
SET
  "title_en" = COALESCE("title_en", 'Community update'),
  "body_en" = COALESCE("body_en", 'There is a new update in the Konnektora community.')
WHERE "title_en" IS NULL OR "body_en" IS NULL;
