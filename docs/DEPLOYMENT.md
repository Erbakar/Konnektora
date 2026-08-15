# Konnektora Deployment

Bu rehber iki production yolunu kapsar:

1. Netlify frontend + Netlify Function API + Netlify Database/Postgres
2. Netlify frontend + Render backend + Render PostgreSQL

## Sosyal sağlayıcılar ve rehber

API ortamında `GOOGLE_CLIENT_ID`, web build ortamında aynı OAuth istemcisine ait `VITE_GOOGLE_CLIENT_ID` tanımlanmalıdır. Google Cloud'da People API etkinleştirilmeli ve izin ekranına `contacts.readonly` kapsamı eklenmelidir. Facebook için web ortamında `VITE_FACEBOOK_APP_ID`, API ortamında `FACEBOOK_APP_ID` ve `FACEBOOK_APP_SECRET` tanımlanır; API access token'ını Graph API üzerinden uygulama kimliğiyle doğrular. Production ve preview origin'leri iki sağlayıcının izin verilen JavaScript origin listesine eklenmelidir.

Telefon rehberi seçimi HTTPS ve Contact Picker API destekleyen mobil tarayıcı gerektirir. Ham rehber verisi yalnızca eşleştirme isteği boyunca işlenir ve saklanmaz; davet denetim kayıtlarında sadece alıcı bilgisinin SHA-256 özeti tutulur. E-posta davetleri mevcut Resend ayarlarını, SMS davetleri `SMS_WEBHOOK_URL` ve `SMS_API_KEY` ayarlarını kullanır.

## Profil fotoğrafı doğrulama

Production ortamında `FACE_VERIFICATION_URL` yüz eşleşmesi ve canlılık kontrolü yapan sağlayıcının webhook adresine, `FACE_VERIFICATION_API_KEY` ise sağlayıcı anahtarına ayarlanır. Yüz ve canlılık skoru 0.90 üzerindeyse profil otomatik onaylanır; 0.65 altındaysa reddedilir, aradaki sonuçlar admin inceleme kuyruğuna düşer. Kamera kanıtları public `uploads` dizininden ayrı tutulur ve yalnızca `media.manage` yetkili admin endpoint'i üzerinden okunur. Sağlayıcı yapılandırılmamış production kurulumlarında başvurular güvenli biçimde manuel incelemeye aktarılır.

## QR ve NFC cihaz desteği

QR tarama tarayıcının kamera API'sini ve ZXing decoder'ını kullanır. Web NFC okuma/yazma Android Chrome tabanlı tarayıcılarda kullanılabilir; desteklenmeyen iOS veya masaüstü cihazlarda QR ve manuel kart verisi fallback'i gösterilir. Kamera ve NFC production ortamında HTTPS gerektirir. NFC etiketine kişisel veri değil, sürümlenebilir ve iptal edilebilir imzalı üye kartı URI'si yazılır; kullanıcı kartını yenilediğinde eski QR ekran görüntüleri ve NFC kayıtları backend tarafından reddedilir.

## Mimari

```text
Netlify Web
  /api/*
      |
      v
Netlify Function: NestJS API
  DATABASE_URL=postgresql://...
      |
      v
Netlify Database / Postgres
```

Harici backend kullanılacaksa `VITE_API_URL=https://konnektora-api.onrender.com` gibi bir değerle `/api` default'u override edilebilir.

## 1. Netlify Full-Stack Kurulum

Repo `netlify.toml` içinde `/api/*` isteklerini `netlify/functions/api.cjs` fonksiyonuna yönlendirir. Build sırasında API de derlenir.

Netlify Environment variables:

