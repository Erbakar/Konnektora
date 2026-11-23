-- 23/11 #51: Profil tamamlama formunda seçilmeyen alanlar "null" metni olarak kaydedilmişti; bunlar gerçek boş değere çevrilir.
UPDATE "users" SET "city" = NULL WHERE "city" IN ('null', 'undefined');
UPDATE "users" SET "country" = NULL WHERE "country" IN ('null', 'undefined');
UPDATE "users" SET "region" = NULL WHERE "region" IN ('null', 'undefined');
UPDATE "users" SET "district" = NULL WHERE "district" IN ('null', 'undefined');
UPDATE "users" SET "website" = NULL WHERE "website" IN ('null', 'undefined', 'https://null');
