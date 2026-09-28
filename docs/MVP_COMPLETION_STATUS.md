# MVP Tamamlanma Durumu

Güncel durum: önerilen büyük iş listesi tamamlandı.

## Tamamlanan Başlıklar

- Üye yönetimi
- Admin rol / yetki altyapısı
- CMS temeli
- Duyuru yönetimi
- Policy sayfaları
- Şikayet kuralları
- Şikayet gruplama ve detay
- Ceza / müdahale sistemi
- İlgi alanı detay yönetimi
- Email token akışları
- Kullanıcılardan mesajlar: FAQ, hesap dondurma ve write to us mesajları için public form, admin liste/detay ekranı, okundu/okunmadı yönetimi ve ayrı rol yetkileri

## Deploy Öncesi Zorunlu Kontroller

```bash
nvm use
npm ci
npm run db:generate
npm run db:deploy
npm run build
npm run test
```

Node sürümü 22 olmalı. Bu makinede Node 18 aktifken Prisma CLI native assertion hatası verdi.

## Production Env

```text
DATABASE_URL=...
JWT_SECRET=...
WEB_ORIGIN=https://konnektora.netlify.app
PUBLIC_APP_URL=https://konnektora.netlify.app
VITE_API_URL=https://api-domain
EMAIL_FROM=Konnektora <noreply@mail.konnektora.com>
EMAIL_REPLY_TO=hello@konnektora.com
RESEND_API_KEY=...
GOOGLE_CLIENT_ID=...
VITE_GOOGLE_CLIENT_ID=...
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
VITE_FACEBOOK_APP_ID=...
CURATOR_APPLICATION_EMAIL=curator@konnektora.com
NODE_VERSION=22
```
