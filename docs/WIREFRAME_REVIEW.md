# Wireframe İnceleme Notları

Kaynak klasör: `/Users/kadirerbakar/Downloads/Images Export v.202606`

İncelenen temsilî ekranlar:

- `03_01_00_00_00-_events_list.png`
- `03_02_01_00_00-_create_event__step_1__basic_info.png`
- `03_03_01_00_00-_event_detail.png`
- `14_02_00_00_00-_sign_up.png`
- `02_01_00_00_00-_tags_home.png`

## Ürün Yorumu

Wireframe seti Konnektora'yı klasik public event directory olarak değil, kapalı veya kontrollü erişimli bir sosyal discovery/community ürünü olarak konumlandırıyor.

Ana modüller:

- Home/discovery
- Tags
- Events
- Places
- Profiles
- Messages
- Notifications
- QR/share/check-in
- Following/mutual hits/guest lists
- Search
- Invite/find friends
- Settings/help
- Onboarding/login/signup

## MVP Kararları

- İlk sürüm kapalı community olacak.
- Başlangıçta kontrollü kullanıcı grubuyla bug ve improvement'lar giderilecek.
- Tüm aktif kullanıcılar etkinlik oluşturabilecek.
- İlk ürün dili İngilizce olacak.
- Lokasyon kapsamı tüm dünya olacak.
- SEO MVP'de öncelikli değil.
- Etkinlik kayıt ve katılım yönetimi Konnektora içinde organizer/kullanıcı tarafından yapılacak.

## Events Çekirdek Akışı

Liste:

- Popular, My attendees, Following, Organizer, All segmentleri.
- Today, This week, This month, All times, Past tarih filtreleri.
- Map/list görünümü.
- Distance ve location filtreleri.
- Search.

Oluşturma:

- Step 1: basic info, event name, start/end date-time, event type, tags, description.
- Step 2: online/offline/hybrid veya adres seçimi.
- Step 3: media ekleme.
- Step 4: organizer bilgisi.

Detay:

- Media gallery.
- Attend ve invite aksiyonları.
- Attendees/invited/following/organizer sayıları.
- Overview/more info.
- Comments.
- Similar events.
- Guest list yönetimi.
- Organizer role management.
- Check-in ve QR scan.
- Report/delete/notification actions.

## Teknik Etki

Mevcut MVP planı şu şekilde güncellendi:

- Event CRUD yalnız admin değil, authenticated user odaklı olacak.
- Event sahibi/organizer permission modeli gerekli.
- Event visibility/type gerekli: open, approval required, invite only.
- EventParticipant modeli gerekli: invited, requested, accepted, declined, banned, attended.
- Event media modeli gerekli.
- Internal attendance guest-list modeli, harici registration URL'den daha öncelikli.
- Kapalı community için auth ve user status modeli gerekli: invited, pending, active, disabled.
- İlk backend karşılığı eklendi: attendance request, invite, participant status update ve check-in endpointleri.
- Seed datasına Startup, Networking, Yatırım ve Founder tag'leri için 16 mock event eklendi; mevcut event list/detail ekranları bu eventlerin detay sayfalarını dinamik gösterir.

## MVP Dışına Alınabilecekler

İlk çekirdeği bitirmek için aşağıdaki modüller sonraki faza bırakılabilir:

- Places tam modülü.
- Messaging.
- Full notification settings.
- QR check-in gelişmiş scan history.
- Contact import: Google, phone book, Facebook.
- Multi-language.
- SEO.
- Public marketing website.
