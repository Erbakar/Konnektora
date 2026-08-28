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
        privacySettings: { select: { messageAudience: true, eventAudience: true, placeAudience: true, profileNameAudience: true, demographicsAudience: true, locationAudience: true, websiteAudience: true, businessAudience: true, addressAudience: true, tradeNameAudience: true } },
        interestTags: { where: { tag: { status: "active" } }, include: { tag: true }, orderBy: { createdAt: "desc" } }
      }
    });
    if (!profile) throw new NotFoundException("Kullanıcı profili bulunamadı.");
    if (viewerId && viewerId !== profile.id) {
      const blocked = await this.prisma.userBlock.findFirst({ where: { targetType: "user", OR: [{ userId: viewerId, targetId: profile.id }, { userId: profile.id, targetId: viewerId }] }, select: { userId: true } });
      if (blocked) throw new ForbiddenException("Bu kullanıcı profili görüntülenemiyor.");
    }
    const relationship = await this.relationship(profile.id, viewerId);
    const privacy = profile.privacySettings ?? { messageAudience: "everybody" as const, eventAudience: "everybody" as const, placeAudience: "everybody" as const, profileNameAudience: "everybody" as const, demographicsAudience: "everybody" as const, locationAudience: "everybody" as const, websiteAudience: "everybody" as const, businessAudience: "everybody" as const, addressAudience: "everybody" as const, tradeNameAudience: "everybody" as const };
    const canViewStats = viewerId === profile.id || ["admin", "super_admin", "curator"].includes(viewerRole ?? "");
    const [media, ownInterests, events, places, profileViews, authoredComments, sentMessages, profileViewDetails, followerDetails, ownedEventStats, scans, profileViewSources, profileSharesByChannel, profileActions] = await Promise.all([
      this.prisma.mediaFile.findMany({ where: { contentType: "user", contentId: profile.id, status: "active" }, select: { id: true, url: true, type: true, sortOrder: true, isProfilePicture: true }, orderBy: { sortOrder: "asc" }, take: 50 }),
      viewerId ? this.prisma.userInterestTag.findMany({ where: { userId: viewerId }, select: { tagId: true, sentiment: true } }) : [],
      this.canView(privacy.eventAudience, relationship) ? this.prisma.event.findMany({ where: { status: "published", OR: [{ createdById: profile.id }, { participants: { some: { userId: profile.id, status: { in: ["accepted", "attended"] } } } }] }, orderBy: { startsAt: "desc" }, take: 24, include: { _count: { select: { participants: { where: { status: { in: ["accepted", "attended"] } } } } } } }) : [],
      this.canView(privacy.placeAudience, relationship) ? this.prisma.place.findMany({ where: { status: "active", OR: [{ createdById: profile.id }, { members: { some: { userId: profile.id, status: "accepted" } } }] }, orderBy: { followerCount: "desc" }, take: 24 }) : [],
      canViewStats ? this.prisma.contentView.count({ where: { targetType: "user", targetId: profile.id, kind: "detail" } }) : 0,
      canViewStats ? this.prisma.contentComment.count({ where: { authorId: profile.id, status: "active" } }) : 0,
      canViewStats ? this.prisma.privateMessage.count({ where: { senderId: profile.id, status: "active" } }) : 0,
      canViewStats ? this.prisma.contentView.findMany({
        where: { targetType: "user", targetId: profile.id, kind: "detail" },
        select: {
          createdAt: true,
          user: { select: { birthDate: true, gender: true, city: true, country: true, interestTags: { select: { tag: { select: { name: true } } }, take: 25 } } },
        },
        orderBy: { createdAt: "desc" },
        take: 20_000,
      }) : [],
      canViewStats ? this.prisma.userFollow.findMany({
        where: { followingId: profile.id },
        select: { createdAt: true, follower: { select: { birthDate: true, gender: true, city: true, country: true, preferredLanguage: true, interestTags: { select: { tag: { select: { name: true } } }, take: 25 } } } },
        take: 20_000,
      }) : [],
      canViewStats ? this.prisma.event.findMany({
        where: { createdById: profile.id },
        select: {
          id: true,
          startsAt: true,
          participants: { where: { status: { in: ["accepted", "attended"] } }, select: { status: true } },
          ticketTypeRecords: { select: { soldCount: true } },
          payments: { where: { status: "succeeded" }, select: { grossAmount: true, platformFee: true, netAmount: true } },
          ticketRefunds: { select: { amount: true } },
        },
        take: 2_000,
      }) : [],
      canViewStats ? this.prisma.memberScan.count({ where: { memberId: profile.id } }) : 0,
      canViewStats ? this.prisma.contentView.groupBy({ by: ["source"], where: { targetType: "user", targetId: profile.id, kind: "detail" }, _count: { _all: true } }) : [],
      canViewStats ? this.prisma.contentShare.groupBy({ by: ["channel"], where: { targetType: "user", targetId: profile.id }, _count: { _all: true } }) : [],
      canViewStats ? this.prisma.contentAction.groupBy({ by: ["action"], where: { targetType: "user", targetId: profile.id }, _count: { _all: true } }) : [],
    ]);
    const ownTagSentiments = new Map(ownInterests.map((item) => [item.tagId, item.sentiment]));
    const commentGroups = profile.interestTags.length ? await this.prisma.contentComment.groupBy({ by: ["targetId"], where: { targetType: "tag", targetId: { in: profile.interestTags.map((item) => item.tagId) }, authorId: profile.id, status: "active" }, _count: { _all: true }, _max: { updatedAt: true } }) : [];
    const commentsByTag = new Map(commentGroups.map((item) => [item.targetId, item]));
    const interests = profile.interestTags.map((item) => { const comments = commentsByTag.get(item.tagId); return { tag: item.tag, sentiment: item.sentiment, common: ownTagSentiments.get(item.tagId) === item.sentiment, commentCount: comments?._count._all ?? 0, lastActivityAt: (comments?._max.updatedAt ?? item.createdAt).toISOString() }; }).sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());
    const mutualism = viewerId && viewerId !== profile.id ? await this.buildMutualism({ viewerId, profile, interests, events, places }) : undefined;
    const now = new Date();
    const day = 86_400_000;
    const profileViewsLast7d = profileViewDetails.filter((item) => now.getTime() - item.createdAt.getTime() <= 7 * day).length;
    const profileViewsLast30d = profileViewDetails.filter((item) => now.getTime() - item.createdAt.getTime() <= 30 * day).length;
    const profileViewsLast90d = profileViewDetails.filter((item) => now.getTime() - item.createdAt.getTime() <= 90 * day).length;
    const visitorCountryCounts = profileDistribution(profileViewDetails.map((item) => item.user?.country || "belirtilmedi"), 10);
    const visitorAgeCounts = profileDistribution(profileViewDetails.map((item) => profileAgeBucket(item.user?.birthDate ?? null)));
    const visitorGenderCounts = profileDistribution(profileViewDetails.map((item) => item.user?.gender || "belirtilmedi"));
    const visitorInterestCounts = profileDistribution(profileViewDetails.flatMap((item) => item.user?.interestTags.map((interest) => interest.tag.name) ?? []), 12);
    const followerCountryCounts = profileDistribution(followerDetails.map((item) => item.follower.country || "belirtilmedi"), 10);
    const followerAgeCounts = profileDistribution(followerDetails.map((item) => profileAgeBucket(item.follower.birthDate)));
    const followerGenderCounts = profileDistribution(followerDetails.map((item) => item.follower.gender || "belirtilmedi"));
    const followerInterestCounts = profileDistribution(followerDetails.flatMap((item) => item.follower.interestTags.map((interest) => interest.tag.name)), 12);
    const followerLanguageCounts = profileDistribution(followerDetails.map((item) => item.follower.preferredLanguage || "belirtilmedi"));
    const averageFollowDurationDays = followerDetails.length ? Math.round(followerDetails.reduce((sum, item) => sum + (now.getTime() - item.createdAt.getTime()) / day, 0) / followerDetails.length * 10) / 10 : 0;
    const followersLast7d = followerDetails.filter((item) => now.getTime() - item.createdAt.getTime() <= 7 * day).length;
    const followersLast30d = followerDetails.filter((item) => now.getTime() - item.createdAt.getTime() <= 30 * day).length;
    const followersLast90d = followerDetails.filter((item) => now.getTime() - item.createdAt.getTime() <= 90 * day).length;
    const eventAccepted = ownedEventStats.reduce((sum, event) => sum + event.participants.length, 0);
    const eventAttended = ownedEventStats.reduce((sum, event) => sum + event.participants.filter((participant) => participant.status === "attended").length, 0);
    const ticketsSold = ownedEventStats.reduce((sum, event) => sum + event.ticketTypeRecords.reduce((ticketSum, ticket) => ticketSum + ticket.soldCount, 0), 0);
    const ticketRevenue = ownedEventStats.reduce((sum, event) => sum + event.payments.reduce((paymentSum, payment) => paymentSum + Number(payment.grossAmount), 0), 0);
    const platformFees = ownedEventStats.reduce((sum, event) => sum + event.payments.reduce((paymentSum, payment) => paymentSum + Number(payment.platformFee), 0), 0);
    const organizerRevenue = ownedEventStats.reduce((sum, event) => sum + event.payments.reduce((paymentSum, payment) => paymentSum + Number(payment.netAmount), 0), 0);
    const refundAmount = ownedEventStats.reduce((sum, event) => sum + event.ticketRefunds.reduce((refundSum, refund) => refundSum + Number(refund.amount), 0), 0);
    const ownedEventIds = ownedEventStats.map((event: any) => event.id).filter(Boolean);
    const [searchImpressions, searchClicks, ownedEventViews, ownedEventShares] = canViewStats ? await Promise.all([
      this.prisma.contentView.count({ where: { targetType: "user", targetId: profile.id, kind: "impression", source: "app_search" } }),
      this.prisma.contentView.count({ where: { targetType: "user", targetId: profile.id, kind: "detail", source: "app_search" } }),
      ownedEventIds.length ? this.prisma.contentView.count({ where: { targetType: "event", targetId: { in: ownedEventIds }, kind: "detail" } }) : 0,
      ownedEventIds.length ? this.prisma.contentShare.count({ where: { targetType: "event", targetId: { in: ownedEventIds } } }) : 0,
    ]) : [0, 0, 0, 0];
    const actionCount = (action: string) => profileActions.find((item) => item.action === action)?._count._all ?? 0;
    const profileStats = canViewStats ? {
      followers: profile.followerCount,
      following: profile.followingCount,
      interests: interests.length,
      events: events.length,
      places: places.length,
      media: media.length,
      profileViews,
      shares: profileSharesByChannel.reduce((sum, item) => sum + item._count._all, 0),
      profileViewsLast7d,
      profileViewsLast30d,
      profileViewsLast90d,
      searchImpressions,
      searchClickRate: searchImpressions > 0 ? Math.round(searchClicks / searchImpressions * 100) : 0,
      websiteClicks: actionCount("website_click"),
      locationViews: actionCount("location_view"),
      comments: authoredComments,
      messages: sentMessages,
      memberScans: scans,
      averageEventsPerMonth: Math.round(events.length / Math.max(1, (Date.now() - profile.createdAt.getTime()) / 2_629_800_000) * 10) / 10,
      averageFollowDurationDays,
      followersLast7d,
      followersLast30d,
      followersLast90d,
      ownedEventViews,
      ownedEventShares,
      eventAccepted,
      eventAttended,
      eventAttendanceRate: eventAccepted > 0 ? Math.round(eventAttended / eventAccepted * 100) : 0,
      ticketsSold,
      ticketRevenue: Math.round(ticketRevenue * 100) / 100,
      platformFees: Math.round(platformFees * 100) / 100,
      organizerRevenue: Math.round(organizerRevenue * 100) / 100,
      refundAmount: Math.round(refundAmount * 100) / 100,
      profileConversionRate: profileViews > 0 ? Math.round(profile.followerCount / profileViews * 100) : 0,
      ...profilePrefix("visitorCountry", visitorCountryCounts),
      ...profilePrefix("visitorAge", visitorAgeCounts),
      ...profilePrefix("visitorGender", visitorGenderCounts),
      ...profilePrefix("visitorInterest", visitorInterestCounts),
      ...profilePrefix("followerCountry", followerCountryCounts),
      ...profilePrefix("followerAge", followerAgeCounts),
      ...profilePrefix("followerGender", followerGenderCounts),
      ...profilePrefix("followerInterest", followerInterestCounts),
      ...profilePrefix("followerLanguage", followerLanguageCounts),
      ...profilePrefix("source", Object.fromEntries(profileViewSources.map((item) => [item.source || "direct", item._count._all]))),
      ...profilePrefix("shareChannel", Object.fromEntries(profileSharesByChannel.map((item) => [item.channel, item._count._all]))),
    } : undefined;
    return {
      id: profile.id, name: this.canView(privacy.profileNameAudience ?? "everybody", relationship) ? profile.name : profile.username ?? "Konnektora üyesi", username: profile.username ?? profile.id,
      accountType: profile.accountType === "corporate" ? "corporate" as const : "individual" as const,
      website: this.canView(privacy.websiteAudience ?? "everybody", relationship) ? profile.website : null,
      city: this.canView(privacy.locationAudience ?? "everybody", relationship) ? profile.city : null,
      country: this.canView(privacy.locationAudience ?? "everybody", relationship) ? profile.country : null,
      district: this.canView(privacy.addressAudience ?? "everybody", relationship) ? profile.district : null,
      address: this.canView(privacy.addressAudience ?? "everybody", relationship) ? profile.address : null,
      gender: this.canView(privacy.demographicsAudience ?? "everybody", relationship) ? profile.gender : null,
      birthDate: this.canView(privacy.demographicsAudience ?? "everybody", relationship) ? profile.birthDate : null,
      companyName: this.canView(privacy.businessAudience ?? "everybody", relationship) ? profile.companyName : null,
      tradeName: this.canView(privacy.tradeNameAudience ?? "everybody", relationship) ? profile.tradeName : null,
      companyType: this.canView(privacy.businessAudience ?? "everybody", relationship) ? profile.companyType : null,
      businessCategory: this.canView(privacy.businessAudience ?? "everybody", relationship) ? profile.businessCategory : null,
      followerCount: profile.followerCount, followingCount: profile.followingCount, memberSince: profile.createdAt, verified: Boolean(profile.profileVerifiedAt),
      media, interests, commonInterestCount: interests.filter((item) => item.common).length, mutualism,
      relationship: { isSelf: viewerId === profile.id, following: relationship.viewerFollowsOwner, canMessage: viewerId !== undefined && viewerId !== profile.id && this.canView(privacy.messageAudience, relationship) },
      stats: profileStats,
      events: events.map((event) => ({ kind: "event" as const, id: event.id, title: event.title, subtitle: event.summary, href: `/events/${event.slug}`, imageUrl: event.coverImageUrl, meta: `${event.locationName ?? event.city ?? "Online"} · ${event.startsAt.toISOString()}`, latitude: event.latitude == null ? null : Number(event.latitude), longitude: event.longitude == null ? null : Number(event.longitude), attendeeCount: event._count.participants, organizer: event.createdById === profile.id })),
      places: places.map((place) => ({ kind: "place" as const, id: place.id, title: place.name, subtitle: place.description, href: `/places/${place.slug}`, imageUrl: place.coverImageUrl, meta: `${place.followerCount} members${place.city ? ` · ${place.city}` : ""}`, latitude: place.latitude == null ? null : Number(place.latitude), longitude: place.longitude == null ? null : Number(place.longitude), organizer: place.createdById === profile.id }))
    };
  }

  private async buildMutualism(input: {
    viewerId: string;
    profile: { id: string; city: string | null; country: string | null; accountType: string };
    interests: Array<{ tag: any; sentiment: string; common: boolean; commentCount?: number; lastActivityAt?: string }>;
    events: Array<any>;
    places: Array<any>;
  }) {
    const { viewerId, profile, interests, events, places } = input;
    const [sharedEventRows, sharedPlaceRows, followRows, reactionRows, commentRows, viewerProfile] = await Promise.all([
      events.length ? this.prisma.event.findMany({ where: { id: { in: events.map((item) => item.id) }, OR: [{ createdById: viewerId }, { participants: { some: { userId: viewerId, status: { in: ["accepted", "attended"] } } } }] }, select: { id: true } }) : [],
      places.length ? this.prisma.place.findMany({ where: { id: { in: places.map((item) => item.id) }, OR: [{ createdById: viewerId }, { members: { some: { userId: viewerId, status: "accepted" } } }] }, select: { id: true } }) : [],
      this.prisma.userFollow.findMany({ where: { followerId: { in: [viewerId, profile.id] } }, select: { followerId: true, followingId: true, following: { select: { id: true, name: true, username: true, uploadedMedia: { where: { contentType: "user", status: "active", isProfilePicture: true }, select: { url: true }, take: 1 } } } }, take: 10_000 }),
      this.prisma.contentReaction.findMany({ where: { userId: { in: [viewerId, profile.id] } }, select: { userId: true, targetType: true, targetId: true }, take: 20_000 }),
      this.prisma.contentComment.findMany({ where: { authorId: { in: [viewerId, profile.id] }, status: "active" }, select: { authorId: true, targetType: true, targetId: true }, take: 20_000 }),
      this.prisma.user.findUnique({ where: { id: viewerId }, select: { city: true, country: true } }),
    ]);
    const sharedEventIds = new Set(sharedEventRows.map((item) => item.id));
    const sharedPlaceIds = new Set(sharedPlaceRows.map((item) => item.id));
    const followGroups = new Map<string, { users: Set<string>; person: (typeof followRows)[number]["following"] }>();
    for (const row of followRows) {
      const current = followGroups.get(row.followingId) ?? { users: new Set<string>(), person: row.following };
      current.users.add(row.followerId);
      followGroups.set(row.followingId, current);
    }
    const people = [...followGroups.values()].filter((item) => item.users.size === 2).map(({ person }) => ({ id: person.id, name: person.name, username: person.username, avatarUrl: person.uploadedMedia[0]?.url ?? null })).slice(0, 24);
    const intersectTargets = (rows: Array<{ userId?: string; authorId?: string | null; targetType: string; targetId: string }>, userKey: "userId" | "authorId") => {
      const groups = new Map<string, Set<string>>();
      for (const row of rows) {
        const actorId = row[userKey];
        if (!actorId) continue;
        const key = `${row.targetType}:${row.targetId}`;
        const actors = groups.get(key) ?? new Set<string>();
        actors.add(actorId);
        groups.set(key, actors);
      }
      return [...groups.values()].filter((actors) => actors.size === 2).length;
    };
    const sharedReactionCount = intersectTargets(reactionRows, "userId");
    const sharedCommentTargetCount = intersectTargets(commentRows, "authorId");
    const sameSentimentTags = interests.filter((item) => item.common);
    const sharedEvents = events.filter((item) => sharedEventIds.has(item.id));
    const sharedPlaces = places.filter((item) => sharedPlaceIds.has(item.id));
    const eventItems = sharedEvents.map((event) => ({ kind: "event" as const, id: event.id, title: event.title, subtitle: event.summary, href: `/events/${event.slug}`, imageUrl: event.coverImageUrl, meta: `${event.locationName ?? event.city ?? "Online"} · ${event.startsAt.toISOString()}`, latitude: event.latitude == null ? null : Number(event.latitude), longitude: event.longitude == null ? null : Number(event.longitude), attendeeCount: event._count.participants, organizer: event.createdById === profile.id }));
    const placeItems = sharedPlaces.map((place) => ({ kind: "place" as const, id: place.id, title: place.name, subtitle: place.description, href: `/places/${place.slug}`, imageUrl: place.coverImageUrl, meta: `${place.followerCount} members${place.city ? ` · ${place.city}` : ""}`, latitude: place.latitude == null ? null : Number(place.latitude), longitude: place.longitude == null ? null : Number(place.longitude), organizer: place.createdById === profile.id }));
    const sameLocation = Boolean(viewerProfile && ((viewerProfile.city && profile.city && viewerProfile.city.localeCompare(profile.city, undefined, { sensitivity: "accent" }) === 0) || (viewerProfile.country && profile.country && viewerProfile.country.localeCompare(profile.country, undefined, { sensitivity: "accent" }) === 0)));
    const score = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
    const friendship = score(sameSentimentTags.length * 8 + people.length * 14 + sharedReactionCount * 4 + sharedCommentTargetCount * 5);
    const networking = score(people.length * 16 + sharedEvents.length * 16 + sameSentimentTags.length * 5);
    const eventPartner = score(sharedEvents.length * 28 + sameSentimentTags.length * 7 + sharedPlaces.length * 10);
    const travel = score(sharedPlaces.length * 24 + (sameLocation ? 12 : 0) + sameSentimentTags.length * 4);
    const business = score(sharedEvents.length * 14 + people.length * 10 + sameSentimentTags.length * 6 + (profile.accountType === "corporate" ? 10 : 0));
    const overall = score((friendship + networking + eventPartner + travel + business) / 5);
    const total = sameSentimentTags.length + sharedEvents.length + sharedPlaces.length + people.length + sharedReactionCount + sharedCommentTargetCount;
    const strongest = [["arkadaşlık", friendship], ["networking", networking], ["etkinlik partnerliği", eventPartner], ["seyahat", travel], ["iş", business]].sort((a, b) => Number(b[1]) - Number(a[1]))[0]!;
    const explanation = total ? `${total} doğrulanmış ortak sinyal bulundu. En güçlü uyum alanı ${strongest[0]} (%${strongest[1]}); skor ortak ilgi duyguları, etkinlikler, mekânlar, takipler ve içerik etkileşimlerinden hesaplandı.` : "Henüz doğrulanmış ortak bir sinyal bulunamadı. Yeni etkinlik ve ilgi alanı etkileşimleri oluştukça analiz güncellenecek.";
    const actions = [
      sharedEvents[0] ? `${sharedEvents[0].title} etkinliği hakkında sohbet başlatın.` : null,
      sameSentimentTags[0] ? `${sameSentimentTags[0].tag.name} ortak ilgi alanından bir sohbet açın.` : null,
      sharedPlaces[0] ? `${sharedPlaces[0].name} mekânındaki gelecek etkinliklere birlikte göz atın.` : null,
      people[0] ? `${people[0].name} ortak bağlantınız üzerinden tanışma bağlamı oluşturun.` : null,
    ].filter((item): item is string => Boolean(item));
    return { total, hiddenCount: 0, sameSentimentTags, events: eventItems, places: placeItems, people, sharedReactionCount, sharedCommentTargetCount, scores: { overall, friendship, networking, eventPartner, travel, business }, explanation, actions };
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

function profileAgeBucket(birthDate: Date | null) {
  if (!birthDate) return "belirtilmedi";
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  if (now.getMonth() < birthDate.getMonth() || now.getMonth() === birthDate.getMonth() && now.getDate() < birthDate.getDate()) age -= 1;
  if (age < 25) return "18_24";
  if (age < 35) return "25_34";
  if (age < 45) return "35_44";
  return "45_plus";
}

function profileDistribution(values: string[], limit = 100) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort((left, right) => right[1] - left[1]).slice(0, limit));
}

function profilePrefix(prefix: string, values: Record<string, number>) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [`${prefix}_${profileMetricKey(key)}`, value]));
}

function profileMetricKey(value: string) {
  return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "belirtilmedi";
}
