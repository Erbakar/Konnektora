import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getInterests(userId: string) {
    const interests = await this.prisma.userInterestTag.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: { tag: true }
    });

    return interests.map((interest) => interest.tag);
  }

  async updateInterests(userId: string, tagIds: string[]) {
    const uniqueTagIds = [...new Set(tagIds)];
    const activeTagCount = await this.prisma.tag.count({
      where: {
        id: { in: uniqueTagIds },
        status: "active"
      }
    });

    if (activeTagCount !== uniqueTagIds.length) {
      throw new BadRequestException("Geçersiz veya pasif tag seçimi var.");
    }

    await this.prisma.$transaction([
      this.prisma.userInterestTag.deleteMany({ where: { userId } }),
      this.prisma.userInterestTag.createMany({
        data: uniqueTagIds.map((tagId) => ({ userId, tagId })),
        skipDuplicates: true
      })
    ]);

    return this.getInterests(userId);
  }

  getNotifications(userId: string) {
    return (this.prisma as any).notification.findMany({
      where: { userId },
      orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
      take: 100
    });
  }

  async markNotificationRead(userId: string, id: string) {
    const notification = await (this.prisma as any).notification.findFirst({ where: { id, userId } });

    if (!notification) {
      throw new NotFoundException("Bildirim bulunamadı.");
    }

    return (this.prisma as any).notification.update({
      where: { id },
      data: { readAt: new Date() }
    });
  }
}
