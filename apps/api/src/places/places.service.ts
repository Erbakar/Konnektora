import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  EventParticipantStatus,
  EventStatus,
  PlaceMemberRole,
  PlaceMemberStatus,
  Prisma,
  User,
} from "@prisma/client";
import { toSlug } from "../common/slug";
import { createHash, randomInt, randomUUID } from "crypto";
import { hash } from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { canUseAdvancedAnalytics } from "../common/analytics-access";
import {
  CreatePlaceDto,
  InvitePlaceMemberDto,
  PlaceCheckInDecisionDto,
  PlaceQueryDto,
  UpdatePlaceDto,
  UpdatePlaceMemberDto,
} from "./places.dto";
import { NotificationsService } from "../notifications/notifications.service";
import { IdentityService } from "../identity/identity.service";
import { AuthService } from "../auth/auth.service";
import { MailService } from "../mail/mail.service";
import { SmsService } from "../sms/sms.service";

const memberUserSelect = {
  id: true,
  email: true,
  name: true,
  username: true,
  role: true,
  accountType: true,
  status: true,
  uploadedMedia: { where: { contentType: "user", status: "active", isProfilePicture: true }, select: { url: true }, take: 1 },
} as const;

@Injectable()
export class PlacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly identity: IdentityService,
    private readonly authService: AuthService,
    private readonly mailService: MailService,
    private readonly smsService: SmsService,
  ) {}

  async list(query: PlaceQueryDto, viewerId?: string) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;
    const blocked = viewerId
      ? await this.prisma.userBlock.findMany({
          where: { userId: viewerId, targetType: "place" },
          select: { targetId: true },
        })
      : [];
    let popularCity: string | undefined;
    let popularCountry: string | undefined;
    const personalTagIds = (query.scope === "for_you" || query.scope === "near") && viewerId ? (await this.prisma.userInterestTag.findMany({ where: { userId: viewerId, sentiment: { in: ["like", "ok"] } }, select: { tagId: true }, take: 100 })).map((item) => item.tagId) : [];
    if (query.scope === "popular" && viewerId && !query.city && !query.country) {
      const viewer = await this.prisma.user.findUnique({ where: { id: viewerId }, select: { city: true, country: true } });
      if (viewer?.city && await this.prisma.place.count({ where: { status: "active", city: { equals: viewer.city, mode: "insensitive" } } })) popularCity = viewer.city;
      else if (viewer?.country && await this.prisma.place.count({ where: { status: "active", country: { equals: viewer.country, mode: "insensitive" } } })) popularCountry = viewer.country;
    }
    const where: Prisma.PlaceWhereInput = {
      status: "active",
      AND: [{ OR: [
          { visibility: { not: "invite_only" } },
          ...(viewerId ? [{ members: { some: { userId: viewerId, status: { in: [PlaceMemberStatus.invited, PlaceMemberStatus.accepted] } } } } as Prisma.PlaceWhereInput] : []),
        ] }, ...(query.scope === "for_you" && personalTagIds.length ? [{ tags: { some: { tagId: { in: personalTagIds } } } } as Prisma.PlaceWhereInput] : [])],
      id: { notIn: blocked.map((item) => item.targetId) },
      ...(query.q
        ? {
            OR: ["name", "description", "address"].map((field) => ({
              [field]: { contains: query.q, mode: "insensitive" as const },
            })),
          }
        : {}),
      ...(query.city || popularCity
        ? { city: { equals: query.city ?? popularCity, mode: "insensitive" } }
        : {}),
      ...(query.country || popularCountry
        ? { country: { equals: query.country ?? popularCountry, mode: "insensitive" } }
        : {}),
      ...(query.tag
        ? { tags: { some: { tag: { slug: query.tag, status: "active" } } } }
        : {}),
      ...(query.scope === "following"
        ? { followers: { some: { userId: viewerId ?? "" } } }
        : {}),
      ...(query.scope === "mine"
        ? { members: { some: { userId: viewerId ?? "", status: "accepted" } } }
        : {}),
    };
    const [foundItems, total] = await this.prisma.$transaction([
      this.prisma.place.findMany({
        where,
        orderBy:
          query.scope === "popular" || query.scope === "for_you"
            ? [{ followerCount: "desc" }, { createdAt: "desc" }]
            : [{ createdAt: "desc" }],
        skip: query.scope === "near" ? 0 : (page - 1) * pageSize,
        take: query.scope === "near" ? 200 : pageSize,
        include: this.viewerInclude(viewerId),
      }),
      this.prisma.place.count({ where }),
    ]);
    const items = query.scope === "near" && query.latitude != null && query.longitude != null
      ? [...foundItems].sort((left, right) => placeNearScore(right, new Set(personalTagIds), query.latitude!, query.longitude!) - placeNearScore(left, new Set(personalTagIds), query.latitude!, query.longitude!)).slice((page - 1) * pageSize, page * pageSize)
      : foundItems;
    return {
      items: items.map((place) => this.toPublicPlace(place, viewerId)),
      total,
      page,
      pageSize,
      hasNextPage: page * pageSize < total,
    };
  }

  async getBySlug(slug: string, viewerId?: string) {
    const publicCode = slug.match(/-(\d{6,})$/)?.[1];
    const slugWhere: Prisma.PlaceWhereInput = {
      OR: [
        { slug },
        { legacySlugs: { has: slug } },
        ...(publicCode ? [{ slug: { endsWith: `-${publicCode}` } }] : []),
      ],
    };
    const identity = await this.prisma.place.findFirst({
      where: slugWhere,
      select: { id: true },
    });
    const blocked =
      viewerId && identity
        ? await this.prisma.userBlock.findUnique({
            where: {
              userId_targetType_targetId: {
                userId: viewerId,
                targetType: "place",
                targetId: identity.id,
              },
            },
          })
        : null;
    if (blocked) throw new NotFoundException("Mekân bulunamadı.");
    const place = await this.prisma.place.findFirst({
      where: { AND: [slugWhere, { OR: [{ visibility: { not: "invite_only" } }, ...(viewerId ? [{ members: { some: { userId: viewerId, status: { in: [PlaceMemberStatus.invited, PlaceMemberStatus.accepted] } } } } as Prisma.PlaceWhereInput] : [])] }], status: "active" },
      include: this.viewerInclude(viewerId, true),
    });
    if (!place) throw new NotFoundException("Mekân bulunamadı.");
    const managers = await this.prisma.placeMember.findMany({
      where: { placeId: place.id, status: "accepted", role: { in: ["organizer", "manager"] } },
      orderBy: [{ role: "desc" }, { createdAt: "asc" }],
      select: { role: true, user: { select: { id: true, name: true, username: true, uploadedMedia: { where: { contentType: "user", status: "active", isProfilePicture: true }, select: { url: true }, take: 1 } } } },
    });
    return { ...this.toPublicPlace(place, viewerId), managers: (managers ?? []).map((item) => ({ id: item.user.id, name: item.user.name, username: item.user.username, role: item.role, avatarUrl: item.user.uploadedMedia?.[0]?.url ?? null })) };
  }

  async getInteractionStats(placeId: string, actor?: User) {
    if (actor && !["admin", "super_admin", "curator"].includes(actor.role)) await this.ensureCanManage(placeId, actor);
    if (actor && !canUseAdvancedAnalytics(actor)) throw new ForbiddenException("Gelişmiş istatistikler admin, küratör ve uygun paket sahipleri tarafından kullanılabilir.");
    const place = await this.prisma.place.findUnique({
      where: { id: placeId },
      select: { id: true, followerCount: true, inviteCount: true },
    });
    if (!place) throw new NotFoundException("Mekân bulunamadı.");
    const [members, memberDetails, placeCheckedIn, comments, reactions, ratingRows, views, detailViews, viewSources, sharesByChannel, events, eventDetails, ticketSummary, paymentSummary, refundSummary] = await Promise.all([
      this.prisma.placeMember.count({ where: { placeId, status: "accepted" } }),
      this.prisma.placeMember.findMany({
        where: { placeId, status: "accepted" },
        select: {
          checkedInAt: true,
          userId: true,
          user: {
            select: {
              birthDate: true,
              gender: true,
              city: true,
              country: true,
              preferredLanguage: true,
              username: true,
              interestTags: { select: { tag: { select: { name: true } } } },
            },
          },
        },
      }),
      this.prisma.placeMember.count({ where: { placeId, checkedInAt: { not: null } } }),
      this.prisma.contentComment.count({
        where: { targetType: "place", targetId: placeId, status: "active" },
      }),
      this.prisma.contentReaction.count({
        where: { targetType: "place", targetId: placeId, NOT: { reaction: { startsWith: "rating_" } } },
      }),
      this.prisma.contentReaction.findMany({
        where: { targetType: "place", targetId: placeId, reaction: { startsWith: "rating_" } },
        select: { reaction: true },
        take: 50_000,
      }),
      this.prisma.contentView.count({
        where: { targetType: "place", targetId: placeId, kind: "impression" },
      }),
      this.prisma.contentView.count({ where: { targetType: "place", targetId: placeId, kind: "detail" } }),
      this.prisma.contentView.groupBy({ by: ["source"], where: { targetType: "place", targetId: placeId, kind: "detail" }, _count: { _all: true } }),
      this.prisma.contentShare.groupBy({ by: ["channel"], where: { targetType: "place", targetId: placeId }, _count: { _all: true } }),
      this.prisma.event.count({ where: { placeId, status: "published" } }),
      this.prisma.event.findMany({ where: { placeId, status: "published" }, select: {
        id: true, title: true, startsAt: true,
        createdBy: { select: { id: true, username: true, name: true } },
        participants: { where: { status: "attended" }, select: { userId: true, checkedInAt: true, user: { select: { username: true, name: true, preferredLanguage: true } } } },
        ticketTypeRecords: { select: { capacity: true, soldCount: true, price: true } },
        _count: { select: { participants: { where: { status: { in: ["accepted", "attended"] } } } } },
      } }),
      this.prisma.eventTicketType.aggregate({ where: { event: { placeId } }, _sum: { capacity: true, soldCount: true }, _avg: { price: true } }),
      this.prisma.paymentTransaction.aggregate({ where: { event: { placeId }, status: { in: ["succeeded", "partially_refunded", "refunded"] } }, _sum: { grossAmount: true, platformFee: true, netAmount: true, refundedAmount: true } }),
      this.prisma.ticketRefund.aggregate({ where: { event: { placeId } }, _count: { _all: true }, _sum: { amount: true } }),
    ]);
    const ageCounts = placeDistributionCount(memberDetails.map((item) => placeAgeBucket(item.user.birthDate)));
    const genderCounts = placeDistributionCount(memberDetails.map((item) => item.user.gender || "belirtilmedi"));
    const locationCounts = placeDistributionCount(memberDetails.map((item) => item.user.country || item.user.city || "belirtilmedi"), 9);
    const interestCounts = placeDistributionCount(memberDetails.flatMap((item) => item.user.interestTags.map((interest) => interest.tag.name)), 100);
    const attendeeRows = eventDetails.flatMap((event) => event.participants);
    const languageCounts = placeDistributionCount([...memberDetails.map((item) => item.user.preferredLanguage || "belirtilmedi"), ...attendeeRows.map((item) => item.user.preferredLanguage || "belirtilmedi")]);
    const checkInTimes = [...memberDetails.map((item) => item.checkedInAt).filter((item): item is Date => Boolean(item)), ...attendeeRows.map((item) => item.checkedInAt).filter((item): item is Date => Boolean(item))];
    const dayCounts = placeDistributionCount(checkInTimes.map((value) => ["pazar", "pazartesi", "sali", "carsamba", "persembe", "cuma", "cumartesi"][value.getDay()]!));
    const hourCounts = placeDistributionCount(checkInTimes.map((value) => placeHourBucket(value)));
    const memberIds = memberDetails.map((item) => item.userId);
    const socialConnections = memberIds.length ? await this.prisma.memberScan.count({ where: { OR: [{ scannerId: { in: memberIds } }, { memberId: { in: memberIds } }] } }) : 0;
    const capacity = ticketSummary._sum.capacity ?? 0;
    const sold = ticketSummary._sum.soldCount ?? 0;
    const eventAttendance = attendeeRows.length;
    const visitCounts = new Map<string, number>();
    for (const event of eventDetails) for (const participant of event.participants) visitCounts.set(participant.userId, (visitCounts.get(participant.userId) ?? 0) + 1);
    for (const member of memberDetails) if (member.checkedInAt) visitCounts.set(member.userId, (visitCounts.get(member.userId) ?? 0) + 1);
    const firstTimeVisitors = [...visitCounts.values()].filter((count) => count === 1).length;
    const repeatVisitors = [...visitCounts.values()].filter((count) => count > 1).length;
    const shares = sharesByChannel.reduce((sum, item) => sum + item._count._all, 0);
    const totalVisitors = eventAttendance + placeCheckedIn;
    const uniqueVisitors = visitCounts.size;
    const now = new Date();
    const visitorsLast6m = new Set([...eventDetails.flatMap((event) => event.participants.filter((item) => item.checkedInAt && now.getTime() - item.checkedInAt.getTime() <= 183 * 86_400_000).map((item) => item.userId)), ...memberDetails.filter((item) => item.checkedInAt && now.getTime() - item.checkedInAt.getTime() <= 183 * 86_400_000).map((item) => item.userId)]).size;
    const visitorsLast12m = new Set([...eventDetails.flatMap((event) => event.participants.filter((item) => item.checkedInAt && now.getTime() - item.checkedInAt.getTime() <= 365 * 86_400_000).map((item) => item.userId)), ...memberDetails.filter((item) => item.checkedInAt && now.getTime() - item.checkedInAt.getTime() <= 365 * 86_400_000).map((item) => item.userId)]).size;
    const occupancyByEvent = eventDetails.map((event) => {
      const eventCapacity = event.ticketTypeRecords.reduce((sum, ticket) => sum + ticket.capacity, 0);
      const eventSold = event.ticketTypeRecords.reduce((sum, ticket) => sum + ticket.soldCount, 0);
      return { name: event.title, rate: eventCapacity > 0 ? Math.round(eventSold / eventCapacity * 100) : 0 };
    }).filter((item) => item.rate > 0);
    const fullEvents = Object.fromEntries([...occupancyByEvent].sort((a, b) => b.rate - a.rate).slice(0, 5).map((item) => [item.name, item.rate]));
    const emptyEvents = Object.fromEntries([...occupancyByEvent].sort((a, b) => a.rate - b.rate).slice(0, 5).map((item) => [item.name, item.rate]));
    const monthlyOccupancyRows = new Map<string, { sold: number; capacity: number }>();
    for (const event of eventDetails) {
      const key = event.startsAt.toISOString().slice(0, 7);
      const current = monthlyOccupancyRows.get(key) ?? { sold: 0, capacity: 0 };
      current.sold += event.ticketTypeRecords.reduce((sum, ticket) => sum + ticket.soldCount, 0);
      current.capacity += event.ticketTypeRecords.reduce((sum, ticket) => sum + ticket.capacity, 0);
      monthlyOccupancyRows.set(key, current);
    }
    const monthlyOccupancyRate = Object.fromEntries([...monthlyOccupancyRows.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([month, value]) => [month, value.capacity > 0 ? Math.round(value.sold / value.capacity * 100) : 0]));
    const monthlyOccupancyPeople = Object.fromEntries([...monthlyOccupancyRows.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([month, value]) => [month, value.sold]));
    const organizerRows = new Map<string, { label: string; events: number; accepted: number; attended: number }>();
    for (const event of eventDetails) {
      const id = event.createdBy?.id ?? "unknown";
      const current = organizerRows.get(id) ?? { label: event.createdBy?.username ? `@${event.createdBy.username}` : event.createdBy?.name ?? "belirtilmedi", events: 0, accepted: 0, attended: 0 };
      current.events += 1; current.accepted += event._count.participants; current.attended += event.participants.length; organizerRows.set(id, current);
    }
    const organizerEvents = Object.fromEntries([...organizerRows.values()].sort((a, b) => b.events - a.events).slice(0, 20).map((item) => [item.label, item.events]));
    const organizerAttendanceRate = Object.fromEntries([...organizerRows.values()].sort((a, b) => b.attended - a.attended).slice(0, 20).map((item) => [item.label, item.accepted > 0 ? Math.round(item.attended / item.accepted * 100) : 0]));
    const visitorLabels = new Map<string, string>();
    for (const event of eventDetails) for (const participant of event.participants) visitorLabels.set(participant.userId, participant.user.username ? `@${participant.user.username}` : participant.user.name);
    for (const member of memberDetails) visitorLabels.set(member.userId, member.user.username ? `@${member.user.username}` : member.userId);
    const topVisitors = Object.fromEntries([...visitCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([id, count]) => [visitorLabels.get(id) ?? id, count]));
    const freeSold = eventDetails.reduce((sum, event) => sum + event.ticketTypeRecords.filter((ticket) => Number(ticket.price) === 0).reduce((ticketSum, ticket) => ticketSum + ticket.soldCount, 0), 0);
    const ratingValues = ratingRows.map((row) => Number(row.reaction.slice("rating_".length))).filter((value) => Number.isInteger(value) && value >= 1 && value <= 5);
    return {
      followers: place.followerCount,
      invites: place.inviteCount,
      members,
      checkedIn: totalVisitors,
      uniqueVisitors,
      detailViews,
      comments,
      reactions,
      views,
      shares,
      events,
      checkInRate: members > 0 ? Math.round(totalVisitors / members * 100) : 0,
      engagementRate: detailViews > 0 ? Math.round((comments + reactions) / detailViews * 100) : 0,
      eventAttendance,
      averageEventAttendance: events > 0 ? Math.round(eventAttendance / events * 10) / 10 : 0,
      averageEventRating: ratingValues.length ? Math.round(ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length * 10) / 10 : 0,
      ratingCount: ratingValues.length,
      ticketCapacity: capacity,
      ticketsSold: sold,
      ticketsRemaining: Math.max(0, capacity - sold),
      freeTicketRate: sold > 0 ? Math.round(freeSold / sold * 100) : 0,
      ticketOccupancyRate: capacity > 0 ? Math.round(sold / capacity * 100) : 0,
      ticketRevenue: Number(paymentSummary._sum.grossAmount ?? 0),
      averageTicketPrice: Number(ticketSummary._avg.price ?? 0),
      refunds: refundSummary._count._all,
      refundAmount: Number(refundSummary._sum.amount ?? paymentSummary._sum.refundedAmount ?? 0),
      platformCommission: Number(paymentSummary._sum.platformFee ?? 0),
      organizerRevenue: Number(paymentSummary._sum.netAmount ?? 0),
      firstTimeVisitors,
      repeatVisitors,
      repeatVisitorRate: visitCounts.size > 0 ? Math.round(repeatVisitors / visitCounts.size * 100) : 0,
      visitorsLast6m,
      visitorsLast12m,
      socialConnections,
      socialConnectionRate: totalVisitors > 0 ? Math.min(100, Math.round(socialConnections / totalVisitors * 100)) : 0,
      averageConnectionsPerVisitor: totalVisitors > 0 ? Math.round(socialConnections / totalVisitors * 10) / 10 : 0,
      ...placePrefixMetrics("source", Object.fromEntries(viewSources.map((item) => [item.source || "direct", item._count._all]))),
      ...placePrefixMetrics("shareChannel", Object.fromEntries(sharesByChannel.map((item) => [item.channel, item._count._all]))),
      ...placePrefixMetrics("age", ageCounts),
      ...placePrefixMetrics("gender", genderCounts),
      ...placePrefixMetrics("location", locationCounts),
      ...placePrefixMetrics("interest", interestCounts),
      ...placePrefixMetrics("language", languageCounts),
      ...placePrefixMetrics("day", dayCounts),
      ...placePrefixMetrics("hour", hourCounts),
      ...placePrefixMetrics("fullEvent", fullEvents),
      ...placePrefixMetrics("emptyEvent", emptyEvents),
      ...placePrefixMetrics("monthlyOccupancyRate", monthlyOccupancyRate),
      ...placePrefixMetrics("monthlyOccupancyPeople", monthlyOccupancyPeople),
      ...placePrefixMetrics("organizerEvents", organizerEvents),
      ...placePrefixMetrics("organizerAttendanceRate", organizerAttendanceRate),
      ...placePrefixMetrics("topVisitor", topVisitors),
      performanceScore: Math.min(100, Math.round(((detailViews ? members / detailViews : 0) * 35 + (members ? totalVisitors / members : 0) * 35 + (capacity ? sold / capacity : 0) * 30) * 100)),
    };
  }

  async create(input: CreatePlaceDto, actor: User) {
    const slug = await this.uniqueSlug(input.name);
    const place = await this.prisma.$transaction(async (tx) => {
      const created = await tx.place.create({
        data: {
          name: input.name.trim(),
          slug,
          description: input.description?.trim() || null,
          placeType: input.placeType ?? "community",
          visibility: (input.visibility as any) ?? "open",
          country: input.country?.trim() || null,
          city: input.city?.trim() || null,
          address: input.address?.trim() || null,
          latitude: input.latitude,
          longitude: input.longitude,
          coverImageUrl: input.coverImageUrl?.trim() || null,
          createdById: actor.id,
          updatedById: actor.id,
          tags: input.tagIds?.length
            ? { create: input.tagIds.map((tagId, sortOrder) => ({ tagId, sortOrder })) }
            : undefined,
        },
      });
      await tx.placeMember.create({
        data: {
          placeId: created.id,
          userId: actor.id,
          status: "accepted",
          role: "organizer",
        },
      });
      return created;
    });
    return this.getBySlug(place.slug, actor.id);
  }

  async listManaged(actor: User) {
    const places = await this.prisma.place.findMany({
      where:
        actor.role === "user"
          ? {
              OR: [
                { createdById: actor.id },
                {
                  members: {
                    some: {
                      userId: actor.id,
                      status: "accepted",
                      role: { in: ["manager", "organizer"] },
                    },
                  },
                },
              ],
            }
          : {},
      orderBy: { updatedAt: "desc" },
      include: this.viewerInclude(actor.id),
    });
    return places.map((place) => this.toPublicPlace(place, actor.id));
  }

  async update(id: string, input: UpdatePlaceDto, actor: User) {
    const current = await this.ensureCanManage(id, actor);
    const slug =
      input.name && input.name.trim() !== current.name
        ? await this.uniqueSlug(input.name, id)
        : undefined;
    const updated = await this.prisma.place.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        slug,
        legacySlugs: slug && slug !== current.slug
          ? { set: [...new Set([...(current.legacySlugs ?? []), current.slug])] }
          : undefined,
        description: this.optionalText(input.description),
        placeType: input.placeType,
        visibility: input.visibility as any,
        country: this.optionalText(input.country),
        city: this.optionalText(input.city),
        address: this.optionalText(input.address),
        latitude: input.latitude,
        longitude: input.longitude,
        coverImageUrl: this.optionalText(input.coverImageUrl),
        updatedById: actor.id,
        tags: input.tagIds
          ? { deleteMany: {}, create: input.tagIds.map((tagId, sortOrder) => ({ tagId, sortOrder })) }
          : undefined,
      },
    });
    if (current.visibility === "approval_required" && input.visibility === "open") {
      await this.prisma.placeMember.updateMany({ where: { placeId: id, status: "pending" }, data: { status: "accepted" } });
    }
    return this.getBySlug(updated.slug, actor.id);
  }

  async archive(id: string, actor: User) {
    const place = await this.prisma.place.findUnique({ where: { id } });
    if (!place) throw new NotFoundException("Mekân bulunamadı.");
    if (actor.role === "user" && place.createdById !== actor.id)
      throw new ForbiddenException("Mekânı yalnız sahibi arşivleyebilir.");
    return this.prisma.place.update({
      where: { id },
      data: { status: "archived", updatedById: actor.id },
    });
  }

  async follow(placeId: string, userId: string) {
    const place = await this.ensureActive(placeId);
    const [existing, existingMember] = await Promise.all([this.prisma.placeFollow.findUnique({
      where: { placeId_userId: { placeId, userId } },
    }), this.prisma.placeMember.findUnique({ where: { placeId_userId: { placeId, userId } } })]);
    if (!existing) {
      try {
        await this.prisma.$transaction([
          this.prisma.placeFollow.create({ data: { placeId, userId } }),
          this.prisma.place.update({
            where: { id: placeId },
            data: { followerCount: { increment: 1 } },
          }),
          ...(!existingMember && place.visibility !== "invite_only" ? [this.prisma.placeMember.create({ data: { placeId, userId, role: "member", status: place.visibility === "approval_required" ? "pending" : "accepted" } })] : []),
        ]);
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== "P2002"
        )
          throw error;
      }
    }
    return { following: true };
  }

  async unfollow(placeId: string, userId: string) {
    const existing = await this.prisma.placeFollow.findUnique({
      where: { placeId_userId: { placeId, userId } },
    });
    if (existing) {
      await this.prisma.$transaction([
        this.prisma.placeFollow.delete({
          where: { placeId_userId: { placeId, userId } },
        }),
        this.prisma.place.updateMany({
          where: { id: placeId, followerCount: { gt: 0 } },
          data: { followerCount: { decrement: 1 } },
        }),
      ]);
    }
    return { following: false };
  }

  async listMembers(placeId: string, actor: User) {
    await this.ensureCanManage(placeId, actor);
    const members = await this.prisma.placeMember.findMany({
      where: { placeId },
      orderBy: [{ role: "desc" }, { createdAt: "asc" }],
      include: { user: { select: { ...memberUserSelect, followerCount: true, _count: { select: { followers: { where: { follower: { placeMemberships: { some: { placeId, status: PlaceMemberStatus.accepted } } } } } } } } } },
    });
    const joinOrder = new Map([...members].sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()).map((member, index) => [member.userId, index + 1]));
    return members.map(({ user, ...member }) => {
      const { uploadedMedia, _count, ...identity } = user;
      return { ...member, joinOrder: joinOrder.get(member.userId), user: { ...identity, relatedFollowerCount: _count?.followers ?? 0, avatarUrl: uploadedMedia[0]?.url ?? null } };
    });
  }

  async listRelatedUsers(placeId: string, actor?: User) {
    const place = await this.prisma.place.findFirst({
      where: { id: placeId, status: "active" },
      select: { id: true, createdById: true },
    });
    if (!place) throw new NotFoundException("Mekân bulunamadı.");
    const manager = actor ? await this.prisma.placeMember.findFirst({ where: { placeId, userId: actor.id, status: PlaceMemberStatus.accepted, role: { in: [PlaceMemberRole.manager, PlaceMemberRole.organizer] } }, select: { userId: true } }) : null;
    const canManage = Boolean(actor && (place.createdById === actor.id || manager || ["admin", "super_admin", "curator"].includes(actor.role)));
    const ownInvitedUserIds = actor && !canManage
      ? (await this.prisma.placeInvitation.findMany({
          where: { placeId, inviterId: actor.id },
          select: { inviteeId: true },
        })).map((invitation) => invitation.inviteeId)
      : [];
    const [members, viewerInterests] = await Promise.all([this.prisma.placeMember.findMany({
      where: {
        placeId,
        ...(canManage
          ? {}
          : ownInvitedUserIds.length
            ? {
                OR: [
                  { status: PlaceMemberStatus.accepted },
                  { status: PlaceMemberStatus.invited, userId: { in: ownInvitedUserIds } },
                ],
              }
            : { status: PlaceMemberStatus.accepted }),
      },
      orderBy: [{ role: "desc" }, { createdAt: "asc" }],
      take: 100,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            city: true,
            country: true,
            gender: true,
            birthDate: true,
            profileVerifiedAt: true,
            uploadedMedia: { where: { contentType: "user", status: "active", isProfilePicture: true }, select: { url: true }, take: 1 },
            privacySettings: { select: { demographicsAudience: true, locationAudience: true } },
            interestTags: { select: { tagId: true } },
          },
        },
      },
    }), actor ? this.prisma.userInterestTag.findMany({ where: { userId: actor.id }, select: { tagId: true } }) : []]);
    const viewerTagIds = new Set(viewerInterests.map((item) => item.tagId));
    return members.map((member) => ({
      id: member.user.id,
      name: member.user.name,
      username: member.user.username,
      city: actor?.id === member.user.id ? member.user.city : null,
      country: actor?.id === member.user.id ? member.user.country : null,
      gender: actor?.id === member.user.id || member.user.privacySettings?.demographicsAudience === "everybody" ? member.user.gender : null,
      birthDate: actor?.id === member.user.id || member.user.privacySettings?.demographicsAudience === "everybody" ? member.user.birthDate : null,
      profileVerifiedAt: member.user.profileVerifiedAt,
      avatarUrl: member.user.uploadedMedia?.[0]?.url ?? null,
      commonTagCount: (member.user.interestTags ?? []).filter((item) => viewerTagIds.has(item.tagId)).length,
      relation: member.role,
      status: member.status,
      checkedIn: Boolean(member.checkedInAt),
      checkedInAt: member.checkedInAt,
    }));
  }

  async invite(placeId: string, input: InvitePlaceMemberDto, actor: User) {
    const place = await this.ensureCanInvite(placeId, actor);
    const canManage = actor.role !== "user" || place.createdById === actor.id || place.members.some((member) => member.role === PlaceMemberRole.manager || member.role === PlaceMemberRole.organizer);
    if (!input.userId && !input.email && !input.username && !input.phone && !input.name)
      throw new BadRequestException(
        "Kullanıcı adı, telefon veya e-posta belirtilmelidir.",
      );
    let user = await this.prisma.user.findFirst({
      where: input.userId
        ? { id: input.userId }
        : input.username
          ? { username: input.username.replace(/^@/, "").toLowerCase().trim() }
          : input.phone
            ? { phone: input.phone.replace(/[\s()-]/g, "") }
            : input.email
              ? { email: input.email.toLowerCase().trim() }
              : { name: { equals: input.name!.trim(), mode: "insensitive" }, status: "active" },
    });
    if (!user && input.email) {
      const email = input.email.toLowerCase().trim();
      user = await this.prisma.user.create({ data: { email, name: input.name?.trim() || email.split("@")[0] || email, passwordHash: await hash(randomUUID(), 10), role: "user", status: "invited" } });
    }
    if (!user && input.phone) {
      const phone = input.phone.replace(/[\s()-]/g, "");
      const digest = createHash("sha256").update(phone).digest("hex").slice(0, 20);
      user = await this.prisma.user.create({ data: { email: `phone-${digest}@invite.konnektora.local`, phone, name: input.name?.trim() || phone, passwordHash: await hash(randomUUID(), 10), role: "user", status: "invited" } });
    }
    if (!user) throw new NotFoundException("Davet edilecek kullanıcı bulunamadı.");
    if (user.id === place.createdById)
      throw new BadRequestException("Mekân sahibi yeniden davet edilemez.");
    await this.ensureCanReceiveInvite(user.id, actor.id);
    const existing = await this.prisma.placeMember.findUnique({
      where: { placeId_userId: { placeId, userId: user.id } },
    });
    if (existing?.status === PlaceMemberStatus.accepted)
      throw new BadRequestException(
        "Kullanıcı zaten bu mekânın aktif üyesidir.",
      );
    if (user.status === "active") {
      const existingInvitation = await this.prisma.placeInvitation.findUnique({
        where: { placeId_inviterId_inviteeId: { placeId, inviterId: actor.id, inviteeId: user.id } },
        select: { id: true },
      });
      if (existingInvitation) throw new ConflictException("Bu kullanıcıyı bu mekâna daha önce davet ettiniz.");
      await this.prisma.placeInvitation.create({ data: { placeId, inviterId: actor.id, inviteeId: user.id } });
    }
    const role = canManage ? input.role ?? PlaceMemberRole.member : PlaceMemberRole.member;
    if (
      role === PlaceMemberRole.organizer &&
      actor.role === "user" &&
      place.createdById !== actor.id
    ) {
      throw new ForbiddenException(
        "Organizatör rolünü yalnız mekân sahibi verebilir.",
      );
    }
    const member = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.placeMember.upsert({
        where: { placeId_userId: { placeId, userId: user.id } },
        create: { placeId, userId: user.id, status: "invited", role },
        update: { status: "invited", role },
      });
      if (!existing || existing.status !== PlaceMemberStatus.invited)
        await tx.place.update({
          where: { id: placeId },
          data: { inviteCount: { increment: 1 } },
        });
      return saved;
    });
    const type =
      role === PlaceMemberRole.manager || role === PlaceMemberRole.organizer
        ? "place_manager"
        : "place_invite";
    await this.notifications.dispatch({
      userId: user.id,
      topic: type,
      type,
      title:
        role === PlaceMemberRole.member
          ? "Mekân daveti"
          : "Mekân yöneticiliği daveti",
      body: `${place.name} mekânına davet edildiniz.`,
      targetType: "place",
      targetId: placeId,
    });
    const acceptToken = user.status === "invited" ? await this.authService.createInviteAcceptToken(user.id) : undefined;
    if (input.phone && user.phone) {
      await this.smsService.sendPlaceInvite(user.phone, actor.name, place.name, place.slug, acceptToken);
    } else if (user.email && !user.email.endsWith("@invite.konnektora.local")) {
      await this.mailService.sendPlaceInviteEmail({ to: user.email, name: user.name, placeName: place.name, placeSlug: place.slug, invitedByName: actor.name, acceptToken });
    }
    return { ...member, user: this.pickUser(user) };
  }

  async listSentInvitations(placeId: string, inviterId: string) {
    const invitations = await this.prisma.placeInvitation.findMany({
      where: { placeId, inviterId },
      orderBy: { createdAt: "asc" },
      include: {
        invitee: {
          select: {
            id: true,
            name: true,
            username: true,
            uploadedMedia: { where: { contentType: "user", status: "active", isProfilePicture: true }, select: { url: true }, take: 1 },
          },
        },
      },
    });
    return invitations.map((invitation) => ({
      id: invitation.invitee.id,
      name: invitation.invitee.name,
      username: invitation.invitee.username,
      avatarUrl: invitation.invitee.uploadedMedia[0]?.url ?? null,
      invitedAt: invitation.createdAt,
    }));
  }

  async updateMember(
    placeId: string,
    userId: string,
    input: UpdatePlaceMemberDto,
    actor: User,
  ) {
    const place = await this.ensureCanManage(placeId, actor);
    const member = await this.prisma.placeMember.findUnique({
      where: { placeId_userId: { placeId, userId } },
    });
    if (!member) throw new NotFoundException("Mekân üyesi bulunamadı.");
    if (
      place.createdById === userId &&
      (input.status === "banned" ||
        input.status === "declined" ||
        (input.role && input.role !== "organizer"))
    ) {
      throw new BadRequestException(
        "Mekân sahibinin organizatör üyeliği kaldırılamaz.",
      );
    }
    if (
      input.role &&
      actor.role === "user" &&
      place.createdById !== actor.id &&
      (input.role === PlaceMemberRole.manager || member.role === PlaceMemberRole.manager)
    ) {
      throw new ForbiddenException(
        "Mekân sahibi rolünü yalnız mekân kurucusu değiştirebilir.",
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.placeMember.update({
        where: { placeId_userId: { placeId, userId } },
        data: { status: input.status, role: input.role },
        include: { user: { select: memberUserSelect } },
      });
      if (input.status && input.status !== member.status) {
        if (member.status === PlaceMemberStatus.invited) {
          await tx.place.update({ where: { id: placeId }, data: { inviteCount: { decrement: 1 } } });
        } else if (input.status === PlaceMemberStatus.invited) {
          await tx.place.update({ where: { id: placeId }, data: { inviteCount: { increment: 1 } } });
        }
      }
      return updated;
    });
  }

  async checkInMember(placeId: string, userId: string, actor: User) {
    await this.ensureCanManage(placeId, actor);
    const member = await this.prisma.placeMember.findUnique({
      where: { placeId_userId: { placeId, userId } },
    });
    if (!member || member.status !== PlaceMemberStatus.accepted)
      throw new NotFoundException("Check-in için uygun üye bulunamadı.");
    const checkInOrder = await this.prisma.placeMember.count({ where: { placeId, checkedInAt: { not: null } } }) + 1;
    return this.prisma.placeMember.update({
      where: { placeId_userId: { placeId, userId } },
      data: { checkedInAt: new Date(), checkInDecisionAt: new Date(), checkInMethod: "manual", checkInOrder },
      include: { user: { select: memberUserSelect } },
    });
  }

  async checkInMemberPass(placeId: string, payload: string, actor: User) {
    const memberId = await this.identity.resolveMemberPass(payload);
    return this.checkInMember(placeId, memberId, actor);
  }

  async previewMemberPass(placeId: string, payload: string, method: "qr" | "nfc", actor: User) {
    await this.ensureCanManage(placeId, actor);
    const memberId = await this.identity.resolveMemberPass(payload);
    return this.getCheckInPassport(placeId, memberId, actor, method);
  }

  async getCheckInPassport(placeId: string, userId: string, actor: User, method: "manual" | "qr" | "nfc" = "manual") {
    await this.ensureCanManage(placeId, actor);
    const member = await this.prisma.placeMember.findUnique({
      where: { placeId_userId: { placeId, userId } },
      include: {
        place: { select: { id: true, name: true } },
        user: {
          select: {
            id: true, email: true, name: true, username: true, role: true, status: true,
            accountType: true, memberPlan: true, businessPlan: true, followerCount: true, profileVerifiedAt: true,
            uploadedMedia: {
              where: { contentType: "user", status: "active" },
              orderBy: [{ isProfilePicture: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
              select: { id: true, url: true, type: true, isProfilePicture: true },
              take: 12,
            },
          },
        },
      },
    });
    if (!member) throw new NotFoundException("Mekân üyesi bulunamadı.");
    const [invitations, guestLists, relatedFollowerCount] = await Promise.all([
      this.prisma.placeInvitation.findMany({
        where: { placeId, inviteeId: userId },
        orderBy: { createdAt: "asc" },
        include: { inviter: { select: { username: true, name: true } } },
      }),
      this.prisma.guestList.findMany({
        where: {
          OR: [{ ownerId: actor.id }, { shares: { some: { userId: actor.id } } }],
          members: { some: { userId } },
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true, ownerId: true },
      }),
      this.prisma.userFollow.count({
        where: {
          followingId: userId,
          follower: { placeMemberships: { some: { placeId, status: PlaceMemberStatus.accepted } } },
        },
      }),
    ]);
    const media = member.user.uploadedMedia.map(({ id, url, type }) => ({ id, url, type }));
    const avatarUrl = member.user.uploadedMedia.find((item) => item.isProfilePicture)?.url ?? media[0]?.url ?? null;
    return {
      targetType: "place" as const,
      targetId: placeId,
      targetName: member.place.name,
      user: { id: member.user.id, email: member.user.email, name: member.user.name, username: member.user.username, role: member.user.role, status: member.user.status, accountType: member.user.accountType, avatarUrl, followerCount: member.user.followerCount, plan: this.getPassportPlan(member.user), profileVerifiedAt: member.user.profileVerifiedAt, media },
      status: member.status,
      role: member.role,
      alreadyInside: Boolean(member.checkedInAt),
      checkedInAt: member.checkedInAt,
      checkInOrder: member.checkInOrder,
      checkInMethod: member.checkInMethod ?? method,
      invitedBy: invitations.map((item) => item.inviter.username ? `@${item.inviter.username}` : item.inviter.name),
      relatedFollowerCount,
      guestLists: guestLists.map((list) => ({ id: list.id, name: list.name, access: list.ownerId === actor.id ? "owner" as const : "read" as const })),
      tickets: [],
    };
  }

  private getPassportPlan(user: { role: string; accountType: string; memberPlan: string; businessPlan: string }) {
    if (["admin", "super_admin"].includes(user.role)) return "Admin";
    if (user.role === "curator") return "Küratör";
    if (user.accountType === "corporate") return user.businessPlan === "starter" ? "Kurumsal Başlangıç" : `Kurumsal ${user.businessPlan}`;
    return user.memberPlan === "free" ? "Standart" : user.memberPlan;
  }

  async decideCheckInPassport(placeId: string, userId: string, input: PlaceCheckInDecisionDto, actor: User) {
    await this.ensureCanManage(placeId, actor);
    const member = await this.prisma.placeMember.findUnique({ where: { placeId_userId: { placeId, userId } }, include: { place: { select: { name: true } } } });
    if (!member) throw new NotFoundException("Mekân üyesi bulunamadı.");
    if (input.decision === "admit" && member.checkedInAt) throw new ConflictException("Kullanıcı zaten check-in içeride.");
    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const checkInOrder = input.decision === "admit" ? await tx.placeMember.count({ where: { placeId, checkedInAt: { not: null } } }) + 1 : null;
      const result = await tx.placeMember.update({
        where: { placeId_userId: { placeId, userId } },
        data: input.decision === "admit"
          ? { status: PlaceMemberStatus.accepted, checkedInAt: now, checkInDecisionAt: now, checkInMethod: input.method, checkInOrder }
          : { status: PlaceMemberStatus.declined, checkedInAt: null, checkInDecisionAt: now, checkInMethod: input.method, checkInOrder: null },
        include: { user: { select: memberUserSelect } },
      });
      if (member.status === PlaceMemberStatus.invited) {
        await tx.place.update({ where: { id: placeId }, data: { inviteCount: { decrement: 1 } } });
      }
      return result;
    });
    await this.notifications.dispatch({
      userId,
      topic: "place_invite",
      type: input.decision === "admit" ? "place_check_in_admitted" : "place_check_in_declined",
      title: input.decision === "admit" ? "Mekâna girişin onaylandı" : "Mekâna girişin onaylanmadı",
      body: input.decision === "admit" ? `${member.place.name}: Hoş geldin, iyi eğlenceler.` : `${member.place.name}: Üzgünüz, mekâna kabul edilmediniz.`,
      targetType: "place",
      targetId: placeId,
    });
    return updated;
  }

  async respondToInvite(
    placeId: string,
    status: PlaceMemberStatus,
    userId: string,
  ) {
    if (
      status !== PlaceMemberStatus.accepted &&
      status !== PlaceMemberStatus.declined
    ) {
      throw new BadRequestException("Davet yalnız kabul veya reddedilebilir.");
    }
    const member = await this.prisma.placeMember.findUnique({
      where: { placeId_userId: { placeId, userId } },
    });
    if (!member || member.status !== PlaceMemberStatus.invited)
      throw new NotFoundException("Aktif mekân daveti bulunamadı.");
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.placeMember.update({
        where: { placeId_userId: { placeId, userId } },
        data: { status },
      });
      await tx.place.update({
        where: { id: placeId },
        data: { inviteCount: { decrement: 1 } },
      });
      return updated;
    });
  }

  private async ensureActive(id: string) {
    const place = await this.prisma.place.findFirst({
      where: { id, status: "active" },
      select: { id: true, visibility: true },
    });
    if (!place) throw new NotFoundException("Mekân bulunamadı.");
    return place;
  }

  private async ensureCanManage(id: string, actor: User) {
    const place = await this.prisma.place.findUnique({
      where: { id },
      include: {
        members: {
          where: {
            userId: actor.id,
            status: "accepted",
            role: { in: ["manager", "organizer"] },
          },
        },
      },
    });
    if (!place) throw new NotFoundException("Mekân bulunamadı.");
    if (
      actor.role === "user" &&
      place.createdById !== actor.id &&
      place.members.length === 0
    )
      throw new ForbiddenException("Bu mekânı yönetme yetkiniz yok.");
    return place;
  }

  private async ensureCanInvite(id: string, actor: User) {
    const place = await this.prisma.place.findUnique({
      where: { id },
      include: {
        members: {
          where: { userId: actor.id, status: PlaceMemberStatus.accepted },
          select: { role: true },
        },
      },
    });
    if (!place) throw new NotFoundException("Mekân bulunamadı.");
    if (actor.role === "user" && place.createdById !== actor.id && place.members.length === 0)
      throw new ForbiddenException("Bu mekâna davet göndermek için aktif üye olmalısınız.");
    return place;
  }

  private async ensureCanReceiveInvite(
    targetUserId: string,
    actorUserId: string,
  ) {
    const [privacy, block] = await Promise.all([
      this.prisma.privacySettings.findUnique({
        where: { userId: targetUserId },
        select: { placeInviteAudience: true },
      }),
      this.prisma.userBlock.findUnique({
        where: {
          userId_targetType_targetId: {
            userId: targetUserId,
            targetType: "user",
            targetId: actorUserId,
          },
        },
      }),
    ]);
    if (block)
      throw new ForbiddenException("Bu kullanıcı mekân daveti alamıyor.");
    const audience = privacy?.placeInviteAudience ?? "everybody";
    if (audience === "everybody") return;
    const direct = await this.prisma.userFollow.findMany({
      where: { followerId: targetUserId },
      select: { followingId: true },
    });
    if (direct.some((item) => item.followingId === actorUserId)) return;
    if (audience === "network" && direct.length > 0) {
      const secondDegree = await this.prisma.userFollow.findFirst({
        where: {
          followerId: { in: direct.map((item) => item.followingId) },
          followingId: actorUserId,
        },
        select: { followerId: true },
      });
      if (secondDegree) return;
    }
    throw new ForbiddenException(
      "Kullanıcının mekân daveti gizlilik ayarı bu davete izin vermiyor.",
    );
  }

  private viewerInclude(viewerId?: string, includeEvents = false) {
    return {
      followers: {
        where: { userId: viewerId ?? "" },
        select: { userId: true },
      },
      members: {
        where: viewerId
          ? {
              OR: [
                { userId: viewerId },
                {
                  status: { in: [PlaceMemberStatus.accepted, PlaceMemberStatus.invited] },
                  user: { followers: { some: { followerId: viewerId } } },
                },
              ],
            }
          : { userId: "" },
        select: {
          userId: true,
          status: true,
          role: true,
          user: {
            select: {
              followers: {
                where: { followerId: viewerId ?? "" },
                select: { followerId: true },
                take: 1,
              },
            },
          },
        },
      },
      tags: { orderBy: { sortOrder: "asc" as const }, include: { tag: true } },
      _count: {
        select: {
          members: { where: { status: "accepted" } },
          events: { where: { status: "published", startsAt: { gte: new Date() } } },
        },
      },
      ...(includeEvents ? { events: { where: { status: EventStatus.published }, orderBy: { startsAt: "desc" as const }, take: 20, include: { tags: { orderBy: { sortOrder: "asc" as const }, include: { tag: true } }, participants: { where: { status: { in: [EventParticipantStatus.accepted, EventParticipantStatus.attended] } }, select: { id: true } } } } } : {}),
    } as const;
  }

  private toPublicPlace(place: any, viewerId?: string) {
    const { followers, members, tags, events, _count, ...data } = place;
    delete data.updatedById;
    delete data.legacySlugs;
    return {
      ...data,
      tags: (tags ?? []).map((item: any) => item.tag),
      events: events?.map((event: any) => ({ ...event, tags: (event.tags ?? []).map((item: any) => item.tag), attendeeCount: event.participants?.length ?? 0, participants: undefined, latitude: event.latitude == null ? null : Number(event.latitude), longitude: event.longitude == null ? null : Number(event.longitude), price: Number(event.price) })),
      latitude: data.latitude == null ? null : Number(data.latitude),
      longitude: data.longitude == null ? null : Number(data.longitude),
      isFollowing: followers.length > 0,
      memberCount: viewerIdSafeCount(_count?.members),
      followingMemberCount: viewerId
        ? (members ?? []).filter((member: any) =>
            member.userId !== viewerId &&
            [PlaceMemberStatus.accepted, PlaceMemberStatus.invited].includes(member.status) &&
            member.user?.followers?.length,
          ).length
        : 0,
      upcomingEventCount: viewerIdSafeCount(_count?.events),
      viewerMembership: (members ?? []).find((member: any) => member.userId === viewerId) ?? null,
    };
  }

  private async uniqueSlug(name: string, currentId?: string) {
    const base = toSlug(name) || "place";
    if (currentId) {
      const current = await this.prisma.place.findUnique({ where: { id: currentId }, select: { slug: true } });
      const publicCode = current?.slug.match(/-(\d{6,})$/)?.[1];
      if (publicCode) return `${base}-${publicCode}`;
    }
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const slug = `${base}-${randomInt(100000, 1000000)}`;
      const existing = await this.prisma.place.findFirst({ where: { slug, id: currentId ? { not: currentId } : undefined }, select: { id: true } });
      if (!existing) return slug;
    }
    return `${base}-${Date.now()}`;
  }

  private optionalText(value?: string) {
    return value === undefined ? undefined : value.trim() || null;
  }

  private pickUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    };
  }
}

