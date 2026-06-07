import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

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

  await prisma.event.upsert({
    where: { slug: "eu-startup-networking-night" },
    update: {},
    create: {
      title: "EU Startup Networking Night",
      slug: "eu-startup-networking-night",
      summary: "Avrupa ekosisteminden founder, yatırımcı ve topluluk liderlerini buluşturan networking etkinliği.",
      description:
        "Konnektora'nın ilk MVP etkinlik örneği. Katılımcılar yeni bağlantılar kurabilir, startup ekosistemindeki fırsatları keşfedebilir ve ilgili topluluklarla tanışabilir.",
      status: "published",
      startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      timezone: "Europe/Istanbul",
      format: "hybrid",
      city: "Berlin",
      country: "Germany",
      language: "en",
      organizerName: "Konnektora",
      externalRegistrationUrl: "https://konnektora.example/events/eu-startup-networking-night",
      createdById: admin.id,
      updatedById: admin.id,
      participants: {
        create: {
          userId: demoUser.id,
          status: "accepted",
          role: "attendee"
        }
      },
      tags: {
        create: tags.map((tag) => ({ tagId: tag.id }))
      }
    }
  });

  for (const tag of tags) {
    const usageCount = await prisma.eventTag.count({ where: { tagId: tag.id } });
    await prisma.tag.update({ where: { id: tag.id }, data: { usageCount } });
  }
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
