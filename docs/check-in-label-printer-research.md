# Check-in QR etiket yazıcısı araştırması

Güncelleme: 28 Ağustos 2026

## Karar

İlk saha denemesi için **Brother QL-820NWBc**, daha yüksek hacim ve doğrudan web entegrasyonu gereken kalıcı kurulum için **Zebra ZD421 (300 dpi, ağ bağlantılı model)** önerilir.

Konnektora etiketi yaklaşık 50–62 mm genişlikte; kullanıcı adı, kısa etkinlik adı ve en az 25 mm QR kod içermelidir. QR kodun güvenilir okunması için 300 dpi tercih edilir. Etiket rengi yazıcıdan değil, kullanılan sarf malzemesinden gelir: floresan/neon sarı, termal uyumlu ve kıyafetten iz bırakmadan çıkabilen etiket rulosu ayrıca tedarik edilmelidir.

## Adaylar

### Brother QL-820NWBc — pilot için önerilen

- Wi‑Fi, Wi‑Fi Direct, Ethernet, USB ve Bluetooth bağlantıları vardır.
- AirPrint ve Brother iPrint&Label ile mobil cihazdan yazdırabilir.
- 62 mm sürekli rulo üzerinde QR, metin ve logo için yeterlidir.
- Brother; Windows, iOS ve Android SDK'ları ile ESC/P, P‑touch Template ve Raster komutlarını destekler.
- Küçük ve taşınabilir olduğu için 1–2 cihazlık etkinlik denemesi için en düşük operasyon riski bu modeldedir.
- Sınır: Tarayıcıdan sessiz/tek tuşla baskı için platforma göre Brother uygulaması, işletim sistemi yazdırma ekranı veya ileride yerel bir yardımcı uygulama gerekebilir. Floresan üçüncü taraf DK uyumlu rulo, satın almadan önce gerçek cihazda test edilmelidir.

Üretici kaynakları:

- https://www.brother-usa.com/p/thermal-printers-labelers/QL820NWBC
- https://www.brother.eu/-/media/Product-Downloads/Devices/Label-Printers/QL/QL820NWBc/QL-820NWBc-Datasheet.ashx

### Zebra ZD421 — kalıcı ve yüksek hacimli kurulum için önerilen

- Direct thermal ve thermal transfer seçenekleri; 203 veya 300 dpi; yaklaşık 104–106 mm baskı genişliği sunar.
- USB standarttır; Ethernet ile Wi‑Fi/Bluetooth seçenekleri modele göre eklenebilir.
- ZPL II ile QR, yazı ve grafik baskısı doğrudan üretilebilir.
- Zebra Browser Print, Windows/macOS tarayıcılarında USB veya ağ yazıcılarına; Android'de ağ/Bluetooth yazıcılarına web uygulamasından baskı desteği verir.
- iOS Safari'de Zebra Browser Print yoktur. iPhone/iPad için sistem PDF/AirPrint akışı, ağdaki bulut baskı servisi veya yerel yardımcı uygulama gerekir.
- ZD421'in medya aralığı farklı floresan sarf tedarikçileriyle çalışma açısından Brother'a göre daha esnektir. Termal transfer modeli, dayanıklı floresan sentetik etiket kullanılması gerekiyorsa daha güvenli tercihtir.

Üretici kaynakları:

- https://www.zebra.com/us/en/products/printers/desktop/zd400-series/zd421.html
- https://www.zebra.com/us/en/products/spec-sheets/printers/desktop/zd421-series.html
- https://www.zebra.com/us/en/support-downloads/software/printer-software/browser-print.html

### DYMO LabelWriter 5XL — önerilmiyor

- Direct thermal, 300 dpi ve USB/LAN bağlantısı vardır.
- Büyük kargo etiketi odağında olduğu için check-in masasındaki küçük rozet etiketi için gereksiz geniştir.
- Sarf esnekliği ve mobil bağlantı seçenekleri Brother/Zebra kadar uygun değildir.

Kaynak: https://www.dymo.com/label-makers-printers/labelwriter-label-printers/dymo-labelwriter-5xl-label-printer/SP_1373968.html

## Önerilen entegrasyon sırası

1. Uygulama, Pasaport ekranındaki “İçeri al” kararından sonra kullanıcı adı + profil QR kodunu 62 × 40 mm PDF/PNG etiket olarak üretir.
2. Pilot aşamada cihazın sistem yazdırma ekranı veya Brother uygulaması kullanılır; başarısız baskı check-in kararını geri almaz ve “Yeniden yazdır” seçeneği sunulur.
3. İki yazıcı ve üç sarf örneğiyle en az 500 baskılık saha testi yapılır: QR okunabilirliği, ısı/ışık, yapışma, kıyafetten çıkma ve baskı hızı ölçülür.
4. Hacim doğrulanırsa Zebra ZD421 + Browser Print/ZPL akışına geçilir. iOS için ayrı bir AirPrint/PDF veya yardımcı uygulama yolu korunur.

## Satın alma öncesi zorunlu kontrol

- Tam modelde gerekli bağlantının gerçekten bulunması (ZD421'de kablosuz özellikler opsiyoneldir).
- Floresan etiketin direct thermal veya thermal transfer yöntemine uygun olması.
- Yapışkanın kumaşta iz bırakmaması; cilt üzerine uygulanmaması.
- QR kodun etkinlik ışığında hem iOS hem Android kameralarla en az 30–50 cm'den okunması.
- Sarfın Türkiye/AB'de düzenli tedarik edilebilirliği.
