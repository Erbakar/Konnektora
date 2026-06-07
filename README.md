# Konnektora

Konnektora EU MVP başlangıç projesi. Bu repo React frontend, Node/NestJS backend, Prisma ve PostgreSQL ile planlanan Tags + Events + Admin MVP kapsamını başlatır.

## Yapı

```text
apps/
  web/      # React + Vite frontend
  api/      # NestJS + Prisma backend
packages/
  shared/   # Ortak Zod şemaları ve TypeScript tipleri
docs/
  PROJECT_PLAN.md
```

## Gereksinimler

- Node.js 22+
- npm 10+ veya uyumlu bir package manager
- Docker

Projede `.nvmrc` dosyası vardır. Local terminalde Node 18 aktifse önce Node 22'ye geç:

```bash
nvm install
nvm use
```

## İlk Kurulum

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
npm install
docker compose up -d
npm run db:generate
npm run db:migrate
npm run db:seed
```

Seed sonrası admin kullanıcısı:

```text
email: admin@konnektora.local
password: ChangeMe123!
```

## Geliştirme

API:

```bash
npm run dev -w apps/api
```

Web:

```bash
npm run dev -w apps/web
```

Varsayılan adresler:

- Web: `http://localhost:5173`
- API: `http://localhost:3000`
- PostgreSQL: `localhost:5432`

## MVP Akışları

İlk sürümde eklenenler:

- Public event listeleme: `GET /events`
- Public event detay: `GET /events/:slug`
- Aktif kullanıcı login: `POST /auth/login`
- Aktif kullanıcı event oluşturma: `POST /events`
- Event katılımcı listesi: `GET /events/:id/participants`
- Event attendance request: `POST /events/:id/attend`
- Event invite: `POST /events/:id/invite`
- Participant status update: `PATCH /events/:id/participants/:userId`
- Participant check-in: `POST /events/:id/participants/:userId/check-in`
- Public tag listeleme: `GET /tags`
- Public tag category listeleme: `GET /tag-categories`
- Admin event CRUD endpoint iskeleti
- Admin tag CRUD endpoint iskeleti
- Admin login endpoint iskeleti
- Admin endpointleri için JWT guard
- Admin dashboard, tag oluşturma/arşivleme ve event oluşturma/arşivleme UI başlangıcı
- Admin tag ve event düzenleme UI başlangıcı
- Admin işlemlerinde `created_by` / `updated_by` audit bağlantısı
- Event status hızlı güncelleme: draft, published, cancelled, archived
- Event katılım tipi: open, approval required, invite only
- Event participant ve media veri modeli başlangıcı
- Event-tag değişikliklerinde tag kullanım sayısı güncelleme
- Seed içinde her ana tag için 4 mock event ve detay sayfası datası
- Prisma veri modeli ve seed data

## Sonraki Teknik Adımlar

1. Kapalı community invite/approval modelini kesinleştir.
2. Guest list UI ekranını bağla.
3. Event owner/organizer permission kontrollerini daha ayrıntılı test et.
4. Admin formlarına daha ayrıntılı hata mesajları ve loading state'leri ekle.
5. API testlerini ve frontend smoke testlerini genişlet.
