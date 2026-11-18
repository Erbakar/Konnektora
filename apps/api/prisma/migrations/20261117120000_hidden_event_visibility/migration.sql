-- 17/10 #14: "Gizli - sadece davetliler görebilir" etkinlik katılım tipi.
-- Yalnız enum değeri eklenir; mevcut kayıtlar değişmez.
ALTER TYPE "EventVisibility" ADD VALUE IF NOT EXISTS 'hidden';
