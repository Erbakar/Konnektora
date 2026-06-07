# Konnektora EU MVP 0.1/0.2 Proje Planı

Tarih: 2026-06-05

## Bağlam

Bu plan, paylaşılan board başlıklarına göre hazırlanmıştır:

- Konnektora EU MVP 0.1 - Tags USM
- Konnektora EU MVP 0.2 - Events USM
- Konnektora Admin USM
- Konnetkora Pitch-Deck Turkce 20260604

Paylaşılan Figma board'ları ve Google Slides dosyası, tam içerik incelemesi için interaktif tarayıcı erişimi veya oturum gerektiriyor. Bu nedenle aşağıdaki plan, React frontend ve Node.js backend için hazırlanmış pratik bir MVP temel planıdır. Figma/Slides içindeki detaylı user story'ler dışa aktarıldığında plan kolayca güncellenebilir.

## Ürün Hedefi

Konnektora için ilk EU odaklı MVP'yi geliştirmek: kullanıcıların etkinlikleri tag'ler üzerinden keşfedebildiği, kategorize edebildiği ve etkinliklerle etkileşime geçebildiği; adminlerin ise temel taksonomiyi, etkinlik verisini ve operasyonel kaliteyi yönetebildiği bir ürün.

## MVP Kapsamı

### MVP 0.1: Tags

Amaç: keşif, filtreleme, öneri ve admin kürasyonu için gerekli taksonomi katmanını kurmak.

Temel yetenekler:

- Tag oluşturma ve yönetme.
- Tag'leri kategoriye göre gruplama; örnek: sektör, hedef kitle, lokasyon, dil, etkinlik tipi veya ilgi alanı.
- Tag'leri etkinliklere bağlama.
- Tag'e göre arama ve filtreleme.
- Admin kontrolüyle tekrar eden veya düşük kaliteli tag'leri engelleme.
- Tag kullanım sayısını takip etme.

Birincil user story'ler:

- Ziyaretçi olarak, ilgili içerikleri hızlı bulabilmek için etkinlikleri tag'lere göre gezebilmek/filtreleyebilmek istiyorum.
- Kayıtlı kullanıcı olarak, ürünün ileride deneyimimi kişiselleştirebilmesi için ilgi alanlarımı/tag'lerimi seçebilmek istiyorum.
- Admin olarak, taksonominin temiz kalması için tag oluşturabilmek, düzenleyebilmek, birleştirebilmek, pasifleştirebilmek ve silebilmek istiyorum.

### MVP 0.2: Events

Amaç: ana etkinlik keşfi ve etkinlik detay deneyimini sağlamak.

Temel yetenekler:

- Etkinlik listeleme sayfası.
- Etkinlik detay sayfası.
- Admin tarafından etkinlik oluşturma/düzenleme.
- Etkinlik durum yaşam döngüsü: draft, published, cancelled, archived.
- Etkinlik tarih/saat, zaman dilimi, lokasyon, dil, organizatör, kapasite ve harici kayıt URL'si.
- Tag bazlı etkinlik filtreleme.
- Temel etkinlik araması.
- Öne çıkan/yaklaşan etkinlik alanları.

Birincil user story'ler:

- Ziyaretçi olarak, yaklaşan etkinlikleri görebilmek istiyorum.
- Ziyaretçi olarak, etkinlikleri tag, tarih, dil ve formata göre filtreleyebilmek istiyorum.
- Ziyaretçi olarak, etkinlik detay sayfasını açıp kayıt linkini kullanabilmek istiyorum.
- Admin olarak, etkinlik oluşturup yayınlayabilmek istiyorum.
- Admin olarak, etkinliği güncelleyebilmek veya iptal edebilmek istiyorum.

### Admin

Amaç: ekibin MVP'yi doğrudan veritabanına erişmeden yönetebilmesi için yeterli operasyonel kontrol sağlamak.

Temel yetenekler:

- Admin kimlik doğrulama.
- Dashboard özeti: yayınlanan etkinlikler, taslak etkinlikler, aktif tag'ler, yaklaşan etkinlikler.
- Event CRUD.
- Tag CRUD.
- Kullanıcı kaydı MVP'ye dahilse temel kullanıcı listesi.
- Denetim için uygun timestamp ve editör takibi.

İlk MVP dışında bırakılacak alanlar, açıkça gerekli değilse:

- Ödeme alma.
- Karmaşık öneri motoru.
- Native mobil uygulamalar.
- Çok kiracılı organizasyon faturalama yapısı.
- Tam CRM otomasyonu.
- Gelişmiş analytics warehouse.

## Önerilen Teknoloji Stack'i

Frontend:

