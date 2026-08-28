# 157 maddelik gereksinim denetimi

> **Durum: devam ediyor.** Bu belge nihai “tamamlandı” raporu değildir. Sağlayıcı/cihaz kabulü bekleyen maddeler kapalı gösterilemez. 133. maddede bugün için açıkça istenen “Muhasebe & Finans” yetki kutusu mevcuttur; parantez içinde geleceğe bırakılan ekranların kapsamı ise ayrıca tanımlanmadan tamamlanmış sayılmayacaktır.

Bu belge, “ekranı var” ile “gereksinim tamamlandı” ifadelerini birbirinden ayırmak için tutulur. Bir madde ancak ilgili arayüz, servis/veri modeli, hata davranışı ve uygulanabilir doğrulamalar birlikte karşılandığında tamamlanmış sayılır.

## Durum anahtarı

- **Kod + test doğrulandı:** Uygulama karşılığı incelendi; tip kontrolü, lint, üretim derlemesi ve ilgili API testleri geçti.
- **Tarayıcı doğrulandı:** Yerel uygulamada gerçek gezinme ve erişilebilirlik ağacı üzerinden açıldığı doğrulandı.
- **Canlı/cihaz doğrulaması bekliyor:** Kod mevcut olsa da gerçek sağlayıcı, iki fiziksel cihaz, kamera/NFC veya production migration gerektiriyor.
- **Bloke:** Kullanıcıya/sağlayıcıya ait bir production bilgisi olmadan tamamlanamaz.

## Mevcut doğrulama özeti

| Maddeler | Durum | Kanıt / kalan işlem |
| --- | --- | --- |
| 1–46 | Kod + test doğrulandı; SMS canlı doğrulaması bekliyor | Navigasyon, topluluk, tag kullanıcıları, standart post aksiyonları, detay kartları, medya/profil, istatistikler, mutualism, detay açılma, katılım, şifre sıfırlama, embed, sabit slug, davet ve kullanıcı aksiyonları incelendi. Ana ve detay rotaları tarayıcıda açıldı. Telefonla şifre sıfırlamanın gerçek gönderimi için production SMS sağlayıcısı gerekiyor. |
| 47 | Canlı/cihaz doğrulaması bekliyor | QR/NFC üye taraması iki kullanıcıya da hedef profil bildirimini gönderiyor; iki fiziksel cihazla son kabul testi gerekiyor. |
| 48–54 | Canlı/cihaz doğrulaması bekliyor | Kamera/NFC tarama, pasaport önizleme, kabul/ret, hedef cihaza sonuç, bilet iadesi ve yakın öneriler kod/test ile doğrulandı. Gerçek kamera, NFC ve iki cihaz testi gerekiyor. |
| 55–66 | Kod + API + UI testi doğrulandı; deploy bekliyor | Düzenleme formunun dolması, opsiyonel program zamanı, dikey ekleme aksiyonları, düğmeyle sıralama, ücretsiz bilet, yalnız onaylı etkinlikte pending sayımı, bağlı masaüstü/mobil tooltip, arama-tag oluşturma, show-more, program etiketleri, küratör URL doğrulaması ve rapor kapsamı doğrudan davranış testleriyle doğrulandı. |
| 67 | **Bloke** | Google Contacts kodu ve çoklu e-posta/telefon seçimi mevcut. Canlı web paketinde `VITE_GOOGLE_CLIENT_ID` yok; API tarafında da eş OAuth kimliği production ortamına eklenmeli ve Google People API/izin ekranı yapılandırılmalı. |
| 68–100 | Kod + test doğrulandı; SMS canlı doğrulaması bekliyor | Yerel popülerlik fallback’i, harita/adres, mekân oluşturma, bilet sınırı/platformu, mobil bilet sheet’i, aktif/pasif bilet, gizlilik, onboarding, discovery widget’ları, tag-event ilişkisi, ilgili kullanıcılar, harita, etiket sırası, mekân etkinlikleri, takip/yorum ve davet yönetimi incelendi. Telefon numarasına gerçek davet gönderimi için production SMS sağlayıcısı gerekiyor. |
| 101–107 | Canlı/cihaz doğrulaması bekliyor | Mekân kamera/NFC, 10’lu listeler, arama, yatay A4 yazdırma/PDF akışı, pasaport ve hedef cihaz sonucu kod/test ile doğrulandı. Gerçek kamera, NFC ve iki cihaz testi gerekiyor. |
| 108–134 | Kod + test doğrulandı | Öneri kartları, mobil header/footer/scroll, profil, ana sayfa metinleri/duyuru, keşif widget’ları, destek ayrımı, admin kategori/FAQ/post/kural/yetki/özel mesaj ve finans yetkileri incelendi. |
| 135 | Kod + test doğrulandı; platform kısıtı kayıtlı | Bildirim açma ekranında takvime ekleme seçeneği `.ics` ve desteklenen cihazlarda paylaşım sayfasını kullanır. Web tarayıcısı varsayılan takvime kullanıcı onayı olmadan doğrudan kayıt yapamaz. |
| 136–157 | Kod + test doğrulandı | Bildirim kapatma, activity log, ilgili kullanıcı aksiyonları, medyasız metin zorunluluğunun kaldırılması, ipuçları/kolaj, medya galerileri, görünürlük geçişleri, inline tag oluşturma, paylaşım/QR/Instagram kartı, haritalar, event widget’ları, hata görünürlüğü, rapor tasarımı ve bilet devri incelendi. |

