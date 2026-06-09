import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, TagStatus } from "@prisma/client";
import { toSlug } from "../common/slug";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTagDto } from "./tags.dto";

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  listPublicTags() {
    return this.prisma.tag.findMany({
      where: { status: "active" },
      orderBy: [{ usageCount: "desc" }, { name: "asc" }]
    });
  }

  listAdminTags() {
    return this.prisma.tag.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: { category: true }
    });
  }

  listTagCategories() {
    return this.prisma.tagCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });
  }

  async createTag(input: CreateTagDto, userId?: string) {
    const slug = toSlug(input.name);
    await this.ensureSlugAvailable(slug);

    return this.prisma.tag.create({
      data: {
        name: input.name,
        slug,
        description: input.description ?? null,
        category: input.categoryId ? { connect: { id: input.categoryId } } : undefined,
        createdBy: userId ? { connect: { id: userId } } : undefined,
        updatedBy: userId ? { connect: { id: userId } } : undefined
      }
    });
  }

  async createUserTag(input: CreateTagDto, userId: string) {
    const slug = toSlug(input.name);
    const existing = await this.prisma.tag.findUnique({ where: { slug } });

    if (existing) {
      return existing;
    }

    return this.prisma.tag.create({
      data: {
        name: input.name.trim(),
        slug,
        description: input.description?.trim() || null,
        category: input.categoryId ? { connect: { id: input.categoryId } } : undefined,
        status: TagStatus.active,
        createdBy: { connect: { id: userId } },
        updatedBy: { connect: { id: userId } }
      }
    });
  }

  async updateTag(id: string, input: Partial<CreateTagDto>, userId?: string) {
    const existing = await this.prisma.tag.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException("Tag bulunamadı.");
    }

    const data: Prisma.TagUpdateInput = {
      description: input.description,
      updatedBy: userId ? { connect: { id: userId } } : undefined
    };

    if (input.name && input.name !== existing.name) {
      const slug = toSlug(input.name);
      await this.ensureSlugAvailable(slug, id);
      data.name = input.name;
      data.slug = slug;
    }

    if (input.categoryId !== undefined) {
      data.category = input.categoryId ? { connect: { id: input.categoryId } } : { disconnect: true };
    }

    return this.prisma.tag.update({ where: { id }, data });
  }

  archiveTag(id: string, userId?: string) {
    return this.prisma.tag.update({
      where: { id },
      data: {
        status: TagStatus.archived,
        updatedBy: userId ? { connect: { id: userId } } : undefined
      }
    });
  }

  private async ensureSlugAvailable(slug: string, currentId?: string) {
    const existing = await this.prisma.tag.findUnique({ where: { slug } });

    if (existing && existing.id !== currentId) {
      throw new ConflictException("Bu tag adı zaten kullanılıyor.");
    }
  }
}
