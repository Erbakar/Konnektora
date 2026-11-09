import { audienceAllows } from "../common/privacy-context";
import { additionalActivities, activityRelations, eventActivityRelations } from "./activity-cards";
import { publicName } from "../common/public-name";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { DiscoveryFeedQueryDto } from "./discovery.dto";

const userSelect = {
  id: true,
  name: true,
  status: true,
  privacySettings: { select: { profileNameAudience: true, eventAudience: true, placeAudience: true } },
  accountType: true,
  companyName: true,
  username: true,
  city: true,
  country: true,
  followerCount: true,
  createdAt: true,
  uploadedMedia: { where: { contentType: "user", status: "active", isProfilePicture: true }, select: { url: true }, take: 1 },
} as const;

@Injectable()
export class DiscoveryService {
  constructor(private readonly prisma: PrismaService) {}

  async feed(userId?: string, query: DiscoveryFeedQueryDto = {}) {
    const [viewer, blockedIds] = await Promise.all([
      userId
        ? this.prisma.user.findUnique({
            where: { id: userId },
            select: { city: true, country: true },
          })
        : null,
      this.blockedUserIds(userId),
    ]);
    const city = query.city?.trim() || viewer?.city || undefined;
    const country = query.country?.trim() || viewer?.country || undefined;
    const userWhere = {
      status: "active" as const,
      role: "user" as const,
      ...(blockedIds.filter(id => id !== userId).length ? { id: { notIn: blockedIds.filter(id => id !== userId) } } : {}),
    };
    const localWhere =
      query.scope === "global"
        ? {}
        : city
          ? { city: { equals: city, mode: "insensitive" as const } }
          : country
            ? { country: { equals: country, mode: "insensitive" as const } }
            : {};
    const trendLocationWhere =
      query.scope === "global" || (!city && !country)
        ? {}
        : {
            OR: [
              {
                events: {
                  some: {
                    event: {
                      ...(city
                        ? {
                            city: {
                              equals: city,
                              mode: "insensitive" as const,
                            },
                          }
                        : {
                            country: {
                              equals: country,
                              mode: "insensitive" as const,
                            },
                          }),
                    },
                  },
                },
              },
              {
                places: {
                  some: {
                    place: {
                      ...(city
                        ? {
                            city: {
                              equals: city,
                              mode: "insensitive" as const,
                            },
                          }
                        : {
                            country: {
                              equals: country,
                              mode: "insensitive" as const,
                            },
                          }),
                    },
                  },
                },
              },
              {
                interestedUsers: {
                  some: {
                    user: {
                      ...(city
                        ? {
                            city: {
                              equals: city,
                              mode: "insensitive" as const,
                            },
                          }
                        : {
                            country: {
                              equals: country,
                              mode: "insensitive" as const,
                            },
                          }),
                    },
                  },
                },
              },
            ],
          };
    const activeSince = new Date(Date.now() - 15 * 60_000);
    // Ana sayfa "Popüler hesaplar" ve "Yeni üyeler" yalnız profil fotoğrafı olan üyeleri listeler (07/11 #12).
    const memberWithAvatarWhere = { ...userWhere, uploadedMedia: { some: { contentType: "user" as const, status: "active" as const, isProfilePicture: true } } };
    const [
      initialPopularMembers,
      initialNewMembers,
      initialLocalEvents,
      trendingTags,
      initialPopularPlaces,
      activeUserCount,
    ] = await Promise.all([
      this.prisma.user.findMany({
        where: memberWithAvatarWhere,
        select: userSelect,
        orderBy: { followerCount: "desc" },
        take: 8,
      }),
      this.prisma.user.findMany({
        where: memberWithAvatarWhere,
        select: userSelect,
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      this.prisma.event.findMany({
        include: eventActivityRelations,
        where: {
          status: "published",
          startsAt: { gte: new Date() },
          ...localWhere,
        },
        orderBy: { startsAt: "asc" },
        take: 8,
      }),
      this.prisma.tag.findMany({
        where: { status: "active", ...trendLocationWhere },
        orderBy: { usageCount: "desc" },
        take: 10,
      }),
      this.prisma.place.findMany({
        include: activityRelations,
        where: { status: "active", ...localWhere },
        orderBy: { followerCount: "desc" },
        take: 8,
      }),
      this.prisma.user.count({
        where: {
          ...userWhere,
          ...localWhere,
          lastOnlineAt: { gte: activeSince },
        },
      }),
    ]);
    let popularMembers = initialPopularMembers;
    let newMembers = initialNewMembers;
    let localEvents = initialLocalEvents;
    let popularPlaces = initialPopularPlaces;
    const [globalPopularMembers, globalNewMembers, globalEvents, globalPlaces] =
      await Promise.all([
        popularMembers.length
          ? Promise.resolve([])
          : this.prisma.user.findMany({
              where: memberWithAvatarWhere,
              select: userSelect,
              orderBy: { followerCount: "desc" },
              take: 8,
            }),
        newMembers.length
          ? Promise.resolve([])
          : this.prisma.user.findMany({
              where: memberWithAvatarWhere,
              select: userSelect,
              orderBy: { createdAt: "desc" },
              take: 8,
            }),
        localEvents.length
          ? Promise.resolve([])
          : this.prisma.event.findMany({
        include: eventActivityRelations,
              where: { status: "published", startsAt: { gte: new Date() } },
              orderBy: { startsAt: "asc" },
              take: 8,
            }),
        popularPlaces.length
          ? Promise.resolve([])
          : this.prisma.place.findMany({
        include: activityRelations,
              where: { status: "active" },
              orderBy: { followerCount: "desc" },
              take: 8,
            }),
      ]);
    if (!popularMembers.length) popularMembers = globalPopularMembers;
    if (!newMembers.length) newMembers = globalNewMembers;
    if (!localEvents.length) localEvents = globalEvents;
    if (!popularPlaces.length) popularPlaces = globalPlaces;
    const createdAt = {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lte: new Date(query.to) } : {}),
    };
    const dateWhere = query.from || query.to ? { createdAt } : {};
    const [
      initialActivityEvents,
      initialActivityPlaces,
      activityTags,
      eventJoins,
      placeJoins,
    ] = await Promise.all([
      this.prisma.event.findMany({
        include: eventActivityRelations,
        where: { status: "published", ...localWhere, ...dateWhere },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
      this.prisma.place.findMany({
        include: activityRelations,
        where: { status: "active", ...localWhere, ...dateWhere },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
      this.prisma.tag.findMany({
        where: { status: "active", ...dateWhere },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
      this.prisma.eventParticipant.findMany({
        where: {
          status: { in: ["accepted", "attended"] },
          ...dateWhere,
          event: { status: "published", ...localWhere },
          ...(blockedIds.length ? { userId: { notIn: blockedIds } } : {}),
        },
        include: { event: { include: eventActivityRelations }, user: { select: userSelect } },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
      this.prisma.placeMember.findMany({
        where: {
          status: "accepted",
          ...dateWhere,
          place: { status: "active", ...localWhere },
          ...(blockedIds.length ? { userId: { notIn: blockedIds } } : {}),
        },
        include: { place: { include: activityRelations }, user: { select: userSelect } },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),
    ]);
    let activityEvents = initialActivityEvents;
    let activityPlaces = initialActivityPlaces;
    if (!activityEvents.length && Object.keys(localWhere).length)
      activityEvents = await this.prisma.event.findMany({
        include: eventActivityRelations,
        where: { status: "published", ...dateWhere },
        orderBy: { createdAt: "desc" },
        take: 15,
      });
    if (!activityPlaces.length && Object.keys(localWhere).length)
      activityPlaces = await this.prisma.place.findMany({
        include: activityRelations,
        where: { status: "active", ...dateWhere },
        orderBy: { createdAt: "desc" },
        take: 15,
      });
    const rawActivities = [
      ...activityEvents.map((item) => ({
        ...this.eventItem(item),
        action: "Etkinlik oluşturuldu",
        occurredAt: item.createdAt,
        ownerId: item.createdById,
      })),
      ...activityPlaces.map((item) => ({
        ...this.placeItem(item),
        action: "Mekân oluşturuldu",
        occurredAt: item.createdAt,
        ownerId: item.createdById,
      })),
      ...activityTags.map((item) => ({
        ...this.tagItem(item),
        action: "Etiket oluşturuldu",
        occurredAt: item.createdAt,
        ownerId: item.createdById,
      })),
      // 07/11 #58: "Topluluğa katıldı" akış kartı iptal edildi.
      ...eventJoins.filter(item => item.user.status !== "invited" && audienceAllows(item.userId, item.user.privacySettings?.eventAudience ?? "everybody")).map((item) => ({
        ...this.eventItem(item.event),
        action: "Etkinliğe katıldı",
        occurredAt: item.createdAt,
        ownerId: item.userId,
      })),
      ...placeJoins.filter(item => item.user.status !== "invited" && item.userId !== item.place.createdById && audienceAllows(item.userId, item.user.privacySettings?.placeAudience ?? "everybody")).map((item) => ({
        ...this.placeItem(item.place),
        action: "Mekâna katıldı",
        occurredAt: item.createdAt,
        ownerId: item.userId,
      })),
    ]
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, 30);
    const actorIds = [...new Set(rawActivities.map((item) => item.ownerId).filter((id): id is string => Boolean(id)))];
    const actors = actorIds.length ? await this.prisma.user.findMany({ where: { id: { in: actorIds }, status: "active" }, select: userSelect }) : [];
    const identities = new Map((actors ?? []).map((actor) => [actor.id, { id: actor.id, name: publicName(actor), username: actor.username, avatarUrl: actor.uploadedMedia?.[0]?.url ?? null }]));
    const baseActivities = rawActivities.map((activity) => ({ ...activity, activityId: `${activity.action}-${activity.id}-${activity.ownerId}`, canManageContent: activity.action.endsWith("oluşturuldu"), actor: activity.ownerId ? identities.get(activity.ownerId) ?? null : null }));
    const extra = await additionalActivities(this.prisma, userId, blockedIds, createdAt);
    const activities = [...new Map([...baseActivities, ...extra].map(item => [item.activityId, item])).values()].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(0, 60);
    return {
      popularMembers: popularMembers.map((item) => this.userItem(item)),
      newMembers: newMembers.map((item) => this.userItem(item)),
      localEvents: localEvents.map((item) => this.eventItem(item)),
      trendingTags: trendingTags.map((item) => this.tagItem(item)),
      popularPlaces: popularPlaces.map((item) => this.placeItem(item)),
      activeUserCount,
      scope: query.scope ?? "local",
      location: city || country || null,
      city: city ?? null,
      country: country ?? null,
      activities,
      hiddenParticipantCount: new Set([...eventJoins, ...placeJoins].filter(item => item.user.status === "invited").map(item => item.userId)).size,
    };
  }

  async search(rawQuery: string, userId?: string) {
    const query = rawQuery.trim().replace(/^@/, "");
    const contains = { contains: query, mode: "insensitive" as const };
    const blockedIds = await this.blockedUserIds(userId);
    const [users, tags, events, places] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          status: "active",
          role: "user",
          ...(blockedIds.length ? { id: { notIn: blockedIds } } : {}),
          OR: [{ name: contains, OR: [{ privacySettings: null }, { privacySettings: { profileNameAudience: "everybody" } }] }, { username: contains }],
        },
        select: userSelect,
        orderBy: { followerCount: "desc" },
        take: 10,
      }),
      this.prisma.tag.findMany({
        where: {
          status: "active",
          OR: [{ name: contains }, { description: contains }],
        },
        orderBy: { usageCount: "desc" },
        take: 10,
      }),
      this.prisma.event.findMany({
        include: eventActivityRelations,
        where: {
          status: "published",
          OR: [{ title: contains }, { summary: contains }, { city: contains }],
        },
        orderBy: { startsAt: "asc" },
        take: 10,
      }),
      this.prisma.place.findMany({
        include: activityRelations,
        where: {
          status: "active",
          OR: [
            { name: contains },
            { description: contains },
            { city: contains },
          ],
        },
        orderBy: { followerCount: "desc" },
        take: 10,
      }),
    ]);
    const items = [
      ...users.map((item) => this.userItem(item)),
      ...tags.map((item) => this.tagItem(item)),
      ...events.map((item) => this.eventItem(item)),
      ...places.map((item) => this.placeItem(item)),
    ];
    return { query, total: items.length, items };
  }

  private async blockedUserIds(userId?: string) {
    if (!userId) return [];
    const blocks = await this.prisma.userBlock.findMany({
      where: { targetType: "user", OR: [{ userId }, { targetId: userId }] },
      select: { userId: true, targetId: true },
    });
    return [
      userId,
      ...blocks.map((block) =>
        block.userId === userId ? block.targetId : block.userId,
      ),
    ];
  }

  private userItem(user: {
    privacySettings?: { profileNameAudience: string } | null;
    accountType?: string; companyName?: string | null;
    uploadedMedia?: Array<{ url: string }>;
    id: string;
    name: string;
    username: string | null;
    city: string | null;
    country: string | null;
    followerCount: number;
  }) {
    return {
      kind: "user" as const,
      id: user.id,
      title: user.username ? `@${user.username}` : publicName(user),
      subtitle: publicName(user) !== user.username ? publicName(user) : null,
      href: `/users/id/${user.id}`,
      imageUrl: user.uploadedMedia?.[0]?.url ?? null,
      meta: `${user.followerCount} takipçi`,
    };
  }
  private tagItem(tag: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    usageCount: number;
  }) {
    return {
      kind: "tag" as const,
      id: tag.id,
      title: `#${tag.name}`,
      subtitle: tag.description,
      href: `/tags/${tag.slug}`,
      imageUrl: null,
      meta: `${tag.usageCount} kullanım`,
    };
  }
  private eventItem(event: {
    tags?: { tag: { id: string; name: string; slug: string } }[];
    place?: { name: string; slug: string } | null;
    id: string;
    title: string;
    slug: string;
    summary: string;
    coverImageUrl: string | null;
    city: string | null;
    startsAt: Date;
    endsAt?: Date | null;
    locationName?: string | null;
  }) {
    return {
      tags: event.tags?.map(t => t.tag) ?? [],
      place: event.place ?? null,
      startsAt: event.startsAt,
      endsAt: event.endsAt ?? null,
      city: event.city ?? null,
      locationName: event.locationName ?? null,
      kind: "event" as const,
      id: event.id,
      title: event.title,
      subtitle: event.summary,
      href: `/events/${event.slug}`,
      imageUrl: event.coverImageUrl,
      meta: `${event.city ?? "Online"} · ${event.startsAt.toISOString()}`,
    };
  }
  private placeItem(place: {
    tags?: { tag: { id: string; name: string; slug: string } }[];
    id: string;
    name: string;
    slug: string;
    description: string | null;
    coverImageUrl: string | null;
    city: string | null;
    country?: string | null;
    placeType?: string | null;
    followerCount: number;
  }) {
    return {
      tags: place.tags?.map(t => t.tag) ?? [],
      city: place.city ?? null,
      country: place.country ?? null,
      placeType: place.placeType ?? null,
      followerCount: place.followerCount,
      kind: "place" as const,
      id: place.id,
      title: place.name,
      subtitle: place.description,
      href: `/places/${place.slug}`,
      imageUrl: place.coverImageUrl,
      meta: `${place.followerCount} takipçi${place.city ? ` · ${place.city}` : ""}`,
    };
  }
}
