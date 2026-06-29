import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AdminContentQueryDto, UpdateAdminContentStatusDto } from "./content-admin.dto";

const USER_SELECT = { id: true, email: true, name: true, role: true, status: true } satisfies Prisma.UserSelect;

@Injectable()
export class ContentAdminService {
  constructor(private readonly prisma: PrismaService) {}

  listPlaces(query: AdminContentQueryDto) {
    return this.prisma.place.findMany({
      where: {
        status: query.status || undefined,
        OR: query.q
          ? [
              { name: { contains: query.q, mode: "insensitive" } },
              { city: { contains: query.q, mode: "insensitive" } },
              { country: { contains: query.q, mode: "insensitive" } }
            ]
          : undefined
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { createdBy: { select: USER_SELECT }, updatedBy: { select: USER_SELECT } }
    });
  }

  async getPlace(id: string) {
    const place = await this.prisma.place.findUnique({
      where: { id },
      include: { createdBy: { select: USER_SELECT }, updatedBy: { select: USER_SELECT } }
    });
    if (!place) throw new NotFoundException("Mekan bulunamadı.");
    return { ...place, reportCount: await this.reportCount("place", id) };
  }

  async updatePlace(id: string, input: UpdateAdminContentStatusDto) {
    await this.getPlace(id);
    return this.prisma.place.update({ where: { id }, data: { status: input.status } });
  }

  listMedia(query: AdminContentQueryDto) {
    return this.prisma.mediaFile.findMany({
      where: {
        status: query.status || undefined,
        OR: query.q
          ? [
              { url: { contains: query.q, mode: "insensitive" } },
              { type: { contains: query.q, mode: "insensitive" } },
              { contentId: { contains: query.q, mode: "insensitive" } }
            ]
          : undefined
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { uploadedBy: { select: USER_SELECT } }
    });
  }

  async getMedia(id: string) {
    const media = await this.prisma.mediaFile.findUnique({ where: { id }, include: { uploadedBy: { select: USER_SELECT } } });
    if (!media) throw new NotFoundException("Medya bulunamadı.");
    return { ...media, reportCount: await this.reportCount("media", id) };
  }

  async updateMedia(id: string, input: UpdateAdminContentStatusDto) {
    await this.getMedia(id);
    return this.prisma.mediaFile.update({ where: { id }, data: { status: input.status } });
  }

  listComments(query: AdminContentQueryDto) {
    return this.prisma.contentComment.findMany({
      where: {
        status: query.status || undefined,
        body: query.q ? { contains: query.q, mode: "insensitive" } : undefined
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        author: { select: USER_SELECT },
        parent: { select: { id: true, body: true, author: { select: USER_SELECT } } },
        _count: { select: { replies: true } }
      }
    });
  }

  async getComment(id: string) {
    const comment = await this.prisma.contentComment.findUnique({
      where: { id },
      include: {
        author: { select: USER_SELECT },
        parent: { select: { id: true, body: true, author: { select: USER_SELECT } } },
        _count: { select: { replies: true } }
      }
    });
    if (!comment) throw new NotFoundException("Yorum bulunamadı.");
    return { ...comment, reportCount: await this.commentReportCount(comment) };
  }

  async updateComment(id: string, input: UpdateAdminContentStatusDto) {
    await this.getComment(id);
    return this.prisma.contentComment.update({ where: { id }, data: { status: input.status } });
  }

  listPrivateMessages(query: AdminContentQueryDto) {
    return this.prisma.privateMessage.findMany({
      where: {
        status: query.status || undefined,
        body: query.q ? { contains: query.q, mode: "insensitive" } : undefined
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { sender: { select: USER_SELECT }, recipient: { select: USER_SELECT } }
    });
  }

  async getPrivateMessage(id: string) {
    const message = await this.prisma.privateMessage.findUnique({
      where: { id },
      include: { sender: { select: USER_SELECT }, recipient: { select: USER_SELECT } }
    });
    if (!message) throw new NotFoundException("Özel mesaj bulunamadı.");
    return { ...message, reportCount: await this.reportCount("private_message", id) };
  }

  async updatePrivateMessage(id: string, input: UpdateAdminContentStatusDto) {
    await this.getPrivateMessage(id);
    return this.prisma.privateMessage.update({ where: { id }, data: { status: input.status } });
  }

  private reportCount(targetType: string, targetId: string) {
    return this.prisma.contentReport.count({ where: { targetType: targetType as any, targetId } });
  }

  private commentReportCount(comment: { id: string; parentId: string | null; targetType: string }) {
    const targetType = comment.parentId ? "comment_reply" : comment.targetType === "tag" ? "tag_comment" : comment.targetType === "event" ? "event_comment" : "place_comment";
    return this.reportCount(targetType, comment.id);
  }
}
