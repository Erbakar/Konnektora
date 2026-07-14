import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ReportTargetType, User } from "@prisma/client";
import { unlink } from "fs/promises";
import { resolve } from "path";
import { toSlug } from "../common/slug";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCommentDto, CreateMediaDto, CreatePlaceDto, CreatePrivateMessageDto, CreateReactionDto } from "./content.dto";

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  listPlaces() {
    return this.prisma.place.findMany({
      where: { status: "active" },
      orderBy: [{ followerCount: "desc" }, { name: "asc" }],
      include: { createdBy: { select: { id: true, email: true, name: true, role: true, status: true } } }
    });
  }

  async createPlace(input: CreatePlaceDto, user: User) {
    const slug = await this.uniquePlaceSlug(input.name);
    return this.prisma.place.create({
      data: {
        name: input.name.trim(),
        slug,
        description: input.description?.trim() || null,
        country: input.country?.trim() || null,
        city: input.city?.trim() || null,
        address: input.address?.trim() || null,
        coverImageUrl: input.coverImageUrl?.trim() || null,
        createdBy: { connect: { id: user.id } },
        updatedBy: { connect: { id: user.id } }
      }
    });
  }

  listMedia(targetType?: ReportTargetType, targetId?: string) {
    return this.prisma.mediaFile.findMany({
      where: { status: "active", contentType: targetType, contentId: targetId },
      orderBy: [{ createdAt: "desc" }],
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

  listComments(targetType: ReportTargetType, targetId: string) {
    return this.prisma.contentComment.findMany({
      where: { status: "active", targetType, targetId, parentId: null },
      orderBy: [{ createdAt: "desc" }],
      include: {
        author: { select: { id: true, email: true, name: true, role: true, status: true } },
        replies: {
          where: { status: "active" },
          orderBy: [{ createdAt: "asc" }],
          include: { author: { select: { id: true, email: true, name: true, role: true, status: true } } }
        }
      }
    });
  }

  createComment(input: CreateCommentDto, user: User) {
    return this.prisma.contentComment.create({
      data: {
        targetType: input.targetType,
        targetId: input.targetId,
        parent: input.parentId ? { connect: { id: input.parentId } } : undefined,
        author: { connect: { id: user.id } },
        body: input.body.trim()
      }
    });
  }

  listPrivateMessages(user: User) {
    return this.prisma.privateMessage.findMany({
      where: {
        status: "active",
        OR: [{ senderId: user.id }, { recipientId: user.id }]
      },
      orderBy: [{ createdAt: "desc" }],
      include: {
        sender: { select: { id: true, email: true, name: true, role: true, status: true } },
        recipient: { select: { id: true, email: true, name: true, role: true, status: true } }
      }
    });
  }

  async createPrivateMessage(input: CreatePrivateMessageDto, user: User) {
    const recipient = await this.prisma.user.findUnique({ where: { id: input.recipientId }, select: { id: true } });
    if (!recipient) throw new NotFoundException("Alıcı bulunamadı.");

    return this.prisma.privateMessage.create({
      data: {
        sender: { connect: { id: user.id } },
        recipient: { connect: { id: input.recipientId } },
        body: input.body.trim()
      }
    });
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

  createView(targetType: ReportTargetType, targetId: string, user?: User) {
    return this.prisma.contentView.create({
      data: {
        targetType,
        targetId,
        user: user ? { connect: { id: user.id } } : undefined
      }
    });
  }

  private async uniquePlaceSlug(name: string) {
    const base = toSlug(name);
    let slug = base;
    let index = 2;

    while (await this.prisma.place.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${base}-${index}`;
      index += 1;
    }

    return slug;
  }
}