```text
DATABASE_URL=<opsiyonel harici Postgres connection string>
JWT_SECRET=<uzun-random-secret>
WEB_ORIGIN=https://konnektora.netlify.app
PUBLIC_APP_URL=https://konnektora.netlify.app
NODE_VERSION=22
NODE_ENV=production
VITE_MOCK_API=false
VITE_API_URL=/api
EMAIL_FROM=Konnektora <noreply@your-domain.com>
RESEND_API_KEY=<resend-api-key>
SMS_WEBHOOK_URL=<sms-provider-https-endpoint>
SMS_API_KEY=<sms-provider-api-key>
VAPID_SUBJECT=mailto:support@your-domain.com
VAPID_PUBLIC_KEY=<web-push-public-key>
VAPID_PRIVATE_KEY=<web-push-private-key>
ALLOW_PRODUCTION_SEED=false
```

API production modunda eksik `DATABASE_URL`, `JWT_SECRET`, origin, e-posta veya SMS ayarıyla başlamaz. Böylece aktivasyon ve GSM doğrulaması sessizce devre dışı kalmış bir sürüm yayına alınamaz.

Web Push anahtarlarını bir kez `npx web-push generate-vapid-keys` komutuyla üretin. Aynı anahtar çiftini kalıcı olarak saklayın; anahtar değişirse mevcut tarayıcı abonelikleri yeniden oluşturulmalıdır.

Netlify Database aktif edildiğinde connection string `@netlify/database` üzerinden sağlanır. API runtime bunu otomatik `DATABASE_URL` fallback'i olarak kullanır; harici Postgres kullanılmayacaksa `DATABASE_URL` manuel tanımlamak gerekmez.

Build sırasında Netlify Database connection string'i alınabiliyorsa Prisma migration otomatik çalışır. İlk seed için Netlify Functions tek başına iyi bir one-off job ortamı değildir. En pratik seçenek lokalden veya Netlify CLI ile production database URL'ine karşı çalıştırmaktır:

```bash
NETLIFY_DB_URL="<production-postgres-url>" npm run db:seed
```

Kontrol:

```text
https://konnektora.netlify.app/api/health
https://konnektora.netlify.app/api/events
```

## 2. Render Blueprint ile Backend + PostgreSQL

Repo kökünde `render.yaml` vardır. Render Dashboard'da **New > Blueprint** seçip GitHub repo'yu bağladığında Render iki kaynak oluşturur:

- `konnektora-api`: NestJS API web service
- `konnektora-db`: PostgreSQL database (`basic-256mb`)

Blueprint `DATABASE_URL` değerini database connection string'den otomatik alır, `JWT_SECRET` değerini de otomatik üretir. Health check path `/health` olarak ayarlanmıştır.

Not: Render PostgreSQL `basic-256mb` ücretli olabilir. Blueprint'i deploy etmeden önce Render plan/fiyat ekranını kontrol et.

Beklenen API URL:

```text
https://konnektora-api.onrender.com
```

Eğer Render servis URL'ini farklı verirse Netlify'da `VITE_API_URL` ile override et.

## 3. Manuel Render Kurulumu Gerekirse

Render'da yeni Web Service aç ve GitHub repo'yu bağla.

Root directory boş kalabilir çünkü repo monorepo olarak root'tan kuruluyor.

Build command:

```bash
npm ci && npm run db:generate && npm run build -w packages/shared && npm run build -w apps/api
```

Start command:

```bash
npm run start -w apps/api
```

Environment variables:

```text
DATABASE_URL=<Render PostgreSQL connection string>
JWT_SECRET=<uzun-random-secret>
WEB_ORIGIN=https://konnektora.netlify.app
PUBLIC_APP_URL=https://konnektora.netlify.app
EMAIL_FROM=Konnektora <noreply@your-domain.com>
RESEND_API_KEY=<resend-api-key>
NODE_VERSION=22
NODE_ENV=production
```

Pre-deploy command:

```bash
npm run db:deploy
```

Render kendi `PORT` değerini sağlar. Bu yüzden ayrıca `PORT` tanımlamak zorunda değilsin.

