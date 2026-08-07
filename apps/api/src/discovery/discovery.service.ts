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
    const localWhere = query.scope === "global" ? {} : city ? { city: { equals: city, mode: "insensitive" as const } } : country ? { country: { equals: country, mode: "insensitive" as const } } : {};
    const trendLocationWhere = query.scope === "global" || (!city && !country) ? {} : {
      OR: [
        { events: { some: { event: { ...(city ? { city: { equals: city, mode: "insensitive" as const } } : { country: { equals: country, mode: "insensitive" as const } }) } } } },
        { places: { some: { place: { ...(city ? { city: { equals: city, mode: "insensitive" as const } } : { country: { equals: country, mode: "insensitive" as const } }) } } } },
        { interestedUsers: { some: { user: { ...(city ? { city: { equals: city, mode: "insensitive" as const } } : { country: { equals: country, mode: "insensitive" as const } }) } } } }
      ]
    };
    const activeSince = new Date(Date.now() - 15 * 60_000);
    let [popularMembers, newMembers, localEvents, trendingTags, popularPlaces, activeUserCount] = await Promise.all([
      this.prisma.user.findMany({ where: { ...userWhere, ...localWhere }, select: userSelect, orderBy: { followerCount: "desc" }, take: 8 }),
      this.prisma.user.findMany({ where: { ...userWhere, ...localWhere }, select: userSelect, orderBy: { createdAt: "desc" }, take: 8 }),
      this.prisma.event.findMany({ where: { status: "published", startsAt: { gte: new Date() }, ...localWhere }, orderBy: { startsAt: "asc" }, take: 8 }),
      this.prisma.tag.findMany({ where: { status: "active", ...trendLocationWhere }, orderBy: { usageCount: "desc" }, take: 10 }),
      this.prisma.place.findMany({ where: { status: "active", ...localWhere }, orderBy: { followerCount: "desc" }, take: 8 }),
      this.prisma.user.count({ where: { ...userWhere, ...localWhere, lastOnlineAt: { gte: activeSince } } })
    ]);
    const [globalPopularMembers, globalNewMembers, globalEvents, globalPlaces] = await Promise.all([
      popularMembers.length ? Promise.resolve([]) : this.prisma.user.findMany({ where: userWhere, select: userSelect, orderBy: { followerCount: "desc" }, take: 8 }),
      newMembers.length ? Promise.resolve([]) : this.prisma.user.findMany({ where: userWhere, select: userSelect, orderBy: { createdAt: "desc" }, take: 8 }),
      localEvents.length ? Promise.resolve([]) : this.prisma.event.findMany({ where: { status: "published", startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, take: 8 }),
      popularPlaces.length ? Promise.resolve([]) : this.prisma.place.findMany({ where: { status: "active" }, orderBy: { followerCount: "desc" }, take: 8 }),
    ]);
    if (!popularMembers.length) popularMembers = globalPopularMembers;
    if (!newMembers.length) newMembers = globalNewMembers;
    if (!localEvents.length) localEvents = globalEvents;
    if (!popularPlaces.length) popularPlaces = globalPlaces;
    const createdAt = { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) };
    const dateWhere = query.from || query.to ? { createdAt } : {};
    let [activityEvents, activityPlaces, activityTags, activityUsers, eventJoins, placeJoins] = await Promise.all([
      this.prisma.event.findMany({ where: { status: "published", ...localWhere, ...dateWhere }, orderBy: { createdAt: "desc" }, take: 15 }),
      this.prisma.place.findMany({ where: { status: "active", ...localWhere, ...dateWhere }, orderBy: { createdAt: "desc" }, take: 15 }),
      this.prisma.tag.findMany({ where: { status: "active", ...dateWhere }, orderBy: { createdAt: "desc" }, take: 15 }),
      this.prisma.user.findMany({ where: { ...userWhere, ...localWhere, ...dateWhere }, select: userSelect, orderBy: { createdAt: "desc" }, take: 15 }),
      this.prisma.eventParticipant.findMany({ where: { status: { in: ["accepted", "attended"] }, ...dateWhere, event: { status: "published", ...localWhere }, ...(blockedIds.length ? { userId: { notIn: blockedIds } } : {}) }, include: { event: true, user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 15 }),
      this.prisma.placeMember.findMany({ where: { status: "accepted", ...dateWhere, place: { status: "active", ...localWhere }, ...(blockedIds.length ? { userId: { notIn: blockedIds } } : {}) }, include: { place: true, user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 15 }),
    ]);
    if (!activityEvents.length && Object.keys(localWhere).length) activityEvents = await this.prisma.event.findMany({ where: { status: "published", ...dateWhere }, orderBy: { createdAt: "desc" }, take: 15 });
    if (!activityPlaces.length && Object.keys(localWhere).length) activityPlaces = await this.prisma.place.findMany({ where: { status: "active", ...dateWhere }, orderBy: { createdAt: "desc" }, take: 15 });
    if (!activityUsers.length && Object.keys(localWhere).length) activityUsers = await this.prisma.user.findMany({ where: { ...userWhere, ...dateWhere }, select: userSelect, orderBy: { createdAt: "desc" }, take: 15 });
    const activities = [
      ...activityEvents.map((item) => ({ ...this.eventItem(item), action: "Etkinlik oluşturuldu", occurredAt: item.createdAt, ownerId: item.createdById })),
      ...activityPlaces.map((item) => ({ ...this.placeItem(item), action: "Mekân oluşturuldu", occurredAt: item.createdAt, ownerId: item.createdById })),
      ...activityTags.map((item) => ({ ...this.tagItem(item), action: "Tag oluşturuldu", occurredAt: item.createdAt, ownerId: item.createdById })),
      ...activityUsers.map((item) => ({ ...this.userItem(item), action: "Topluluğa katıldı", occurredAt: item.createdAt, ownerId: item.id })),
      ...eventJoins.map((item) => ({ ...this.eventItem(item.event), action: `${item.user.name} etkinliğe katıldı`, occurredAt: item.createdAt, ownerId: item.userId })),
      ...placeJoins.map((item) => ({ ...this.placeItem(item.place), action: `${item.user.name} mekâna katıldı`, occurredAt: item.createdAt, ownerId: item.userId })),
    ].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()).slice(0, 30);
    return {
      popularMembers: popularMembers.map((item) => this.userItem(item)),
      newMembers: newMembers.map((item) => this.userItem(item)),
      localEvents: localEvents.map((item) => this.eventItem(item)),
      trendingTags: trendingTags.map((item) => this.tagItem(item)),
      popularPlaces: popularPlaces.map((item) => this.placeItem(item)),
      activeUserCount,
      scope: query.scope ?? "local",
      location: city || country || null,
      activities
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
  private tagItem(tag: { id: string; name: string; slug: string; description: string | null; usageCount: number }) { return { kind: "tag" as const, id: tag.id, title: `#${tag.name}`, subtitle: tag.description, href: `/tags/${tag.slug}`, imageUrl: null, meta: `${tag.usageCount} kullanım` }; }
  private eventItem(event: { id: string; title: string; slug: string; summary: string; coverImageUrl: string | null; city: string | null; startsAt: Date }) { return { kind: "event" as const, id: event.id, title: event.title, subtitle: event.summary, href: `/events/${event.slug}`, imageUrl: event.coverImageUrl, meta: `${event.city ?? "Online"} · ${event.startsAt.toISOString()}` }; }
  private placeItem(place: { id: string; name: string; slug: string; description: string | null; coverImageUrl: string | null; city: string | null; followerCount: number }) { return { kind: "place" as const, id: place.id, title: place.name, subtitle: place.description, href: `/places/${place.slug}`, imageUrl: place.coverImageUrl, meta: `${place.followerCount} takipçi${place.city ? ` · ${place.city}` : ""}` }; }
}
