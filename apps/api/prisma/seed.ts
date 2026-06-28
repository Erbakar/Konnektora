import { PrismaClient, UserMessageStatus, UserMessageType } from "@prisma/client";
import { hash } from "bcryptjs";

if (!process.env.DATABASE_URL && process.env.NETLIFY_DB_URL) {
  process.env.DATABASE_URL = process.env.NETLIFY_DB_URL;
}

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@konnektora.local" },
    update: {},
    create: {
      email: "admin@konnektora.local",
      name: "Konnektora Admin",
      passwordHash: await hash("ChangeMe123!", 10),
      role: "super_admin"
    }
  });

  const demoUser = await prisma.user.upsert({
    where: { email: "user@konnektora.local" },
    update: {},
    create: {
      email: "user@konnektora.local",
      name: "Konnektora User",
      passwordHash: await hash("ChangeMe123!", 10),
      role: "user"
    }
  });

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
      { name: "Startup", slug: "startup", categoryId: sector.id },
      { name: "Networking", slug: "networking", categoryId: format.id },
      { name: "Yatırım", slug: "yatirim", categoryId: sector.id },
      { name: "Founder", slug: "founder", categoryId: audience.id }
    ].map((tag) =>
      prisma.tag.upsert({
        where: { slug: tag.slug },
        update: { name: tag.name, categoryId: tag.categoryId, status: "active" },
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

    await prisma.event.upsert({
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
        },
        participants: {
          deleteMany: {},
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
