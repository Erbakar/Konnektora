# Google ve Facebook üyelik kurulumu

## 5 Ekim 2026: güncel yayın ve başvuru durumu

- Kullanıcı iş telefonu ve posta kodunu iletti. Özel iletişim bilgileri bu belgeye kopyalanmadı.
- Meta Business Suite güvenlik merkezinde Erbakar Yazılım şirket doğrulaması `Değerlendirmede` görünüyor; ekran yaklaşık iki iş günü değerlendirme süresi bildiriyor. Bu çalışmada şirket doğrulamasının son gönderimi yapılmadı; gönderilmiş mevcut durum gözlendi. Bu durum Facebook Login App Review gönderildiği anlamına gelmez.
- Kullanıcının 5 Ekim onayıyla App Review taslağındaki `email` ve `public_profile` kullanım beyanlarının iki `I agree` kutusu onaylanıp kaydedildi. Her iki izin ekranında artık `Edit` görünüyor; beyanlar kaydedilmiş durumda. Başvuru özetindeki `Submit for review` düğmesi diğer adımlar nedeniyle hâlâ kapalı; başvuru gönderilmedi.
- Railway `b9d39d2b-9ed6-4ec6-97b3-0cd18594ec84` SUCCESS ile canlıda. Veri silme formu takip numarası ve sunucudaki kayıt tarihinden hesaplanan 30 günlük yanıt son gününü gösterir; yönetim mesajlarında aynı son gün ve inceleme kontrol listesi bulunur. Onboarding'de çıkış ve başka hesapla devam düğmesi eklendi.
- Canlı TR/EN veri silme metinleri, Google ile açılmış pending oturumdan yeni düğmeyle çıkış ve giriş ekranına yönlendirme doğrulandı. Sağlık uç noktası veritabanı hazır, Google/Facebook sunucu yapılandırması etkin, SMS sağlayıcısı kapalı gösterdi. İlgili 12 test, web typecheck/lint geçti.
- Yeni canlı Facebook popup'ı `Giriş Değerlendirmesine Gönder` uyarısını ve kapalı `Kadir Olarak Devam Et` düğmesini gösteriyor. Facebook girişinin başarılı olduğu söylenemez; uygulama incelemesi hâlâ tamamlanmadı. Eski popup'ın süresi dolduğu için çıkan hatayla karıştırılmamalı.
- Eksik sağlayıcı işlem/uzaktan erişim ülke listeleri ve başarılı Facebook giriş kanıtı tamamlanmadan başvuru hazır kabul edilmemeli. Aşağıdaki 4 Ekim kayıtları tarihsel durumu anlatır; güncel durum bu bölümdür.

### Kamu kurumu veri talepleri için yeni süreç taslağı

Kullanıcı daha önce yazılı süreç bulunmadığını ve son 12 ayda talep/veri paylaşımı olmadığını bildirdi. Aşağıdaki süreç yeni hazırlanmıştır; geçmişte uygulanmış gibi Meta'ya beyan edilmemelidir. İşletme tarafından yürürlüğe alınması ve fiilen uygulanması gerekir.

1. Gelen talebi, alınış tarihini, talep eden kurumu, resmi iletişim kanalını ve dosya referansını erişimi kısıtlı bir kayıt altında tutun. Talebi inceleme sorumlusu Kadir Erbakar'a iletin; başvuru sahibine veya üçüncü kişilere kullanıcı verisi açıklamayın.
2. Kurumun ve talebin gerçekliğini bağımsız resmi iletişim bilgileri üzerinden doğrulayın. Hukuki dayanak, yetki, istenen veri kapsamı ve yanıt süresini inceleyin; belirsiz veya tartışmalı talepler için hukuki danışmanlık alın. E-posta gönderen adına güvenerek veri paylaşmayın.
3. Talebin gerekliliğini ve kapsamını değerlendirin; uygunsuz veya fazla kapsamlı bölümleri açıklığa kavuşturun ve gerektiğinde daraltılmasını isteyin. Veriyi yalnız belgelenen yetki ve gerekli kapsam içinde hazırlayın; ilgisiz kullanıcı kayıtlarını eklemeyin.
4. Paylaşım öncesi gerekçe, veri alanları, alıcı ve aktarım kanalını kayıt altına alın. Güvenli aktarım kullanın, yetkisiz alıcılara erişim vermeyin; bildirim yükümlülüklerini ve varsa bildirim kısıtlarını hukuki inceleme kapsamında değerlendirin.
5. İnceleme sonucunu, onay/ret gerekçesini, yapılan açıklamayı ve aktarım kanıtını kayıt altında tutun. Bu kayıtlar kaynak koda, halka açık sayfalara veya Meta'nın serbest metin alanlarına eklenmemelidir.

