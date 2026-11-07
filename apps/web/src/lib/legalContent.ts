export const legalCompany = {
  name: "Erbakar Yazılım Teknolojileri Ticaret Anonim Şirketi",
  address: "Bahçeşehir 2. Kısım Mah. Medeniyet Cad. Bahçekent 652 Ada 1. Blok No: 41 F İç Kapı No: 33, Başakşehir / İstanbul, Türkiye",
  taxOffice: "Başakşehir",
  taxNumber: "3380302497",
  domain: "https://konnektora.com",
  email: "kadirerbakar@hotmail.com",
};
type Section = { title: string; paragraphs: string[] };
type Document = { title: string; sections: Section[] };
const section = (title: string, ...paragraphs: string[]): Section => ({ title, paragraphs });
export const legalContent = {
  cookies: {
    tr: { title: "Çerez Politikası", sections: [
      section("Kapsam", "Bu politika konnektora.com üzerindeki çerezleri ve benzer tarayıcı depolama teknolojilerini açıklar. Veri sorumlusu aşağıda bilgileri bulunan Erbakar Yazılım Teknolojileri Ticaret Anonim Şirketi’dir."),
      section("Oturum ve güvenlik", "Üye oturumu ve hesap bilgileri tarayıcının yerel depolamasında tutulur. Yönetici oturumları ayrı saklanır. Bu bilgiler giriş gerektiren özellikleri sunmak için kullanılır; çıkış işlemi ilgili oturum bilgilerini kaldırır. Yerel depolama kayıtları, çerezlerden farklı olarak kendiliğinden sona ermeyebilir; çıkış yapana veya tarayıcı verilerini temizleyene kadar kalabilir."),
      section("Tercihler ve geçici kayıtlar", "Dil tercihiniz aynı tarayıcıda sonraki ziyaretlerde kullanılmak üzere saklanır. Sayfa gezinmesine ilişkin geçici kayıtlar oturum depolamasında bulunabilir; bu kayıtlar ilgili sekme oturumu sona erdiğinde silinir. Tarayıcı verilerinin temizlenmesi sunucudaki hesabınızı veya işlem geçmişinizi silmez."),
      section("Üçüncü taraf hizmetleri", "Google ve Facebook ile giriş sırasında sağlayıcı bileşenleri; video, harita ve diğer dış içerikler görüntülendiğinde ilgili sağlayıcılar cihaz ve bağlantı bilgilerini işleyebilir, kendi çerezlerini kullanabilir. Bunların yönetimi sağlayıcının ve tarayıcınızın gizlilik ayarlarından yapılır. Konnektora’daki bir tercih, üçüncü taraf hesabınızın ayarlarını değiştirmez."),
      section("Tercihlerinizi yönetme", "Çerez Tercihleri sayfasından tarayıcı ayarlarına ilişkin yönlendirmelere ulaşabilirsiniz. Zorunlu depolamayı engellemek giriş ve güvenlik özelliklerini etkileyebilir. Veri işleme ve başvuru haklarınız için KVKK ve Gizlilik Politikası sayfalarını inceleyebilirsiniz.")
    ] },
    en: { title: "Cookie Policy", sections: [
      section("Scope", "This policy covers cookies and similar browser storage on konnektora.com. The controller is Erbakar Yazılım Teknolojileri Ticaret Anonim Şirketi, identified below."),
      section("Sessions and security", "Member credentials and account information are held in local storage; administrator sessions are stored separately. Signing out removes the relevant session records. Local storage may remain until sign-out or deletion of browser data, rather than expiring automatically."),
      section("Preferences and temporary records", "Your language choice is remembered in this browser. Temporary navigation records may be held in session storage until the tab session ends. Clearing browser data does not delete your account or server-side transaction history."),
      section("External services", "Google and Facebook sign-in components and external video or map content may process device and connection data and use their own cookies. Manage these through provider and browser privacy settings. A Konnektora preference does not change your external account settings."),
      section("Your choices", "Visit Cookie Preferences for browser controls. Blocking essential storage may affect sign-in and security. See the KVKK notice and Privacy Policy for processing details and requests.")
    ] }
  },
  kvkk: {
    tr: { title: "KVKK Aydınlatma Metni", sections: [
      section("Veri sorumlusu ve kapsam", "konnektora.com üzerinden sunulan hesap, sosyal keşif, topluluk, etkinlik ve destek hizmetleri bakımından veri sorumlusu aşağıda kimlik ve iletişim bilgileri bulunan şirketimizdir. Bu metin bilgilendirme amaçlıdır; açık rıza beyanı değildir."),
      section("Toplama yöntemleri ve hukuki sebepler", "Kayıt ve profil formları, kullanıcı işlemleri, destek başvuruları, seçtiğiniz sosyal giriş sağlayıcısı ve teknik erişim kayıtları üzerinden elektronik ortamda veri elde edilir. Hesap, iletişim ve işlem verileri üyelik sözleşmesinin kurulması ve yürütülmesi; fatura ve muhasebe verileri hukuki yükümlülükler; uyuşmazlık kayıtları bir hakkın tesisi veya korunması için işlenir. Güvenlik ve kötüye kullanımın önlenmesine yönelik teknik kayıtlar, temel haklarınıza zarar vermemek kaydıyla meşru menfaat kapsamında değerlendirilir. Açık rıza gerektiren işlemler için ayrıca rızanız istenir."),
      section("Veriler ve amaçlar", "Kimlik ve iletişim bilgileri hesap açma, doğrulama ve destek için; profil, ilgi alanı ve paylaşımlar topluluk özellikleri için; mesaj ve katılım kayıtları ilgili iletişimi ve etkinlik işlemlerini yürütmek için kullanılır. IP, cihaz ve işlem kayıtları güvenlik ve hata incelemesine yardımcı olur. Ayrıntılı veri kategorileri, sosyal giriş izinleri ve mevcut saklama uygulamaları Gizlilik Politikası’nda açıklanır."),
      section("Alıcılar ve aktarımlar", "Seçtiğiniz görünürlük kapsamında diğer kullanıcılar, mesaj alıcıları ve ilgili etkinlik işlemini yürüten yetkililer gerekli bilgilere erişebilir. Barındırma, güvenlik, iletişim ve ödeme hizmet sağlayıcıları görevleriyle sınırlı verileri; yetkili kurumlar yasal talepleri kapsamındaki kayıtları alabilir. Kullanılan altyapı ve sosyal giriş hizmetleri yurt dışında veri işlenmesine yol açabilir. Yurt dışı aktarımın KVKK’nın 9. maddesindeki uygulanabilir şartlara dayanması gerekir; bu sayfayı okumak aktarım için rıza oluşturmaz."),
      section("Haklarınız ve başvuru", "KVKK’nın 11. maddesi kapsamında verilerinizin işlenip işlenmediğini ve amacını öğrenebilir, alıcıları sorabilir, eksik veya yanlış bilgilerin düzeltilmesini, şartları oluştuğunda silinmesini veya yok edilmesini ve bu işlemlerin alıcılara bildirilmesini isteyebilirsiniz. Yalnız otomatik analiz sonucu aleyhinize çıkan sonuca itiraz ve hukuka aykırı işleme nedeniyle zararın giderilmesini talep haklarınız da vardır. Başvurunuzu kayıtlı iş adresimize yazılı olarak veya sistemimizde kayıtlı e-posta adresinizden aşağıdaki iletişim adresine iletebilirsiniz. Talebinize en geç 30 gün içinde yanıt verilir.")
    ] },
    en: { title: "KVKK Privacy Notice", sections: [
      section("Controller and scope", "Our company, identified below, is the controller for accounts, social discovery, communities, events and support on konnektora.com. This notice provides information and is not a consent declaration."),
      section("Collection and legal grounds", "Data is collected electronically through forms, activity, support, chosen social login providers and access records. Account and transaction data supports the membership contract; billing supports legal obligations; dispute records protect legal claims. Security records support legitimate interests subject to your fundamental rights. Processing requiring consent needs a separate choice."),
      section("Purposes and recipients", "Identity and contact details support registration and assistance; profiles, interests, posts and messages support community features. Technical records support security. Visibility settings, message recipients and relevant event staff determine access. Hosting, security, communication and payment providers receive necessary data, and authorities may receive legally required records. See the Privacy Policy for categories, providers and retention practices."),
      section("International processing", "Infrastructure and social login services may process information abroad. Transfers require an applicable basis under Article 9 of KVKK; reading this notice does not provide transfer consent."),
      section("Rights and requests", "Under Article 11 you may ask whether and why data is processed, learn recipients, request correction or eligible deletion and notification to recipients, object to adverse solely automated analysis and seek compensation for unlawful processing. Write to our registered address or email us from your registered email address. Requests receive a response within 30 days.")
    ] }
  },
  information: {
    tr: { title: "Bilgilendirme", sections: [
      section("Konnektora hakkında", "konnektora.com; insanların ilgi alanları, mekânlar ve etkinlikler üzerinden bağlantı kurmasına yardımcı olur. Platformun işletmecisi aşağıda bilgileri bulunan Erbakar Yazılım Teknolojileri Ticaret Anonim Şirketi’dir."),
      section("Etkinlik ve hizmet bilgileri", "Etkinliğin organizatörünü, tarihini, konumunu, yaş ve giriş koşullarını ilgili sayfadan kontrol edin. Katılım veya liste kaydı her zaman ücretli bilet anlamına gelmez. Bir işlemin satıcısı ile platformun işletmecisi farklı olabilir; sorumlu satıcı/sağlayıcı bilgisi işlem öncesinde ayrıca belirtilmelidir."),
      section("Ücretler ve tüketici başvuruları", "Ücretli işlemlerde kapsamı, vergiler dahil toplam bedeli ve varsa ek ücretleri onay öncesinde inceleyin. Destek, iptal ve iade başvurularında işlem numarası ile talebinizi paylaşın; şifre veya tam kart bilgisi göndermeyin. Tüketici işlemlerinde yasal görev ve parasal sınırlar dahilinde tüketici hakem heyetlerine veya tüketici mahkemelerine başvuru hakları saklıdır."),
      section("İlgili belgeler", "Hesap kullanımı için Kullanım Şartları; kişisel veriler için KVKK ve Gizlilik Politikası; ücretli işlemlerin genel çerçevesi için Ön Bilgilendirme Formu ve Mesafeli Satış Sözleşmesi sayfalarını inceleyebilirsiniz.")
    ] },
    en: { title: "Information", sections: [
      section("About the platform", "konnektora.com connects people through interests, venues and events. The operator is Erbakar Yazılım Teknolojileri Ticaret Anonim Şirketi, identified below."),
      section("Events and services", "Check the organizer, date, venue, age and entry rules. A participation or guest-list record is not necessarily a paid ticket. The seller may differ from the platform operator and must be identified before a transaction."),
      section("Prices and requests", "Review service scope, tax-inclusive total and additional charges before approval. Include your transaction reference in support or refund requests, never passwords or full card details. Statutory access to consumer arbitration committees and courts remains available subject to jurisdiction and applicable thresholds."),
      section("Related documents", "See the Terms of Use, Privacy Policy, KVKK notice, Preliminary Information Form and Distance Sales Agreement for the relevant subjects.")
    ] }
  },
  "distance-selling": {
    tr: { title: "Mesafeli Satış Sözleşmesi", sections: [
      section("Sözleşmenin kapsamı", "Bu metin konnektora.com üzerinden sunulabilecek ücretli hizmetler için genel çerçevedir. Tek başına sipariş veya ödeme oluşturmaz. Alıcı, satıcı/sağlayıcı, hizmet, toplam bedel, ifa tarihi ve işlem koşulları siparişe özel belgede belirlenir. Yeni paket satın alma şu anda açık değildir."),
      section("Taraflar ve hizmet", "Konnektora’nın doğrudan sunduğu hizmetlerde sağlayıcı aşağıda bilgileri yer alan şirketimizdir. Üçüncü kişiye ait etkinlik veya hizmetlerde satıcı/sağlayıcı ayrıca gösterilir. Platformun aracı olduğu işlemlerde kanundan doğan sorumlulukları saklıdır. Alıcının bilgileri yalnız kendi işlem belgesinde yer alır."),
      section("Sipariş ve ifa", "Hizmetin nitelikleri, kullanım süresi, tüm ücretleri, ödeme ve sunum koşulları işlemden önce açıklanır. Ödeme yükümlülüğü doğuran onay açıkça belirtilmelidir. Siparişe özel ön bilgilendirme ve sözleşme alıcının saklayabileceği şekilde sunulmalıdır. Genel sayfanın daha sonra değiştirilmesi geçmiş siparişin koşullarını kendiliğinden değiştirmez."),
      section("Cayma, iptal ve iade", "Tüketici işlemlerinde kural olarak 14 günlük cayma hakkı bulunur. Belirli tarihli eğlence veya boş zaman etkinlikleri ile onay üzerine erken ifasına başlanan hizmetlerde kanuni istisnalar söz konusu olabilir. İstisna işlem öncesinde açıklanmalı; gerekli onay ayrıca alınmalıdır. Cayma istisnası, iptal edilen veya gereği gibi sunulmayan hizmete ilişkin hakları ortadan kaldırmaz. Talepler işlem numarasıyla iletişim kanalımıza iletilebilir; iade, ilgili mevzuattaki süre ve yöntemlere göre yürütülür."),
      section("Uyuşmazlık ve iletişim", "Tüketicinin zorunlu hakları saklıdır. Görev ve parasal sınırlar kapsamında tüketici hakem heyetlerine veya tüketici mahkemelerine başvurulabilir. Bu genel metin siparişe özgü ön bilgilendirme ve sözleşmenin yerine geçmez.")
    ] },
    en: { title: "Distance Sales Agreement", sections: [
      section("Scope", "This is the general framework for paid services on konnektora.com; it does not create an order or payment. Buyer, seller, service, price and performance details belong in the individual transaction document. New plan purchases are currently unavailable."),
      section("Parties and performance", "Our company is the provider of its own services. External sellers and organizers must be identified for their services; statutory platform responsibilities remain. Service scope, duration, full charges and delivery terms must be disclosed before an explicit payment commitment. Transaction documents must be supplied in a retainable format. Later edits do not automatically change earlier contracts."),
      section("Withdrawal and refunds", "Consumer transactions generally carry a 14-day withdrawal right, with statutory exceptions such as dated leisure events and services begun early with the required consent. Applicable exceptions must be explained before purchase. They do not remove rights concerning cancelled or defective services. Send requests with a transaction reference; applicable statutory refund deadlines and methods govern."),
      section("Disputes", "Mandatory consumer rights and access to competent consumer arbitration committees or courts remain. This general text does not replace individual transaction documents.")
    ] }
  },
  "pre-information": {
    tr: { title: "Ön Bilgilendirme Formu", sections: [
      section("Formun niteliği", "Bu sayfa konnektora.com için genel ön bilgilendirme çerçevesini açıklar. Size ait bir sipariş belgesi değildir ve ödeme onayı içermez. Yeni paket satın alma henüz açılmamıştır."),
      section("Sağlayıcı bilgileri", "Konnektora’nın doğrudan sunduğu hizmetlerin sağlayıcısı aşağıdaki şirkettir. Başka bir organizatör veya satıcı tarafından sunulan hizmetlerde o tarafın unvanı, adresi ve iletişim bilgileri işlem öncesinde ayrıca verilmelidir."),
      section("İşleme özel bilgiler", "Siparişe özel formda hizmetin adı ve temel nitelikleri, etkinlik tarihi veya kullanım dönemi, miktarı, vergiler dahil fiyatı, varsa hizmet ve teslimat ücretleri, toplam ödeme, ödeme yöntemi ve ifa koşulları bulunmalıdır. Süreli hizmetlerde yenileme, fesih, taahhüt ve teknik kullanım şartları da açıklanmalıdır. Bu genel sayfada kişiye özel fiyat veya sipariş bilgisi gösterilmez."),
      section("Haklar ve başvuru yolu", "Cayma hakkının uygulanıp uygulanmadığı, varsa istisnanın gerekçesi, başvuru yöntemi, iade koşulları ve şikâyet kanalı satın almadan önce işlem belgesinde açıklanmalıdır. Genel bilgi için Mesafeli Satış Sözleşmesi’ni inceleyin. Destek ve taleplerinizi aşağıdaki e-posta adresine veya İletişim sayfasından iletebilirsiniz."),
      section("Bilgilendirmenin teyidi", "Alıcının ön bilgilendirmeyi edindiği teyit edilmeli ve belge kalıcı olarak saklanabilir biçimde sunulmalıdır. Bu sayfayı ziyaret etmeniz satın alma, açık rıza veya cayma hakkından vazgeçme anlamına gelmez.")
    ] },
    en: { title: "Preliminary Information Form", sections: [
      section("Purpose", "This page explains the general pre-contract information framework for konnektora.com. It is not your order document or payment approval. New plan purchases are not yet available."),
      section("Provider", "Our company below supplies its own services. External sellers must be separately identified with their address and contact information before purchase."),
      section("Individual transaction details", "The individual form must identify service characteristics, date or duration, quantity, tax-inclusive price, extra charges, total, payment and performance arrangements. Term services must explain renewal, termination, commitment and technical conditions. This page does not display personalized order details."),
      section("Rights and acknowledgment", "Applicable withdrawal rights or exceptions, request methods, refund terms and complaint channels must be explained before purchase. The buyer must receive and acknowledge information in a retainable form. Visiting this page is not a purchase, consent or waiver. Contact us below or through the Contact page.")
    ] }
  },
} satisfies Record<string, Record<"tr" | "en", Document>>;
export type LegalDocumentType = keyof typeof legalContent;
