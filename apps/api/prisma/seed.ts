import { getConnectionString } from "@netlify/database";
import { PrismaClient, UserMessageStatus, UserMessageType } from "@prisma/client";
import { hash } from "bcryptjs";

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (process.env.NETLIFY_DB_URL) {
    process.env.DATABASE_URL = process.env.NETLIFY_DB_URL;
    return process.env.NETLIFY_DB_URL;
  }

  try {
    const databaseUrl = getConnectionString();
    process.env.DATABASE_URL = databaseUrl;
    return databaseUrl;
  } catch {
    // Prisma will report the missing DATABASE_URL with schema context.
    return undefined;
  }
}

const databaseUrl = resolveDatabaseUrl();
const prisma = new PrismaClient(databaseUrl ? { datasourceUrl: databaseUrl } : undefined);

async function main() {
  const production = process.env.NODE_ENV === "production";
  if (production && process.env.ALLOW_PRODUCTION_SEED !== "true") {
    throw new Error("Production seed kapalı. Bilinçli çalıştırmak için ALLOW_PRODUCTION_SEED=true ayarlayın.");
  }
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? (production ? "" : "ChangeMe123!");
  const demoPassword = process.env.SEED_DEMO_PASSWORD ?? (production ? "" : "ChangeMe123!");
  if (production && (adminPassword.length < 14 || demoPassword.length < 14)) {
    throw new Error("Production seed parolaları en az 14 karakter olmalıdır.");
  }
  const admin = await prisma.user.upsert({
    where: { email: "admin@konnektora.local" },
    update: {},
    create: {
      email: "admin@konnektora.local",
      name: "Konnektora Admin",
      passwordHash: await hash(adminPassword, 12),
      role: "super_admin"
    }
  });

  const demoUser = await prisma.user.upsert({
    where: { email: "user@konnektora.local" },
    update: { lastOnlineAt: new Date(), username: "konnektora-demo" },
    create: {
      email: "user@konnektora.local",
      name: "Konnektora User",
      username: "konnektora-demo",
      lastOnlineAt: new Date(),
      passwordHash: await hash(demoPassword, 12),
      role: "user"
    }
  });

  const faqCategories = await Promise.all(
    [
      { id: "10000000-0000-4000-8000-000000000001", name: "Hesap ve profil", slug: "hesap-ve-profil", description: "Hesap, profil ve gizlilik ayarları" },
      { id: "10000000-0000-4000-8000-000000000002", name: "Etkinlikler", slug: "etkinlikler", description: "Katılım, davet ve etkinlik yönetimi" },
      { id: "10000000-0000-4000-8000-000000000003", name: "Ödemeler", slug: "odemeler", description: "Ödeme, iade ve faturalandırma" }
    ].map((category) => prisma.cmsCategory.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description, type: "faq", status: "active" },
      create: { ...category, type: "faq", status: "active" }
    }))
  );

  const faqCategoryBySlug = new Map(faqCategories.map((category) => [category.slug, category.id]));
  const seededFaqs = [
    { id: "20000000-0000-4000-8000-000000000001", category: "hesap-ve-profil", title: "Profil bilgilerimi nasıl güncellerim?", body: "Hesap sayfasındaki Profil bölümünü açın. Bilgilerinizi düzenledikten sonra değişiklikleri kaydedin." },
    { id: "20000000-0000-4000-8000-000000000002", category: "hesap-ve-profil", title: "Hesabımı nasıl güvende tutabilirim?", body: "Benzersiz bir parola kullanın, iletişim bilgilerinizi doğrulayın ve tanımadığınız cihazlardaki oturumları kapatın." },
    { id: "20000000-0000-4000-8000-000000000003", category: "etkinlikler", title: "Bir etkinliğe nasıl katılırım?", body: "Etkinlik detay sayfasında Katıl seçeneğini kullanın. Onay gerektiren etkinliklerde organizatörün yanıtı size bildirilir." },
    { id: "20000000-0000-4000-8000-000000000004", category: "odemeler", title: "İade süreci nasıl işler?", body: "Uygun işlemler için etkinlik ve ödeme detaylarından iade durumunu takip edebilirsiniz. Sonuç finans hareketlerinize yansıtılır." }
  ];

  for (const faq of seededFaqs) {
    const categoryId = faqCategoryBySlug.get(faq.category);
    if (!categoryId) throw new Error(`Seed FAQ category not found: ${faq.category}`);
    await prisma.faq.upsert({
      where: { id: faq.id },
      update: { categoryId, title: faq.title, body: faq.body, status: "active" },
      create: { id: faq.id, categoryId, title: faq.title, body: faq.body, status: "active" }
    });
  }

  const policies = [
    { type: "privacy", title: "Gizlilik Politikası", body: `<h2>Topladığımız bilgiler</h2><p>Hesap oluşturduğunuzda kimlik, iletişim, profil ve tercih bilgilerinizi; platformu kullandığınızda etkinlik katılımı, mekân üyeliği, mesaj ve güvenlik kayıtlarını işleriz.</p><h2>Kullanım amaçları</h2><p>Verileri hesabınızı çalıştırmak, topluluk özelliklerini sunmak, güvenliği sağlamak, yasal yükümlülükleri yerine getirmek ve açık tercihleriniz doğrultusunda deneyimi kişiselleştirmek için kullanırız.</p><h2>Paylaşım ve saklama</h2><p>Bilgiler yalnız hizmet sağlayıcılar, yetkili iş ortakları ve yasal olarak gerekli mercilerle amaçla sınırlı biçimde paylaşılır. Veriler gerekli olduğu sürece ve yasal saklama süreleri boyunca tutulur.</p><h2>Haklarınız</h2><p>Profil ve gizlilik ayarlarınızı hesabınızdan yönetebilir; erişim, düzeltme, silme veya itiraz talepleriniz için destek merkezi üzerinden bize ulaşabilirsiniz.</p>` },
    { type: "terms", title: "Kullanım Koşulları", body: `<h2>Hesap ve uygun kullanım</h2><p>Konnektora hesabınızın güvenliğinden siz sorumlusunuz. Yanıltıcı kimlik, taciz, spam, yasa dışı içerik ve başkalarının haklarını ihlal eden davranışlara izin verilmez.</p><h2>Etkinlikler ve ödemeler</h2><p>Organizatörler yayınladıkları etkinlik, mekân, fiyat, iade ve katılım bilgilerinin doğruluğundan sorumludur. Ödeme ve iade koşulları işlem sırasında gösterilen kurallara tabidir.</p><h2>İçerik ve moderasyon</h2><p>İçeriğiniz üzerindeki haklarınız korunur; platformda yayınlayarak hizmetin sunulması için gerekli sınırlı kullanım iznini verirsiniz. Güvenlik veya kural ihlalinde içerik kaldırılabilir ya da hesap kısıtlanabilir.</p><h2>Değişiklikler</h2><p>Koşullar güncellendiğinde yayın tarihi bu sayfada gösterilir. Hizmeti kullanmaya devam etmeniz güncel koşulları kabul ettiğiniz anlamına gelir.</p>` },
    { type: "cookies", title: "Çerez Politikası", body: `<h2>Zorunlu çerezler</h2><p>Oturum açma, güvenlik, dil seçimi ve temel sayfa işlevleri için zorunlu çerezler ve yerel depolama kullanırız.</p><h2>Tercihler ve ölçüm</h2><p>İzin verdiğiniz ölçüde tercihleri hatırlamak ve ürün performansını anlamak için ek teknolojiler kullanılabilir. Zorunlu olmayan seçenekleri tarayıcı ve izin ayarlarınızdan yönetebilirsiniz.</p><h2>Saklama</h2><p>Oturum verileri oturum süresince, kalıcı tercihler ise belirtilen amaç için gerekli süre boyunca saklanır.</p>` },
    { type: "about", title: "Konnektora Hakkında", body: `<h2>Anlamlı bağlantılar için</h2><p>Konnektora; ortak ilgi alanları çevresinde insanları, etkinlikleri ve mekânları bir araya getiren topluluk platformudur.</p><h2>Nasıl çalışır?</h2><p>Üyeler profillerini ve ilgi alanlarını oluşturur, uygun toplulukları keşfeder, etkinliklere katılır ve güvenli davet listeleri üzerinden bağlantı kurar.</p><h2>İşletmeler için</h2><p>Organizatörler ve mekânlar etkinlik, katılımcı, giriş, ödeme ve kurumsal doğrulama süreçlerini tek merkezden yönetebilir.</p>` }
  ];
  for (const policy of policies) {
    await prisma.cmsPolicy.upsert({ where: { type: policy.type }, update: { ...policy, status: "active", publishedAt: new Date() }, create: { ...policy, status: "active", publishedAt: new Date() } });
  }

  const categories = await Promise.all(
    [
      { name: "Sektör", slug: "sektor", sortOrder: 1 },
      { name: "Format", slug: "format", sortOrder: 2 },
      { name: "Hedef Kitle", slug: "hedef-kitle", sortOrder: 3 }
    ].map((category) =>
      prisma.tagCategory.upsert({
        where: { slug: category.slug },
        update: category,
        create: category
      })
    )
  );

  const [sector, format, audience] = categories;
  const tags = await Promise.all(
    [
      { name: "Startup", slug: "startup", categoryId: sector.id, description: "Yeni ürünler geliştiren girişim ekipleri, erken aşama büyüme ve pazara çıkış deneyimleri." },
      { name: "Networking", slug: "networking", categoryId: format.id, description: "Ortak hedefleri olan profesyonellerle tanışma, bağlantı kurma ve iş birliği fırsatları." },
      { name: "Yatırım", slug: "yatirim", categoryId: sector.id, description: "Yatırım hazırlığı, fonlama süreçleri, yatırımcı görüşmeleri ve finansman stratejileri." },
      { name: "Founder", slug: "founder", categoryId: audience.id, description: "Kurucuların ürün, ekip, liderlik ve şirket kurma yolculuğundaki deneyim paylaşımları." }
    ].map((tag) =>
      prisma.tag.upsert({
        where: { slug: tag.slug },
        update: { name: tag.name, description: tag.description, categoryId: tag.categoryId, status: "active" },
        create: {
          ...tag,
          createdById: admin.id,
          updatedById: admin.id
        }
      })
    )
  );

  const tagBySlug = new Map(tags.map((tag) => [tag.slug, tag]));
  const day = 1000 * 60 * 60 * 24;
  const getTagId = (slug: string) => {
    const tag = tagBySlug.get(slug);

    if (!tag) {
      throw new Error(`Seed tag not found: ${slug}`);
    }

    return tag.id;
  };

  const places = await Promise.all(
    [
      {
        name: "Konnektora Hub Berlin",
        slug: "konnektora-hub-berlin",
        description: "Community meetup venue",
        country: "Germany",
        city: "Berlin",
        address: "Mitte",
        coverImageUrl: null,
        followerCount: 42,
        inviteCount: 8
      },
      {
        name: "Galata Product House",
        slug: "galata-product-house",
        description: "Ürün ekipleri, bağımsız geliştiriciler ve kurucular için çalışma ve etkinlik alanı.",
        country: "Türkiye",
        city: "Istanbul",
        address: "Galata",
        coverImageUrl: "https://images.unsplash.com/photo-1497366754035-f200968a6e72",
        followerCount: 118,
        inviteCount: 24
      },
      {
        name: "Amsterdam Founder Loft",
        slug: "amsterdam-founder-loft",
        description: "Founder breakfast, yatırımcı görüşmeleri ve küçük topluluk buluşmaları için sakin bir merkez.",
        country: "Netherlands",
        city: "Amsterdam",
        address: "De Pijp",
        coverImageUrl: "https://images.unsplash.com/photo-1497366811353-6870744d04b2",
        followerCount: 86,
        inviteCount: 16
      },
      {
        name: "London Community Studio",
        slug: "london-community-studio",
        description: "Demo geceleri, yaratıcı atölyeler ve küratörlü networking oturumları için esnek stüdyo.",
        country: "United Kingdom",
        city: "London",
        address: "Shoreditch",
        coverImageUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4",
        followerCount: 154,
        inviteCount: 31
      }
    ].map((place) => prisma.place.upsert({
      where: { slug: place.slug },
      update: {
        name: place.name,
        description: place.description,
        country: place.country,
        city: place.city,
        address: place.address,
        coverImageUrl: place.coverImageUrl,
        status: "active",
        updatedById: admin.id
      },
      create: { ...place, status: "active", createdById: admin.id, updatedById: admin.id }
    }))
  );

  await Promise.all(places.flatMap((place) => [
    prisma.placeMember.upsert({
      where: { placeId_userId: { placeId: place.id, userId: admin.id } },
      update: { status: "accepted", role: "organizer" },
      create: { placeId: place.id, userId: admin.id, status: "accepted", role: "organizer" }
    }),
    prisma.placeMember.upsert({
      where: { placeId_userId: { placeId: place.id, userId: demoUser.id } },
      update: { status: "accepted", role: "member" },
      create: { placeId: place.id, userId: demoUser.id, status: "accepted", role: "member" }
    }),
    prisma.placeFollow.upsert({
      where: { placeId_userId: { placeId: place.id, userId: demoUser.id } },
      update: {},
      create: { placeId: place.id, userId: demoUser.id }
    })
  ]));

  const tagConversations = [
    { id: "71000000-0000-4000-8000-000000000001", slug: "startup", body: "Bu hafta MVP doğrulama ve ilk kullanıcı görüşmeleri üzerine çalışan ekiplerle deneyim paylaşmak isterim." },
    { id: "71000000-0000-4000-8000-000000000002", slug: "networking", body: "İstanbul’daki ürün ve teknoloji topluluklarının yaklaşan buluşmalarını burada paylaşabiliriz." },
    { id: "71000000-0000-4000-8000-000000000003", slug: "yatirim", body: "Seed turuna hazırlanan ekipler için data room kontrol listesi ve yatırımcı görüşmesi notları paylaşacağım." },
    { id: "71000000-0000-4000-8000-000000000004", slug: "founder", body: "Kurucu olarak ekip büyütürken öğrendiğiniz en önemli dersi merak ediyorum. Benim için erken ve açık iletişim öne çıkıyor." }
  ];

  await prisma.contentComment.deleteMany({ where: { id: { in: ["seed-tag-comment-startup", "seed-tag-comment-networking", "seed-tag-comment-investment", "seed-tag-comment-founder"] } } });
  await Promise.all(tagConversations.map((comment) => prisma.contentComment.upsert({
    where: { id: comment.id },
    update: { targetId: getTagId(comment.slug), body: comment.body, status: "active", authorId: demoUser.id },
    create: { id: comment.id, targetType: "tag", targetId: getTagId(comment.slug), authorId: demoUser.id, body: comment.body, status: "active" }
  })));

  await prisma.event.deleteMany({ where: { slug: "eu-startup-networking-night" } });

  const mockEvents = [
    {
      title: "Global Startup Demo Night",
      slug: "global-startup-demo-night",
      summary: "Early-stage startup ekiplerinin ürünlerini kapalı community içinde sunduğu demo gecesi.",
      description:
        "Founder'lar beş dakikalık demo sunumları yapar, katılımcılar ürün geri bildirimi verir ve yatırımcılarla kontrollü networking alanında buluşur. Etkinlik open tipindedir ve Konnektora içinde attend akışıyla yönetilir.",
      startsInDays: 4,
      format: "hybrid",
      visibility: "open",
      city: "London",
      country: "United Kingdom",
      organizerName: "Konnektora Labs",
      coverImageUrl: "https://images.unsplash.com/photo-1556761175-b413da4baf72",
      tagSlugs: ["startup"]
    },
    {
      title: "AI Product Builders Breakfast",
      slug: "ai-product-builders-breakfast",
      summary: "AI ürün geliştiren founder ve product ekipleri için sabah buluşması.",
      description:
        "Kapalı community üyeleri ürün discovery, kullanıcı görüşmeleri ve go-to-market kararlarını tartışır. Katılım approval required olarak ayarlanmıştır; organizer katılım taleplerini guest list üzerinden onaylar.",
      startsInDays: 8,
      format: "offline",
      visibility: "approval_required",
      city: "Amsterdam",
      country: "Netherlands",
      organizerName: "Konnektora Product Circle",
      coverImageUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4",
      tagSlugs: ["startup"]
    },
    {
      title: "SaaS Growth Office Hours",
      slug: "saas-growth-office-hours",
      summary: "SaaS founder'ları için growth, pricing ve retention odaklı kapalı oturum.",
      description:
        "Katılımcılar kendi metriklerini getirir, küçük gruplarda problem çözme oturumlarına katılır ve deneyimli operator'lardan geri bildirim alır. Invite-only yapı, hassas metriklerin güvenli paylaşımı için tercih edilir.",
      startsInDays: 12,
      format: "online",
      visibility: "invite_only",
      city: null,
      country: null,
      organizerName: "Konnektora SaaS Guild",
      coverImageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978",
      tagSlugs: ["startup"]
    },
    {
      title: "Climate Tech Founder Roundtable",
      slug: "climate-tech-founder-roundtable",
      summary: "Climate tech girişimleri için yatırım, regülasyon ve pilot müşteri gündemi.",
      description:
        "Global founder'lar climate tech pazarındaki finansman dinamiklerini, kurumsal pilot süreçlerini ve community desteklerini konuşur. Session sonunda katılımcılar takip listelerine eklenebilir.",
      startsInDays: 17,
      format: "hybrid",
      visibility: "approval_required",
      city: "Berlin",
      country: "Germany",
      organizerName: "Konnektora Climate",
      coverImageUrl: "https://images.unsplash.com/photo-1497366811353-6870744d04b2",
      tagSlugs: ["startup"]
    },
    {
      title: "Founders & Operators Mixer",
      slug: "founders-operators-mixer",
      summary: "Founder, operator ve community liderleri için hızlı tanışma etkinliği.",
      description:
        "Konnektora matching mantığına uygun olarak katılımcılar ilgi alanı tag'lerine göre küçük gruplara ayrılır. Etkinlik boyunca invite ve follow aksiyonları öne çıkar.",
      startsInDays: 5,
      format: "offline",
      visibility: "open",
      city: "New York",
      country: "United States",
      organizerName: "Konnektora NYC",
      coverImageUrl: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622",
      tagSlugs: ["networking"]
    },
    {
      title: "Remote Builders Social",
      slug: "remote-builders-social",
      summary: "Remote çalışan builder'ların şehir bağımsız tanışma ve ortak çalışma buluşması.",
      description:
        "Online başlayan etkinlik, katılımcıların çalışma alanları ve proje hedeflerine göre breakout odalarına ayrılmasıyla devam eder. Internal attendance listesi etkinlik sonrası takip için kullanılır.",
      startsInDays: 9,
      format: "online",
      visibility: "open",
      city: null,
      country: null,
      organizerName: "Konnektora Remote",
      coverImageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f",
      tagSlugs: ["networking"]
    },
    {
      title: "Investor Coffee Chats",
      slug: "investor-coffee-chats",
      summary: "Yatırımcılar ve founder'lar arasında kontrollü bire bir tanışma saatleri.",
      description:
        "Katılımcılar kısa profilleriyle başvurur; organizer uygun eşleşmeleri onaylar ve guest list üzerinden invited/accepted durumlarını yönetir.",
      startsInDays: 15,
      format: "hybrid",
      visibility: "approval_required",
      city: "Paris",
      country: "France",
      organizerName: "Konnektora Capital",
      coverImageUrl: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7",
      tagSlugs: ["networking"]
    },
    {
      title: "Community Leaders Dinner",
      slug: "community-leaders-dinner",
      summary: "Global topluluk yöneticileri için invite-only akşam yemeği.",
      description:
        "Kapalı community moderasyon deneyimleri, event kalite standardı ve offline buluşma güvenliği konuşulur. Katılım yalnızca organizer davetiyle mümkündür.",
      startsInDays: 22,
      format: "offline",
      visibility: "invite_only",
      city: "Lisbon",
      country: "Portugal",
      organizerName: "Konnektora Community",
      coverImageUrl: "https://images.unsplash.com/photo-1528605248644-14dd04022da1",
      tagSlugs: ["networking"]
    },
    {
      title: "Seed Funding Readiness Clinic",
      slug: "seed-funding-readiness-clinic",
      summary: "Seed turuna hazırlanan startup'lar için pitch, metrik ve data room kliniği.",
      description:
        "Founder'lar yatırım hazırlıklarını uzmanlarla gözden geçirir. Event detail sayfasındaki guest list, yatırımcı ve founder rollerini takip etmek için kullanılır.",
      startsInDays: 6,
      format: "online",
      visibility: "approval_required",
      city: null,
      country: null,
      organizerName: "Konnektora Capital",
      coverImageUrl: "https://images.unsplash.com/photo-1551836022-d5d88e9218df",
      tagSlugs: ["yatirim"]
    },
    {
      title: "Angel Investor AMA",
      slug: "angel-investor-ama",
      summary: "Angel yatırımcılarla soru-cevap ve deal değerlendirme oturumu.",
      description:
        "Katılımcılar sorularını önceden gönderir, organizer soruları gruplar ve canlı oturumda cevapları yönetir. Attend listesi sonradan follow-up için saklanır.",
      startsInDays: 11,
      format: "online",
      visibility: "open",
      city: null,
      country: null,
      organizerName: "Konnektora Angels",
      coverImageUrl: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85",
      tagSlugs: ["yatirim"]
    },
    {
      title: "VC Reverse Pitch",
      slug: "vc-reverse-pitch",
      summary: "VC fonlarının thesis ve yatırım kriterlerini founder'lara anlattığı etkinlik.",
      description:
        "Bu formatta yatırımcılar sahneye çıkar ve founder'lar hangi fonla görüşmek istediklerini seçer. Guest list rolleri organizer, investor ve attendee olarak ayrıştırılır.",
      startsInDays: 19,
      format: "hybrid",
      visibility: "approval_required",
      city: "San Francisco",
      country: "United States",
      organizerName: "Konnektora VC Network",
      coverImageUrl: "https://images.unsplash.com/photo-1559136555-9303baea8ebd",
      tagSlugs: ["yatirim"]
    },
    {
      title: "Impact Capital Roundtable",
      slug: "impact-capital-roundtable",
      summary: "Impact yatırımcıları ve sosyal girişim founder'ları için yuvarlak masa.",
      description:
        "Katılımcılar etki ölçümü, yatırım yapısı ve global expansion konularını tartışır. Invite-only yapı, nitelikli ve dengeli katılımcı kompozisyonu sağlar.",
      startsInDays: 27,
      format: "offline",
      visibility: "invite_only",
      city: "Copenhagen",
      country: "Denmark",
      organizerName: "Konnektora Impact",
      coverImageUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d",
      tagSlugs: ["yatirim"]
    },
    {
      title: "Solo Founder Accountability Sprint",
      slug: "solo-founder-accountability-sprint",
      summary: "Solo founder'lar için haftalık hedef, ilerleme ve destek oturumu.",
      description:
        "Founder'lar haftalık hedeflerini paylaşır, diğer katılımcılarla eşleşir ve ilerleme takibi yapar. Konnektora internal attend listesi düzenli katılımı takip eder.",
      startsInDays: 3,
      format: "online",
      visibility: "open",
      city: null,
      country: null,
      organizerName: "Konnektora Founder Club",
      coverImageUrl: "https://images.unsplash.com/photo-1497366754035-f200968a6e72",
      tagSlugs: ["founder"]
    },
    {
      title: "Founder Mental Load Circle",
      slug: "founder-mental-load-circle",
      summary: "Founder'ların yalnızlık, stres ve karar yükünü konuştuğu kapalı circle.",
      description:
        "Güvenli bir ortamda deneyim paylaşımı yapılır. Invite-only görünürlük ve küçük guest list, oturum kalitesini korumak için kullanılır.",
      startsInDays: 13,
      format: "online",
      visibility: "invite_only",
      city: null,
      country: null,
      organizerName: "Konnektora Founder Care",
      coverImageUrl: "https://images.unsplash.com/photo-1543269865-cbf427effbad",
      tagSlugs: ["founder"]
    },
    {
      title: "Co-Founder Matching Lab",
      slug: "co-founder-matching-lab",
      summary: "Yeni proje kurmak isteyen founder adayları için kontrollü eşleşme lab'i.",
      description:
        "Katılımcılar yetkinlik, ilgi ve çalışma tarzına göre eşleştirilir. Organizer, approval_required akışında uygun profilleri kabul eder.",
      startsInDays: 20,
      format: "hybrid",
      visibility: "approval_required",
      city: "Toronto",
      country: "Canada",
      organizerName: "Konnektora Matching",
      coverImageUrl: "https://images.unsplash.com/photo-1556761175-4b46a572b786",
      tagSlugs: ["founder"]
    },
    {
      title: "Founder Story Night",
      slug: "founder-story-night",
      summary: "Founder'ların başarısızlık, pivot ve büyüme hikayelerini paylaştığı gece.",
      description:
        "Kısa sahne anlatımları ve sonrasında küçük grup konuşmaları yapılır. Similar events ve tag bağlantıları yeni keşifler için kullanılır.",
      startsInDays: 29,
      format: "offline",
      visibility: "open",
      city: "Istanbul",
      country: "Turkey",
      organizerName: "Konnektora Stories",
      coverImageUrl: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678",
      tagSlugs: ["founder"]
    }
  ] as const;

  for (const [index, event] of mockEvents.entries()) {
    const startsAt = new Date(Date.now() + day * event.startsInDays);
    const endsAt = new Date(startsAt.getTime() + 1000 * 60 * 60 * 3);
    const tagIds = event.tagSlugs.map(getTagId);

    const seededEvent = await prisma.event.upsert({
      where: { slug: event.slug },
      update: {
        title: event.title,
        summary: event.summary,
        description: event.description,
        status: "published",
        startsAt,
        endsAt,
        timezone: event.city ? "Europe/Istanbul" : "UTC",
        format: event.format,
        visibility: event.visibility,
        city: event.city,
        country: event.country,
        language: "en",
        organizerName: event.organizerName,
        externalRegistrationUrl: null,
        coverImageUrl: event.coverImageUrl,
        updatedById: admin.id,
        tags: {
          deleteMany: {},
          create: tagIds.map((tagId) => ({ tagId }))
        }
      },
      create: {
        title: event.title,
        slug: event.slug,
        summary: event.summary,
        description: event.description,
        status: "published",
        startsAt,
        endsAt,
        timezone: event.city ? "Europe/Istanbul" : "UTC",
        format: event.format,
        visibility: event.visibility,
        city: event.city,
        country: event.country,
        language: "en",
        organizerName: event.organizerName,
        externalRegistrationUrl: null,
        coverImageUrl: event.coverImageUrl,
        createdById: admin.id,
        updatedById: admin.id,
        participants: {
          create: [
            {
              userId: admin.id,
              status: "accepted",
              role: "organizer"
            },
            {
              userId: demoUser.id,
              status: index % 3 === 0 ? "invited" : "accepted",
              role: "attendee"
            }
          ]
        },
        tags: {
          create: tagIds.map((tagId) => ({ tagId }))
        }
      }
    });

    await Promise.all([
      prisma.eventParticipant.upsert({
        where: { eventId_userId: { eventId: seededEvent.id, userId: admin.id } },
        update: { status: "accepted", role: "organizer" },
        create: { eventId: seededEvent.id, userId: admin.id, status: "accepted", role: "organizer" }
      }),
      prisma.eventParticipant.upsert({
        where: { eventId_userId: { eventId: seededEvent.id, userId: demoUser.id } },
        update: {},
        create: {
          eventId: seededEvent.id,
          userId: demoUser.id,
          status: index % 3 === 0 ? "invited" : "accepted",
          role: "attendee"
        }
      })
    ]);
  }

  for (const tag of tags) {
    const usageCount = await prisma.eventTag.count({ where: { tagId: tag.id } });
    await prisma.tag.update({ where: { id: tag.id }, data: { usageCount } });
  }

  const seededUserMessages = [
    {
      id: "seed-user-message-faq",
      type: UserMessageType.faq,
      category: "Etkinlik oluşturma",
      name: "Elif Demir",
      email: "elif.demo@konnektora.local",
      phone: "+90 555 010 1001",
      body: "Etkinlik oluştururken davetli listesini sonradan toplu güncelleyebilir miyim?",
      status: UserMessageStatus.unread
    },
    {
      id: "seed-user-message-account-freeze",
      type: UserMessageType.account_freeze,
      category: "Geçici dondurma",
      userId: demoUser.id,
      name: "Konnektora User",
      email: "user@konnektora.local",
      phone: "+90 555 010 1002",
      body: "Hesabımı birkaç hafta dondurmak istiyorum. Etkinlik katılım geçmişim korunacak mı?",
      status: UserMessageStatus.read,
      readAt: new Date(Date.now() - day),
      readById: admin.id
    },
    {
      id: "seed-user-message-write-to-us",
      type: UserMessageType.write_to_us,
      category: "Geri bildirim",
      name: "Marcus Lee",
      email: "marcus.demo@konnektora.local",
      phone: "+44 20 0000 1003",
      body: "London community launch için partnerlik ve özel event akışı hakkında görüşmek istiyoruz.",
      status: UserMessageStatus.unread,
      appVersion: "web-mvp",
      systemInfo: "Seed message"
    }
  ];

  await prisma.userMessage.deleteMany({
    where: { id: { in: seededUserMessages.map((message) => message.id) } }
  });

  await prisma.userMessage.createMany({
    data: seededUserMessages
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