## 5 Ekim 2026: veri silme taleplerinin işletilmesi

Sorumlu işletme Erbakar Yazılım Teknolojileri Ticaret Anonim Şirketi; işletme adına takip Kadir Erbakar tarafından yapılır. Talep kanalları halka açık `/data-deletion` formu ve kayıtlı gizlilik iletişim adresidir. Form otomatik silme işlemi yapmaz.

1. Yönetim panelinde Mesajlar → Write to us bölümünü günlük kontrol edin; kategori `Veri silme talebi` ile süzün. E-posta kanalındaki talepleri de aynı takip çizelgesinde kaydedin. Kayıt kimliği takip numarasıdır; yanıt son günü başlangıçtan 30 takvim günüdür. Sürenin hesabı, eksik bilgi talebi nedeniyle kendiliğinden yeniden başlatılmamalıdır.
2. Gönderenin yalnız e-posta adresini yazmış olması sahiplik kanıtı değildir. İlgili hesap e-postasının kontrolünü veya o hesaba ait doğrulanmış oturumu teyit edin; e-posta yanıtı gerektiğinde hesabın kayıtlı adresini kullanın. Şifre istemeyin. Doğrulanmamış bir taleple silme yapmayın; ilgisiz hesapların varlığını açıklamayın. Aynı e-postadaki birden çok kayıt/sağlayıcı varsa kapsamı açıkça doğrulayın.
3. Kapsamı `account`, `facebook` veya `google` olarak belirleyin. Sosyal hesap kaydı `social_accounts` tablosunda sağlayıcı kimliği, e-posta, görünen ad ve fotoğraf adresi içerir. Bağlantı kaldırma bu kaydı kaldırır; kullanıcı profilindeki kopyalanmış ad/e-posta/fotoğraf, içerikler ve diğer kayıtlar ayrıca incelenmelidir. Tam hesap talebini yalnız bağlantı kaldırma veya `frozen`/`deleted` durum değişikliğiyle tamamlandı saymayın.
4. Tam hesap taleplerinde profil, fotoğraf/dosya yüklemeleri, hesap doğrulama kayıtları, iletişim/destek kayıtları, paylaşımlar, mesajlar, katılım/bilet ve ödeme kayıtları, audit/loglar ile sağlayıcılardaki kopyaları envantere alın. Diğer kullanıcıların kayıtlarını veya ortak etkinlikleri gelişigüzel silmeyin. Her veri grubu için silme, anonimleştirme veya saklama kararı ve gerekçesini kaydedin; hukuken saklanması gereken mali/uyuşmazlık kayıtları hakkında kesin süreyi işletme teyit etmelidir.
5. Teknik işlem öncesinde doğru hesap/sağlayıcı, beklenen satır ve dosya kapsamı ile geri döndürülemez işlem yetkisini kontrol edin. Hesaba özgü doğrulanmış silme talebi olmadan üretimde toplu SQL, kalıcı hesap veya dosya silme çalıştırmayın. Bu çalışma sırasında gerçek kullanıcı verisi silinmemiştir. Kodda tam hesaba ait bütün veri gruplarını otomatik temizleyen bir işlev henüz yoktur; teknik inceleme ve uygulama manuel yürütülür.
6. Altyapı kopyaları için Railway/Cloudflare/Resend saklama ve silme koşullarını kontrol edin; ilgili sağlayıcıdaki işlemin sonucunu vaka kaydına ekleyin. Yedekten geri yükleme yapılırsa tamamlanmış silme taleplerini tekrar uygulamadan sistemi kullanıcıya açmayın. Bütün yedeklerin aynı gün silindiğini veya doğrulanmamış süreleri kullanıcıya vaat etmeyin.
7. Kullanıcıya en geç 30 gün içinde yazılı/elektronik sonuç iletin: takip numarası, doğrulanan kapsam, yapılan işlem, saklanan veri varsa nedeni/kapsamı ve kalan sağlayıcı işlemleri. Alındı mesajı veya panelde `read` durumu işlemin bittiğini kanıtlamaz. Yanıt metni ve teknik sonuç kaydı saklanmadan vaka tamamlandı sayılmamalıdır. Panelde şu an ayrı kapanış durumu bulunmadığından vaka sonuçlarını işletmenin erişimi sınırlı takip çizelgesinde tutun; hassas içeriği Git'e veya herkese açık belgelere koymayın.

