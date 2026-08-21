-- Keep onboarding interests backed by real database records. The web app's
-- bundled demo tags are only a visual fallback and cannot be persisted.
INSERT INTO "tag_categories" ("id", "name", "slug", "sort_order", "created_at", "updated_at")
VALUES
  ('4b3b8fa0-5f2d-4eed-8f2a-1cb8f7fbf101', 'Sektör', 'sektor', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('4b3b8fa0-5f2d-4eed-8f2a-1cb8f7fbf102', 'Format', 'format', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('4b3b8fa0-5f2d-4eed-8f2a-1cb8f7fbf103', 'Hedef Kitle', 'hedef-kitle', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "tags" ("id", "name", "slug", "description", "category_id", "created_at", "updated_at")
VALUES
  (
    '6c9b8fa0-5f2d-4eed-8f2a-1cb8f7fbf201',
    'Startup',
    'startup',
    'Yeni ürünler geliştiren girişim ekipleri, erken aşama büyüme ve pazara çıkış deneyimleri.',
    (SELECT "id" FROM "tag_categories" WHERE "slug" = 'sektor'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    '6c9b8fa0-5f2d-4eed-8f2a-1cb8f7fbf202',
    'Networking',
    'networking',
    'Ortak hedefleri olan profesyonellerle tanışma, bağlantı kurma ve iş birliği fırsatları.',
    (SELECT "id" FROM "tag_categories" WHERE "slug" = 'format'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    '6c9b8fa0-5f2d-4eed-8f2a-1cb8f7fbf203',
    'Yatırım',
    'yatirim',
    'Yatırım hazırlığı, fonlama süreçleri, yatırımcı görüşmeleri ve finansman stratejileri.',
    (SELECT "id" FROM "tag_categories" WHERE "slug" = 'sektor'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    '6c9b8fa0-5f2d-4eed-8f2a-1cb8f7fbf204',
    'Founder',
    'founder',
    'Kurucuların ürün, ekip, liderlik ve şirket kurma yolculuğundaki deneyim paylaşımları.',
    (SELECT "id" FROM "tag_categories" WHERE "slug" = 'hedef-kitle'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("slug") DO NOTHING;
