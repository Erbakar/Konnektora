import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, TagStatus, User } from "@prisma/client";
import { toSlug } from "../common/slug";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTagDto } from "./tags.dto";

const tagAuthorSelect = {
  id: true,
  name: true,
  username: true,
  uploadedMedia: {
    where: { contentType: "user", status: "active", isProfilePicture: true },
    take: 1,
    select: { url: true },
  },
} as const;

function tagAuthor(
  author: {
    id: string;
    name: string;
    username: string | null;
    uploadedMedia?: Array<{ url: string }>;
  } | null,
) {
  if (!author) return null;
  return {
    id: author.id,
    name: author.name,
    username: author.username,
    avatarUrl: author.uploadedMedia?.[0]?.url ?? null,
  };
}

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublicTags(
    userId?: string,
    filters: {
      createdFrom?: string;
      createdTo?: string;
      country?: string;
      city?: string;
    } = {},
  ) {
    const blocks = userId
      ? await this.prisma.userBlock.findMany({
          where: { userId, targetType: "tag" },
          select: { targetId: true },
        })
      : [];
    const createdFrom = filters.createdFrom ? new Date(filters.createdFrom) : null;
    const createdTo = filters.createdTo ? new Date(`${filters.createdTo}T23:59:59.999Z`) : null;
    const where: Prisma.TagWhereInput = {
      status: "active",
      id: { notIn: blocks.map((block) => block.targetId) },
      ...(createdFrom && !Number.isNaN(createdFrom.getTime()) || createdTo && !Number.isNaN(createdTo.getTime())
        ? {
            createdAt: {
              ...(createdFrom && !Number.isNaN(createdFrom.getTime()) ? { gte: createdFrom } : {}),
              ...(createdTo && !Number.isNaN(createdTo.getTime()) ? { lte: createdTo } : {}),
            },
          }
        : {}),
      ...(filters.country?.trim() || filters.city?.trim()
        ? {
            createdBy: {
              is: {
                ...(filters.country?.trim()
                  ? { country: { equals: filters.country.trim(), mode: "insensitive" as const } }
                  : {}),
                ...(filters.city?.trim()
                  ? { city: { equals: filters.city.trim(), mode: "insensitive" as const } }
                  : {}),
              },
            },
          }
        : {}),
    };
    const tags = await this.prisma.tag.findMany({
      where,
      orderBy: [{ usageCount: "desc" }, { name: "asc" }],
      include: { _count: { select: { events: { where: { event: { status: "published", startsAt: { gte: new Date() } } } }, places: { where: { place: { status: "active" } } } } } },
    });
    return tags.map(({ _count, ...tag }) => ({ ...tag, eventCount: _count.events, placeCount: _count.places }));
  }

  async listTagComments(tagId: string, userId?: string) {
    await this.ensureTagVisible(tagId, userId);
    const blockedUserIds = userId
      ? (
          await this.prisma.userBlock.findMany({
            where: { userId, targetType: "user" },
            select: { targetId: true },
          })
        ).map((block) => block.targetId)
      : [];
    const comments = await this.prisma.contentComment.findMany({
      where: {
        targetType: "tag",
        targetId: tagId,
        parentId: null,
        status: "active",
        authorId: { notIn: blockedUserIds },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { author: { select: tagAuthorSelect } },
    });
    const ids = comments.map((comment) => comment.id);
    const [media, liked, replyCounts] = await Promise.all([
      ids.length
        ? this.prisma.mediaFile.findMany({
            where: {
              contentType: "tag_comment",
              contentId: { in: ids },
              status: "active",
            },
            orderBy: { sortOrder: "asc" },
          })
        : [],
      userId && ids.length
        ? this.prisma.contentReaction.findMany({
            where: {
              targetType: "tag_comment",
              targetId: { in: ids },
              userId,
              reaction: "like",
            },
            select: { targetId: true },
          })
        : [],
      ids.length ? this.prisma.contentComment.groupBy({ by: ["targetId"], where: { targetType: "tag_comment", targetId: { in: ids }, status: "active" }, _count: { _all: true } }) : [],
    ]);
    const likedIds = new Set(liked.map((item) => item.targetId));
    return comments.map((comment) => ({
      id: comment.id,
      tagId,
      body: comment.body,
      likeCount: comment.likeCount,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      canDelete: comment.authorId === userId,
      author: tagAuthor(comment.author),
      liked: likedIds.has(comment.id),
      replyCount: replyCounts.find((item) => item.targetId === comment.id)?._count._all ?? 0,
      media: media
        .filter((item) => item.contentId === comment.id)
        .map((item) => ({ id: item.id, url: item.url, type: item.type })),
    }));
  }

  async listRelatedUsers(tagId: string, viewerId?: string) {
    await this.ensureTagVisible(tagId, viewerId);
    const userSelect = {
      id: true,
      name: true,
      username: true,
      city: true,
      country: true,
      gender: true,
      birthDate: true,
      profileVerifiedAt: true,
      uploadedMedia: { where: { contentType: "user", status: "active", isProfilePicture: true }, select: { url: true }, take: 1 },
      privacySettings: { select: { demographicsAudience: true, locationAudience: true } },
      interestTags: { select: { tagId: true } },
    } as const;
    const [interests, posts, viewerInterests] = await Promise.all([
      this.prisma.userInterestTag.findMany({
        where: { tagId, user: { status: "active" } },
        take: 100,
        include: { user: { select: userSelect } },
      }),
      this.prisma.contentComment.findMany({
        where: {
          targetType: "tag",
          targetId: tagId,
          status: "active",
          author: { status: "active" },
        },
        distinct: ["authorId"],
        take: 100,
        include: { author: { select: userSelect } },
      }),
      viewerId ? this.prisma.userInterestTag.findMany({ where: { userId: viewerId }, select: { tagId: true } }) : [],
    ]);
    const viewerTagIds = new Set(viewerInterests.map((item) => item.tagId));
    const present = (member: (typeof interests)[number]["user"]) => ({
      id: member.id,
      name: member.name,
      username: member.username,
      city: viewerId === member.id ? member.city : null,
      country: viewerId === member.id ? member.country : null,
      gender: viewerId === member.id || member.privacySettings?.demographicsAudience === "everybody" ? member.gender : null,
      birthDate: viewerId === member.id || member.privacySettings?.demographicsAudience === "everybody" ? member.birthDate : null,
      profileVerifiedAt: member.profileVerifiedAt,
      avatarUrl: member.uploadedMedia?.[0]?.url ?? null,
      commonTagCount: (member.interestTags ?? []).filter((item) => viewerTagIds.has(item.tagId)).length,
    });
    const users = new Map<
      string,
      {
        id: string;
        name: string;
        username: string | null;
        city: string | null;
        country: string | null;
        gender: string | null;
        birthDate: Date | null;
        profileVerifiedAt: Date | null;
        avatarUrl: string | null;
        commonTagCount: number;
        sentiment?: string;
        relation: string;
        checkedIn: boolean;
      }
    >();
    for (const interest of interests)
      users.set(interest.user.id, {
        ...present(interest.user),
        relation: "ilgileniyor",
        sentiment: interest.sentiment,
        checkedIn: false,
      });
    for (const post of posts) {
      if (!post.author) continue;
      users.set(post.author.id, {
        ...present(post.author),
        relation: users.has(post.author.id)
          ? "ilgileniyor · paylaşım yaptı"
          : "paylaşım yaptı",
        checkedIn: false,
      });
    }
    return [...users.values()];
  }

  async getPublicStats(tagId: string, user: User) {
    if (!["admin", "super_admin", "curator"].includes(user.role)) throw new ForbiddenException("Etiket istatistiklerini görüntüleme yetkiniz yok.");
    await this.ensureTagVisible(tagId, user.id);
    const [events, places, sentiments, posts, views, reactionSummary] = await Promise.all([
      this.prisma.eventTag.count({
        where: { tagId, event: { status: "published" } },
      }),
      this.prisma.placeTag.count({
        where: { tagId, place: { status: "active" } },
      }),
      this.prisma.userInterestTag.groupBy({
        by: ["sentiment"],
        where: { tagId },
        _count: { _all: true },
      }),
      this.prisma.contentComment.count({
        where: { targetType: "tag", targetId: tagId, status: "active" },
      }),
      this.prisma.contentView.count({
        where: { targetType: "tag", targetId: tagId },
      }),
      this.prisma.contentComment.aggregate({
        where: { targetType: "tag", targetId: tagId, status: "active" },
        _sum: { likeCount: true },
      }),
    ]);
    const sentimentCount = (sentiment: string) => sentiments.find((item) => item.sentiment === sentiment)?._count._all ?? 0;
    const likes = sentimentCount("like");
    const ok = sentimentCount("ok");
    const dislikes = sentimentCount("dislike");
    const reactions = reactionSummary._sum.likeCount ?? 0;
    return {
      events,
      places,
      followers: likes + ok,
      likes,
      ok,
      dislikes,
      posts,
      views,
      reactions,
      engagementRate: views > 0 ? Math.round((posts + reactions) / views * 100) : 0,
    };
  }

  async toggleCommentLike(commentId: string, userId: string) {
    const comment = await this.prisma.contentComment.findFirst({
      where: { id: commentId, targetType: "tag", status: "active" },
      select: { id: true },
    });
    if (!comment) throw new NotFoundException("Gönderi bulunamadı.");
    const key = {
      targetType_targetId_userId_reaction: {
        targetType: "tag_comment" as const,
        targetId: commentId,
        userId,
        reaction: "like",
      },
    };
    const existing = await this.prisma.contentReaction.findUnique({
      where: key,
    });
    await this.prisma.$transaction(
      existing
        ? [
            this.prisma.contentReaction.delete({ where: key }),
            this.prisma.contentComment.update({
              where: { id: commentId },
              data: { likeCount: { decrement: 1 } },
            }),
          ]
        : [
            this.prisma.contentReaction.create({
              data: {
                targetType: "tag_comment",
                targetId: commentId,
                userId,
                reaction: "like",
              },
            }),
            this.prisma.contentComment.update({
              where: { id: commentId },
              data: { likeCount: { increment: 1 } },
            }),
          ],
    );
    return { liked: !existing };
  }

  async addCommentMedia(
    commentId: string,
    user: User,
    url: string,
    type: "image" | "video",
  ) {
    const comment = await this.prisma.contentComment.findFirst({
      where: { id: commentId, targetType: "tag", status: "active" },
      select: { authorId: true },
    });
    if (!comment) throw new NotFoundException("Gönderi bulunamadı.");
    if (
      comment.authorId !== user.id &&
      !["admin", "super_admin"].includes(user.role)
    )
      throw new ForbiddenException("Bu gönderiye medya ekleyemezsiniz.");
    const count = await this.prisma.mediaFile.count({
      where: {
        contentType: "tag_comment",
        contentId: commentId,
        status: "active",
      },
    });
    if (count >= 4)
      throw new ConflictException(
        "Bir gönderiye en fazla 4 medya eklenebilir.",
      );
    return this.prisma.mediaFile.create({
      data: {
        contentType: "tag_comment",
        contentId: commentId,
        uploadedById: user.id,
        url,
        type,
        sortOrder: count,
      },
    });
  }

  async createTagComment(tagId: string, body: string, userId: string) {
    await this.ensureTagVisible(tagId, userId);
    const comment = await this.prisma.contentComment.create({
      data: {
        targetType: "tag",
        targetId: tagId,
        authorId: userId,
        body: body.trim().replace(/\n{3,}/g, "\n\n"),
      },
      include: { author: { select: tagAuthorSelect } },
    });
    return {
      id: comment.id,
      tagId,
      body: comment.body,
      likeCount: comment.likeCount,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      canDelete: true,
      author: tagAuthor(comment.author),
    };
  }

  async updateTagComment(commentId: string, body: string, user: User) {
    const comment = await this.prisma.contentComment.findFirst({
      where: { id: commentId, targetType: "tag", status: "active" },
      select: { id: true, authorId: true, targetId: true },
    });
    if (!comment) throw new NotFoundException("Gönderi bulunamadı.");
    if (
      comment.authorId !== user.id &&
      !["admin", "super_admin"].includes(user.role)
    )
      throw new ForbiddenException("Bu gönderi düzenlenemez.");
    const updated = await this.prisma.contentComment.update({
      where: { id: comment.id },
      data: { body: body.trim().replace(/\n{3,}/g, "\n\n") },
      include: { author: { select: tagAuthorSelect } },
    });
    return {
      id: updated.id,
      tagId: comment.targetId,
      body: updated.body,
      likeCount: updated.likeCount,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      canDelete: true,
      author: tagAuthor(updated.author),
    };
  }

  async deleteTagComment(tagId: string, commentId: string, user: User) {
    const comment = await this.prisma.contentComment.findFirst({
      where: {
        id: commentId,
        targetType: "tag",
        targetId: tagId,
        status: "active",
      },
      select: { id: true, authorId: true },
    });
    if (!comment) throw new NotFoundException("Yorum bulunamadı.");
    if (
      comment.authorId !== user.id &&
      !["admin", "super_admin"].includes(user.role)
    ) {
      throw new ForbiddenException("Bu yorum kaldırılamaz.");
    }
    await this.prisma.contentComment.update({
      where: { id: comment.id },
      data: { status: "deleted" },
    });
    return { ok: true as const };
  }

  listAdminTags() {
    return this.prisma.tag.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: { category: true },
    });
  }

  async getAdminTag(id: string) {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
      include: {
        category: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
          },
        },
        _count: {
          select: {
            events: true,
            interestedUsers: true,
          },
        },
      },
    });

    if (!tag) {
      throw new NotFoundException("Tag bulunamadı.");
    }

    const [
      reportCount,
      likeCount,
      okCount,
      dislikeCount,
      commentCount,
      viewCount,
      viewerCount,
      firstComment,
    ] = await Promise.all([
      this.prisma.contentReport.count({
        where: { targetType: "tag", targetId: id },
      }),
      this.prisma.contentReaction.count({
        where: { targetType: "tag", targetId: id, reaction: "like" },
      }),
      this.prisma.contentReaction.count({
        where: { targetType: "tag", targetId: id, reaction: "ok" },
      }),
      this.prisma.contentReaction.count({
        where: { targetType: "tag", targetId: id, reaction: "dislike" },
      }),
      this.prisma.contentComment.count({
        where: { targetType: "tag" as any, targetId: id },
      }),
      this.prisma.contentView.count({
        where: { targetType: "tag" as any, targetId: id },
      }),
      this.prisma.contentView
        .findMany({
          where: {
            targetType: "tag" as any,
            targetId: id,
            userId: { not: null },
          },
          distinct: ["userId"],
          select: { userId: true },
        })
        .then((items) => items.length),
      this.prisma.contentComment.findFirst({
        where: { targetType: "tag" as any, targetId: id },
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              status: true,
            },
          },
        },
      }),
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
      firstProfileUser: tag.createdBy,
    };
  }

  listTagCategories() {
    return this.prisma.tagCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
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
        category: input.categoryId
          ? { connect: { id: input.categoryId } }
          : undefined,
        createdBy: userId ? { connect: { id: userId } } : undefined,
        updatedBy: userId ? { connect: { id: userId } } : undefined,
      },
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
        category: input.categoryId
          ? { connect: { id: input.categoryId } }
          : undefined,
        status: TagStatus.active,
        createdBy: { connect: { id: userId } },
        updatedBy: { connect: { id: userId } },
      },
    });
  }

  private async ensureTagVisible(tagId: string, userId?: string) {
    const tag = await this.prisma.tag.findFirst({
      where: { id: tagId, status: "active" },
      select: { id: true },
    });
    if (!tag) throw new NotFoundException("Tag bulunamadı.");
    if (userId) {
      const block = await this.prisma.userBlock.findUnique({
        where: {
          userId_targetType_targetId: {
            userId,
            targetType: "tag",
            targetId: tagId,
          },
        },
        select: { userId: true },
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
      updatedBy: userId ? { connect: { id: userId } } : undefined,
    };

    if (input.name && input.name !== existing.name) {
      const slug = toSlug(input.name);
      await this.ensureSlugAvailable(slug, id);
      data.name = input.name;
      data.slug = slug;
    }

    if (input.categoryId !== undefined) {
      data.category = input.categoryId
        ? { connect: { id: input.categoryId } }
        : { disconnect: true };
    }

    return this.prisma.tag.update({ where: { id }, data });
  }

  archiveTag(id: string, userId?: string) {
    return this.prisma.tag.update({
      where: { id },
      data: {
        status: TagStatus.archived,
        updatedBy: userId ? { connect: { id: userId } } : undefined,
      },
    });
  }

  banTag(id: string, userId?: string) {
    return this.prisma.tag.update({
      where: { id },
      data: {
        status: TagStatus.hidden,
        updatedBy: userId ? { connect: { id: userId } } : undefined,
      },
    });
  }

  async mergeTag(sourceTagId: string, targetTagId: string, userId?: string) {
    if (sourceTagId === targetTagId) {
      throw new ConflictException("Bir tag kendi içine merge edilemez.");
    }

    const [sourceTag, targetTag] = await Promise.all([
      this.prisma.tag.findUnique({ where: { id: sourceTagId } }),
      this.prisma.tag.findUnique({ where: { id: targetTagId } }),
    ]);

    if (!sourceTag || !targetTag) {
      throw new NotFoundException("Merge edilecek tag bulunamadı.");
    }

    return this.prisma.$transaction(async (tx) => {
      const sourceEventTags = await tx.eventTag.findMany({
        where: { tagId: sourceTagId },
      });
      const sourceInterestTags = await tx.userInterestTag.findMany({
        where: { tagId: sourceTagId },
      });

      for (const eventTag of sourceEventTags) {
        await tx.eventTag.upsert({
          where: {
            eventId_tagId: { eventId: eventTag.eventId, tagId: targetTagId },
          },
          create: { eventId: eventTag.eventId, tagId: targetTagId },
          update: {},
        });
      }

      for (const interestTag of sourceInterestTags) {
        await tx.userInterestTag.upsert({
          where: {
            userId_tagId: { userId: interestTag.userId, tagId: targetTagId },
          },
          create: { userId: interestTag.userId, tagId: targetTagId },
          update: {},
        });
      }

      await tx.eventTag.deleteMany({ where: { tagId: sourceTagId } });
      await tx.userInterestTag.deleteMany({ where: { tagId: sourceTagId } });
      await tx.contentReport.updateMany({
        where: { targetType: "tag", targetId: sourceTagId },
        data: { targetId: targetTagId },
      });

      if ((tx as any).notification) {
        await (tx as any).notification.createMany({
          data: sourceInterestTags.map((interestTag) => ({
            userId: interestTag.userId,
            type: "tag_merge",
            title: "İlgi alanı taşındı",
            body: `${sourceTag.name} ilgi alanı ${targetTag.name} altında birleştirildi.`,
            targetType: "tag",
            targetId: targetTagId,
          })),
          skipDuplicates: true,
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
              notificationMode: "simulated",
            },
          },
        });
      }

      const usageCount = await tx.eventTag.count({
        where: { tagId: targetTagId },
      });

      await tx.tag.update({
        where: { id: targetTagId },
        data: {
          usageCount,
          updatedBy: userId ? { connect: { id: userId } } : undefined,
        },
      });

      return tx.tag.update({
        where: { id: sourceTagId },
        data: {
          status: TagStatus.archived,
          usageCount: 0,
          updatedBy: userId ? { connect: { id: userId } } : undefined,
        },
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
