# 30/09 test listesi — uygulama durumu

İnceleme tarihi: 3 Ekim 2026.
Kaynak: https://docs.google.com/spreadsheets/d/1tZdzPN7diSJJR7omUtJJp_bdMWERAICPFI4S2bngHSk/edit?gid=1340438966
Kapsam: bağlantının açtığı **30/09** sekmesindeki 16 dolu madde. 17–21 numaralı satırlar boş. Diğer tarihli sekmeler bu incelemenin kapsamına alınmadı. Kaynak tablo değiştirilmedi.

Değişiklikler yerel çalışma kopyasında uygulanmıştır; canlıya dağıtım yapılmadı.

| Madde | Durum | Yapılan işlem |
| --- | --- | --- |
| 1 | Uygulandı | Katılım yanıtı geldiğinde buton ve katılımcı sayısı hemen güncellenir. Ayrılma sonrası tekrar katılım mümkündür. Onay bekleyen istek geri çekilebilir; ayrılma hatası görünür. |
| 2 | Uygulandı | Mekânlar başlığı, varsayılan Trendy ve Yeni eklenenler seçenekleri. Trendy, son 7 gündeki detay görüntülemelerine göre filtrelenmiş mekânları sıralar; sayfalama sıralamadan sonra yapılır. |
| 3 | Uygulandı | Ortak takipler API analizinden, puanlardan, toplamdan, açıklamadan, önerilerden ve arayüzden çıkarıldı. |
| 4 | Uygulandı | Bağlantının soluna beyaz, kesişen halkalar simgesi eklendi. Animasyon 3 saniye sonra durur ve simge görünür kalır. Azaltılmış hareket tercihi desteklenir. |
| 5 | Kısmen uygulandı | E-posta ve kullanıcı adı geri bildirimleri ayrıldı; gecikmiş cevapların yanlış mesaj göstermesi engellendi. 250 ülke/bölge, Türkiye'nin 81 ili, ülkeye göre yüklenen GeoNames şehir listesi, arama/elle giriş, IP önerisi ve izinli GPS konumu desteği eklendi. Aşağıdaki kapsam sınırları geçerlidir. |
| 6 | Uygulandı | Beğeniyorum, beğenmiyorum ve nötr seçeneklerine ikonlar eklendi. |
| 7 | Uygulandı | Bekleyen kurumsal üyeliğin konum önerisi isteği aktif üyelik isteyen uç noktaya token göndermiyor; bu isteğin yeni oturumu kapatması önlendi. Eski isteğin 401 cevabı yeni token'ı silemez. |
| 8 | Uygulandı | Oturum sahibi değişince sorgu önbelleği temizlenir. Mevcut e-posta veya telefonla kayıt mevcut hesabın bilgilerini/şifresini değiştiremez. Davetli hesaplar doğrulanmış davet bağlantısını kullanır. Telefon doğrulaması başka hesaba ait numarayı reddeder. |
| 9 | Uygulandı | E-posta veya telefon alanı değişince önceki işlem hatası temizlenir. |
| 10 | Uygulandı | Kurumsal doğrulama metni KYB / KYC olarak güncellendi ve /finance/kyc bağlantısı eklendi. |
| 11 | Uygulandı | Başvuru bağlantısı finans sayfasından /settings/business sayfasına KYB / KYC başvurusu butonu olarak taşındı; hedef /finance/kyc. |
| 12 | Uygulandı | Cüzdan ve ödeme ayarları etiketi Fatura ve vergi bilgileri olarak değiştirildi. |
| 13 | Uygulandı | TikTok metni yerine 20 px nota biçimli logo eklendi; erişilebilir bağlantı adı korundu. |
| 14 | Uygulandı | Keşfet, bağlantı kur, birlikte deneyimle bölümüne kontrollü carousel eklendi. Topluluk videosu ve üst bölümdeki ilgi alanı–etkinlik–birlikte katıl görseli arasında geçiş yapılır. Mobilde ikinci slayt görünür kalır. |
| 15 | Uygulandı | Profil etkinlik kartına API'den görünürlük/katılım türü taşınır; genel Etkinlik etiketi yerine Herkese açık / Onay gerekli / Sadece davetli gösterilir. |
| 16 | Uygulandı | Profil mekân kartlarına aynı katılım türü davranışı eklendi. |

## Kalan kapsam ve dış bağımlılıklar

- **Madde 5, dünyanın bütün şehirleri:** GeoNames cities500 kaynağı nüfusu 500 üzerindeki yerleşimler ve belirli idari merkezleri kapsar. Kaynak 208.278 benzersiz ülke–yer adı içeriyor; Türkiye arayüzünde 81 il listeleniyor. Bu, dünyadaki her küçük yerleşimin eksiksiz listesi değildir. Eksik yerler elle yazılabilir. Tam kapsama iddiası için daha kapsamlı veri ve şehir/il/yerleşim tanımının doğrulanması gerekir. Veri projeye alındı; normal şehir seçimi dış servise bağımlı değil. Kaynak/lisans: https://www.geonames.org/export/ ve apps/web/public/data/cities/LICENSE.txt.
- **Madde 5, otomatik konum:** GPS için kullanıcının tarayıcı izni ve HTTPS gerekir. Koordinatı ülke/şehre çevirme Nominatim/OpenStreetMap servisine, IP önerisi altyapının ilettiği coğrafi başlıklara bağlıdır. Bu koşullar yoksa elle seçim çalışır. Gerçek cihaz/üretim IP'siyle test yapılmadı. Sağlayıcı belgesi: https://nominatim.org/release-docs/latest/api/Reverse/.
- **Madde 7–8, canlı doğrulama:** Kod ve regresyon testleri tamamlandı. Gerçek SMS sağlayıcısıyla teslimat ve üretimde art arda iki hesapla uçtan uca kayıt testi yapılmadı; canlı düzeltme doğrulaması dağıtım sonrasında yapılmalıdır.
- **Görsel kontrol (güncellendi):** Uygulama içi tarayıcıdaki engel sonrasında Chrome üzerinden yerel önizleme açıldı. Carousel geçişi, masaüstü görünümü, 390 px mobil görünüm ve alt bilgideki TikTok simgesi görsel olarak doğrulandı. Ekran kayıtları: `tmp/visual-review/carousel-desktop.jpg` ve `tmp/visual-review/carousel-mobile.jpg`. Yerel API bağlantısı (port 3000) kapalı olduğundan veri/oturum gerektiren ekranların görsel kontrolü henüz tamamlanmadı. Önceki bileşen testleri geçerlidir.

## Doğrulama

- API: 36 test dosyası, 278 test geçti.
- Arayüz: mevcut 22 test dosyasındaki 95 test geçti; yeni güvenlik/katılım/konum/carousel senaryolarıyla ilgili test grupları ayrıca geçti (16 ve 7 test).
- TypeScript, lint ve üretim derlemesi başarılı. Derlemede mevcut büyük paket boyutu uyarıları var.
- Kullanıcının önceden mevcut değişiklikleri korunmuştur; çalışma kopyasında commit veya dağıtım yapılmamıştır.
