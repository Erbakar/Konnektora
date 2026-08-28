UPDATE "cms_categories"
SET
  "name" = 'Üyelik ve hesap ayarları',
  "description" = 'Üyelik ve şifre sıfırlama, e-posta / GSM aktivasyonu konuları içindir.',
  "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = '3c19d046-0e23-46bc-b70c-9ff23cb4bc30'
   OR "slug" = 'uyelik-ve-hesap-ayarlari';

INSERT INTO "report_rules" (
  "id", "target_type", "title", "description", "violation_score", "status", "created_at", "updated_at"
)
VALUES
  ('30000000-0000-4000-8000-000000000001', 'event', 'Ayrımcılık ve nefret söylemi', 'Bir kişi veya grubu korunan özellikleri nedeniyle hedef alan, aşağılayan ya da dışlayan etkinlik içeriklerine izin verilmez.', 40, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('30000000-0000-4000-8000-000000000002', 'event', 'Yanıltıcı etkinlik bilgisi', 'Tarih, konum, ücret, organizatör veya etkinlik içeriği hakkında kullanıcıyı yanıltan bilgi yayınlanamaz.', 20, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('30000000-0000-4000-8000-000000000003', 'place', 'Güvenli olmayan mekân', 'Katılımcıların fiziksel güvenliğini tehlikeye atan veya gerçeğe aykırı güvenlik bilgisi paylaşan mekânlar bildirilebilir.', 35, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('30000000-0000-4000-8000-000000000004', 'post', 'Spam ve istenmeyen tanıtım', 'Tekrarlayan, ilgisiz, yanıltıcı veya topluluk deneyimini bozan ticari içeriklere izin verilmez.', 10, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('30000000-0000-4000-8000-000000000005', 'private_message', 'Taciz ve tehdit', 'Özel mesajlarda ısrarlı taciz, tehdit, korkutma veya hedef gösterme yasaktır.', 50, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('30000000-0000-4000-8000-000000000006', 'user', 'Sahte kimlik ve taklit', 'Başka bir kişi, marka veya kuruluş gibi davranarak kullanıcıları yanıltan hesaplara izin verilmez.', 30, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "target_type" = EXCLUDED."target_type",
  "title" = EXCLUDED."title",
  "description" = EXCLUDED."description",
  "violation_score" = EXCLUDED."violation_score",
  "status" = EXCLUDED."status",
  "updated_at" = CURRENT_TIMESTAMP;
