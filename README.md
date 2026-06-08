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

## Netlify Test Deploy

Netlify sadece React/Vite frontend'i host eder. Node/NestJS API ayrıca Render, Railway, Fly.io veya benzeri bir servise deploy edilmelidir.

Frontend canlı ortamda `VITE_API_URL` verilmezse public event listeleme, event detay, tag filtreleri ve admin event oluşturma mock data ile çalışır. Admin demo modunda veriler tarayıcı `localStorage` alanına yazılır; aynı cihaz/tarayıcıda görünür, başka kullanıcılara ortak database gibi yansımaz.

Demo modunda `/admin` ekranına aşağıdaki bilgilerle veya herhangi bir email/şifreyle girilebilir:

```text
email: admin@konnektora.local
password: ChangeMe123!
```

Admin formunda `Published` durumuyla kaydedilen etkinlikler public event listesinde görünür. `Draft` kayıtlar sadece admin listesinde kalır.

Gerçek backend deploy edildikten sonra Netlify Environment variables içine şunu ekle:

```text
VITE_API_URL=https://api-domainin.com
```

Sonra Netlify deploy'unu yeniden çalıştır. Backend CORS ayarında da Netlify domain'i izinli olmalıdır:

```text
WEB_ORIGIN=https://konnektora.netlify.app
```

## MVP Akışları

İlk sürümde eklenenler:

- Public event listeleme: `GET /events`
- Public event detay: `GET /events/:slug`
- Aktif kullanıcı login: `POST /auth/login`
- Aktif kullanıcı kayıt: `POST /auth/register`
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
- Kullanıcı üyelik/giriş ve event oluşturma UI
- Kullanıcı profilinde ilgi alanı/tag seçimi
- Profil ilgi alanlarının PostgreSQL'e kalıcı kaydı
- Event detayında kullanıcı Attend akışı
- Admin/organizer guest list görüntüleme, kabul/ret, ban ve check-in UI
- Organizer email ile kullanıcı davet etme ve invited kullanıcı oluşturma akışı
- Event listelemede tag, format ve dil filtreleri
- Event-tag değişikliklerinde tag kullanım sayısı güncelleme
- Seed içinde her ana tag için 4 mock event ve detay sayfası datası
- Prisma veri modeli ve seed data

## Sonraki Teknik Adımlar

1. Event owner/organizer permission kontrollerini daha ayrıntılı test et.
2. Arama, tarih ve lokasyon filtrelerini genişlet.
3. Profil ve event akışları için API testlerini genişlet.
4. Frontend smoke testlerini ekle.
5. Production email gönderimi ve davet kabul ekranını ekle.