`EMAIL_FROM` ve `RESEND_API_KEY` tanımlı değilse API üyelik/davet akışlarını bozmaz; gönderilecek e-postaları Render loglarına dev mail olarak yazar.

Önemli: Repo `Node.js >=22` ister. Localde veya Render build sırasında Node 18 kullanılırsa Prisma CLI native hatalar verebilir. Render'da `NODE_VERSION=22` tanımlı olmalı; localde `.nvmrc` için `nvm use` çalıştır.

## 4. İlk Seed

API deploy tamamlandıktan sonra Render Shell veya one-off job üzerinden seed çalıştır:

```bash
npm run db:seed
```

Bu işlem admin kullanıcısını, demo user'ı, tag'leri ve başlangıç mock event datasını oluşturur.

Lokal geliştirme admini:

```text
email: admin@konnektora.local
password: ChangeMe123!
```

Production seed varsayılan olarak kapalıdır. Bilinçli seed sırasında `ALLOW_PRODUCTION_SEED=true`, en az 14 karakterlik benzersiz `SEED_ADMIN_PASSWORD` ve `SEED_DEMO_PASSWORD` zorunludur. Seed tamamlandıktan sonra bu secret'ları ortamdan kaldırın.

## 5. Netlify Frontend Ayarı

Frontend production build varsayılan olarak şu API adresini dener:

```text
/api
```

Render servis URL'i veya başka harici API kullanılacaksa Netlify site settings içinde Environment variables alanına API URL'ini ekle:

```text
VITE_API_URL=https://konnektora-api.onrender.com
VITE_MOCK_API=false
```

Sonra Netlify deploy'u yeniden çalıştır.

Bu değişiklikten sonra frontend mock mode yerine gerçek API'ye bağlanır. Adminin eklediği `Published` event'ler PostgreSQL'e kaydedilir ve herkes için `/events` listesinde görünür.

Backend henüz hazır değilken Netlify demo için `VITE_MOCK_API=true` kullanılabilir. Bu modda kayıtlar tarayıcı `localStorage` alanında kalır ve ortak database'e yazılmaz.

## 6. Kontrol Listesi

- `https://konnektora.netlify.app/api/health` `{ ok: true }` dönüyor mu?
- `/api/health/live` ve `/api/health/ready` monitorları aktif mi?
- `https://konnektora.netlify.app/api/events` JSON dönüyor mu?
- `https://konnektora-api.onrender.com/health` `{ ok: true }` dönüyor mu?
- `https://konnektora-api.onrender.com/events` JSON dönüyor mu?
- Netlify build log'unda `VITE_API_URL` doğru mu?
- Admin login çalışıyor mu?
- Admin panelde yeni event `Published` olarak kaydediliyor mu?
- `/events` sayfasında yeni event görünüyor mu?
- `/verify-email`, `/reset-password`, `/accept-invite` token sayfaları frontend'de açılıyor mu?
- API logs içinde email gönderimleri için Resend hatası veya dev mail logu görünüyor mu?
- Render API logs içinde CORS veya database hatası var mı?
- `SMOKE_BASE_URL=https://konnektora.netlify.app/api npm run ops:smoke` başarılı mı?
- İlk şifreli backup alındı ve staging restore tatbikatı tamamlandı mı?

## 7. Sık Hatalar

### Netlify'da event görünmüyor

`VITE_API_URL` eksik, `VITE_MOCK_API=false` iken API deploy edilmemiş veya Netlify deploy'u env ekledikten sonra yeniden çalışmamış olabilir.

### API CORS hatası veriyor

API `WEB_ORIGIN` değeri Netlify domain'i ile birebir aynı olmalı:

```text
WEB_ORIGIN=https://konnektora.netlify.app
```

### Database tablosu bulunamadı

Migration çalışmamıştır. Render start command içinde şu komut olmalı:

```bash
npm run db:deploy && npm run start -w apps/api
```

### Admin kullanıcı yok

Seed çalışmamıştır:

```bash
npm run db:seed
```
