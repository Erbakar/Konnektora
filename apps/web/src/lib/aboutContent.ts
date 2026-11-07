/** Hakkımızda sayfası (07/11 #8): içerik "Konnektora - Hakkimizda Sayfasi" dokümanından alınmıştır. */
export type AboutBlock =
  | { type: "p"; text: string }
  | { type: "lead"; text: string }
  | { type: "h3"; text: string }
  | { type: "list"; items: string[] }
  | { type: "motto"; text: string };

export type AboutSection = { title?: string; blocks: AboutBlock[] };

export const aboutHero = {
  tr: "İnsanları ortak ilgi alanları ve etkinliklerde buluşturuyoruz.",
  en: "We bring people together through shared interests and events.",
};

export const aboutContent: Record<"tr" | "en", AboutSection[]> = {
  tr: [
    { blocks: [
      { type: "lead", text: "Konnektora, insanların ilgi alanlarını keşfetmesini, etkinlikleri bulmasını ve kendileriyle benzer şeylerden hoşlanan insanlarla bağlantı kurmasını sağlayan yeni nesil bir sosyal keşif platformudur." },
    ] },
    { title: "Yapay Zekâ ile Daha Akıllı Keşif, Daha Anlamlı Bağlantılar", blocks: [
      { type: "p", text: "Konnektora, yapay zekâ teknolojilerini sosyal keşif ve etkinlik deneyiminin merkezine taşıyor." },
      { type: "p", text: "Geleneksel etkinlik platformlarının ötesine geçerek kullanıcıların ilgi alanlarını, tercihlerini, etkileşimlerini ve keşif alışkanlıklarını anlamlandıran akıllı bir deneyim sunmayı hedefliyoruz." },
      { type: "p", text: "Yapay zekâ destekli sistemlerimiz sayesinde kullanıcıların yalnızca popüler etkinlikleri değil, gerçekten ilgilerini çekebilecek etkinlikleri, toplulukları ve insanları keşfetmelerini amaçlıyoruz." },
      { type: "p", text: "Konnektora'da yapay zekâ üç temel alanda deneyimi güçlendiriyor:" },
      { type: "list", items: ["Akıllı Etkinlik Keşfi", "Akıllı Sosyal Eşleşme", "Kişiselleştirilmiş Deneyim"] },
      { type: "p", text: "Yapay zekâyı yalnızca daha fazla içerik sunmak için değil, doğru içeriği doğru insanla buluşturmak için kullanıyoruz." },
      { type: "p", text: "Çünkü bizim için teknoloji, insanların yerini almak değil; insanlar arasındaki bağlantıları güçlendirmek anlamına geliyor." },
      { type: "motto", text: "Less scrolling. More discovering. Better connections." },
      { type: "p", text: "Konnektora ile keşif artık daha akıllı." },
    ] },
    { title: "Organizasyonlar için daha fazlası: Keşfet, büyüt ve bağlantı kur.", blocks: [
      { type: "h3", text: "Etkinliğinizi doğru insanlarla buluşturun." },
      { type: "p", text: "Konnektora'nın ilgi alanı ve yapay zekâ destekli keşif altyapısı sayesinde etkinliklerinizin, gerçekten ilgi duyabilecek insanlarla buluşmasını hedefliyoruz." },
      { type: "p", text: "Etkinliklerinizi geniş kitlelere duyurabilir, belirli ilgi alanlarına sahip kullanıcıları hedefleyebilir ve yeni potansiyel katılımcılara ulaşabilirsiniz." },
      { type: "h3", text: "Bilet satışından katılımcı yönetimine." },
      { type: "p", text: "Etkinliklerinizi yayınlayabilir, farklı kategorilerde bilet seçenekleri oluşturabilir, bilet satışlarınızı takip edebilir ve katılımcılarınızı tek bir platform üzerinden yönetebilirsiniz." },
      { type: "p", text: "Dijital biletler, QR kod ve NFC destekli giriş çözümleriyle etkinlik operasyonlarınızı kolaylaştırabilir, katılımcı deneyimini daha hızlı ve verimli hale getirebilirsiniz." },
      { type: "h3", text: "Topluluğunuzu tanıyın ve büyütün." },
      { type: "p", text: "Başarılı organizasyonlar yalnızca etkinlik düzenlemez, etraflarında güçlü topluluklar oluşturur." },
      { type: "p", text: "Konnektora ile katılımcılarınızın ilgi alanlarını, tercihlerini ve etkinliklerle olan etkileşimlerini daha iyi anlayabilirsiniz. Takipçi ve katılımcı topluluğunuzla iletişiminizi sürdürebilir, yeni etkinliklerinizi duyurabilir ve tekrar katılımı destekleyen deneyimler oluşturabilirsiniz." },
      { type: "h3", text: "Veriye dayalı kararlar alın." },
      { type: "p", text: "Etkinlik görüntülenmeleri, bilet satışları, katılımcı profilleri, trafik kaynakları, davetler, etkileşimler ve giriş istatistikleri gibi değerli verileri analiz edebilirsiniz." },
      { type: "p", text: "Yapay zekâ destekli analiz ve raporlama yaklaşımlarıyla katılımcı davranışlarını daha iyi anlamayı, etkinlik performansınızı değerlendirmeyi ve gelecekteki organizasyonlarınız için daha bilinçli kararlar almayı hedefliyoruz." },
      { type: "h3", text: "Markalar ve ajanslar için yeni fırsatlar." },
      { type: "p", text: "Konnektora, markaların ve ajansların hedef kitleleriyle ortak ilgi alanları üzerinden buluşabilecekleri yeni bir iletişim ve keşif alanı oluşturuyor." },
      { type: "p", text: "İlgi alanı analizleri, topluluk içgörüleri, sponsorluk fırsatları ve hedef kitle verileriyle pazarlama ve araştırma çalışmalarına yeni perspektifler kazandırmayı amaçlıyoruz." },
      { type: "h3", text: "Sadece bir etkinlik platformu değil, büyüyen bir ekosistem." },
      { type: "p", text: "İster küçük bir topluluk etkinliği düzenleyin, ister binlerce kişinin katıldığı uluslararası bir festival organize edin; ister bir gece kulübü işletin, ister global bir marka olun..." },
      { type: "p", text: "Konnektora, organizasyonların keşfedilmesine, büyümesine ve insanlarla daha güçlü bağlantılar kurmasına yardımcı olmak için geliştiriliyor." },
      { type: "p", text: "Siz deneyimleri oluşturun. Biz onları doğru insanlarla buluşturmanıza yardımcı olalım." },
    ] },
    { title: "Global bir topluluk için yola çıkıyoruz.", blocks: [
      { type: "lead", text: "Konnektora'nın başlangıç noktası neresi olursa olsun, vizyonumuz sınırlarla sınırlı değil." },
      { type: "lead", text: "Farklı şehirlerden, farklı kültürlerden ve farklı hayat hikâyelerinden insanların ortak ilgi alanları üzerinden birbirlerini keşfedebildiği global bir topluluk oluşturmak istiyoruz." },
      { type: "lead", text: "Çünkü dünyanın herhangi bir yerinde seninle aynı şeyi seven birileri mutlaka var." },
      { type: "lead", text: "Konnektora, onları bulmana yardımcı olmak için burada." },
      { type: "motto", text: "Discover. Connect. Experience." },
    ] },
    { title: "Güven ve kontrol", blocks: [
      { type: "p", text: "Konnektora, kişisel tercihlerinize saygı duyan bir topluluk deneyimi hedefler. Gizlilik ayarları, içerik şikâyetleri ve destek kanalları bu deneyimin parçasıdır. Etkinliğe katılmadan önce organizatörün bilgilerini ve koşullarını inceleyin; hassas bilgileri herkese açık alanlarda paylaşmayın." },
    ] },
    { title: "Konnektora'nın arkasında", blocks: [
      { type: "p", text: "Konnektora, Erbakar Yazılım Teknolojileri Ticaret Anonim Şirketi tarafından geliştirilmektedir. Hizmet şu anda kontrollü beta sürecindedir. Sorularınızı, görüşlerinizi ve destek taleplerinizi İletişim sayfasından iletebilir; veri işleme ve hesap talepleri için Gizlilik ve Veri silme talebi sayfalarını inceleyebilirsiniz." },
    ] },
    { title: "Konnektora.", blocks: [
      { type: "lead", text: "İlgi alanlarının insanlarla buluştuğu yer." },
    ] },
  ],
  en: [
    { blocks: [
      { type: "lead", text: "Konnektora is a next-generation social discovery platform that helps people explore their interests, find events and connect with people who enjoy the same things." },
    ] },
    { title: "Smarter Discovery and More Meaningful Connections with AI", blocks: [
      { type: "p", text: "Konnektora puts artificial intelligence at the centre of social discovery and the event experience." },
      { type: "p", text: "Going beyond traditional event platforms, we aim to offer a smart experience that makes sense of people's interests, preferences, interactions and discovery habits." },
      { type: "p", text: "With our AI-supported systems, we want people to discover not just popular events, but the events, communities and people that genuinely interest them." },
      { type: "p", text: "At Konnektora, AI strengthens the experience in three core areas:" },
      { type: "list", items: ["Smart Event Discovery", "Smart Social Matching", "Personalised Experience"] },
      { type: "p", text: "We use AI not to serve more content, but to bring the right content to the right people." },
      { type: "p", text: "For us, technology does not replace people; it strengthens the connections between them." },
      { type: "motto", text: "Less scrolling. More discovering. Better connections." },
      { type: "p", text: "Discovery is smarter with Konnektora." },
    ] },
    { title: "More for organisations: discover, grow and connect.", blocks: [
      { type: "h3", text: "Bring your event to the right people." },
      { type: "p", text: "With Konnektora's interest-based, AI-supported discovery infrastructure, we aim to connect your events with people who are genuinely interested in them." },
      { type: "p", text: "Announce your events to wide audiences, target people with specific interests and reach new potential attendees." },
      { type: "h3", text: "From ticket sales to attendee management." },
      { type: "p", text: "Publish events, create ticket options in different categories, track ticket sales and manage attendees on a single platform." },
      { type: "p", text: "Digital tickets and QR and NFC-supported entry make event operations easier and the attendee experience faster and more efficient." },
      { type: "h3", text: "Know and grow your community." },
      { type: "p", text: "Successful organisations do not only run events; they build strong communities around them." },
      { type: "p", text: "Konnektora helps you better understand your attendees' interests, preferences and interactions with events. Stay in touch with your followers and attendees, announce new events and create experiences that encourage people to come back." },
      { type: "h3", text: "Make data-driven decisions." },
      { type: "p", text: "Analyse valuable data such as event views, ticket sales, attendee profiles, traffic sources, invitations, interactions and entry statistics." },
      { type: "p", text: "With AI-supported analysis and reporting, we aim to help you understand attendee behaviour, evaluate event performance and make more informed decisions for future organisations." },
      { type: "h3", text: "New opportunities for brands and agencies." },
      { type: "p", text: "Konnektora creates a new space where brands and agencies can meet their audiences through shared interests." },
      { type: "p", text: "With interest analysis, community insights, sponsorship opportunities and audience data, we aim to bring new perspectives to marketing and research." },
      { type: "h3", text: "Not just an event platform, but a growing ecosystem." },
      { type: "p", text: "Whether you run a small community event or an international festival with thousands of attendees, a nightclub or a global brand..." },
      { type: "p", text: "Konnektora is being built to help organisations get discovered, grow and build stronger connections with people." },
      { type: "p", text: "You create the experiences. We help you bring them to the right people." },
    ] },
    { title: "Setting out for a global community.", blocks: [
      { type: "lead", text: "Wherever Konnektora starts, our vision is not limited by borders." },
      { type: "lead", text: "We want to build a global community where people from different cities, cultures and life stories can discover each other through shared interests." },
      { type: "lead", text: "Because somewhere in the world, someone loves the same thing you do." },
      { type: "lead", text: "Konnektora is here to help you find them." },
      { type: "motto", text: "Discover. Connect. Experience." },
    ] },
    { title: "Trust and control", blocks: [
      { type: "p", text: "Konnektora aims to offer a community experience that respects personal choices. Privacy settings, content reporting and support channels are part of that experience. Review the organiser's details and conditions before attending, and avoid sharing sensitive information in public spaces." },
    ] },
    { title: "Behind Konnektora", blocks: [
      { type: "p", text: "Konnektora is developed by Erbakar Yazılım Teknolojileri Ticaret Anonim Şirketi. The service is currently in a controlled beta. Send questions, feedback and support requests through Contact, and review Privacy and Data deletion for data processing and account requests." },
    ] },
    { title: "Konnektora.", blocks: [
      { type: "lead", text: "Where interests meet people." },
    ] },
  ],
};