- Vite ile React.
- TypeScript.
- Routing için React Router.
- Server state yönetimi için TanStack Query.
- Formlar ve validasyon için React Hook Form ve Zod.
- Tasarım tercihine göre Tailwind CSS veya hafif bir component sistemi.

Backend:

- Node.js ile NestJS veya Express/Fastify.
- TypeScript.
- PostgreSQL.
- Prisma ORM.
- Role-based access control ile JWT/session auth.
- Request validasyonu için Zod veya class-validator.

Önerilen seçim:

- Backend'in daha büyük ve modüler bir sisteme dönüşmesi bekleniyorsa NestJS kullan.
- İlk geliştirme hızı ve basitlik daha önemliyse Express/Fastify kullan.

Bu MVP için NestJS + Prisma + PostgreSQL daha güvenli uzun vadeli seçimdir; çünkü admin, events, tags, auth, roller ve ileride gelecek entegrasyonlar modül sınırlarından faydalanır.

Altyapı:

- Local PostgreSQL için Docker Compose.
- Lint/test/build için GitHub Actions.
- Frontend hosting: Vercel veya Netlify.
- Backend hosting: Render, Fly.io, Railway veya ileride AWS ECS.
- Veritabanı: managed PostgreSQL.

## Önerilen Repository Yapısı

```text
apps/
  web/              # React uygulaması
  api/              # Node/NestJS API
packages/
  shared/           # ortak tipler, validasyon şemaları, sabitler
docs/
  PROJECT_PLAN.md
```

En hızlı başlangıç için alternatif:

```text
web/
api/
docs/
```

Ortak tipler ve koordineli deployment ilk günden önemliyse monorepo kullan. Değilse daha basit `web/` ve `api/` ayrımı da yeterli olur.

## İlk Veri Modeli

### User

- id
- email
- name
- role: user, admin, super_admin
- status: active, disabled
- created_at
- updated_at

### Tag

- id
- name
- slug
- description
- category_id
- status: active, hidden, archived
- usage_count
- created_by
- updated_by
- created_at
- updated_at

### TagCategory

- id
- name
- slug
- description
- sort_order
- created_at
- updated_at

### Event

- id
- title
- slug
- summary
- description
- status: draft, published, cancelled, archived
- starts_at
- ends_at
- timezone
- format: online, offline, hybrid
- location_name
- location_address
- city
- country
- language
- organizer_name
- external_registration_url
- cover_image_url
- capacity
- created_by
- updated_by
- created_at
- updated_at

### EventTag

- event_id
- tag_id

## API Yüzeyi

Public:

- `GET /events`
- `GET /events/:slug`
- `GET /tags`
- `GET /tag-categories`

Admin:

- `POST /admin/auth/login`
- `GET /admin/dashboard`
- `GET /admin/events`
- `POST /admin/events`
- `PATCH /admin/events/:id`
- `DELETE /admin/events/:id`
- `GET /admin/tags`
- `POST /admin/tags`
- `PATCH /admin/tags/:id`
- `DELETE /admin/tags/:id`
- `POST /admin/tags/:id/merge`

## Frontend Ekranları

Public uygulama:

- Ana sayfa/yaklaşan etkinlikler.
- Filtreli etkinlik listeleme.
- Etkinlik detayı.
- Kayıt MVP'ye dahilse opsiyonel kullanıcı ilgi alanı seçimi.

Admin uygulaması:

- Login.
- Dashboard.
- Etkinlik listesi.
- Etkinlik oluşturma/düzenleme formu.
- Tag listesi.
- Tag oluşturma/düzenleme formu.
- Tag kategorileri.
- Admin dışında kullanıcı auth'u da varsa temel kullanıcılar sayfası.

## Teslimat Planı

### Faz 0: Ürün ve Tasarım Netleştirme, 2-3 gün

Teslimatlar:

- Figma USM board'larını user story'lere dönüştürme.
- MVP kabul kriterlerini netleştirme.
- Hedef dilleri, ülkeleri, rolleri ve etkinlik kaynaklarını netleştirme.
- Public kullanıcı kaydının MVP'de olup olmadığını netleştirme.
- Marka/design system temelini netleştirme.

### Faz 1: Temel Kurulum, 3-5 gün

Teslimatlar:

- Repository kurulumu.
- React uygulama iskeleti.
- Node API iskeleti.
- PostgreSQL ve Prisma kurulumu.
- CI: lint, typecheck, test, build.
- Environment config.
- Temel deployment pipeline.

### Faz 2: Tags MVP 0.1, 5-8 gün

Teslimatlar:

