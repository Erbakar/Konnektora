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

  async getAdminTag(id: string) {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
      include: {
        category: true,
        createdBy: { select: { id: true, email: true, name: true, role: true, status: true } },
        updatedBy: { select: { id: true, email: true, name: true, role: true, status: true } },
        _count: {
          select: {
            events: true,
            interestedUsers: true
          }
        }
      }
    });

    if (!tag) {
      throw new NotFoundException("Tag bulunamadı.");
    }

    const reportCount = await this.prisma.contentReport.count({
      where: { targetType: "tag", targetId: id }
    });

    return {
      ...tag,
      reportCount
    };
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

  banTag(id: string, userId?: string) {
    return this.prisma.tag.update({
      where: { id },
      data: {
        status: TagStatus.hidden,
        updatedBy: userId ? { connect: { id: userId } } : undefined
      }
    });
  }

  async mergeTag(sourceTagId: string, targetTagId: string, userId?: string) {
    if (sourceTagId === targetTagId) {
      throw new ConflictException("Bir tag kendi içine merge edilemez.");
    }

    const [sourceTag, targetTag] = await Promise.all([
      this.prisma.tag.findUnique({ where: { id: sourceTagId } }),
      this.prisma.tag.findUnique({ where: { id: targetTagId } })
    ]);

    if (!sourceTag || !targetTag) {
      throw new NotFoundException("Merge edilecek tag bulunamadı.");
    }

    return this.prisma.$transaction(async (tx) => {
      const sourceEventTags = await tx.eventTag.findMany({ where: { tagId: sourceTagId } });
      const sourceInterestTags = await tx.userInterestTag.findMany({ where: { tagId: sourceTagId } });

      for (const eventTag of sourceEventTags) {
        await tx.eventTag.upsert({
          where: { eventId_tagId: { eventId: eventTag.eventId, tagId: targetTagId } },
          create: { eventId: eventTag.eventId, tagId: targetTagId },
          update: {}
        });
      }

      for (const interestTag of sourceInterestTags) {
        await tx.userInterestTag.upsert({
          where: { userId_tagId: { userId: interestTag.userId, tagId: targetTagId } },
          create: { userId: interestTag.userId, tagId: targetTagId },
          update: {}
        });
      }

      await tx.eventTag.deleteMany({ where: { tagId: sourceTagId } });
      await tx.userInterestTag.deleteMany({ where: { tagId: sourceTagId } });
      await tx.contentReport.updateMany({
        where: { targetType: "tag", targetId: sourceTagId },
        data: { targetId: targetTagId }
      });

      const usageCount = await tx.eventTag.count({ where: { tagId: targetTagId } });

      await tx.tag.update({
        where: { id: targetTagId },
        data: {
          usageCount,
          updatedBy: userId ? { connect: { id: userId } } : undefined
        }
      });

      return tx.tag.update({
        where: { id: sourceTagId },
        data: {
          status: TagStatus.archived,
          usageCount: 0,
          updatedBy: userId ? { connect: { id: userId } } : undefined
        }
      });
    });
  }

  private async ensureSlugAvailable(slug: string, currentId?: string) {
    const existing = await this.prisma.tag.findUnique({ where: { slug } });

    if (existing && existing.id !== currentId) {
      throw new ConflictException("Bu tag adı zaten kullanılıyor.");
    }
  }
}