function viewerIdSafeCount(value: unknown) {
  return typeof value === "number" ? value : 0;
}

function placeDistance(place: { latitude: unknown; longitude: unknown }, latitude: number, longitude: number) {
  if (place.latitude == null || place.longitude == null) return Number.POSITIVE_INFINITY;
  const toRadians = (value: number) => value * Math.PI / 180;
  const lat = Number(place.latitude); const lon = Number(place.longitude);
  const a = Math.sin(toRadians(lat - latitude) / 2) ** 2 + Math.cos(toRadians(latitude)) * Math.cos(toRadians(lat)) * Math.sin(toRadians(lon - longitude) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function placeNearScore(place: any, interestTagIds: Set<string>, latitude: number, longitude: number) {
  const distance = placeDistance(place, latitude, longitude);
  const proximity = Number.isFinite(distance) ? Math.max(0, 80 - distance) : 0;
  const commonInterests = (place.tags ?? []).filter((item: any) => interestTagIds.has(item.tagId ?? item.tag?.id)).length;
  const followedMembers = Number(place._count?.followers ?? 0);
  const popularity = Number(place.followerCount ?? 0);
  return proximity + commonInterests * 24 + followedMembers * 12 + Math.min(popularity, 100) * 0.25;
}

function placeAgeBucket(birthDate: Date | null) {
  if (!birthDate) return "belirtilmedi";
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  if (now.getMonth() < birthDate.getMonth() || now.getMonth() === birthDate.getMonth() && now.getDate() < birthDate.getDate()) age -= 1;
  if (age < 25) return "18_24";
  if (age < 35) return "25_34";
  if (age < 45) return "35_44";
  return "45_plus";
}

function placeDistributionCount(values: string[], limit = 100) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort((left, right) => right[1] - left[1]).slice(0, limit));
}

function placeHourBucket(value: Date) {
  const hour = value.getHours();
  return hour < 6 ? "00_06" : hour < 12 ? "06_12" : hour < 18 ? "12_18" : "18_24";
}

function placePrefixMetrics(prefix: string, values: Record<string, number>) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [`${prefix}_${placeMetricKey(key)}`, value]));
}

function placeMetricKey(value: string) {
  return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "belirtilmedi";
}
