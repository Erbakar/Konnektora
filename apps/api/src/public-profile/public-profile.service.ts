import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrivacyAudience } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PublicProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getByUsername(rawUsername: string, viewerId?: string, viewerRole?: string) {
    const username = rawUsername.trim();
    return this.getProfile({ username: { equals: username, mode: "insensitive" } }, viewerId, viewerRole);
  }

  async getById(id: string, viewerId?: string, viewerRole?: string) {
    return this.getProfile({ id }, viewerId, viewerRole);
  }

  private async getProfile(identifier: { id: string } | { username: { equals: string; mode: "insensitive" } }, viewerId?: string, viewerRole?: string) {
    const profile = await this.prisma.user.findFirst({
      where: { ...identifier, status: "active", role: { in: ["user", "curator"] } },
      select: {
        id: true, name: true, username: true, accountType: true, website: true, city: true, country: true, district: true, address: true, gender: true, birthDate: true, companyName: true, tradeName: true, companyType: true, businessCategory: true,
        followerCount: true, followingCount: true, createdAt: true, profileVerifiedAt: true,
        privacySettings: { select: { messageAudience: true, eventAudience: true, placeAudience: true, profileNameAudience: true, demographicsAudience: true, locationAudience: true, websiteAudience: true, businessAudience: true } },
        interestTags: { where: { tag: { status: "active" } }, include: { tag: true }, orderBy: { createdAt: "desc" } }
      }
    });
    if (!profile) throw new NotFoundException("Kullanıcı profili bulunamadı.");
    if (viewerId && viewerId !== profile.id) {
      const blocked = await this.prisma.userBlock.findFirst({ where: { targetType: "user", OR: [{ userId: viewerId, targetId: profile.id }, { userId: profile.id, targetId: viewerId }] }, select: { userId: true } });
      if (blocked) throw new ForbiddenException("Bu kullanıcı profili görüntülenemiyor.");
    }
    const relationship = await this.relationship(profile.id, viewerId);
    const privacy = profile.privacySettings ?? { messageAudience: "everybody" as const, eventAudience: "everybody" as const, placeAudience: "everybody" as const, profileNameAudience: "everybody" as const, demographicsAudience: "everybody" as const, locationAudience: "everybody" as const, websiteAudience: "everybody" as const, businessAudience: "everybody" as const };
    const canViewStats = viewerId === profile.id || ["admin", "super_admin", "curator"].includes(viewerRole ?? "");
    const [media, ownInterests, events, places, profileViews, authoredComments, sentMessages] = await Promise.all([
      this.prisma.mediaFile.findMany({ where: { contentType: "user", contentId: profile.id, status: "active" }, select: { id: true, url: true, type: true, sortOrder: true, isProfilePicture: true }, orderBy: { sortOrder: "asc" }, take: 50 }),
      viewerId ? this.prisma.userInterestTag.findMany({ where: { userId: viewerId }, select: { tagId: true } }) : [],
      this.canView(privacy.eventAudience, relationship) ? this.prisma.event.findMany({ where: { status: "published", OR: [{ createdById: profile.id }, { participants: { some: { userId: profile.id, status: { in: ["accepted", "attended"] } } } }] }, orderBy: { startsAt: "desc" }, take: 24, include: { _count: { select: { participants: { where: { status: { in: ["accepted", "attended"] } } } } } } }) : [],
      this.canView(privacy.placeAudience, relationship) ? this.prisma.place.findMany({ where: { status: "active", OR: [{ createdById: profile.id }, { members: { some: { userId: profile.id, status: "accepted" } } }] }, orderBy: { followerCount: "desc" }, take: 24 }) : [],
      canViewStats ? this.prisma.contentView.count({ where: { targetType: "user", targetId: profile.id } }) : 0,
      canViewStats ? this.prisma.contentComment.count({ where: { authorId: profile.id, status: "active" } }) : 0,
      canViewStats ? this.prisma.privateMessage.count({ where: { senderId: profile.id, status: "active" } }) : 0,
    ]);
    const ownTagIds = new Set(ownInterests.map((item) => item.tagId));
    const commentGroups = profile.interestTags.length ? await this.prisma.contentComment.groupBy({ by: ["targetId"], where: { targetType: "tag", targetId: { in: profile.interestTags.map((item) => item.tagId) }, authorId: profile.id, status: "active" }, _count: { _all: true }, _max: { updatedAt: true } }) : [];
    const commentsByTag = new Map(commentGroups.map((item) => [item.targetId, item]));
    const interests = profile.interestTags.map((item) => { const comments = commentsByTag.get(item.tagId); return { tag: item.tag, sentiment: item.sentiment, common: ownTagIds.has(item.tagId), commentCount: comments?._count._all ?? 0, lastActivityAt: (comments?._max.updatedAt ?? item.createdAt).toISOString() }; }).sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());
    return {
      id: profile.id, name: this.canView(privacy.profileNameAudience ?? "everybody", relationship) ? profile.name : profile.username ?? "Konnektora üyesi", username: profile.username ?? profile.id,
      accountType: profile.accountType === "corporate" ? "corporate" as const : "individual" as const,
      website: this.canView(privacy.websiteAudience ?? "everybody", relationship) ? profile.website : null,
      city: viewerId === profile.id ? profile.city : null,
      country: viewerId === profile.id ? profile.country : null,
      district: viewerId === profile.id ? profile.district : null,
      address: viewerId === profile.id ? profile.address : null,
      gender: this.canView(privacy.demographicsAudience ?? "everybody", relationship) ? profile.gender : null,
      birthDate: this.canView(privacy.demographicsAudience ?? "everybody", relationship) ? profile.birthDate : null,
      companyName: this.canView(privacy.businessAudience ?? "everybody", relationship) ? profile.companyName : null,
      tradeName: this.canView(privacy.businessAudience ?? "everybody", relationship) ? profile.tradeName : null,
      companyType: this.canView(privacy.businessAudience ?? "everybody", relationship) ? profile.companyType : null,
      businessCategory: this.canView(privacy.businessAudience ?? "everybody", relationship) ? profile.businessCategory : null,
      followerCount: profile.followerCount, followingCount: profile.followingCount, memberSince: profile.createdAt, verified: Boolean(profile.profileVerifiedAt),
      media, interests, commonInterestCount: interests.filter((item) => item.common).length,
      relationship: { isSelf: viewerId === profile.id, following: relationship.viewerFollowsOwner, canMessage: viewerId !== undefined && viewerId !== profile.id && this.canView(privacy.messageAudience, relationship) },
      stats: canViewStats ? { followers: profile.followerCount, following: profile.followingCount, interests: interests.length, events: events.length, places: places.length, media: media.length, profileViews, comments: authoredComments, messages: sentMessages, averageEventsPerMonth: Math.round(events.length / Math.max(1, (Date.now() - profile.createdAt.getTime()) / 2_629_800_000) * 10) / 10 } : undefined,
      events: events.map((event) => ({ kind: "event" as const, id: event.id, title: event.title, subtitle: event.summary, href: `/events/${event.slug}`, imageUrl: event.coverImageUrl, meta: `${event.locationName ?? event.city ?? "Online"} · ${event.startsAt.toISOString()}`, latitude: event.latitude == null ? null : Number(event.latitude), longitude: event.longitude == null ? null : Number(event.longitude), attendeeCount: event._count.participants, organizer: event.createdById === profile.id })),
      places: places.map((place) => ({ kind: "place" as const, id: place.id, title: place.name, subtitle: place.description, href: `/places/${place.slug}`, imageUrl: place.coverImageUrl, meta: `${place.followerCount} members${place.city ? ` · ${place.city}` : ""}`, latitude: place.latitude == null ? null : Number(place.latitude), longitude: place.longitude == null ? null : Number(place.longitude), organizer: place.createdById === profile.id }))
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
