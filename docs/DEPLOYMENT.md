# Konnektora Deployment

Bu rehber Netlify frontend + Render backend + Render PostgreSQL düzeni içindir.

## Mimari

```text
Netlify Web
  VITE_API_URL=https://konnektora-api.onrender.com
      |
      v
Render Web Service: NestJS API
  DATABASE_URL=postgresql://...
      |
      v
Render PostgreSQL
```

## 1. PostgreSQL Oluştur

Render dashboard içinde yeni PostgreSQL servisi oluştur.

Not alman gereken değer:

```text
Internal Database URL veya External Database URL
```

API Render üzerinde aynı workspace/project içinde çalışacağı için genelde internal URL tercih edilir. Local bilgisayardan bağlanman gerekiyorsa external URL kullanılır.

## 2. API Web Service Oluştur

Render'da yeni Web Service aç ve GitHub repo'yu bağla.

Root directory boş kalabilir çünkü repo monorepo olarak root'tan kuruluyor.

Build command:

```bash
npm ci && npm run db:generate && npm run build -w packages/shared && npm run build -w apps/api
```

Start command:

```bash
npm run db:deploy && npm run start -w apps/api
```

Environment variables:

```text
DATABASE_URL=<Render PostgreSQL connection string>
JWT_SECRET=<uzun-random-secret>
WEB_ORIGIN=https://konnektora.netlify.app
PUBLIC_APP_URL=https://konnektora.netlify.app
EMAIL_FROM=Konnektora <noreply@your-domain.com>
RESEND_API_KEY=<resend-api-key>
NODE_ENV=production
```

Render kendi `PORT` değerini sağlar. Bu yüzden ayrıca `PORT` tanımlamak zorunda değilsin.

`EMAIL_FROM` ve `RESEND_API_KEY` tanımlı değilse API üyelik/davet akışlarını bozmaz; gönderilecek e-postaları Render loglarına dev mail olarak yazar.

## 3. İlk Seed

API deploy tamamlandıktan sonra Render Shell veya one-off job üzerinden seed çalıştır:

```bash
npm run db:seed
```

Bu işlem admin kullanıcısını, demo user'ı, tag'leri ve başlangıç mock event datasını oluşturur.

Admin:

```text
email: admin@konnektora.local
password: ChangeMe123!
```

Production'a geçmeden admin şifresi ve seed stratejisi değiştirilmeli.

## 4. Netlify Frontend Ayarı

Netlify site settings içinde Environment variables alanına API URL'ini ekle:

```text
VITE_API_URL=https://konnektora-api.onrender.com
```

Sonra Netlify deploy'u yeniden çalıştır.

Bu değişiklikten sonra frontend mock mode yerine gerçek API'ye bağlanır. Adminin eklediği `Published` event'ler PostgreSQL'e kaydedilir ve herkes için `/events` listesinde görünür.

## 5. Kontrol Listesi

- `https://konnektora-api.onrender.com/events` JSON dönüyor mu?
- Netlify build log'unda `VITE_API_URL` doğru mu?
- Admin login çalışıyor mu?
- Admin panelde yeni event `Published` olarak kaydediliyor mu?
- `/events` sayfasında yeni event görünüyor mu?
- Render API logs içinde CORS veya database hatası var mı?

## 6. Sık Hatalar

### Netlify'da event görünmüyor

`VITE_API_URL` eksik veya Netlify deploy'u env ekledikten sonra yeniden çalışmamış olabilir.

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
