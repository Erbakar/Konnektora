import { Injectable, NotFoundException } from "@nestjs/common";
import { ReportTargetType, User } from "@prisma/client";
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