- Tag ve tag category şeması.
- Admin tag CRUD.
- Public tag listeleme.
- Tag arama/filtreleme desteği.
- Tekrarlayan slug/name oluşturmayı engelleme.
- Tag mantığı için unit/API testleri.

Kabul kriterleri:

- Admin tag oluşturabilir, düzenleyebilir, arşivleyebilir ve silebilir.
- Public uygulama aktif tag'leri çekebilir.
- Tag'lerin stabil slug'ları vardır.
- Tekrarlayan aktif tag oluşturulamaz.

### Faz 3: Events MVP 0.2, 8-12 gün

Teslimatlar:

- Event şeması ve event-tag ilişkisi.
- Admin event CRUD.
- Etkinlik listeleme sayfası.
- Etkinlik detay sayfası.
- Tarih/status/tag filtreleri.
- Published/draft/cancelled yaşam döngüsü.
- Kritik akışlar için API ve frontend testleri.

Kabul kriterleri:

- Admin zorunlu alanlarla etkinlik yayınlayabilir.
- Public kullanıcılar yalnızca yayınlanmış etkinlikleri görür.
- Etkinlik listesi tag/tarih/dil/format filtrelerine göre doğru çalışır.
- Etkinlik detayı kayıt linkini ve temel metadata'yı gösterir.

### Faz 4: Admin Sağlamlaştırma, 4-6 gün

Teslimatlar:

- Admin authentication.
- Role-based guard'lar.
- Dashboard metrikleri.
- Form validasyonu ve hata durumları.
- Denetim alanları: created_by, updated_by.
- Temel seed data.

Kabul kriterleri:

- Admin olmayan kullanıcılar admin endpoint'lerine erişemez.
- Admin formları geçersiz event/tag verilerini engeller.
- Dashboard gerçek veritabanı sayılarını yansıtır.

### Faz 5: QA ve Launch Hazırlığı, 4-7 gün

Teslimatlar:

- End-to-end smoke testleri.
- Responsive UI kontrolü.
- Accessibility kontrolü.
- Production environment kurulumu.
- Veritabanı için backup/restore planı.
- Launch checklist.

Kabul kriterleri:

- Public etkinlik keşfi desktop ve mobile'da çalışır.
- Admin, tüm yaşam döngüsünü geliştirici yardımı olmadan yönetebilir.
- Production build başarılıdır.
- Kritik API route'ları test kapsamındadır.

## Önerilen Milestone'lar

Hafta 1:

- Ürün netleştirme.
- Repo ve altyapı.
- Veritabanı şeması.
- Admin auth temeli.

Hafta 2:

- Tags MVP.
- Admin tag yönetimi.
- Public tag API.

Hafta 3:

- Events API.
- Admin event yönetimi.
- Public etkinlik listeleme/detay.

Hafta 4:

- Dashboard.
- QA.
- Deployment.
- MVP launch düzeltmeleri.

## Ana Riskler

- Figma/Slides user story'leri bu ilk planda yer almayan akışlar içerebilir.
- Public kullanıcı kaydı kapsamı belirgin şekilde büyütebilir.
- Çok dilli içerik veri modelini, routing'i, SEO'yu ve admin iş akışlarını etkileyebilir.
- Etkinlikler manuel girilmeyecekse etkinlik kaynakları/import süreçleri entegrasyon gerektirebilir.
- GDPR gereklilikleri auth, kullanıcı profilleri, analytics ve veri saklama politikalarını etkileyebilir.

## Karar Verilmesi Gereken Konular

- Public kullanıcılar MVP'de hesap oluşturacak mı, yoksa ilk versiyon yalnızca ziyaretçi deneyimi mi olacak?
- Konnektora etkinlik verisi adminler tarafından manuel mi girilecek, import mu edilecek, yoksa organizatörler tarafından mı gönderilecek?
- İlk EU launch'ta hangi ülkeler ve diller olacak?
- Admin panel aynı React uygulamasının içinde mi olacak, yoksa ayrı route/app olarak mı konumlanacak?
- Public etkinlik sayfaları için SEO MVP'de önemli mi?
- Etkinlik kayıtları harici sistemde mi yapılacak, yoksa Konnektora içinde mi yönetilecek?
- Backend yalnızca REST mi sunacak, yoksa GraphQL tercih ediliyor mu?

## Hemen Sonraki Adımlar

1. Figma board'larını ve Slides içeriğini export et veya ekran görüntüsü al.
2. Her USM maddesini kabul kriterleri olan backlog issue'larına dönüştür.
3. Yukarıdaki karar konularını netleştir.
4. Monorepo iskeletini kur.
5. Önce veritabanı şemasını ve tags modülünü implemente et.
