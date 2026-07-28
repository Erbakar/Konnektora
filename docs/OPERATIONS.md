# Konnektora Operasyon Runbook

## Sağlık ve gözlem

- Liveness: `GET /health/live` yalnızca prosesin yanıt verdiğini gösterir.
- Readiness: `GET /health/ready` veritabanını kontrol eder ve e-posta, SMS, push ve profil doğrulama sağlayıcılarının yapılandırma durumunu döndürür.
- Her API yanıtı `x-request-id` içerir. Uygulama logları aynı kimlikle JSON satırı olarak method, path, durum kodu ve süreyi yazar.
- Alarm önerisi: readiness 5 dakika boyunca başarısız, 5xx oranı 5 dakikada %2 üstü veya p95 süre 2 saniye üstü.

## Bildirim teslimatları

- Admin teslimat listesi: `GET /admin/notifications/deliveries?status=failed`
- Tekrar deneme: `POST /admin/notifications/deliveries/:id/retry`
- `failed` kayıtları için sağlayıcı anahtarı, domain doğrulaması ve VAPID anahtarlarını kontrol edin.
- Push aboneliği kalmayan kullanıcıların teslimatı `skipped` olur; bu bir servis arızası değildir.

## Backup

Günlük Postgres custom-format backup:

```bash
DATABASE_URL="..." BACKUP_DIR="/secure/konnektora" npm run ops:backup
```

Script SHA-256 dosyası üretir, izinleri yalnız çalıştıran kullanıcıya açar ve varsayılan olarak 14 günden eski yerel kopyaları temizler. Backup dosyalarını ayrı hesapta, şifreli object storage üzerinde saklayın. Haftalık tam backup ve en az günlük provider PITR önerilir.

## Restore tatbikatı

Restore yalnızca boş veya bilinçli olarak değiştirilecek hedef veritabanında yapılmalıdır:

```bash
DATABASE_URL="..." BACKUP_FILE="/secure/konnektora/konnektora-....dump" CONFIRM_RESTORE=RESTORE npm run ops:restore
```

Restore sonrasında migration çalışır. Ardından `SMOKE_BASE_URL=https://api.example.com npm run ops:smoke` ve admin giriş kontrolü yapılır. Restore tatbikatını en az üç ayda bir staging ortamında tekrarlayın.

## Incident akışı

1. Etki alanını ve başlangıç zamanını kaydet.
2. Deploy değişikliklerini durdur ve ilgili request ID’leri topla.
3. Veritabanı bütünlüğü riski varsa yazma trafiğini durdur.
4. Son sağlıklı sürüme dön veya doğrulanmış backup’tan restore et.
5. Sağlık, smoke ve kritik kullanıcı akışlarını doğrula.
6. Olay sonrası kök neden, etki, düzeltme ve tekrar önleme aksiyonlarını kaydet.

## Launch checklist

- Production secret’ları platform secret store içinde ve repodan ayrı.
- `JWT_SECRET` en az 32 rastgele byte.
- Resend domaini doğrulandı; test e-postası ulaştı.
- VAPID anahtarları kalıcı olarak kaydedildi; gerçek cihaz push testi geçti.
- SMS ve profil doğrulama sağlayıcıları gerçek ortamda test edildi.
- `npm run db:deploy` başarılı.
- Production seed yalnız `ALLOW_PRODUCTION_SEED=true` ve benzersiz güçlü parolalarla çalıştırıldı.
- İlk backup alındı, checksum doğrulandı ve restore tatbikatı yapıldı.
- Liveness/readiness monitorları ve 5xx alarmı aktif.
- `npm run ops:smoke` production URL’i üzerinde başarılı.
- Admin, KYC, ödeme, mesaj, davet ve QR giriş akışları smoke kontrolünden geçti.
- KVKK/GDPR iletişim, saklama ve silme sorumluları belirlendi.

## Dependency güvenliği

CI, production bağımlılıklarında kritik seviye açığa izin vermez. 28 Temmuz 2026 denetiminde kritik açık yoktur. `react-router` için raporlanan yüksek seviye bulgu RSC server action işleme yolunu etkiler; Konnektora yalnız istemci tarafı `createBrowserRouter` kullanır ve RSC/server action çalıştırmaz. Bu istisna geçicidir: upstream güvenli sürüm yayınlandığında paket yükseltilmeli, her aylık bakımda `npm audit --omit=dev` tekrar incelenmelidir.