Yanıt süresi dayanağı: [KVKK'nın başvuruların cevaplanmasına ilişkin güncel duyurusu](https://www.kvkk.gov.tr/Icerik/9024/ilgili-kisilerin-basvurularina-verilecek-cevabin-bildirim-usulune-iliskin-kamuoyu-duyurusu).

### Sağlayıcı ülke beyanı için doğrulananlar

| Sağlayıcı | İşlev | Doğrulanan yer bilgisi | Tamamlanması gereken |
| --- | --- | --- | --- |
| Railway Corporation | Uygulama/veri barındırma; sunucu yapılandırması ve Meta uygulama anahtarı | Üretim uygulaması SFO bölgesinde; DPA ana işlem operasyonlarının ABD'de olduğunu bildiriyor. | Destek/personel uzaktan erişim ülkelerinin eksiksiz listesi teyit edilmedi. |
| Plus Five Five, Inc. (Resend) | Uygulama e-postaları | Güvenlik belgesi depolamanın ABD'de olduğunu, e-posta gönderim bölgesinin depolama bölgesini değiştirmediğini bildiriyor. | Personel erişimi ve kullanılan gönderim bölgesinin ülke kapsamı teyit edilmeli. |
| Cloudflare | Proxy, trafik dağıtımı ve güvenlik | Genel ağ küreseldir; varsayılan trafik işleme uygun veri merkezine yönlendirilir. | Bu hesap için Platform Data'nın işlenebileceği ülkeler/global ağ kapsamı teyit edilmeli. |

Kaynaklar: [Railway DPA](https://railway.com/legal/dpa), [Resend security](https://resend.com/security), [Cloudflare HTTP privacy](https://developers.cloudflare.com/data-localization/regional-services/http-requests/). Merkez ofis ülkesini veya sunucu bölgesini tüm işlem/uzaktan erişim ülkeleri gibi Meta formuna yazmayın. Sağlayıcılara teyit mesajı bu çalışma kapsamında gönderilmedi.

## 4 Ekim 2026: canlı yayın

### Sayfa denetimi ve resmi şirket bilgileri

- Meta App Review ekranında `Not submitted` görüldü; `email` ve `public_profile` taslağı mevcut, son gönderim düğmesi doğrulama ve diğer adımlar tamamlanmadığı için kapalı. Önceki talimat kaydı bir başvuru gönderimi değildir.
- Kullanıcının sağladığı vergi levhasından resmi unvan/adres doğrulandı; belge, vergi numarası ve mali bilgiler kaynak koda veya yayın paketine eklenmedi. İşletme: Erbakar Yazılım Teknolojileri Ticaret Anonim Şirketi, Türkiye.
- Kullanıcı son 12 ayda ulusal güvenlik talebi gelmediğini/veri paylaşmadığını ve yazılı süreç henüz bulunmadığını belirtti. Meta veri işleme taslağında şirket unvanı, Türkiye, paylaşım için No ve süreçler için None of the above kaydedildi. İş telefonu bekleniyor.
- Türkçe/İngilizce kullanım koşulları ve gizlilik açıklaması genişletildi; gerçek veri kategorileri, hesap/profil amaçları, Railway/Cloudflare/Resend hizmetleri, uluslararası işleme olasılığı, tarayıcı depolaması, başvuru ve silme ayrımı belirtildi. Kesin saklama/yanıt süresi veya tamamlanmış mevzuat uyumu beyan edilmedi. Eski CMS koşullarının yeni metni gizlemesi için regresyon düzeltmesi/testi eklendi; 4 Ekim veya sonrasındaki yeni CMS yayını yine kullanılabilir.
- Meta sağlayıcı formu tüm işlem ve uzaktan erişim ülkelerini ister. Yalnız ana barındırma bölgesini tüm ülke listesi gibi göstermek doğru değildir; eksiksiz sağlayıcı ülke teyidi hâlâ açık.
- İşletme doğrulaması Türkiye ve özel şirket adımlarına kadar hazırlandı. Belge yükleme/gönderme yapılmadı.
- Tam unvan ve belgedeki iş adresi doğrulama formuna girildi; sonraki adım posta kodunu gerektiriyor. İş telefonu ve posta kodu kullanıcıdan bekleniyor. Vergi levhasının geçici görüntüsü silindi; kullanıcının orijinal belgesi korundu.
- Son sayfa sürümü Railway `4918a43f-e837-45aa-aedd-fb690e8580cd` ile SUCCESS durumunda canlıya çıktı. `/terms` yeni tam metni, `/privacy` şirket/sağlayıcı/saklama/depolama açıklamalarını gösteriyor. TR/EN ek açıklamalar kontrol edildi. `/privacy`, `/terms`, `/data-deletion`, `/api/health/ready` anonim erişimde HTTP 200; ilgili 6 web testi, web typecheck/lint ve uzak derleme geçti.

- Kullanıcının yayın onayıyla mevcut Railway Konnektora production hizmetine dağıtım yapıldı. Proje: `7d077c8a-c1ca-4407-be91-8f9a8d4a10c0`; hizmet: `b5696264-c51d-460a-89f8-04e4c698ce23`. Eski `.netlify/state.json` canlı ortamı göstermiyor; bu yayın için Netlify kullanılmadı.
- İlk dağıtım: `9871f78c-d328-497f-982a-7a93416313eb`. Canlı site/API/veritabanı, etkinlik ve mekân listesi/detayı, duyuru ve SSS kontrolleri geçti.
- Google istemcisi üretimde zaten aynı kimlikle ayarlıydı. Facebook uygulama kimliği ve sunucu anahtarı Railway production değişkenlerine güvenli biçimde eklendi. Web/API kimlikleri ve anahtarın yerel ayarla eşleşmesi değerleri yazdırılmadan doğrulandı.
- `.railwayignore` dosyasına geçici dosyalar, özel yüklemeler ve ortam dosyaları eklendi. Test görselleri ve yerel sır dosyaları yayın paketine dahil edilmez.
- Canlı `/data-deletion` formunda sentetik `release-test@example.com` adresi ve açıkça gerçek silme talebi olmadığı belirtilen yayın testi kaydı oluşturuldu. HTTP 201 ve ekrandaki alındı onayı doğrulandı; hiçbir hesap/veri silinmedi.
- `https://konnektora.com/data-deletion` Meta temel ayarlarına **Data deletion instructions URL** olarak kaydedildi; panel yeniden yüklenerek kalıcı kayıt doğrulandı.
- Meta inceleyen kişi talimatlarına Facebook SDK, sunucudaki debug_token ve /me doğrulaması, yalnız public_profile/email kullanımı ve onboarding akışı açıklaması taslak olarak kaydedildi. İnceleme başvurusu gönderilmedi.
- İlk canlı Google testi sağlayıcı doğrulamasında HTTP 201 döndü; ancak AccountPage'in pending kullanıcı için aktif üye sorguları başlatması oturumu 401 yanıtlarıyla kapatıyordu. Sorgular aktif üyelerle sınırlandı, pending veya eksik onboarding hesabı hesap panelleri oluşturulmadan onboarding'e yönlendirildi. Bu geçişte oturumun korunmasına ilişkin regresyon testi eklendi ve geçti. Düzeltme dağıtımı: `f23abc07-7e03-4608-9224-e0f4693ea1a4`.
- Facebook canlı giriş penceresi `Kadir Olarak Devam Et` aşamasına ulaştı; gerçek hesabın ad/profil resmi/e-posta paylaşımı için kullanıcı onayı bekleniyor. Uygulama hâlâ unpublished olduğundan bu geliştirici hesabı testi genel kullanıcı erişiminin kanıtı sayılmaz.
- Düzeltme dağıtımı SUCCESS durumunda tamamlandı. Canlı Google girişi gerçek hesapla yeniden doğrulandı: e-posta doğrulanmış halde onboarding %33 / telefon adımı açıldı ve sayfa yenilendiğinde oturum korundu. Telefon ve profil tamamlama testi yapılmadı; üretimde SMS sağlayıcısı henüz bağlı değil, kod oluşturma modu kullanılıyor. Son canlı sağlık ve içerik kontrolleri de geçti.
- Meta şirket doğrulaması resmi şirket bilgilerini; veri işleme bölümü kamu kurumu talepleri geçmişi/süreçlerine dair kullanıcı beyanını ve sağlayıcıların işlem/uzaktan erişim ülkelerinin teyidini bekliyor. Bu alanlarda tahmini beyan girilmedi.

## 4 Ekim 2026: başvuru hazırlığı

Bu bölüm yayın öncesi hazırlık kaydıdır; güncel dağıtım durumu yukarıdaki canlı yayın bölümündedir.

- `/data-deletion` halka açık veri silme yönergesi ve talep formu eklendi. Giriş gerektirmez. Talep mevcut `/messages` uç noktası üzerinden `write_to_us` / `Veri silme talebi` olarak yönetim panelindeki mesajlara kaydedilir. Form otomatik hesap silmez; destek görevlisi hesap sahipliğini doğrulamalı ve silme sonucunu kullanıcıya iletmelidir. Dondurma ve bağlantıyı kaldırmanın tam silme olmadığı açıkça belirtilir.
- Gizlilik sayfasına mevcut kodda işlenen hesap/profil bilgileri ve sosyal giriş veri açıklaması eklendi; Google/Facebook kimliği, ad, e-posta, profil resmi URL'si ve kullanım amacı belirtilir. CMS'de yayınlanmış metin varsa sosyal giriş açıklaması ona ek olarak görünür. Bu geliştirme şirketin ayrıntılı veri işleme/saklama koşullarının hukuken tamamlandığı anlamına gelmez; resmi şirket bilgileri, hizmet sağlayıcılar ve saklama uygulaması ayrıca netleştirilmeli.
- Üyeliği tamamlanmamış hesapların gizlilik, koşullar, veri silme ve destek sayfalarından onboarding'e zorla yönlendirilmesi düzeltildi.
- Meta başvuru ekranı doğrulama, uygulama ayarları, izin kullanımı, veri işleme ve inceleyen kişi talimatları istiyor. `Submit for review` hâlâ devre dışı; başvuru gönderilmedi.
- Değişiklikler yereldir. Canlıya dağıtım ve ortam değişkenlerinin barındırma sistemine kurulması, ardından gerçek HTTPS Facebook testi tamamlanmalı. Yalnızca yayına çıktıktan ve halka açık URL doğrulandıktan sonra Meta User Data Deletion alanına `https://konnektora.com/data-deletion` yönerge URL'si kaydedilmeli.
- Erbakar Yazılım için resmi kayıtlı unvan, ülke, iş adresi ve iş telefonu kullanıcıdan bekleniyor; belge ve kimlik/vergi numaraları sohbete istenmedi.

### Başvuruya eklenecek test akışı

1. HTTPS Konnektora sitesinde Kayıt ol veya Giriş yap ekranını açın ve Facebook düğmesine basın.
2. Facebook giriş penceresinde `public_profile` ve `email` izinlerini verin. Uygulama bunları yalnızca üyelik oluşturmak ve sonraki girişlerde hesabı tanımak için kullanır.
3. Yeni hesap telefon doğrulama ve profil tamamlama ekranına gelir. Var olan bağlı hesap aynı üyeye giriş yapar. E-posta başka bir Konnektora hesabına aitse önce o hesaba giriş ve Ayarlar üzerinden bağlama gerekir.
4. Ayarlar → Hesap → Bağlı hesaplar bölümünde bağlantıyı görüntüleyin veya kaldırın. `/data-deletion` sayfası giriş olmadan talep kabul eder.

Bu akış henüz Meta'ya başarılı Facebook testinin kanıtı olarak sunulamaz: HTTPS üzerinde gerçek Facebook hesabıyla test ve kaydı eksik. İnceleme sırasında telefon doğrulaması/profil adımlarına erişim için uygun test düzeni hazırlanmalı; gerçek kullanıcı şifresi paylaşılmamalı. Veri işleme formunda barındırma sağlayıcıları ve saklama/silme uygulaması doğrulanmadan yanıt verilmemeli.

## 3 Ekim 2026 durumu

Geliştirici hesabı Kadir Erbakar’a aittir. Konnektora diğer projeden ayrı bir Meta uygulamasıdır. Erbakar Yazılım, projelerin arkasındaki ve fatura kesecek işletmedir. Kullanıcının açıklaması doğrultusunda Konnektora HubPixel portföyüne bağlanmadı; Erbakar Yazılım adına ayrı işletme portföyü oluşturuldu (`2538081006658394`). Konnektora doğrulama ekranı bu portföyü gösteriyor. Resmi işletme doğrulaması henüz tamamlanmadı.

- Mevcut Google projesi: `konnektora-prod-2026-keb`; istemci: Konnektora Web Production. Yerel API/web ayarlarına bağlandı. `http://localhost:5173` üzerinden gerçek Google hesabıyla üyelik ve sunucu doğrulaması başarılı; üye telefon/profil tamamlama adımında. `127.0.0.1` bu istemcinin izinli adresleri arasında değil; test için localhost kullanın.
- Meta uygulaması oluşturuldu: `1121792046918019`, Konnektora, Facebook Login. İletişim adresi kadirerbakar@hotmail.com. Alan adı, gizlilik/koşul adresleri ve sosyal ağ kategorisi kaydedildi.
- Google geliştirici iletişim adresi Hotmail olarak kaydedildi. Destek adresi mevcut Google hesabı kadirerbakar@gmail.com olarak kaldı; panel Hotmail adresini seçenek olarak sunmuyor.
- Meta genel yayın için işletme doğrulaması ve uygulama incelemesi istiyor. Ayrıca gerçek gizlilik metni ve veri silme yönergesi gerekiyor. Yayındaki `/privacy` sayfası henüz yalnızca yer tutucu metin gösteriyor; bu durum tamamlanmış gizlilik politikası sayılmamalı.
- Meta `email` izni eklendi (Ready for testing); JavaScript SDK girişi yalnızca `https://konnektora.com/` için etkinleştirildi. Website platformu ve 1024 × 1024 mevcut marka ikonu kaydedildi. HTTPS zorunluluğu açık; Facebook uçtan uca testi uygun HTTPS ortamında henüz yapılmadı.
- Facebook App ID yerel web/API ayarlarına, App Secret yalnızca git dışında tutulan sunucu `.env` dosyalarına yazıldı. Dosyalar yalnızca dosya sahibi tarafından okunabilir.
- Üretim ortamına kod/ortam değişkenleri henüz dağıtılmadı.
- İlgili API/güvenlik testleri: 35 başarılı; ilgili web testleri: 14 başarılı. Typecheck, lint ve üretim derlemesi başarılı (mevcut büyük paket boyutu uyarıları devam ediyor).


Kod, sağlayıcı hesabını doğruladıktan sonra yeni üyeyi telefon doğrulaması ve profil tamamlama akışına alır. Bağlı hesaplar tekrar giriş yapabilir. Aynı e-postayla mevcut hesap varsa önce o hesaba giriş yapılmalı ve Ayarlar üzerinden sosyal hesap bağlanmalıdır.

## Google

1. Google Cloud Console'da projeyi oluşturun; Google Auth Platform bölümünde uygulama adı, destek e-postası ve izin ekranını hazırlayın.
2. Web application türünde OAuth istemcisi oluşturun.
3. Authorized JavaScript origins listesine `http://localhost:5173`, `http://127.0.0.1:5173` ve kullanılan gerçek HTTPS site kök adresini ayrı ayrı ekleyin. Yol veya `/api` eklemeyin.
4. İstemci kimliğini kök `.env` içindeki `GOOGLE_CLIENT_ID` ve `apps/web/.env` içindeki `VITE_GOOGLE_CLIENT_ID` alanlarına aynı değer olarak yazın. Bu akış Google client secret gerektirmez.
5. Test modunda gerekiyorsa test kullanıcılarını ekleyin; genel kullanıma açarken izin ekranı/yayın durumunu tamamlayın.

Google resmi yönergesi: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid

## Facebook

1. Meta for Developers üzerinde uygulama oluşturun ve Facebook Login kullanımını ekleyin.
2. Web platformu, gerçek site adresi ve uygulama alan adını tanımlayın. JavaScript SDK girişini etkinleştirin, izin verilen SDK alanlarına kullanılan site alan adını ekleyin.
3. App ID değerini kök `.env` içindeki `FACEBOOK_APP_ID` ve `apps/web/.env` içindeki `VITE_FACEBOOK_APP_ID` alanlarına yazın.
4. App Secret değerini yalnızca sunucunun `.env` dosyasındaki `FACEBOOK_APP_SECRET` alanına yazın. VITE değişkenine veya kaynak koda yazmayın.
5. Test kullanıcılarına uygulama rolü verin. Genel erişim için Meta panelinin istediği gizlilik politikası, veri silme bilgileri, yayın ve varsa izin inceleme adımlarını tamamlayın. Akış `public_profile,email` ister; e-posta paylaşımı gerekir.
6. Facebook testini HTTPS test ortamında yapın; localhost/HTTP desteğini uygulamanın güncel Meta panelindeki kurallardan kontrol edin.

Meta giriş noktası: https://developers.facebook.com/apps/

## Çalıştırma ve doğrulama

Değerleri değiştirdikten sonra API ve web geliştirme sunucularını yeniden başlatın. Yayında VITE değerleri için web uygulamasını yeniden derleyin; sunucu değerlerini barındırma ortamına ekleyin. Yerel web adresi `http://127.0.0.1:5173`; API de çalışır durumda olmalıdır.

Her sağlayıcıyla yeni hesap açma, telefon/profil tamamlama, çıkış ve yeniden giriş; izin iptali; mevcut e-posta; Ayarlar üzerinden bağlama senaryolarını test edin. Gerçek sağlayıcı kimlikleri olmadan canlı giriş doğrulanamaz. Eksik ayarlar artık demo hesabına giriş yaptırmaz.
