import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ReportTargetType, User } from "@prisma/client";
import { unlink } from "fs/promises";
import { resolve } from "path";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCommentDto, CreateMediaDto, CreateReactionDto } from "./content.dto";

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  listMedia(targetType?: ReportTargetType, targetId?: string) {
    return this.prisma.mediaFile.findMany({
      where: { status: "active", contentType: targetType, contentId: targetId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { uploadedBy: { select: { id: true, email: true, name: true, role: true, status: true } } }
    });
  }

  createMedia(input: CreateMediaDto, user: User) {
    return this.prisma.mediaFile.create({
      data: {
        url: input.url.trim(),
        type: input.type?.trim() || "image",
        contentType: input.contentType,
        contentId: input.contentId,
        uploadedBy: { connect: { id: user.id } }
      }
    });
  }

  async createContentMedia(targetType: ReportTargetType, targetId: string, user: User, url: string, type: "image" | "video") {
    const commentTypes = new Set<ReportTargetType>([ReportTargetType.tag_comment, ReportTargetType.event_comment, ReportTargetType.place_comment, ReportTargetType.comment_reply]);
    if (targetType !== ReportTargetType.event && targetType !== ReportTargetType.place && !commentTypes.has(targetType)) {
      throw new BadRequestException("Bu içerik türüne medya yüklenemez.");
    }
    if (targetType === ReportTargetType.event) {
      await this.ensureContentMediaManager(targetType, targetId, user);
    } else if (targetType === ReportTargetType.place) {
      await this.ensureContentMediaManager(targetType, targetId, user);
    } else {
      const comment = await this.prisma.contentComment.findUnique({ where: { id: targetId }, select: { authorId: true, status: true } });
      if (!comment || comment.status !== "active") throw new NotFoundException("Yorum bulunamadı.");
      if (comment.authorId !== user.id && !["admin", "super_admin"].includes(user.role)) throw new ForbiddenException("Bu yoruma medya yükleme yetkiniz yok.");
    }
    const count = await this.prisma.mediaFile.count({ where: { contentType: targetType, contentId: targetId, status: "active" } });
    if (count >= 20) throw new BadRequestException("Bir içerikte en fazla 20 medya bulunabilir.");
    return this.prisma.mediaFile.create({ data: { url, type, contentType: targetType, contentId: targetId, uploadedById: user.id, sortOrder: count } });
  }

  async reorderContentMedia(targetType: ReportTargetType, targetId: string, mediaIds: string[], user: User) {
    if (targetType !== ReportTargetType.event && targetType !== ReportTargetType.place) throw new BadRequestException("Bu medya albümü sıralanamaz.");
    await this.ensureContentMediaManager(targetType, targetId, user);
    const current = await this.prisma.mediaFile.findMany({ where: { contentType: targetType, contentId: targetId, status: "active" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
    if (mediaIds.length !== current.length || new Set(mediaIds).size !== mediaIds.length || current.some((item) => !mediaIds.includes(item.id))) throw new BadRequestException("Sıralama albümdeki tüm medyaları tam olarak bir kez içermelidir.");
    const first = current.find((item) => item.id === mediaIds[0]);
    if (first && first.type !== "image") throw new BadRequestException("Albümün ilk medyası kapak olarak kullanılabilecek bir fotoğraf olmalıdır.");
    await this.prisma.$transaction([
      ...mediaIds.map((id, sortOrder) => this.prisma.mediaFile.update({ where: { id }, data: { sortOrder } })),
      ...(first && targetType === ReportTargetType.event ? [this.prisma.event.update({ where: { id: targetId }, data: { coverImageUrl: first.url } })] : []),
      ...(first && targetType === ReportTargetType.place ? [this.prisma.place.update({ where: { id: targetId }, data: { coverImageUrl: first.url } })] : []),
    ]);
    return this.listMedia(targetType, targetId);
  }

  async deleteContentMedia(targetType: ReportTargetType, targetId: string, mediaId: string, user: User) {
    if (targetType !== ReportTargetType.event && targetType !== ReportTargetType.place) throw new BadRequestException("Bu medya albümünden silme yapılamaz.");
    await this.ensureContentMediaManager(targetType, targetId, user);
    const media = await this.prisma.mediaFile.findFirst({ where: { id: mediaId, contentType: targetType, contentId: targetId, status: "active" } });
    if (!media) throw new NotFoundException("Medya bulunamadı.");
    const remaining = await this.prisma.mediaFile.findMany({ where: { contentType: targetType, contentId: targetId, status: "active", id: { not: mediaId } }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
    const nextCover = remaining.find((item) => item.type === "image")?.url ?? null;
    await this.prisma.$transaction([
      this.prisma.mediaFile.update({ where: { id: mediaId }, data: { status: "deleted" } }),
      ...remaining.map((item, sortOrder) => this.prisma.mediaFile.update({ where: { id: item.id }, data: { sortOrder } })),
      ...(media.sortOrder === 0 && targetType === ReportTargetType.event ? [this.prisma.event.update({ where: { id: targetId }, data: { coverImageUrl: nextCover } })] : []),
      ...(media.sortOrder === 0 && targetType === ReportTargetType.place ? [this.prisma.place.update({ where: { id: targetId }, data: { coverImageUrl: nextCover } })] : []),
    ]);
    if (media.url.startsWith("/uploads/")) await unlink(resolve(process.cwd(), media.url.slice(1))).catch(() => undefined);
    return this.listMedia(targetType, targetId);
  }

  private async ensureContentMediaManager(targetType: "event" | "place", targetId: string, user: User) {
    if (["admin", "super_admin", "curator"].includes(user.role)) return;
    if (targetType === ReportTargetType.event) {
      const event = await this.prisma.event.findUnique({ where: { id: targetId }, select: { createdById: true } });
      if (!event) throw new NotFoundException("Etkinlik bulunamadı.");
      if (event.createdById === user.id) return;
      const manager = await this.prisma.eventParticipant.findFirst({ where: { eventId: targetId, userId: user.id, status: { in: ["accepted", "attended"] }, role: { in: ["organizer", "manager"] } }, select: { id: true } });
      if (manager) return;
      throw new ForbiddenException("Bu etkinliğin medya albümünü yönetme yetkiniz yok.");
    }
    const place = await this.prisma.place.findUnique({ where: { id: targetId }, select: { createdById: true } });
    if (!place) throw new NotFoundException("Mekân bulunamadı.");
    if (place.createdById === user.id) return;
    const manager = await this.prisma.placeMember.findFirst({ where: { placeId: targetId, userId: user.id, status: "accepted", role: { in: ["organizer", "manager"] } }, select: { placeId: true } });
    if (manager) return;
    throw new ForbiddenException("Bu mekânın medya albümünü yönetme yetkiniz yok.");
  }

  listProfileMedia(userId: string) {
    return this.prisma.mediaFile.findMany({
      where: { uploadedById: userId, contentType: ReportTargetType.user, contentId: userId, status: "active" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    });
  }

  async createProfileMedia(userId: string, url: string, type: "image" | "video") {
    const current = await this.listProfileMedia(userId);
    if (current.length >= 50) throw new BadRequestException("Profil albümünde en fazla 50 medya bulunabilir.");
    if (!current.some((item) => item.type === "image") && type !== "image") {
      throw new BadRequestException("Profil albümündeki ilk medya bir fotoğraf olmalıdır.");
    }
    const isFirst = current.length === 0;
    const insertOrder = isFirst ? 0 : 1;
    return this.prisma.$transaction(async (tx) => {
      if (!isFirst) {
        await tx.mediaFile.updateMany({
          where: { uploadedById: userId, contentType: ReportTargetType.user, contentId: userId, status: "active", sortOrder: { gte: insertOrder } },
          data: { sortOrder: { increment: 1 } }
        });
      }
      return tx.mediaFile.create({
        data: {
          url,
          type,
          contentType: ReportTargetType.user,
          contentId: userId,
          uploadedById: userId,
          sortOrder: insertOrder,
          isProfilePicture: isFirst
        }
      });
    });
  }

  async makeProfilePicture(userId: string, mediaId: string) {
    const media = await this.getOwnedProfileMedia(userId, mediaId);
    if (media.type !== "image") throw new BadRequestException("Yalnız fotoğraflar profil resmi yapılabilir.");
    await this.prisma.$transaction([
      this.prisma.mediaFile.updateMany({
        where: { uploadedById: userId, contentType: ReportTargetType.user, contentId: userId },
        data: { isProfilePicture: false, sortOrder: { increment: 1 } }
      }),
      this.prisma.mediaFile.update({ where: { id: mediaId }, data: { isProfilePicture: true, sortOrder: 0 } })
    ]);
    return this.listProfileMedia(userId);
  }

  async reorderProfileMedia(userId: string, mediaIds: string[]) {
    const current = await this.listProfileMedia(userId);
    if (mediaIds.length !== current.length || new Set(mediaIds).size !== mediaIds.length || current.some((item) => !mediaIds.includes(item.id))) {
      throw new BadRequestException("Sıralama albümdeki tüm medyaları tam olarak bir kez içermelidir.");
    }
    const profilePicture = current.find((item) => item.isProfilePicture);
    if (profilePicture && mediaIds[0] !== profilePicture.id) {
      throw new BadRequestException("Profil resmi albümün ilk sırasında kalmalıdır.");
    }
    await this.prisma.$transaction(mediaIds.map((id, sortOrder) => this.prisma.mediaFile.update({ where: { id }, data: { sortOrder } })));
    return this.listProfileMedia(userId);
  }

  async deleteProfileMedia(userId: string, mediaId: string) {
    const media = await this.getOwnedProfileMedia(userId, mediaId);
    const current = await this.listProfileMedia(userId);
    const images = current.filter((item) => item.type === "image");
    if (media.type === "image" && images.length === 1) {
      throw new BadRequestException("Profilde en az bir fotoğraf bulunmalıdır.");
    }
    const nextProfilePicture = media.isProfilePicture ? images.find((item) => item.id !== media.id) : undefined;
    await this.prisma.$transaction([
      this.prisma.mediaFile.update({ where: { id: mediaId }, data: { status: "deleted", isProfilePicture: false } }),
      ...(nextProfilePicture
        ? [this.prisma.mediaFile.update({ where: { id: nextProfilePicture.id }, data: { isProfilePicture: true, sortOrder: 0 } })]
        : [])
    ]);
    if (media.url.startsWith("/uploads/")) {
      await unlink(resolve(process.cwd(), media.url.slice(1))).catch(() => undefined);
    }
    return this.listProfileMedia(userId);
  }

  private async getOwnedProfileMedia(userId: string, mediaId: string) {
    const media = await this.prisma.mediaFile.findUnique({ where: { id: mediaId } });
    if (!media || media.contentType !== ReportTargetType.user || media.contentId !== userId || media.status !== "active") {
      throw new NotFoundException("Profil medyası bulunamadı.");
    }
    if (media.uploadedById !== userId) throw new ForbiddenException("Bu medya üzerinde işlem yetkiniz yok.");
    return media;
  }

  async listComments(targetType: ReportTargetType, targetId: string) {
    const comments = await this.prisma.contentComment.findMany({
      where: { status: "active", targetType, targetId, parentId: null },
      orderBy: [{ createdAt: "desc" }],
      include: {
        author: { select: { id: true, email: true, name: true, username: true, role: true, status: true, uploadedMedia: { where: { contentType: "user", status: "active", isProfilePicture: true }, select: { url: true }, take: 1 } } },
        replies: {
          where: { status: "active" },
          orderBy: [{ createdAt: "asc" }],
          include: { author: { select: { id: true, email: true, name: true, username: true, role: true, status: true, uploadedMedia: { where: { contentType: "user", status: "active", isProfilePicture: true }, select: { url: true }, take: 1 } } } }
        }
      }
    });
    const commentIds = comments.flatMap((comment) => [comment.id, ...comment.replies.map((reply) => reply.id)]);
    const media = commentIds.length ? await this.prisma.mediaFile.findMany({ where: { contentId: { in: commentIds }, contentType: { in: ["tag_comment", "event_comment", "place_comment", "comment_reply"] }, status: "active" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }) : [];
    const mediaByComment = new Map<string, typeof media>();
    for (const item of media) mediaByComment.set(item.contentId, [...(mediaByComment.get(item.contentId) ?? []), item]);
    const present = (comment: any): any => ({ ...comment, media: mediaByComment.get(comment.id) ?? [], author: comment.author ? { ...comment.author, avatarUrl: comment.author.uploadedMedia?.[0]?.url ?? null, uploadedMedia: undefined } : null, replies: comment.replies?.map(present) });
    return comments.map(present);
  }

  createComment(input: CreateCommentDto, user: User) {
    return this.prisma.contentComment.create({
      data: {
        targetType: input.targetType,
        targetId: input.targetId,
        parent: input.parentId ? { connect: { id: input.parentId } } : undefined,
        author: { connect: { id: user.id } },
        body: input.body.trim().replace(/\n{3,}/g, "\n\n")
      }
    });
  }

  async updateComment(id: string, body: string, user: User) {
    const comment = await this.prisma.contentComment.findUnique({ where: { id } });
    if (!comment || comment.status !== "active") throw new NotFoundException("Yorum bulunamadı.");
    if (comment.authorId !== user.id && !["admin", "super_admin"].includes(user.role)) throw new ForbiddenException("Bu yorumu düzenleyemezsiniz.");
    return this.prisma.contentComment.update({ where: { id }, data: { body: body.trim().replace(/\n{3,}/g, "\n\n") } });
  }

  async deleteComment(id: string, user: User) {
    const comment = await this.prisma.contentComment.findUnique({ where: { id } });
    if (!comment || comment.status !== "active") throw new NotFoundException("Yorum bulunamadı.");
    let manager = false;
    if (comment.targetType === ReportTargetType.event) manager = Boolean(await this.prisma.event.findFirst({ where: { id: comment.targetId, createdById: user.id }, select: { id: true } }));
    if (comment.targetType === ReportTargetType.place) manager = Boolean(await this.prisma.place.findFirst({ where: { id: comment.targetId, createdById: user.id }, select: { id: true } }));
    if (comment.authorId !== user.id && !manager && !["admin", "super_admin"].includes(user.role)) throw new ForbiddenException("Bu yorumu silemezsiniz.");
    await this.prisma.contentComment.update({ where: { id }, data: { status: "deleted" } });
    return { ok: true };
  }

  async toggleCommentLike(id: string, user: User) {
    const comment = await this.prisma.contentComment.findUnique({ where: { id }, select: { id: true } });
    if (!comment) throw new NotFoundException("Yorum bulunamadı.");
    const key = { targetType: ReportTargetType.comment_reply, targetId: id, userId: user.id, reaction: "like" };
    const existing = await this.prisma.contentReaction.findUnique({ where: { targetType_targetId_userId_reaction: key } });
    await this.prisma.$transaction(existing
      ? [this.prisma.contentReaction.delete({ where: { id: existing.id } }), this.prisma.contentComment.update({ where: { id }, data: { likeCount: { decrement: 1 } } })]
      : [this.prisma.contentReaction.create({ data: key }), this.prisma.contentComment.update({ where: { id }, data: { likeCount: { increment: 1 } } })]);
    return { liked: !existing };
  }

  async createReaction(input: CreateReactionDto, user: User) {
    return this.prisma.contentReaction.upsert({
      where: {
        targetType_targetId_userId_reaction: {
          targetType: input.targetType,
          targetId: input.targetId,
          userId: user.id,
          reaction: input.reaction
        }
      },
      create: {
        targetType: input.targetType,
        targetId: input.targetId,
        user: { connect: { id: user.id } },
        reaction: input.reaction
      },
      update: {}
    });
  }

  createView(targetType: ReportTargetType, targetId: string, user?: User, source?: string, referrer?: string, kind = "detail") {
    if (!new Set(["detail", "impression"]).has(kind)) throw new BadRequestException("Geçersiz görüntülenme türü.");
    return this.prisma.contentView.create({
      data: {
        targetType,
        targetId,
        kind,
        source: source?.trim().slice(0, 80) || null,
        referrer: referrer?.trim().slice(0, 500) || null,
        user: user ? { connect: { id: user.id } } : undefined
      }
    });
  }

  createShare(targetType: ReportTargetType, targetId: string, channel: string, user?: User) {
    const normalizedChannel = channel.trim().toLocaleLowerCase("en-US").replace(/[^a-z0-9_-]+/g, "_").slice(0, 40);
    if (!normalizedChannel) throw new BadRequestException("Paylaşım kanalı gereklidir.");
    return this.prisma.contentShare.create({ data: { targetType, targetId, channel: normalizedChannel, user: user ? { connect: { id: user.id } } : undefined } });
  }

  createAction(targetType: ReportTargetType, targetId: string, action: string, user?: User) {
    const normalizedAction = action.trim().toLocaleLowerCase("en-US").replace(/[^a-z0-9_-]+/g, "_").slice(0, 40);
    if (!normalizedAction) throw new BadRequestException("Etkileşim türü gereklidir.");
    return this.prisma.contentAction.create({ data: { targetType, targetId, action: normalizedAction, user: user ? { connect: { id: user.id } } : undefined } });
  }

}
