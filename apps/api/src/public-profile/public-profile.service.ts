import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrivacyAudience } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PublicProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getByUsername(rawUsername: string, viewerId?: string) {
    const username = rawUsername.trim();
    const profile = await this.prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" }, status: "active", role: "user" },
      select: {
        id: true, name: true, username: true, accountType: true, website: true, city: true, country: true,
        followerCount: true, followingCount: true, createdAt: true,
        privacySettings: { select: { messageAudience: true, eventAudience: true, placeAudience: true } },
        interestTags: { where: { tag: { status: "active" } }, include: { tag: true }, orderBy: { createdAt: "desc" } }
      }
    });
    if (!profile?.username) throw new NotFoundException("Kullanıcı profili bulunamadı.");
    if (viewerId && viewerId !== profile.id) {
      const blocked = await this.prisma.userBlock.findFirst({ where: { targetType: "user", OR: [{ userId: viewerId, targetId: profile.id }, { userId: profile.id, targetId: viewerId }] }, select: { userId: true } });
      if (blocked) throw new ForbiddenException("Bu kullanıcı profili görüntülenemiyor.");
    }
    const relationship = await this.relationship(profile.id, viewerId);
    const privacy = profile.privacySettings ?? { messageAudience: "everybody" as const, eventAudience: "everybody" as const, placeAudience: "everybody" as const };
    const [media, ownInterests, events, places] = await Promise.all([
      this.prisma.mediaFile.findMany({ where: { contentType: "user", contentId: profile.id, status: "active" }, select: { id: true, url: true, type: true, sortOrder: true, isProfilePicture: true }, orderBy: { sortOrder: "asc" }, take: 50 }),
      viewerId ? this.prisma.userInterestTag.findMany({ where: { userId: viewerId }, select: { tagId: true } }) : [],
      this.canView(privacy.eventAudience, relationship) ? this.prisma.event.findMany({ where: { createdById: profile.id, status: "published" }, orderBy: { startsAt: "desc" }, take: 12 }) : [],
      this.canView(privacy.placeAudience, relationship) ? this.prisma.place.findMany({ where: { createdById: profile.id, status: "active" }, orderBy: { followerCount: "desc" }, take: 12 }) : []
    ]);
    const ownTagIds = new Set(ownInterests.map((item) => item.tagId));
    const interests = profile.interestTags.map((item) => ({ tag: item.tag, sentiment: item.sentiment, common: ownTagIds.has(item.tagId) }));
    return {
      id: profile.id, name: profile.name, username: profile.username,
      accountType: profile.accountType === "corporate" ? "corporate" as const : "individual" as const,
      website: profile.website, city: profile.city, country: profile.country,
      followerCount: profile.followerCount, followingCount: profile.followingCount, memberSince: profile.createdAt,
      media, interests, commonInterestCount: interests.filter((item) => item.common).length,
      relationship: { isSelf: viewerId === profile.id, following: relationship.viewerFollowsOwner, canMessage: viewerId !== undefined && viewerId !== profile.id && this.canView(privacy.messageAudience, relationship) },
      events: events.map((event) => ({ kind: "event" as const, id: event.id, title: event.title, subtitle: event.summary, href: `/events/${event.slug}`, imageUrl: event.coverImageUrl, meta: `${event.city ?? "Online"} · ${event.startsAt.toISOString()}` })),
      places: places.map((place) => ({ kind: "place" as const, id: place.id, title: place.name, subtitle: place.description, href: `/places/${place.slug}`, imageUrl: place.coverImageUrl, meta: `${place.followerCount} takipçi${place.city ? ` · ${place.city}` : ""}` }))
    };
  }

  private async relationship(ownerId: string, viewerId?: string) {
    if (!viewerId || ownerId === viewerId) return { viewerFollowsOwner: ownerId === viewerId, ownerFollowsViewer: ownerId === viewerId, inNetwork: ownerId === viewerId };
    const direct = await this.prisma.userFollow.findMany({ where: { OR: [{ followerId: viewerId, followingId: ownerId }, { followerId: ownerId, followingId: viewerId }] }, select: { followerId: true, followingId: true } });
    const viewerFollowsOwner = direct.some((item) => item.followerId === viewerId);
    const ownerFollowsViewer = direct.some((item) => item.followerId === ownerId);
    let inNetwork = ownerFollowsViewer;
    if (!inNetwork) {
      const ownerFollowing = await this.prisma.userFollow.findMany({ where: { followerId: ownerId }, select: { followingId: true }, take: 500 });
      if (ownerFollowing.length) inNetwork = Boolean(await this.prisma.userFollow.findFirst({ where: { followerId: { in: ownerFollowing.map((item) => item.followingId) }, followingId: viewerId }, select: { followerId: true } }));
    }
    return { viewerFollowsOwner, ownerFollowsViewer, inNetwork };
  }

  private canView(audience: PrivacyAudience, relationship: { ownerFollowsViewer: boolean; inNetwork: boolean }) { return audience === "everybody" || audience === "following" && relationship.ownerFollowsViewer || audience === "network" && relationship.inNetwork; }
}