## Otomatik kontroller

- API testleri: **34 suite / 246 test geçti**. Sosyal servis için yeni üyeler sırası, 200 kayıt sınırı, engel hariç tutma, takip ve ortak ilgi bağlamına ek olarak küratör özgeçmiş URL doğrulaması kapsandı.
- Web etkileşim testleri: **5 suite / 31 test geçti**. Önceki akışlara ek olarak etkinlik düzenleme/program, ücretsiz bilet, pending bağlantısı, uzun açıklama, program etiketi, takipçi tooltip'i, boş arama ve küratör başvurusu doğrudan kullanıcı etkileşimiyle doğrulandı.
- Check-in pasaportunda erişilebilir Guest List adlarının A–Z sıralanmaması yeni UI testinde yakalandı ve düzeltildi. Etkinlik/mekân listelerinde 10’ar kayıt, arama, bilet/gate, geçmiş, QR/NFC yöntemi, pasaport, “zaten içeride” kilidi, kabul/ret ve taranan kullanıcı sonuç ekranları regresyon kapsamına alındı.
- Shared, API ve web TypeScript kontrolleri: geçti.
- API ve web lint: geçti.
- Shared, API ve web production build: geçti.
- Prisma şema doğrulaması: geçti.
- Bağımlılık güvenlik denetimi: **0 açık**. 28 Ağustos 2026 tarihli yüksek seviye duyurular için güvenli yama sürümleri kilit dosyaya işlendi ve tüm kontroller yeniden geçti.
- Web paketleri rota ve sağlayıcı bazında bölündü; önceki yaklaşık 604 KB ana paket kaldırıldı. Güncel ana uygulama paketi yaklaşık **46 KB** (gzip yaklaşık **14 KB**); QR ve PDF kütüphaneleri yalnız ilgili işlem açıldığında yüklenir.
- Yerel ana rotalar TR ve EN olarak tarandı; kaçak arayüz dili bulunmadı. İngilizce görünümde kalan Türkçe satırlar yalnız demo içerikleridir.
- `/events` 15 kart/sayfa, masaüstü üç kolon ve ikinci sayfadaki tek kartın sabit genişliği tarayıcıda doğrulandı.
- Güncel etkinlik ve mekân kartı bağlantıları detay sayfalarını açtı.
- Canlı `/api/health/ready`, `/api/events` ve `/api/places` istekleri 28 Ağustos 2026 tarihinde HTTP 200 döndürdü.
- `09fbd3b` sürümü için GitHub CI `33136284661` başarıyla tamamlandı ve Railway deployment `6aa86435-e45f-4650-818f-cbada2cbbed2` başarılı oldu.
- `dfa50a3` doğrulama sürümü için GitHub CI `33136932847` başarıyla tamamlandı ve Railway deployment `3ebc40cc-4034-4c67-b8e4-3efa45b04276` başarılı oldu. Canlı açık/oturumlu smoke paketleri yeniden geçti.
- `9244893` check-in doğrulama/düzeltme sürümü için GitHub CI `33137608767` başarıyla tamamlandı ve Railway deployment `5aceca11-3f3b-42db-b519-36347c039ffe` başarılı oldu. Canlı etkinlik ve mekân pasaportları hedef türü, kullanıcı, medya, davetçi, Guest List, bilet ve içeride durumu alanlarıyla doğrulandı.
- Canlı herkese açık kabul testi sağlık, 15 kayıtlık etkinlik sayfası, dinamik etkinlik detayı, ikinci sayfa, mekân listesi/detayı, çift dilli duyurular ve SSS uçlarını doğruladı.
- Canlı oturumlu kabul testi admin kullanıcı/CMS/içerik/activity-log, etkinlik katılımcı-davet-bilet-istatistik-pasaport, mekân üye-davet-istatistik ve üye profil/etkinlik/bilet/finans akışlarını doğruladı. Uygun paketi olmayan test üyesinde Guest List'in `403` dönmesi beklenen yetki davranışı olarak ayrıca doğrulandı.
- Canlı tarayıcıda konum tanıtımı izin vermeden “Şimdi değil” ile kapatıldı. `/events` sayfalaması gerçek düğme tıklamasıyla 2. sayfaya geçti; tek kart 279 px genişlikte kaldı ve 1. sayfaya dönüşte 15 kart üç kolona geri döndü. 390 px mobil görünümde yatay taşma olmadı.
- Canlı etkinlik bilgi penceresi açılıp kapandı. İlgili etkinlikler masaüstünde 3 sütun (8 kartta 3+3+2), 390 px mobilde tek sütun gösterildi; yatay taşma ve tarayıcı konsol hatası bulunmadı.

## Açık dış bağımlılıklar ve tamamlanan canlı kapılar

1. Google OAuth web/API istemci kimliğini ve People API iznini production ortamına ekle.
2. Gerçek telefon daveti ve telefonla şifre sıfırlama için `SMS_WEBHOOK_URL` ile `SMS_API_KEY` değerlerini production ortamına ekle.
3. QR/NFC/kamera, ses/titreşim ve iki cihaz akışlarını desteklenen fiziksel cihazlarda kabul testine al.
4. Kalıcı VAPID anahtar çifti production ortamında mevcuttur; in-app ve push hazırlığı dış bağımlılık sayılmaz.
5. CI, production build/deploy, herkese açık ve oturumlu canlı smoke testleri tamamlandı.
