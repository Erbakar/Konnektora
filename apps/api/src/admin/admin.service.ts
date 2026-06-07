import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const [publishedEvents, draftEvents, activeTags, upcomingEvents] = await Promise.all([
      this.prisma.event.count({ where: { status: "published" } }),
      this.prisma.event.count({ where: { status: "draft" } }),
      this.prisma.tag.count({ where: { status: "active" } }),
      this.prisma.event.count({
        where: {
          status: "published",
          startsAt: { gte: new Date() }
        }
      })
    ]);

    return {
      publishedEvents,
      draftEvents,
      activeTags,
      upcomingEvents
    };
  }
}

