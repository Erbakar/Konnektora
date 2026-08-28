import { NotFoundException } from "@nestjs/common";
import { CmsService } from "./cms.service";

describe("CmsService category and FAQ management", () => {
  const cmsCategory = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const faq = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const announcement = { findMany: jest.fn(), create: jest.fn() };
  const service = new CmsService({ cmsCategory, faq, announcement } as never);

  beforeEach(() => jest.clearAllMocks());

  it("creates and lists a Write to us category", async () => {
    cmsCategory.findUnique.mockResolvedValue(null);
    cmsCategory.create.mockResolvedValue({
      id: "category-1",
      name: "İş birliği",
      slug: "is-birligi",
      type: "write_to_us",
      status: "active",
    });
    await service.createCategory({
      name: "İş birliği",
      type: "write_to_us",
    });
    expect(cmsCategory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "write_to_us" }),
      }),
    );

    cmsCategory.findMany.mockResolvedValue([]);
    await service.listPublicSupportCategories("write_to_us");
    expect(cmsCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "active", type: "write_to_us" },
      }),
    );
  });

  it("removes an existing category", async () => {
    cmsCategory.findUnique.mockResolvedValue({ id: "category-1" });
    await expect(service.deleteCategory("category-1")).resolves.toEqual({ ok: true });
    expect(cmsCategory.delete).toHaveBeenCalledWith({ where: { id: "category-1" } });
  });

  it("creates an FAQ only in an FAQ category", async () => {
    cmsCategory.findUnique.mockResolvedValue({ id: "faq-category", type: "faq" });
    faq.create.mockResolvedValue({ id: "faq-1" });
    await service.createFaq({
      categoryId: "faq-category",
      title: "Nasıl kullanılır?",
      body: "Açıklama",
    });
    expect(faq.create).toHaveBeenCalled();

    cmsCategory.findUnique.mockResolvedValue({
      id: "contact-category",
      type: "write_to_us",
    });
    await expect(
      service.createFaq({
        categoryId: "contact-category",
        title: "Yanlış kategori",
        body: "Açıklama",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("returns active admin announcements without requiring CMS permissions", async () => {
    announcement.findMany.mockResolvedValue([]);
    await service.listActiveAdminAnnouncements({
      id: "admin-1",
      role: "admin",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      lastOnlineAt: new Date("2026-08-01T00:00:00Z"),
    } as never, "web");
    expect(announcement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "active",
          target: "admins",
          publishAt: { lte: expect.any(Date) },
        }),
      }),
    );
  });

  it("stores both Turkish and English announcement content", async () => {
    announcement.create.mockResolvedValue({ id: "announcement-bilingual" });
    await service.createAnnouncement({
      title: "Yeni keşif deneyimi",
      body: "Etkinlikleri daha kolay keşfedin.",
      titleEn: "A new discovery experience",
      bodyEn: "Discover events more easily.",
    });
    expect(announcement.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        title: "Yeni keşif deneyimi",
        body: "Etkinlikleri daha kolay keşfedin.",
        titleEn: "A new discovery experience",
        bodyEn: "Discover events more easily.",
      }),
    }));
  });

  it("applies last-login, join-date and app-version filters before returning an announcement", async () => {
    const base = {
      id: "announcement-1",
      title: "Hedefli duyuru",
      body: "İçerik",
      target: "members",
      status: "active",
      publishMode: "login_window",
      publishAt: new Date("2026-07-01T00:00:00Z"),
      expiresAt: null,
      createdAt: new Date("2026-07-01T00:00:00Z"),
      updatedAt: new Date("2026-07-01T00:00:00Z"),
      targetLastLoginFrom: new Date("2026-08-01T00:00:00Z"),
      targetLastLoginTo: new Date("2026-08-31T23:59:59Z"),
      targetJoinedFrom: new Date("2026-01-01T00:00:00Z"),
      targetJoinedTo: new Date("2026-06-30T23:59:59Z"),
      targetAppVersion: "web-2.4.0",
    };
    announcement.findMany.mockResolvedValue([base]);
    const member: any = {
      id: "member-1",
      role: "user",
      accountType: "individual",
      createdAt: new Date("2026-04-10T00:00:00Z"),
      lastOnlineAt: new Date("2026-08-20T00:00:00Z"),
    };

    await expect(service.listPublicAnnouncements(member, "web-2.4.0")).resolves.toHaveLength(1);
    await expect(service.listPublicAnnouncements(member, "web-2.3.9")).resolves.toHaveLength(0);
    await expect(service.listPublicAnnouncements({ ...member, lastOnlineAt: new Date("2026-07-20T00:00:00Z") }, "web-2.4.0")).resolves.toHaveLength(0);
  });

  it("does not expose constrained announcements to logged-out visitors", async () => {
    announcement.findMany.mockResolvedValue([{
      id: "announcement-2",
      title: "Yeni üyeler",
      body: "İçerik",
      target: "all",
      status: "active",
      publishMode: "after_signup",
      publishAt: new Date("2026-07-01T00:00:00Z"),
      expiresAt: null,
      createdAt: new Date("2026-07-01T00:00:00Z"),
      updatedAt: new Date("2026-07-01T00:00:00Z"),
      targetLastLoginFrom: null,
      targetLastLoginTo: null,
      targetJoinedFrom: new Date("2026-07-01T00:00:00Z"),
      targetJoinedTo: null,
      targetAppVersion: null,
    }]);

    await expect(service.listPublicAnnouncements(undefined, "web")).resolves.toHaveLength(0);
  });
});
