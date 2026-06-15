import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { toSlug } from "../common/slug";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateAnnouncementDto,
  CreateCmsCategoryDto,
  CreateFaqDto,
  UpdateAnnouncementDto,
  UpdateCmsCategoryDto,
  UpdateFaqDto,
  UpsertPolicyDto
} from "./cms.dto";

@Injectable()
export class CmsService {
  constructor(private readonly prisma: PrismaService) {}

  listPublicFaqs() {
    return this.prisma.faq.findMany({
      where: { status: "active", category: { status: "active" } },
      orderBy: [{ category: { name: "asc" } }, { createdAt: "desc" }],
      include: { category: true }
    });
  }

  listPublicAnnouncements() {
    const now = new Date();

    return this.prisma.announcement.findMany({
      where: {
        status: "active",
        publishAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
      },
      orderBy: [{ publishAt: "desc" }, { createdAt: "desc" }]
    });
  }

  async getPublicPolicy(type: string) {
    const policy = await this.prisma.cmsPolicy.findFirst({
      where: { type, status: "active" }
    });

    if (!policy) {
      throw new NotFoundException("Policy sayfası bulunamadı.");
    }

    return policy;
  }

  listCategories() {
    return this.prisma.cmsCategory.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: { _count: { select: { faqs: true } } }
    });
  }

  async createCategory(input: CreateCmsCategoryDto) {
    const slug = toSlug(input.name);
    await this.ensureCategorySlugAvailable(slug);

    return this.prisma.cmsCategory.create({
      data: {
        name: input.name.trim(),
        slug,
        description: input.description?.trim() || null
      },
      include: { _count: { select: { faqs: true } } }
    });
  }

  async updateCategory(id: string, input: UpdateCmsCategoryDto) {
    const existing = await this.prisma.cmsCategory.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException("CMS kategorisi bulunamadı.");
    }

    const data: { name?: string; slug?: string; description?: string | null; status?: string } = {
      description: input.description === undefined ? undefined : input.description?.trim() || null,
      status: input.status
    };

    if (input.name && input.name !== existing.name) {
      const slug = toSlug(input.name);
      await this.ensureCategorySlugAvailable(slug, id);
      data.name = input.name.trim();
      data.slug = slug;
    }

    return this.prisma.cmsCategory.update({
      where: { id },
      data,
      include: { _count: { select: { faqs: true } } }
    });
  }

  listFaqs() {
    return this.prisma.faq.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { category: true }
    });
  }

  async createFaq(input: CreateFaqDto) {
    await this.ensureCategoryExists(input.categoryId);

    return this.prisma.faq.create({
      data: {
        categoryId: input.categoryId,
        title: input.title.trim(),
        body: input.body.trim()
      },
      include: { category: true }
    });
  }

  async updateFaq(id: string, input: UpdateFaqDto) {
    const existing = await this.prisma.faq.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException("SSS bulunamadı.");
    }

    if (input.categoryId) {
      await this.ensureCategoryExists(input.categoryId);
    }

    return this.prisma.faq.update({
      where: { id },
      data: {
        categoryId: input.categoryId,
        title: input.title?.trim(),
        body: input.body?.trim(),
        status: input.status
      },
      include: { category: true }
    });
  }

  listAnnouncements() {
    return this.prisma.announcement.findMany({
      orderBy: [{ status: "asc" }, { publishAt: "desc" }, { createdAt: "desc" }]
    });
  }

  createAnnouncement(input: CreateAnnouncementDto) {
    return this.prisma.announcement.create({
      data: {
        title: input.title.trim(),
        body: input.body.trim(),
        target: input.target ?? "all",
        publishAt: input.publishAt ? new Date(input.publishAt) : new Date(),
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null
      }
    });
  }

  async updateAnnouncement(id: string, input: UpdateAnnouncementDto) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException("Duyuru bulunamadı.");
    }

    return this.prisma.announcement.update({
      where: { id },
      data: {
        title: input.title?.trim(),
        body: input.body?.trim(),
        target: input.target,
        status: input.status,
        publishAt: input.publishAt ? new Date(input.publishAt) : undefined,
        expiresAt: input.expiresAt === undefined ? undefined : input.expiresAt ? new Date(input.expiresAt) : null
      }
    });
  }

  listPolicies() {
    return this.prisma.cmsPolicy.findMany({
      orderBy: [{ type: "asc" }]
    });
  }

  upsertPolicy(input: UpsertPolicyDto) {
    const status = input.status ?? "active";
    const publishedAt = status === "active" ? new Date() : null;

    return this.prisma.cmsPolicy.upsert({
      where: { type: input.type },
      create: {
        type: input.type,
        title: input.title.trim(),
        body: input.body.trim(),
        status,
        publishedAt
      },
      update: {
        title: input.title.trim(),
        body: input.body.trim(),
        status,
        publishedAt
      }
    });
  }

  private async ensureCategorySlugAvailable(slug: string, currentId?: string) {
    const existing = await this.prisma.cmsCategory.findUnique({ where: { slug } });

    if (existing && existing.id !== currentId) {
      throw new ConflictException("Bu CMS kategori adı zaten kullanılıyor.");
    }
  }

  private async ensureCategoryExists(id: string) {
    const existing = await this.prisma.cmsCategory.findUnique({ where: { id }, select: { id: true } });

    if (!existing) {
      throw new NotFoundException("CMS kategorisi bulunamadı.");
    }
  }
}
