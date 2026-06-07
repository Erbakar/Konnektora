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

Amaç: kapalı community içindeki aktif kullanıcıların etkinlik keşfetmesini, oluşturmasını ve kendi katılımcı/kayıt süreçlerini yönetmesini sağlamak.

Temel yetenekler:

- Etkinlik listeleme sayfası.
- Etkinlik detay sayfası.
- Aktif kullanıcı tarafından etkinlik oluşturma/düzenleme.
- Event owner/organizer yönetimi.
- Etkinlik durum yaşam döngüsü: draft, published, cancelled, archived.
- Event katılım tipi: open, approval required, invite only.
- Etkinlik tarih/saat, zaman dilimi, lokasyon, dil, organizatör, kapasite, medya ve dahili katılım yönetimi.
- Guest list, invite, approval/decline ve attendance state yönetimi.
- Tag bazlı etkinlik filtreleme.
- Temel etkinlik araması.
- Harita görünümü ve lokasyon/distance filtreleri.
- Öne çıkan/yaklaşan etkinlik alanları.

Birincil user story'ler:

- Aktif kullanıcı olarak, yaklaşan etkinlikleri görebilmek istiyorum.
- Aktif kullanıcı olarak, etkinlikleri tag, tarih, dil, format ve lokasyona göre filtreleyebilmek istiyorum.
- Aktif kullanıcı olarak, etkinlik detay sayfasını açıp attend/invite aksiyonlarını kullanabilmek istiyorum.
- Aktif kullanıcı olarak, etkinlik oluşturup yayınlayabilmek veya taslakta tutabilmek istiyorum.
- Organizer olarak, davetlileri ve katılımcıları kabul/ret/ban/check-in durumlarıyla yönetebilmek istiyorum.
- Admin olarak, etkinlikleri ve kullanıcı üretimi içeriği modere edebilmek istiyorum.

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
- visibility: open, approval_required, invite_only
- location_name
- location_address
- city
- country
- latitude
- longitude
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

### EventParticipant

- id
- event_id
- user_id
- status: invited, requested, accepted, declined, banned, attended
- role: attendee, organizer, manager
- checked_in_at
- created_at
- updated_at

### EventMedia

- id
- event_id
- url
- type
- sort_order
- created_at

## API Yüzeyi

Public:

- `POST /auth/login`
- `GET /events`
- `GET /events/:slug`
- `POST /events`
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

- Kapalı community ana sayfası/yaklaşan etkinlikler.
- Filtreli etkinlik listeleme.
- Harita görünümü ve lokasyon/distance filtreleri.
- Etkinlik detayı.
- Etkinlik oluşturma çok adımlı akış: temel bilgi, adres, medya, organizer.
- Guest list, invite, attend/request ve organizer yönetimi.
- Kullanıcı ilgi alanı/tag seçimi.

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
- Kapalı community davet/erişim modelini netleştirme.
- İngilizce içerik ve tüm dünya lokasyon kapsamını netleştirme.
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
- Aktif kullanıcı event CRUD.
- Organizer/owner event management.
- Guest list ve attendance state modeli.
- Etkinlik listeleme sayfası.
- Etkinlik detay sayfası.
- Tarih/status/tag filtreleri.
- Published/draft/cancelled yaşam döngüsü.
- Kritik akışlar için API ve frontend testleri.

Kabul kriterleri:

- Aktif kullanıcı zorunlu alanlarla etkinlik oluşturabilir.
- Kapalı community dışındaki kullanıcılar uygulama içeriğine erişemez.
- Etkinlik listesi tag/tarih/dil/format filtrelerine göre doğru çalışır.
- Etkinlik detayı attend/invite/guest list temel akışlarını destekler.
- Seed ortamında her ana tag için 3-4 mock etkinlik ve detay datası bulunur.

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
- Kapalı community ve kullanıcı event oluşturma modeli auth, moderation ve permission kapsamını büyütür.
- Guest list, invite, approval ve check-in akışları event modülünü basit CRUD'dan operasyonel yönetime taşır.
- Çok dilli içerik ilerleyen faza bırakıldı; ileride veri modelini, routing'i, SEO'yu ve admin iş akışlarını etkileyebilir.
- GDPR gereklilikleri auth, kullanıcı profilleri, analytics ve veri saklama politikalarını etkileyebilir.

## Karara Bağlanan Konular

- İlk versiyon açık public site değil, kapalı community olarak ilerleyecek.
- Başlangıçta community kontrollü tutulacak; bug ve improvement'lar kapalı kullanıcı grubuyla giderilecek.
- Tüm aktif kullanıcılar etkinlik oluşturabilecek.
- İlk launch dili İngilizce olacak.
- Lokasyon kapsamı EU ile sınırlı değil, tüm dünya olacak.
- SEO MVP'de öncelikli değil; web app ve multi-language modülü ilerleyen fazlarda ele alınacak.
- Etkinlik kayıt/katılımcı yönetimi Konnektora içinde kullanıcı/organizer tarafından yönetilecek.
- Wireframe kapsamı events yanında tags, profiles, messages, notifications, QR/check-in, places ve settings modüllerini de gösteriyor; MVP kesimi bu modüllerin tamamını değil, events/tags/auth/guest-list çekirdeğini kapsayacak.

## Açık Kalan Konular

- Kapalı community üyeliği invite-only mi, admin approval mı, yoksa ikisi birlikte mi olacak?
- Facebook/Google login MVP'ye dahil mi, yoksa email/phone ile mi başlayacağız?
- Phone/GSM verification MVP'de gerçek SMS sağlayıcıyla mı çalışacak, yoksa mock/manual approval yeterli mi?
- Places modülü MVP kapsamına dahil mi, yoksa events sonrasındaki faz mı?
- Check-in QR akışı MVP'de gerekli mi, yoksa guest-list yönetiminden sonraki faz mı?
- Backend REST ile devam edecek mi, yoksa ileride GraphQL ihtimali korunacak mı?

## Hemen Sonraki Adımlar

1. Figma board'larını ve Slides içeriğini export et veya ekran görüntüsü al.
2. Her USM maddesini kabul kriterleri olan backlog issue'larına dönüştür.
3. Kapalı community üyelik modelini netleştir.
4. Kullanıcı auth + event owner/organizer permissions modelini tamamla.
5. Guest list ve internal attendance akışlarını uygulamaya al.
