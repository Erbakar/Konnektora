import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, TagStatus, User } from "@prisma/client";
import { toSlug } from "../common/slug";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTagDto } from "./tags.dto";

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublicTags(userId?: string) {
    const blocks = userId
      ? await this.prisma.userBlock.findMany({ where: { userId, targetType: "tag" }, select: { targetId: true } })
      : [];
    return this.prisma.tag.findMany({
      where: { status: "active", id: { notIn: blocks.map((block) => block.targetId) } },
      orderBy: [{ usageCount: "desc" }, { name: "asc" }]
    });
  }

  async listTagComments(tagId: string, userId?: string) {
    await this.ensureTagVisible(tagId, userId);
    const blockedUserIds = userId
      ? (await this.prisma.userBlock.findMany({ where: { userId, targetType: "user" }, select: { targetId: true } })).map((block) => block.targetId)
      : [];
    const comments = await this.prisma.contentComment.findMany({
      where: {
        targetType: "tag",
        targetId: tagId,
        parentId: null,
        status: "active",
        authorId: { notIn: blockedUserIds }
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { author: { select: { id: true, name: true, username: true } } }
    });
    return comments.map((comment) => ({
      id: comment.id,
      tagId,
      body: comment.body,
      likeCount: comment.likeCount,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      canDelete: comment.authorId === userId,
      author: comment.author
    }));
  }

  async createTagComment(tagId: string, body: string, userId: string) {
    await this.ensureTagVisible(tagId, userId);
    const comment = await this.prisma.contentComment.create({
      data: { targetType: "tag", targetId: tagId, authorId: userId, body: body.trim() },
      include: { author: { select: { id: true, name: true, username: true } } }
    });
    return {
      id: comment.id,
      tagId,
      body: comment.body,
      likeCount: comment.likeCount,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      canDelete: true,
      author: comment.author
    };
  }

  async deleteTagComment(tagId: string, commentId: string, user: User) {
    const comment = await this.prisma.contentComment.findFirst({
      where: { id: commentId, targetType: "tag", targetId: tagId, status: "active" },
      select: { id: true, authorId: true }
    });
    if (!comment) throw new NotFoundException("Yorum bulunamadı.");
    if (comment.authorId !== user.id && !["admin", "super_admin"].includes(user.role)) {
      throw new ForbiddenException("Bu yorum kaldırılamaz.");
    }
    await this.prisma.contentComment.update({ where: { id: comment.id }, data: { status: "deleted" } });
    return { ok: true as const };
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

    const [reportCount, likeCount, okCount, dislikeCount, commentCount, viewCount, viewerCount, firstComment] = await Promise.all([
      this.prisma.contentReport.count({ where: { targetType: "tag", targetId: id } }),
      this.prisma.contentReaction.count({ where: { targetType: "tag", targetId: id, reaction: "like" } }),
      this.prisma.contentReaction.count({ where: { targetType: "tag", targetId: id, reaction: "ok" } }),
      this.prisma.contentReaction.count({ where: { targetType: "tag", targetId: id, reaction: "dislike" } }),
      this.prisma.contentComment.count({ where: { targetType: "tag" as any, targetId: id } }),
      this.prisma.contentView.count({ where: { targetType: "tag" as any, targetId: id } }),
      this.prisma.contentView
        .findMany({ where: { targetType: "tag" as any, targetId: id, userId: { not: null } }, distinct: ["userId"], select: { userId: true } })
        .then((items) => items.length),
      this.prisma.contentComment.findFirst({
        where: { targetType: "tag" as any, targetId: id },
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, email: true, name: true, role: true, status: true } } }
      })
    ]);

    return {
      ...tag,
      reportCount,
      likeCount,
      okCount,
      dislikeCount,
      commentCount,
      viewCount,
      viewerCount,
      firstCommenter: firstComment?.author ?? null,
      firstProfileUser: tag.createdBy
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

  private async ensureTagVisible(tagId: string, userId?: string) {
    const tag = await this.prisma.tag.findFirst({ where: { id: tagId, status: "active" }, select: { id: true } });
    if (!tag) throw new NotFoundException("Tag bulunamadı.");
    if (userId) {
      const block = await this.prisma.userBlock.findUnique({
        where: { userId_targetType_targetId: { userId, targetType: "tag", targetId: tagId } },
        select: { userId: true }
      });
      if (block) throw new NotFoundException("Tag bulunamadı.");
    }
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

      if ((tx as any).notification) {
        await (tx as any).notification.createMany({
          data: sourceInterestTags.map((interestTag) => ({
            userId: interestTag.userId,
            type: "tag_merge",
            title: "İlgi alanı taşındı",
            body: `${sourceTag.name} ilgi alanı ${targetTag.name} altında birleştirildi.`,
            targetType: "tag",
            targetId: targetTagId
          })),
          skipDuplicates: true
        });
      }

      if ((tx as any).adminActivityLog) {
        await (tx as any).adminActivityLog.create({
          data: {
            actorId: userId ?? null,
            action: "tag_merged_with_simulated_notifications",
            targetType: "tag",
            targetId: sourceTagId,
            note: `${sourceTag.name} -> ${targetTag.name}`,
            metadata: {
              sourceTagId,
              targetTagId,
              movedEvents: sourceEventTags.length,
              movedInterests: sourceInterestTags.length,
              notificationMode: "simulated"
            }
          }
        });
      }

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
