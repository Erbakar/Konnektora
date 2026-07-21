import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { DiscoveryFeedQueryDto } from "./discovery.dto";

const userSelect = { id: true, name: true, username: true, city: true, country: true, followerCount: true, createdAt: true } as const;

@Injectable()
export class DiscoveryService {
  constructor(private readonly prisma: PrismaService) {}

  async feed(userId?: string, query: DiscoveryFeedQueryDto = {}) {
    const [viewer, blockedIds] = await Promise.all([userId ? this.prisma.user.findUnique({ where: { id: userId }, select: { city: true, country: true } }) : null, this.blockedUserIds(userId)]);
    const city = query.city?.trim() || viewer?.city || undefined;
    const country = query.country?.trim() || viewer?.country || undefined;
    const userWhere = { status: "active" as const, role: "user" as const, ...(blockedIds.length ? { id: { notIn: blockedIds } } : {}) };
    const localWhere = city ? { city: { equals: city, mode: "insensitive" as const } } : country ? { country: { equals: country, mode: "insensitive" as const } } : {};
    const [popularMembers, newMembers, localEvents, trendingTags, popularPlaces] = await Promise.all([
      this.prisma.user.findMany({ where: userWhere, select: userSelect, orderBy: { followerCount: "desc" }, take: 8 }),
      this.prisma.user.findMany({ where: userWhere, select: userSelect, orderBy: { createdAt: "desc" }, take: 8 }),
      this.prisma.event.findMany({ where: { status: "published", startsAt: { gte: new Date() }, ...localWhere }, orderBy: { startsAt: "asc" }, take: 8 }),
      this.prisma.tag.findMany({ where: { status: "active" }, orderBy: { usageCount: "desc" }, take: 10 }),
      this.prisma.place.findMany({ where: { status: "active", ...localWhere }, orderBy: { followerCount: "desc" }, take: 8 })
    ]);
    return {
      popularMembers: popularMembers.map((item) => this.userItem(item)),
      newMembers: newMembers.map((item) => this.userItem(item)),
      localEvents: localEvents.map((item) => this.eventItem(item)),
      trendingTags: trendingTags.map((item) => this.tagItem(item)),
      popularPlaces: popularPlaces.map((item) => this.placeItem(item))
    };
  }

  async search(rawQuery: string, userId?: string) {
    const query = rawQuery.trim();
    const contains = { contains: query, mode: "insensitive" as const };
    const blockedIds = await this.blockedUserIds(userId);
    const [users, tags, events, places] = await Promise.all([
      this.prisma.user.findMany({ where: { status: "active", role: "user", ...(blockedIds.length ? { id: { notIn: blockedIds } } : {}), OR: [{ name: contains }, { username: contains }] }, select: userSelect, orderBy: { followerCount: "desc" }, take: 10 }),
      this.prisma.tag.findMany({ where: { status: "active", OR: [{ name: contains }, { description: contains }] }, orderBy: { usageCount: "desc" }, take: 10 }),
      this.prisma.event.findMany({ where: { status: "published", OR: [{ title: contains }, { summary: contains }, { city: contains }] }, orderBy: { startsAt: "asc" }, take: 10 }),
      this.prisma.place.findMany({ where: { status: "active", OR: [{ name: contains }, { description: contains }, { city: contains }] }, orderBy: { followerCount: "desc" }, take: 10 })
    ]);
    const items = [...users.map((item) => this.userItem(item)), ...tags.map((item) => this.tagItem(item)), ...events.map((item) => this.eventItem(item)), ...places.map((item) => this.placeItem(item))];
    return { query, total: items.length, items };
  }

  private async blockedUserIds(userId?: string) {
    if (!userId) return [];
    const blocks = await this.prisma.userBlock.findMany({ where: { targetType: "user", OR: [{ userId }, { targetId: userId }] }, select: { userId: true, targetId: true } });
    return [userId, ...blocks.map((block) => block.userId === userId ? block.targetId : block.userId)];
  }

  private userItem(user: { id: string; name: string; username: string | null; city: string | null; country: string | null; followerCount: number }) { return { kind: "user" as const, id: user.id, title: user.name, subtitle: user.username ? `@${user.username}` : null, href: user.username ? `/users/${user.username}` : `/messages?peer=${user.id}`, imageUrl: null, meta: `${user.followerCount} takipçi${user.city || user.country ? ` · ${user.city ?? user.country}` : ""}` }; }
  private tagItem(tag: { id: string; name: string; slug: string; description: string | null; usageCount: number }) { return { kind: "tag" as const, id: tag.id, title: `#${tag.name}`, subtitle: tag.description, href: `/events?tag=${tag.slug}`, imageUrl: null, meta: `${tag.usageCount} kullanım` }; }
  private eventItem(event: { id: string; title: string; slug: string; summary: string; coverImageUrl: string | null; city: string | null; startsAt: Date }) { return { kind: "event" as const, id: event.id, title: event.title, subtitle: event.summary, href: `/events/${event.slug}`, imageUrl: event.coverImageUrl, meta: `${event.city ?? "Online"} · ${event.startsAt.toISOString()}` }; }
  private placeItem(place: { id: string; name: string; slug: string; description: string | null; coverImageUrl: string | null; city: string | null; followerCount: number }) { return { kind: "place" as const, id: place.id, title: place.name, subtitle: place.description, href: `/places/${place.slug}`, imageUrl: place.coverImageUrl, meta: `${place.followerCount} takipçi${place.city ? ` · ${place.city}` : ""}` }; }
}
