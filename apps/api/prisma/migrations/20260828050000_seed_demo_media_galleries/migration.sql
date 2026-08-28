INSERT INTO "media_files" ("id", "url", "type", "status", "content_type", "content_id", "sort_order", "created_at", "updated_at")
SELECT media."id", media."url", 'image', 'active', 'event', event."id", media."sort_order", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "events" AS event
CROSS JOIN (VALUES
  ('31000000-0000-4000-8000-000000000001', 'https://images.unsplash.com/photo-1511578314322-379afb476865', 0),
  ('31000000-0000-4000-8000-000000000002', 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d', 1),
  ('31000000-0000-4000-8000-000000000003', 'https://images.unsplash.com/photo-1556761175-b413da4baf72', 2),
  ('31000000-0000-4000-8000-000000000004', 'https://images.unsplash.com/photo-1559136555-9303baea8ebd', 3),
  ('31000000-0000-4000-8000-000000000005', 'https://images.unsplash.com/photo-1543269865-cbf427effbad', 4)
) AS media("id", "url", "sort_order")
WHERE event."slug" = 'global-startup-demo-night-420001'
ON CONFLICT ("id") DO UPDATE SET "url" = EXCLUDED."url", "status" = 'active', "content_id" = EXCLUDED."content_id", "sort_order" = EXCLUDED."sort_order", "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "media_files" ("id", "url", "type", "status", "content_type", "content_id", "sort_order", "created_at", "updated_at")
SELECT media."id", media."url", 'image', 'active', 'place', place."id", media."sort_order", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "places" AS place
CROSS JOIN (VALUES
  ('32000000-0000-4000-8000-000000000001', 'https://images.unsplash.com/photo-1497366811353-6870744d04b2', 0),
  ('32000000-0000-4000-8000-000000000002', 'https://images.unsplash.com/photo-1497366754035-f200968a6e72', 1),
  ('32000000-0000-4000-8000-000000000003', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c', 2),
  ('32000000-0000-4000-8000-000000000004', 'https://images.unsplash.com/photo-1524758631624-e2822e304c36', 3),
  ('32000000-0000-4000-8000-000000000005', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f', 4)
) AS media("id", "url", "sort_order")
WHERE place."slug" = 'london-community-studio-310004'
ON CONFLICT ("id") DO UPDATE SET "url" = EXCLUDED."url", "status" = 'active', "content_id" = EXCLUDED."content_id", "sort_order" = EXCLUDED."sort_order", "updated_at" = CURRENT_TIMESTAMP;
