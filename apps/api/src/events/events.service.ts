import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  EventParticipantRole,
  EventParticipantStatus,
  EventStatus,
  EventVisibility,
  OwnedTicketStatus,
  PaymentStatus,
  Prisma,
  TicketOrderStatus,
  User,
} from "@prisma/client";
import { hash } from "bcryptjs";
import { createHash, randomBytes, randomInt, randomUUID } from "crypto";
import { AuthService } from "../auth/auth.service";
import { toSlug } from "../common/slug";
import { MailService } from "../mail/mail.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { canUseAdvancedAnalytics, canUseGuestListPlan } from "../common/analytics-access";
import { SmsService } from "../sms/sms.service";
import {
  CreateEventDto,
  CheckInDecisionDto,
  EventQueryDto,
  InviteParticipantDto,
} from "./events.dto";

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly authService: AuthService,
    private readonly notifications: NotificationsService,
    private readonly smsService: SmsService,
  ) {}

  async listPublicEvents(query: EventQueryDto, userId?: string) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 24;
    const where: Prisma.EventWhereInput = {
      status: "published",
      startsAt: query.dateFrom
        ? { gte: new Date(query.dateFrom) }
        : query.dateTo
          ? undefined
          : { gte: new Date(Date.now() - 1000 * 60 * 60 * 24) },
    };
    const andFilters: Prisma.EventWhereInput[] = [];
    const nearInterestTagIds = new Set(
      query.scope === "near" && userId
        ? ((await this.prisma.userInterestTag.findMany({ where: { userId, sentiment: { in: ["like", "ok"] } }, select: { tagId: true }, take: 100 })) ?? []).map((item) => item.tagId)
        : [],
    );
    if (userId) {
      const blocks = await this.prisma.userBlock.findMany({
        where: { userId },
        select: { targetType: true, targetId: true },
      });
      const blocked = (type: "user" | "tag" | "event") =>
        blocks
          .filter((item) => item.targetType === type)
          .map((item) => item.targetId);
      where.NOT = [
        { id: { in: blocked("event") } },
        { createdById: { in: blocked("user") } },
        { tags: { some: { tagId: { in: blocked("tag") } } } },
      ];
    }

    if (query.dateTo) {
      where.startsAt = {
        ...(typeof where.startsAt === "object" ? where.startsAt : {}),
        lte: new Date(query.dateTo),
      };
    }

    if (query.q) {
      andFilters.push({
        OR: [
          { title: { contains: query.q, mode: "insensitive" } },
          { summary: { contains: query.q, mode: "insensitive" } },
          { description: { contains: query.q, mode: "insensitive" } },
          { organizerName: { contains: query.q, mode: "insensitive" } },
        ],
      });
    }

    if (query.format) {
      where.format = query.format;
    }

    if (query.tag) {
      where.tags = { some: { tag: { slug: query.tag, status: "active" } } };
    }

    if (query.city) {
      where.city = { equals: query.city, mode: "insensitive" };
    }

    if (query.country) {
      where.country = { equals: query.country, mode: "insensitive" };
    }

    if (query.scope === "mine") {
      andFilters.push({
        OR: [
          { createdById: userId ?? "" },
          { participants: { some: { userId: userId ?? "", status: { in: ["accepted", "attended"] } } } },
          { ownedTickets: { some: { ownerId: userId ?? "", status: { in: [OwnedTicketStatus.active, OwnedTicketStatus.used] } } } },
        ],
      });
    } else if (query.scope === "invited") {
      where.participants = { some: { userId: userId ?? "", status: "invited" } };
    } else if (query.scope === "individual") {
      where.createdBy = { accountType: "individual" };
      where.participants = { none: { role: { in: ["organizer", "manager"] }, user: { accountType: "corporate" } } };
    } else if (query.scope === "following") {
      where.createdBy = { followers: { some: { followerId: userId ?? "" } } };
    } else if (query.scope === "for_you") {
      where.tags = {
        some: {
          tag: {
            interestedUsers: {
              some: { userId: userId ?? "", sentiment: "like" },
            },
          },
        },
      };
    }

    if (andFilters.length) where.AND = andFilters;

    if (query.scope === "popular" && (query.city || query.country)) {
      const localCount = await this.prisma.event.count({ where });
      if (!localCount && query.city) {
        delete where.city;
        if (query.country) where.country = { equals: query.country, mode: "insensitive" };
      }
      if (!await this.prisma.event.count({ where })) {
        delete where.city;
        delete where.country;
      }
    }

    if (query.scope === "individual") {
      const [total, viewer, candidates] = await Promise.all([
        this.prisma.event.count({ where }),
        userId
          ? this.prisma.user.findUnique({
              where: { id: userId },
              select: {
                city: true,
                country: true,
                interestTags: { select: { tagId: true } },
                following: { select: { followingId: true } },
              },
            })
          : Promise.resolve(null),
        this.prisma.event.findMany({
          where,
          orderBy: { startsAt: "asc" },
          take: 2000,
          include: {
            tags: { orderBy: { sortOrder: "asc" as const }, include: { tag: true } },
            participants: {
              where: { status: { in: ["accepted", "attended", "invited"] } },
              select: { status: true, userId: true, user: { select: { followers: { where: { followerId: userId ?? "" }, select: { followerId: true }, take: 1 } } } },
            },
            _count: { select: { participants: { where: { status: { in: ["accepted", "attended"] } } } } },
          },
        }),
      ]);
      const interestTagIds = new Set(viewer?.interestTags.map((item) => item.tagId) ?? []);
      const followingIds = new Set(viewer?.following.map((item) => item.followingId) ?? []);
      const now = Date.now();
      const scored = candidates.map((event) => {
        const daysAway = Math.max(0, (event.startsAt.getTime() - now) / 86_400_000);
        const timeScore = Math.max(0, 45 - Math.min(daysAway, 45));
        const interestScore = event.tags.filter((item) => interestTagIds.has(item.tagId)).length * 24;
        const networkScore = Math.min(32, event.participants.filter((item) => item.status !== "invited" && followingIds.has(item.userId)).length * 8);
        const locationScore = viewer?.city && event.city?.localeCompare(viewer.city, undefined, { sensitivity: "accent" }) === 0
          ? 28
          : viewer?.country && event.country?.localeCompare(viewer.country, undefined, { sensitivity: "accent" }) === 0
            ? 12
            : 0;
        return { event, score: timeScore + interestScore + networkScore + locationScore };
      }).sort((left, right) => right.score - left.score || left.event.startsAt.getTime() - right.event.startsAt.getTime());
      const items = scored.slice((page - 1) * pageSize, page * pageSize).map(({ event }) => this.mapEvent(event));
      return { items, total, page, pageSize, hasNextPage: page * pageSize < total };
    }

    const orderBy: Prisma.EventOrderByWithRelationInput[] =
      query.scope === "popular"
        ? [{ participants: { _count: "desc" } }, { startsAt: "asc" }]
        : [{ startsAt: "asc" }];

    const [total, foundEvents] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.findMany({
        where,
        orderBy,
        skip: query.scope === "near" ? 0 : (page - 1) * pageSize,
        take: query.scope === "near" ? 200 : pageSize,
        include: {
          tags: { orderBy: { sortOrder: "asc" as const }, include: { tag: true } },
          participants: {
            where: { status: { in: ["accepted", "attended", "invited"] } },
            select: { status: true, userId: true, user: { select: { followers: { where: { followerId: userId ?? "" }, select: { followerId: true }, take: 1 } } } },
          },
          _count: {
            select: {
              participants: {
                where: { status: { in: ["accepted", "attended"] } },
              },
            },
          },
        },
      }),
    ]);
    const events = query.scope === "near" && query.latitude != null && query.longitude != null
      ? [...foundEvents]
          .sort((left, right) => eventNearScore(right, nearInterestTagIds, query.latitude!, query.longitude!) - eventNearScore(left, nearInterestTagIds, query.latitude!, query.longitude!))
          .slice((page - 1) * pageSize, page * pageSize)
      : foundEvents;

    return {
      items: events.map(this.mapEvent),
      total,
      page,
      pageSize,
      hasNextPage: page * pageSize < total,
    };
  }

  async getPublicEvent(slug: string, userId?: string) {
    const publicCode = slug.match(/-(\d{6,})$/)?.[1];
    const blocks = userId
      ? await this.prisma.userBlock.findMany({
          where: { userId },
          select: { targetType: true, targetId: true },
        })
      : [];
    const blocked = (type: "user" | "tag" | "event") =>
      blocks
        .filter((item) => item.targetType === type)
        .map((item) => item.targetId);
    const event = await this.prisma.event.findFirst({
      where: {
        OR: [
          { slug },
          { legacySlugs: { has: slug } },
          ...(publicCode ? [{ slug: { endsWith: `-${publicCode}` } }] : []),
        ],
        status: "published",
        NOT: [
          { id: { in: blocked("event") } },
          { createdById: { in: blocked("user") } },
          { tags: { some: { tagId: { in: blocked("tag") } } } },
        ],
      },
      include: {
        tags: { orderBy: { sortOrder: "asc" as const }, include: { tag: true } },
        place: { select: { id: true, name: true, slug: true, address: true, city: true, country: true } },
        participants: userId ? { where: { userId }, select: { role: true, status: true }, take: 1 } : false,
        _count: {
          select: {
            participants: {
              where: { status: { in: ["accepted", "attended"] } },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException("Etkinlik bulunamadı.");
    }

    return this.mapEvent(event);
  }

  async listAdminEvents() {
    const events = await this.prisma.event.findMany({
      orderBy: { startsAt: "desc" },
      include: { tags: { orderBy: { sortOrder: "asc" as const }, include: { tag: true } } },
    });

    return events.map(this.mapEvent);
  }

  async listManagedEvents(user: User) {
    const elevated = ["admin", "super_admin", "curator"].includes(user.role);
    const events = await this.prisma.event.findMany({
      where: elevated ? {} : {
        OR: [
          { createdById: user.id },
          {
            participants: {
              some: {
                userId: user.id,
                status: EventParticipantStatus.accepted,
                role: {
                  in: [
                    EventParticipantRole.organizer,
                    EventParticipantRole.manager,
                  ],
                },
              },
            },
          },
        ],
      },
      orderBy: { startsAt: "desc" },
      include: {
        tags: { orderBy: { sortOrder: "asc" as const }, include: { tag: true } },
        ticketTypeRecords: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        place: { select: { id: true, name: true, slug: true, address: true, city: true, country: true } },
      },
    });

    return events.map(this.mapEvent);
  }

  async getInteractionStats(eventId: string, actor?: User) {
    if (actor) {
      await this.ensureCanManageParticipants(eventId, actor, true);
      if (!canUseAdvancedAnalytics(actor)) throw new ForbiddenException("Gelişmiş istatistikler admin, küratör ve uygun paket sahipleri tarafından kullanılabilir.");
    }
    const exists = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, startsAt: true, endsAt: true },
    });
    if (!exists) throw new NotFoundException("Etkinlik bulunamadı.");
    const [participants, participantDetails, comments, reactions, ratingRows, views, detailViews, viewSources, sharesByChannel, ticketOrders, orderDetails, refunds, ticketTypes, payments] = await Promise.all([
      this.prisma.eventParticipant.groupBy({
        by: ["status"],
        where: { eventId },
        _count: { _all: true },
      }),
      this.prisma.eventParticipant.findMany({
        where: { eventId, status: { in: ["accepted", "attended"] } },
        select: {
          createdAt: true,
          checkedInAt: true,
          userId: true,
          user: {
            select: {
              birthDate: true,
              gender: true,
              city: true,
              country: true,
              preferredLanguage: true,
              interestTags: { select: { tag: { select: { name: true } } } },
            },
          },
        },
      }),
      this.prisma.contentComment.count({
        where: { targetType: "event", targetId: eventId, status: "active" },
      }),
      this.prisma.contentReaction.count({
        where: { targetType: "event", targetId: eventId, NOT: { reaction: { startsWith: "rating_" } } },
      }),
      this.prisma.contentReaction.findMany({
        where: { targetType: "event", targetId: eventId, reaction: { startsWith: "rating_" } },
        select: { reaction: true },
        take: 50_000,
      }),
      this.prisma.contentView.count({
        where: { targetType: "event", targetId: eventId, kind: "impression" },
      }),
      this.prisma.contentView.count({ where: { targetType: "event", targetId: eventId, kind: "detail" } }),
      this.prisma.contentView.groupBy({ by: ["source"], where: { targetType: "event", targetId: eventId, kind: "detail" }, _count: { _all: true } }),
      this.prisma.contentShare.groupBy({ by: ["channel"], where: { targetType: "event", targetId: eventId }, _count: { _all: true } }),
      this.prisma.eventTicketOrder.aggregate({
        where: { eventId, status: "paid" },
        _sum: { quantity: true, totalAmount: true },
        _count: { _all: true },
      }),
      this.prisma.eventTicketOrder.findMany({
        where: { eventId, status: "paid" },
        select: { quantity: true, totalAmount: true, purchasedAt: true, createdAt: true, ticketType: { select: { name: true } } },
        take: 50_000,
      }),
      this.prisma.ticketRefund.aggregate({ where: { eventId }, _count: { _all: true }, _sum: { amount: true } }),
      this.prisma.eventTicketType.findMany({ where: { eventId }, select: { id: true, name: true, capacity: true, soldCount: true, price: true } }),
      this.prisma.paymentTransaction.aggregate({ where: { eventId, status: { in: ["succeeded", "partially_refunded", "refunded"] } }, _sum: { grossAmount: true, platformFee: true, netAmount: true, refundedAmount: true } }),
    ]);
    const count = (status: string) =>
      participants.find((item) => item.status === status)?._count._all ?? 0;
    const accepted = count("accepted");
    const attended = count("attended");
    const requested = count("requested");
    const invited = count("invited");
    const ticketCapacity = ticketTypes.reduce((sum, ticket) => sum + ticket.capacity, 0);
    const ticketSold = ticketTypes.reduce((sum, ticket) => sum + ticket.soldCount, 0);
    const now = new Date();
    const ageCounts = distributionCount(participantDetails.map((item) => ageBucket(item.user.birthDate, now)));
    const genderCounts = distributionCount(participantDetails.map((item) => item.user.gender || "belirtilmedi"));
    const countryCounts = distributionCount(participantDetails.map((item) => item.user.country || item.user.city || "belirtilmedi"), 9);
    const interestCounts = distributionCount(participantDetails.flatMap((item) => item.user.interestTags.map((interest) => interest.tag.name)), 100);
    const languageCounts = distributionCount(participantDetails.map((item) => item.user.preferredLanguage || "belirtilmedi"));
    const decisionBuckets = { "15_gun_once": 0, "7_gun_once": 0, "3_gun_once": 0, "etkinlik_gunu": 0 };
    for (const participant of participantDetails) {
      const days = (exists.startsAt.getTime() - participant.createdAt.getTime()) / 86_400_000;
      if (days >= 15) decisionBuckets["15_gun_once"] += 1;
      else if (days >= 7) decisionBuckets["7_gun_once"] += 1;
      else if (days >= 3) decisionBuckets["3_gun_once"] += 1;
      else decisionBuckets.etkinlik_gunu += 1;
    }
    const participantIds = participantDetails.map((item) => item.userId);
    const socialConnections = participantIds.length ? await this.prisma.memberScan.count({
      where: {
        createdAt: { gte: exists.startsAt, lte: exists.endsAt ?? new Date(exists.startsAt.getTime() + 86_400_000) },
        OR: [{ scannerId: { in: participantIds } }, { memberId: { in: participantIds } }],
      },
    }) : 0;
    const acceptedTotal = accepted + attended;
    const shares = sharesByChannel.reduce((sum, item) => sum + item._count._all, 0);
    const ticketTypeSold = distributionSum(orderDetails.map((order) => [order.ticketType.name, order.quantity] as const));
    const ticketTypeRevenue = distributionSum(orderDetails.map((order) => [order.ticketType.name, Number(order.totalAmount)] as const));
    const ticketSaleDay = distributionCount(orderDetails.map((order) => (order.purchasedAt ?? order.createdAt).toISOString().slice(0, 10)));
    const ticketSaleHour = distributionCount(orderDetails.map((order) => hourBucket(order.purchasedAt ?? order.createdAt)));
    const ticketGroup = distributionCount(orderDetails.map((order) => order.quantity === 1 ? "tekli" : order.quantity === 2 ? "2_kisilik" : "3_plus"));
    const checkInHour = distributionCount(participantDetails.filter((item) => item.checkedInAt).map((item) => hourBucket(item.checkedInAt!)));
    const ratingValues = ratingRows.map((row) => Number(row.reaction.slice("rating_".length))).filter((value) => Number.isInteger(value) && value >= 1 && value <= 5);
    const averageRating = ratingValues.length ? Math.round(ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length * 10) / 10 : 0;
    const declined = count("declined");
    return {
      accepted,
      attended,
      requested,
      invited,
      comments,
      reactions,
      views,
      shares,
      ticketsSold: ticketOrders._sum.quantity ?? ticketSold,
      ticketOrders: ticketOrders._count._all,
      ticketRevenue: Number(ticketOrders._sum.totalAmount ?? 0),
      refunds: refunds._count._all,
      refundAmount: Number(refunds._sum.amount ?? payments._sum.refundedAmount ?? 0),
      ticketCapacity,
      ticketsRemaining: Math.max(0, ticketCapacity - ticketSold),
      averageTicketPrice: ticketSold > 0 ? Math.round(Number(payments._sum.grossAmount ?? 0) / ticketSold * 100) / 100 : 0,
      platformCommission: Number(payments._sum.platformFee ?? 0),
      organizerRevenue: Number(payments._sum.netAmount ?? 0),
      rsvpRate: invited + requested > 0 ? Math.round((accepted + attended) / (invited + requested + accepted + attended) * 100) : 0,
      attendanceRate: accepted + attended > 0 ? Math.round(attended / (accepted + attended) * 100) : 0,
      cancellationRate: accepted + attended + declined > 0 ? Math.round(declined / (accepted + attended + declined) * 100) : 0,
      engagementRate: detailViews > 0 ? Math.round((comments + reactions) / detailViews * 100) : 0,
      detailViews,
      socialConnections,
      socialConnectionRate: attended > 0 ? Math.round(socialConnections / attended * 100) : 0,
      ticketConversionRate: detailViews > 0 ? Math.round((ticketOrders._sum.quantity ?? ticketSold) / detailViews * 100) : 0,
      averageConnectionsPerAttendee: attended > 0 ? Math.round(socialConnections / attended * 10) / 10 : 0,
      averageRating,
      ratingCount: ratingValues.length,
      ...prefixMetrics("source", Object.fromEntries(viewSources.map((item) => [item.source || "direct", item._count._all]))),
      ...prefixMetrics("shareChannel", Object.fromEntries(sharesByChannel.map((item) => [item.channel, item._count._all]))),
      ...prefixMetrics("age", ageCounts),
      ...prefixMetrics("gender", genderCounts),
      ...prefixMetrics("location", countryCounts),
      ...prefixMetrics("interest", interestCounts),
      ...prefixMetrics("language", languageCounts),
      ...prefixMetrics("decision", decisionBuckets),
      ...prefixMetrics("ticketTypeSold", ticketTypeSold),
      ...prefixMetrics("ticketTypeRevenue", ticketTypeRevenue),
      ...prefixMetrics("ticketSaleDay", ticketSaleDay),
      ...prefixMetrics("ticketSaleHour", ticketSaleHour),
      ...prefixMetrics("ticketGroup", ticketGroup),
      ...prefixMetrics("checkInHour", checkInHour),
      performanceScore: Math.min(100, Math.round(((detailViews ? acceptedTotal / detailViews : 0) * 40 + (acceptedTotal ? attended / acceptedTotal : 0) * 40 + (detailViews ? (comments + reactions) / detailViews : 0) * 20) * 100)),
    };
  }

  async createEvent(input: CreateEventDto, userId?: string) {
    await this.validateTicketPlatforms(input.ticketTypes, userId);
    const slug = await this.uniqueSlug(input.title);
    const tagIds = await this.resolveEventTagIds(input.tagIds ?? [], input.lineup, userId);

    const event = await this.prisma.event.create({
      data: {
        title: input.title,
        slug,
        summary: this.resolveSummary(input),
        description: input.description,
        status: input.status ?? EventStatus.published,
        startsAt: new Date(input.startsAt),
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        timezone:
          input.timezone ?? this.resolveTimezone(input.city, input.country),
        format: input.format,
        visibility: input.visibility ?? "open",
        place: input.placeId ? { connect: { id: input.placeId } } : undefined,
        locationName: input.locationName ?? null,
        locationAddress: input.locationAddress ?? null,
        city: input.city ?? null,
        country: input.country ?? null,
        latitude: input.latitude,
        longitude: input.longitude,
        language: input.language ?? "en",
        organizerName: input.organizerName ?? null,
        externalRegistrationUrl: input.externalRegistrationUrl ?? null,
        liveUrl: input.liveUrl ?? null,
        timeline: input.timeline ?? null,
        lineup: input.lineup ?? [],
        ticketTypes: input.ticketTypes ?? [],
        ticketTypeRecords: input.ticketTypes?.length
          ? {
              create: input.ticketTypes.map((ticket, index) => ({
                name: ticket.name,
                description: ticket.description,
                capacity: ticket.capacity ?? 1,
                perUserLimit: ticket.perUserLimit ?? null,
                price: ticket.price,
                currency: ticket.currency,
                salesPlatform: ticket.salesPlatform ?? "door",
                externalSalesUrl: ticket.salesPlatform === "external" ? ticket.externalSalesUrl ?? null : null,
                saleStartsAt: ticket.saleStartsAt
                  ? new Date(ticket.saleStartsAt)
                  : null,
                saleEndsAt: ticket.saleEndsAt
                  ? new Date(ticket.saleEndsAt)
                  : null,
                gateOpensAt: ticket.gateOpensAt
                  ? new Date(ticket.gateOpensAt)
                  : null,
                gateClosesAt: ticket.gateClosesAt
                  ? new Date(ticket.gateClosesAt)
                  : null,
                status: ticket.status === "inactive" ? "inactive" : "active",
                sortOrder: index,
              })),
            }
          : undefined,
        coverImageUrl: input.coverImageUrl ?? null,
        capacity: input.capacity ?? null,
        price: input.price ?? 0,
        currency: input.currency ?? "TRY",
        createdBy: userId ? { connect: { id: userId } } : undefined,
        updatedBy: userId ? { connect: { id: userId } } : undefined,
        tags: {
          create: tagIds.map((tagId, sortOrder) => ({ tagId, sortOrder })),
        },
        participants: userId
          ? {
              create: {
                userId,
                role: EventParticipantRole.organizer,
                status: EventParticipantStatus.accepted,
              },
            }
          : undefined,
      },
      include: { tags: { orderBy: { sortOrder: "asc" as const }, include: { tag: true } } },
    });

    await this.refreshTagUsageCounts(tagIds);

    return this.mapEvent(event);
  }

  async listMyTickets(userId: string) {
    const participants = await this.prisma.eventParticipant.findMany({
      where: {
        userId,
        status: {
          in: [
            EventParticipantStatus.accepted,
            EventParticipantStatus.attended,
          ],
        },
      },
      include: { event: { include: { tags: { orderBy: { sortOrder: "asc" as const }, include: { tag: true } } } } },
      orderBy: { event: { startsAt: "asc" } },
    });
    return participants.map((item) => ({
      ...this.mapEvent(item.event),
      participationStatus: item.status,
      checkedInAt: item.checkedInAt?.toISOString() ?? null,
    }));
  }

  async listParticipants(eventId: string, user: User) {
    await this.ensureCanManageParticipants(eventId, user);

    const participants = await this.prisma.eventParticipant.findMany({
      where: { eventId },
      orderBy: [{ role: "desc" }, { status: "asc" }, { createdAt: "asc" }],
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            username: true,
            role: true,
            accountType: true,
            followerCount: true,
            status: true,
            _count: { select: { followers: { where: { follower: { eventParticipations: { some: { eventId, status: { in: [EventParticipantStatus.accepted, EventParticipantStatus.attended] } } } } } } } },
            uploadedMedia: { where: { contentType: "user", status: "active", isProfilePicture: true }, select: { url: true }, take: 1 },
            ownedTickets: { where: { eventId, status: { in: [OwnedTicketStatus.active, OwnedTicketStatus.used] } }, include: { ticketType: true } },
          },
        },
      },
    });
    const joinOrder = new Map([...participants].sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()).map((participant, index) => [participant.userId, index + 1]));
    return participants.map((participant) => {
      const tickets = new Map<string, { id: string; name: string; description: string | null; quantity: number; unitPrice: number; currency: string; gateOpensAt: Date | null; gateClosesAt: Date | null }>();
      for (const ticket of participant.user.ownedTickets) {
        const current = tickets.get(ticket.ticketTypeId);
        if (current) current.quantity += 1;
        else tickets.set(ticket.ticketTypeId, { id: ticket.ticketTypeId, name: ticket.ticketType.name, description: ticket.ticketType.description, quantity: 1, unitPrice: Number(ticket.ticketType.price), currency: ticket.ticketType.currency, gateOpensAt: ticket.ticketType.gateOpensAt, gateClosesAt: ticket.ticketType.gateClosesAt });
      }
      const user = participant.user;
      return {
        ...participant,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          role: user.role,
          accountType: user.accountType,
          followerCount: user.followerCount,
          relatedFollowerCount: user._count?.followers ?? 0,
          status: user.status,
          avatarUrl: user.uploadedMedia[0]?.url ?? null,
        },
        joinOrder: joinOrder.get(participant.userId),
        tickets: [...tickets.values()],
      };
    });
  }

  async listSentInvitations(eventId: string, inviterId: string) {
    const invitations = await this.prisma.eventInvitation.findMany({
      where: { eventId, inviterId },
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

  async listInviteRecommendations(eventId: string, actor: User) {
    await this.ensureCanManageParticipants(eventId, actor, true);
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        status: true,
        startsAt: true,
        endsAt: true,
        city: true,
        country: true,
        tags: { select: { tagId: true } },
        participants: { select: { userId: true } },
        invitations: { select: { inviteeId: true } },
      },
    });
    if (!event || event.status !== EventStatus.published) {
      throw new NotFoundException("Etkinlik bulunamadı.");
    }
    const cutoff = event.endsAt
      ? event.endsAt.getTime() + 12 * 60 * 60 * 1000
      : event.startsAt.getTime() + 24 * 60 * 60 * 1000;
    if (Date.now() > cutoff) {
      throw new BadRequestException("Bitmiş bir etkinlik için davet önerisi oluşturulamaz.");
    }

    const [follows, guestLists, managedPastEvents, blocks] = await Promise.all([
      this.prisma.userFollow.findMany({
        where: { followerId: actor.id },
        select: { followingId: true },
      }),
      this.prisma.guestList.findMany({
        where: { ownerId: actor.id },
        select: { members: { select: { userId: true } } },
      }),
      this.prisma.event.findMany({
        where: {
          id: { not: eventId },
          status: { in: [EventStatus.published, EventStatus.archived] },
          endsAt: { lt: new Date() },
          OR: [
            { createdById: actor.id },
            {
              participants: {
                some: {
                  userId: actor.id,
                  status: EventParticipantStatus.accepted,
                  role: { in: [EventParticipantRole.organizer, EventParticipantRole.manager] },
                },
              },
            },
          ],
        },
        select: { id: true },
        take: 100,
      }),
      this.prisma.userBlock.findMany({
        where: {
          targetType: "user",
          OR: [{ userId: actor.id }, { targetId: actor.id }],
        },
        select: { userId: true, targetId: true },
      }),
    ]);
    const pastAttendees = managedPastEvents.length
      ? await this.prisma.eventParticipant.findMany({
          where: {
            eventId: { in: managedPastEvents.map((item) => item.id) },
            status: { in: [EventParticipantStatus.accepted, EventParticipantStatus.attended] },
          },
          select: { userId: true },
          distinct: ["userId"],
          take: 500,
        })
      : [];
    const excludedIds = new Set([
      actor.id,
      ...event.participants.map((item) => item.userId),
      ...event.invitations.map((item) => item.inviteeId),
      ...blocks.flatMap((item) => [item.userId, item.targetId]),
    ]);
    const candidates = await this.prisma.user.findMany({
      where: {
        id: { notIn: [...excludedIds] },
        status: "active",
        username: { not: null },
      },
      select: {
        id: true,
        name: true,
        username: true,
        city: true,
        country: true,
        followerCount: true,
        lastOnlineAt: true,
        profileVerifiedAt: true,
        interestTags: { select: { tagId: true, sentiment: true } },
        uploadedMedia: {
          where: { contentType: "user", status: "active", isProfilePicture: true },
          select: { url: true },
          take: 1,
        },
      },
      take: 500,
    });
    const eventTagIds = new Set(event.tags.map((item) => item.tagId));
    const followingIds = new Set(follows.map((item) => item.followingId));
    const guestListIds = new Set(guestLists.flatMap((list) => list.members.map((item) => item.userId)));
    const pastAttendeeIds = new Set(pastAttendees.map((item) => item.userId));
    const normalize = (value?: string | null) => value?.trim().toLocaleLowerCase("tr-TR") ?? "";
    const recentThreshold = Date.now() - 30 * 24 * 60 * 60 * 1000;

    return candidates
      .map((candidate) => {
        const matchingInterests = candidate.interestTags.filter((item) => eventTagIds.has(item.tagId));
        const likedInterests = matchingInterests.filter((item) => item.sentiment === "like").length;
        const okayInterests = matchingInterests.filter((item) => item.sentiment === "ok").length;
        const reasons: string[] = [];
        let score = likedInterests * 12 + okayInterests * 5;
        if (matchingInterests.length) reasons.push("shared_interests");
        if (event.city && normalize(candidate.city) === normalize(event.city)) {
          score += 8;
          reasons.push("same_city");
        } else if (event.country && normalize(candidate.country) === normalize(event.country)) {
          score += 3;
          reasons.push("same_country");
        }
        if (followingIds.has(candidate.id)) {
          score += 8;
          reasons.push("following");
        }
        if (pastAttendeeIds.has(candidate.id)) {
          score += 6;
          reasons.push("past_attendee");
        }
        if (guestListIds.has(candidate.id)) {
          score += 5;
          reasons.push("guest_list");
        }
        if (candidate.profileVerifiedAt) {
          score += 2;
          reasons.push("verified");
        }
        if (candidate.lastOnlineAt && candidate.lastOnlineAt.getTime() >= recentThreshold) {
          score += 2;
          reasons.push("active_recently");
        }
        score += Math.min(5, Math.floor(Math.log10(candidate.followerCount + 1) * 2));
        if (candidate.followerCount >= 10) reasons.push("popular");
        return {
          id: candidate.id,
          name: candidate.name,
          username: candidate.username,
          avatarUrl: candidate.uploadedMedia[0]?.url ?? null,
          score,
          sharedInterestCount: matchingInterests.length,
          reasons,
        };
      })
      .sort((left, right) =>
        right.score - left.score ||
        right.sharedInterestCount - left.sharedInterestCount ||
        (left.username ?? "").localeCompare(right.username ?? "", "tr"),
      )
      .slice(0, 25);
  }

  async listRelatedUsers(eventId: string, actor?: User) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, status: "published" },
      select: {
        id: true,
        createdById: true,
        participants: actor ? { where: { userId: actor.id }, select: { role: true, status: true }, take: 1 } : false,
      },
    });
    if (!event) throw new NotFoundException("Etkinlik bulunamadı.");
    const viewerParticipant = event.participants?.[0];
    const canManage = Boolean(actor && (["admin", "super_admin", "curator"].includes(actor.role) || event.createdById === actor.id || viewerParticipant?.status === "accepted" && ["organizer", "manager"].includes(viewerParticipant.role)));
    const ownInvitedUserIds = actor && !canManage
      ? (await this.prisma.eventInvitation.findMany({
          where: { eventId, inviterId: actor.id },
          select: { inviteeId: true },
        })).map((invitation) => invitation.inviteeId)
      : [];
    const [participants, viewerInterests] = await Promise.all([this.prisma.eventParticipant.findMany({
      where: {
        eventId,
        ...(canManage
          ? { status: { in: [EventParticipantStatus.accepted, EventParticipantStatus.attended, EventParticipantStatus.invited, EventParticipantStatus.requested, EventParticipantStatus.declined, EventParticipantStatus.banned] } }
          : ownInvitedUserIds.length
            ? {
                OR: [
                  { status: { in: [EventParticipantStatus.accepted, EventParticipantStatus.attended] } },
                  { status: EventParticipantStatus.invited, userId: { in: ownInvitedUserIds } },
                ],
              }
            : { status: { in: [EventParticipantStatus.accepted, EventParticipantStatus.attended] } }),
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
    return participants.map((participant) => ({
      id: participant.user.id,
      name: participant.user.name,
      username: participant.user.username,
      city: actor?.id === participant.user.id ? participant.user.city : null,
      country: actor?.id === participant.user.id ? participant.user.country : null,
      gender: actor?.id === participant.user.id || participant.user.privacySettings?.demographicsAudience === "everybody" ? participant.user.gender : null,
      birthDate: actor?.id === participant.user.id || participant.user.privacySettings?.demographicsAudience === "everybody" ? participant.user.birthDate : null,
      profileVerifiedAt: participant.user.profileVerifiedAt,
      avatarUrl: participant.user.uploadedMedia?.[0]?.url ?? null,
      commonTagCount: (participant.user.interestTags ?? []).filter((item) => viewerTagIds.has(item.tagId)).length,
      relation: participant.role,
      status: participant.status,
      checkedIn: Boolean(participant.checkedInAt),
    }));
  }

  async requestAttendance(eventId: string, userId: string) {
    const [event, existing] = await Promise.all([
      this.prisma.event.findUnique({ where: { id: eventId } }),
      this.prisma.eventParticipant.findUnique({
        where: { eventId_userId: { eventId, userId } },
      }),
    ]);

    if (!event || event.status !== EventStatus.published) {
      throw new NotFoundException("Etkinlik bulunamadı.");
    }

    if (
      event.visibility === "invite_only" &&
      existing?.status !== EventParticipantStatus.invited &&
      existing?.status !== EventParticipantStatus.accepted
    ) {
      throw new ForbiddenException(
        "Bu etkinliğe yalnız davet edilen kullanıcılar katılabilir.",
      );
    }

    const status =
      event.visibility === "approval_required"
        ? EventParticipantStatus.requested
        : EventParticipantStatus.accepted;

    if (
      status === EventParticipantStatus.accepted &&
      existing?.status !== EventParticipantStatus.accepted &&
      event.capacity
    ) {
      const acceptedCount = await this.prisma.eventParticipant.count({
        where: {
          eventId,
          status: {
            in: [
              EventParticipantStatus.accepted,
              EventParticipantStatus.attended,
            ],
          },
        },
      });
      if (acceptedCount >= event.capacity)
        throw new ConflictException("Etkinlik kapasitesi doldu.");
    }

    return this.prisma.eventParticipant.upsert({
      where: { eventId_userId: { eventId, userId } },
      update: { status },
      create: {
        eventId,
        userId,
        status,
        role: EventParticipantRole.attendee,
      },
    });
  }

  async issueCheckInTicket(eventId: string, userId: string) {
    const participant = await this.prisma.eventParticipant.findUnique({
      where: { eventId_userId: { eventId, userId } },
      include: { event: { select: { id: true, title: true, status: true } } },
    });
    if (
      !participant ||
      participant.event.status !== EventStatus.published ||
      (participant.status !== EventParticipantStatus.accepted &&
        participant.status !== EventParticipantStatus.invited)
    ) {
      throw new NotFoundException("Aktif etkinlik bileti bulunamadı.");
    }

    const token = randomBytes(32).toString("hex");
    const issuedAt = new Date();
    await this.prisma.eventParticipant.update({
      where: { id: participant.id },
      data: {
        checkInTokenHash: this.hashCheckInToken(token),
        checkInTokenIssuedAt: issuedAt,
      },
    });
    return {
      eventId,
      eventTitle: participant.event.title,
      token,
      qrPayload: `konnektora://check-in?event=${encodeURIComponent(eventId)}&token=${token}`,
      issuedAt: issuedAt.toISOString(),
    };
  }

  async checkInWithTicket(eventId: string, token: string, actor: User) {
    await this.ensureCanManageParticipants(eventId, actor, true);
    await this.ensureEventCheckInOpen(eventId);
    const participant = await this.prisma.eventParticipant.findUnique({
      where: { checkInTokenHash: this.hashCheckInToken(token) },
    });
    if (!participant || participant.eventId !== eventId) {
      throw new NotFoundException("QR bilet geçersiz.");
    }
    if (participant.status === EventParticipantStatus.attended) {
      throw new ConflictException("Bu bilet daha önce kullanılmış.");
    }
    if (
      participant.status !== EventParticipantStatus.accepted &&
      participant.status !== EventParticipantStatus.invited
    ) {
      throw new NotFoundException("QR bilet check-in için uygun değil.");
    }
    const checkInOrder = await this.prisma.eventParticipant.count({ where: { eventId, checkedInAt: { not: null } } }) + 1;
    return this.prisma.eventParticipant.update({
      where: { id: participant.id },
      data: {
        status: EventParticipantStatus.attended,
        checkedInAt: new Date(),
        checkInDecisionAt: new Date(),
        checkInMethod: "qr",
        checkInOrder,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
          },
        },
      },
    });
  }

  async previewCheckInWithTicket(eventId: string, token: string, method: "qr" | "nfc", actor: User) {
    await this.ensureCanManageParticipants(eventId, actor, true);
    const participant = await this.prisma.eventParticipant.findUnique({
      where: { checkInTokenHash: this.hashCheckInToken(token) },
      select: { eventId: true, userId: true },
    });
    if (!participant || participant.eventId !== eventId) throw new NotFoundException("QR bilet geçersiz.");
    return this.getCheckInPassport(eventId, participant.userId, actor, method);
  }

  async getCheckInPassport(eventId: string, userId: string, actor: User, method: "manual" | "qr" | "nfc" = "manual") {
    await this.ensureCanManageParticipants(eventId, actor, true);
    await this.ensureEventCheckInOpen(eventId);
    const participant = await this.prisma.eventParticipant.findUnique({
      where: { eventId_userId: { eventId, userId } },
      include: {
        event: { select: { id: true, title: true, placeId: true, place: { select: { id: true, name: true } } } },
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
            ownedTickets: {
              where: { eventId, status: { in: [OwnedTicketStatus.active, OwnedTicketStatus.used] } },
              include: { ticketType: true },
            },
          },
        },
      },
    });
    if (!participant) throw new NotFoundException("Katılımcı bulunamadı.");
    const [invitations, guestLists, relatedFollowerCount, relatedPlaceMember, relatedPlaceInvitations] = await Promise.all([
      this.prisma.eventInvitation.findMany({
        where: { eventId, inviteeId: userId },
        orderBy: { createdAt: "asc" },
        include: { inviter: { select: { username: true, name: true } } },
      }),
      this.prisma.guestList.findMany({
        where: { ownerId: actor.id, members: { some: { userId } } },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      this.prisma.userFollow.count({
        where: {
          followingId: userId,
          follower: { eventParticipations: { some: { eventId, status: { in: [EventParticipantStatus.accepted, EventParticipantStatus.attended] } } } },
        },
      }),
      participant.event.placeId ? this.prisma.placeMember.findUnique({ where: { placeId_userId: { placeId: participant.event.placeId, userId } } }) : Promise.resolve(null),
      participant.event.placeId ? this.prisma.placeInvitation.findMany({ where: { placeId: participant.event.placeId, inviteeId: userId }, include: { inviter: { select: { username: true, name: true } } }, orderBy: { createdAt: "asc" } }) : Promise.resolve([]),
    ]);
    const tickets = new Map<string, { id: string; name: string; description: string | null; quantity: number; unitPrice: number; currency: string; gateOpensAt: Date | null; gateClosesAt: Date | null }>();
    for (const ticket of participant.user.ownedTickets) {
      const current = tickets.get(ticket.ticketTypeId);
      if (current) current.quantity += 1;
      else tickets.set(ticket.ticketTypeId, { id: ticket.ticketTypeId, name: ticket.ticketType.name, description: ticket.ticketType.description, quantity: 1, unitPrice: Number(ticket.ticketType.price), currency: ticket.ticketType.currency, gateOpensAt: ticket.ticketType.gateOpensAt, gateClosesAt: ticket.ticketType.gateClosesAt });
    }
    const media = participant.user.uploadedMedia.map(({ id, url, type }) => ({ id, url, type }));
    const avatarUrl = participant.user.uploadedMedia.find((item) => item.isProfilePicture)?.url ?? media[0]?.url ?? null;
    return {
      targetType: "event" as const,
      targetId: eventId,
      targetName: participant.event.title,
      user: { id: participant.user.id, email: participant.user.email, name: participant.user.name, username: participant.user.username, role: participant.user.role, status: participant.user.status, accountType: participant.user.accountType, avatarUrl, followerCount: participant.user.followerCount, plan: this.getPassportPlan(participant.user), profileVerifiedAt: participant.user.profileVerifiedAt, media },
      status: participant.status,
      role: participant.role,
      alreadyInside: participant.status === EventParticipantStatus.attended || Boolean(participant.checkedInAt),
      checkedInAt: participant.checkedInAt,
      checkInOrder: participant.checkInOrder,
      checkInMethod: participant.checkInMethod ?? method,
      invitedBy: invitations.map((item) => item.inviter.username ? `@${item.inviter.username}` : item.inviter.name),
      relatedFollowerCount,
      guestLists,
      relatedPlace: participant.event.place && relatedPlaceMember ? { id: participant.event.place.id, name: participant.event.place.name, status: relatedPlaceMember.status, role: relatedPlaceMember.role, checkedInAt: relatedPlaceMember.checkedInAt, order: relatedPlaceMember.checkInOrder, invitedBy: relatedPlaceInvitations.map((item) => item.inviter.username ? `@${item.inviter.username}` : item.inviter.name) } : null,
      tickets: [...tickets.values()],
    };
  }

  private getPassportPlan(user: { role: string; accountType: string; memberPlan: string; businessPlan: string }) {
    if (["admin", "super_admin"].includes(user.role)) return "Admin";
    if (user.role === "curator") return "Küratör";
    if (user.accountType === "corporate") return user.businessPlan === "starter" ? "Kurumsal Başlangıç" : `Kurumsal ${user.businessPlan}`;
    return user.memberPlan === "free" ? "Standart" : user.memberPlan;
  }

  async decideCheckInPassport(eventId: string, userId: string, input: CheckInDecisionDto, actor: User) {
    await this.ensureCanManageParticipants(eventId, actor, true);
    await this.ensureEventCheckInOpen(eventId);
    const participant = await this.prisma.eventParticipant.findUnique({ where: { eventId_userId: { eventId, userId } }, include: { event: { select: { title: true } } } });
    if (!participant) throw new NotFoundException("Katılımcı bulunamadı.");
    if (input.decision === "admit" && participant.status === EventParticipantStatus.attended) throw new ConflictException("Kullanıcı zaten check-in içeride.");
    const refundableOrders = input.decision === "decline"
      ? await this.prisma.eventTicketOrder.findMany({
          where: {
            eventId,
            buyerId: userId,
            status: TicketOrderStatus.paid,
            payment: { isNot: null },
            tickets: {
              some: { ownerId: userId, status: OwnedTicketStatus.active },
              every: { ownerId: userId, status: OwnedTicketStatus.active },
            },
          },
          include: { payment: true },
        })
      : [];
    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const checkInOrder = input.decision === "admit" ? await tx.eventParticipant.count({ where: { eventId, checkedInAt: { not: null } } }) + 1 : null;
      const updated = await tx.eventParticipant.update({
        where: { eventId_userId: { eventId, userId } },
        data: input.decision === "admit"
          ? { status: EventParticipantStatus.attended, checkedInAt: now, checkInDecisionAt: now, checkInMethod: input.method, checkInOrder }
          : { status: EventParticipantStatus.declined, checkedInAt: null, checkInDecisionAt: now, checkInMethod: input.method, checkInOrder: null },
        include: { user: { select: { id: true, email: true, name: true, username: true, role: true, status: true } } },
      });
      let refundedAmount = 0;
      let refundedCurrency = "";
      for (const order of refundableOrders) {
        if (!order.payment) continue;
        const reversal = Number(order.payment.netAmount);
        const account = await tx.financialAccount.findUnique({ where: { userId: order.payment.payeeId } });
        if (!account || Number(account.availableBalance) < reversal) {
          throw new BadRequestException("Bilet iadesi için organizatör bakiyesi yetersiz; giriş reddi kaydedilmedi.");
        }
        await tx.financialAccount.update({ where: { userId: order.payment.payeeId }, data: { availableBalance: { decrement: reversal } } });
        await tx.paymentTransaction.update({ where: { id: order.payment.id }, data: { status: PaymentStatus.refunded, refundedAmount: order.payment.grossAmount } });
        await tx.ticketRefund.create({ data: { eventId, userId, paymentId: order.payment.id, amount: order.payment.grossAmount, currency: order.currency, provider: order.payment.provider, status: "refunded", reason: "Check-in kontrolünde giriş reddedildi." } });
        await tx.ownedEventTicket.updateMany({ where: { orderId: order.id }, data: { status: OwnedTicketStatus.refunded } });
        await tx.eventTicketType.update({ where: { id: order.ticketTypeId }, data: { soldCount: { decrement: order.quantity }, status: "active" } });
        await tx.eventTicketOrder.update({ where: { id: order.id }, data: { status: TicketOrderStatus.refunded } });
        refundedAmount += Number(order.payment.grossAmount);
        refundedCurrency = order.currency;
      }
      return { updated, refundedAmount, refundedCurrency };
    });
    await this.notifications.dispatch({
      userId,
      topic: "event_invite",
      type: input.decision === "admit" ? "event_check_in_admitted" : "event_check_in_declined",
      title: input.decision === "admit" ? "Etkinliğe girişin onaylandı" : "Etkinliğe girişin onaylanmadı",
      body: input.decision === "admit"
        ? `${participant.event.title}: Hoş geldin, iyi eğlenceler.`
        : result.refundedAmount > 0
          ? `${participant.event.title}: Üzgünüz, etkinliğe kabul edilmediniz. ${result.refundedAmount} ${result.refundedCurrency} bilet ücretiniz iade edildi.`
          : `${participant.event.title}: Üzgünüz, etkinliğe kabul edilmediniz.`,
      targetType: "event",
      targetId: eventId,
    });
    return result.updated;
  }

  async inviteParticipant(
    eventId: string,
    input: InviteParticipantDto,
    actor: User,
  ) {
    const canManage = await this.canManageParticipants(eventId, actor, true);
    if (!canManage && input.role && input.role !== EventParticipantRole.attendee) {
      throw new ForbiddenException("Yönetici rolü yalnız etkinlik yöneticileri tarafından atanabilir.");
    }
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        slug: true,
        startsAt: true,
        endsAt: true,
        status: true,
        participants: {
          where: { userId: actor.id },
          select: { status: true },
          take: 1,
        },
      },
    });

    if (!event || event.status !== EventStatus.published) {
      throw new NotFoundException("Etkinlik bulunamadı.");
    }
    const cutoff = event.endsAt
      ? event.endsAt.getTime() + 12 * 60 * 60 * 1000
      : event.startsAt.getTime() + 24 * 60 * 60 * 1000;
    if (Date.now() > cutoff) {
      throw new BadRequestException("Bitmiş bir etkinliğe başkasını davet edemezsiniz. Etkinlik Düzenle sayfasındaki etkinlik bitiş zamanını güncelleyerek tekrar deneyin.");
    }
    const actorStatus = event.participants[0]?.status;
    const invitationStatuses = new Set<EventParticipantStatus>([
      EventParticipantStatus.accepted,
      EventParticipantStatus.attended,
      EventParticipantStatus.invited,
    ]);
    if (!canManage && (!actorStatus || !invitationStatuses.has(actorStatus))) {
      throw new ForbiddenException("Sadece katılımcılar ve davetliler davet edebilir.");
    }

    const invitee = await this.resolveInvitee(input);
    const existingParticipant = await this.prisma.eventParticipant.findUnique({
      where: { eventId_userId: { eventId, userId: invitee.id } },
      select: { status: true },
    });

    if (invitee.status === "active") {
      const existingInvitation = await this.prisma.eventInvitation.findUnique({
        where: { eventId_inviterId_inviteeId: { eventId, inviterId: actor.id, inviteeId: invitee.id } },
        select: { id: true },
      });
      if (existingInvitation) throw new ConflictException("Bu kullanıcıyı bu etkinliğe daha önce davet ettiniz.");
      await this.prisma.eventInvitation.create({ data: { eventId, inviterId: actor.id, inviteeId: invitee.id } });
    }

    const participant = await this.prisma.eventParticipant.upsert({
      where: { eventId_userId: { eventId, userId: invitee.id } },
      update: {
        status: existingParticipant && (existingParticipant.status === EventParticipantStatus.accepted || existingParticipant.status === EventParticipantStatus.attended)
          ? undefined
          : EventParticipantStatus.invited,
        role: canManage ? input.role ?? EventParticipantRole.attendee : EventParticipantRole.attendee,
      },
      create: {
        eventId,
        userId: invitee.id,
        status: EventParticipantStatus.invited,
        role: canManage ? input.role ?? EventParticipantRole.attendee : EventParticipantRole.attendee,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
          },
        },
      },
    });

    const acceptToken =
      invitee.status === "invited"
        ? await this.authService.createInviteAcceptToken(invitee.id)
        : undefined;

    if (input.phone && invitee.phone) {
      await this.smsService.sendEventInvite(
        invitee.phone,
        actor.name,
        event.title,
        event.slug,
        acceptToken,
      );
    } else if (!invitee.email.endsWith("@invite.konnektora.local")) {
      await this.mailService.sendEventInviteEmail({
        to: invitee.email,
        name: invitee.name,
        eventTitle: event.title,
        eventSlug: event.slug,
        invitedByName: actor.name,
        acceptToken,
      });
    }

    return participant;
  }

  async updateParticipant(
    eventId: string,
    userId: string,
    input: { status?: EventParticipantStatus; role?: EventParticipantRole },
    actor: User,
  ) {
    await this.ensureCanManageParticipants(eventId, actor);
    if (!input.status && !input.role) throw new BadRequestException("Katılımcı durumu veya rolü seçilmelidir.");
    const [participant, event] = await Promise.all([
      this.prisma.eventParticipant.findUnique({ where: { eventId_userId: { eventId, userId } } }),
      this.prisma.event.findUnique({ where: { id: eventId }, select: { createdById: true } }),
    ]);

    if (!participant) {
      throw new NotFoundException("Katılımcı bulunamadı.");
    }

    if (
      input.role &&
      (input.role === EventParticipantRole.manager || participant.role === EventParticipantRole.manager) &&
      event?.createdById !== actor.id &&
      !["admin", "super_admin"].includes(actor.role)
    ) throw new ForbiddenException("Etkinlik sahibi rolünü yalnızca etkinlik kurucusu değiştirebilir.");
    return this.prisma.eventParticipant.update({
      where: { eventId_userId: { eventId, userId } },
      data: { ...(input.status ? { status: input.status } : {}), ...(input.role ? { role: input.role } : {}) },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
          },
        },
      },
    });
  }

  async updateParticipantStatus(eventId: string, userId: string, status: EventParticipantStatus, actor: User) {
    return this.updateParticipant(eventId, userId, { status }, actor);
  }

  async checkInParticipant(eventId: string, userId: string, actor: User) {
    await this.ensureCanManageParticipants(eventId, actor);
    await this.ensureEventCheckInOpen(eventId);

    const participant = await this.prisma.eventParticipant.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (
      !participant ||
      (participant.status !== EventParticipantStatus.accepted &&
        participant.status !== EventParticipantStatus.invited)
    ) {
      throw new NotFoundException("Check-in için uygun katılımcı bulunamadı.");
    }

    const checkInOrder = await this.prisma.eventParticipant.count({ where: { eventId, checkedInAt: { not: null } } }) + 1;
    return this.prisma.eventParticipant.update({
      where: { eventId_userId: { eventId, userId } },
      data: {
        status: EventParticipantStatus.attended,
        checkedInAt: new Date(),
        checkInDecisionAt: new Date(),
        checkInMethod: "manual",
        checkInOrder,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
          },
        },
      },
    });
  }

  async updateEvent(
    id: string,
    input: Partial<CreateEventDto>,
    userId?: string,
  ) {
    await this.validateTicketPlatforms(input.ticketTypes, userId);
    const previousTagIds = await this.getEventTagIds(id);
    const nextTagIds = input.tagIds || input.lineup
      ? await this.resolveEventTagIds(input.tagIds ?? previousTagIds, input.lineup, userId)
      : null;
    const data: Prisma.EventUpdateInput = {
      title: input.title,
      summary: input.summary
        ? this.resolveSummary(input as CreateEventDto)
        : undefined,
      description: input.description,
      status: input.status,
      startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
      endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
      timezone:
        input.timezone ??
        (input.city !== undefined || input.country !== undefined
          ? this.resolveTimezone(input.city, input.country)
          : undefined),
      format: input.format,
      visibility: input.visibility,
      place: input.placeId === undefined ? undefined : input.placeId ? { connect: { id: input.placeId } } : { disconnect: true },
      locationName: input.locationName,
      locationAddress: input.locationAddress,
      city: input.city,
      country: input.country,
      latitude: input.latitude,
      longitude: input.longitude,
      language: input.language,
      organizerName: input.organizerName,
      externalRegistrationUrl: input.externalRegistrationUrl,
      liveUrl: input.liveUrl,
      timeline: input.timeline,
      lineup: input.lineup,
      ticketTypes: input.ticketTypes,
      coverImageUrl: input.coverImageUrl,
      capacity: undefined,
      price: input.price,
      currency: input.currency,
      updatedBy: userId ? { connect: { id: userId } } : undefined,
    };

    if (input.title) {
      const current = await this.prisma.event.findUnique({
        where: { id },
        select: { slug: true, legacySlugs: true },
      });
      const nextSlug = await this.uniqueSlug(input.title, id);
      data.slug = nextSlug;
      if (current && current.slug !== nextSlug) {
        data.legacySlugs = {
          set: [...new Set([...(current.legacySlugs ?? []), current.slug])],
        };
      }
    }

    if (nextTagIds) {
      data.tags = {
        deleteMany: {},
        create: nextTagIds.map((tagId, sortOrder) => ({ tagId, sortOrder })),
      };
    }

    const event = await this.prisma.event.update({
      where: { id },
      data,
      include: { tags: { orderBy: { sortOrder: "asc" as const }, include: { tag: true } } },
    });

    if (input.ticketTypes) await this.syncTicketTypes(id, input.ticketTypes);

    await this.refreshTagUsageCounts([
      ...previousTagIds,
      ...(nextTagIds ?? []),
    ]);

    return this.mapEvent(event);
  }

  private async resolveEventTagIds(
    explicitTagIds: string[],
    lineup?: CreateEventDto["lineup"],
    userId?: string,
  ) {
    const ids = new Set(explicitTagIds);
    const sessionTitles = [...new Set((lineup ?? [])
      .filter((item) => (item.type ?? "session") === "session")
      .map((item) => item.title.trim())
      .filter(Boolean))];
    for (const title of sessionTitles) {
      const slug = toSlug(title);
      if (!slug) continue;
      const existing = await this.prisma.tag.findUnique({
        where: { slug },
        select: { id: true, status: true },
      });
      if (existing?.status === "active") {
        ids.add(existing.id);
        continue;
      }
      if (!existing && userId) {
        const created = await this.prisma.tag.create({
          data: {
            name: title,
            slug,
            status: "active",
            createdById: userId,
            updatedById: userId,
          },
          select: { id: true },
        });
        ids.add(created.id);
      }
    }
    return [...ids];
  }

  private async syncTicketTypes(eventId: string, ticketTypes: NonNullable<CreateEventDto["ticketTypes"]>) {
    const existing = await this.prisma.eventTicketType.findMany({ where: { eventId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
    for (const [index, ticket] of ticketTypes.entries()) {
      const current = existing[index];
      const capacity = ticket.capacity ?? 1;
      if (current && capacity < current.soldCount) throw new BadRequestException(`${ticket.name} kontenjanı satılmış bilet sayısından düşük olamaz.`);
      const data = {
        name: ticket.name,
        description: ticket.description ?? null,
        capacity,
        perUserLimit: ticket.perUserLimit ?? null,
        price: ticket.price,
        currency: ticket.currency,
        salesPlatform: ticket.salesPlatform ?? "door",
        externalSalesUrl: ticket.salesPlatform === "external" ? ticket.externalSalesUrl ?? null : null,
        saleStartsAt: ticket.saleStartsAt ? new Date(ticket.saleStartsAt) : null,
        saleEndsAt: ticket.saleEndsAt ? new Date(ticket.saleEndsAt) : null,
        gateOpensAt: ticket.gateOpensAt ? new Date(ticket.gateOpensAt) : null,
        gateClosesAt: ticket.gateClosesAt ? new Date(ticket.gateClosesAt) : null,
        status: ticket.status === "inactive" ? "inactive" as const : "active" as const,
        sortOrder: index,
      };
      if (current) await this.prisma.eventTicketType.update({ where: { id: current.id }, data });
      else await this.prisma.eventTicketType.create({ data: { eventId, ...data } });
    }
    if (existing.length > ticketTypes.length) await this.prisma.eventTicketType.updateMany({ where: { id: { in: existing.slice(ticketTypes.length).map((item) => item.id) } }, data: { status: "inactive" } });
  }

  private async validateTicketPlatforms(ticketTypes?: CreateEventDto["ticketTypes"], userId?: string) {
    if (!ticketTypes?.length) return;
    for (const ticket of ticketTypes) {
      if (ticket.salesPlatform !== "external") continue;
      try { new URL(ticket.externalSalesUrl ?? ""); }
      catch { throw new BadRequestException(`${ticket.name} için geçerli bir dış satış URL'si girin.`); }
    }
    if (!ticketTypes.some((ticket) => ticket.salesPlatform === "konnektora")) return;
    const owner = userId ? await this.prisma.user.findUnique({ where: { id: userId }, select: { accountType: true, role: true } }) : null;
    if (!owner || owner.accountType !== "corporate" && !["admin", "super_admin"].includes(owner.role)) throw new BadRequestException('Sadece kurumsal üyeler "Konnektora online satış" ayarını tercih edebilir.');
  }

  async updateManagedEvent(
    id: string,
    input: Partial<CreateEventDto>,
    user: User,
  ) {
    await this.ensureCanManageParticipants(id, user);
    const previous = input.visibility
      ? await this.prisma.event.findUnique({ where: { id }, select: { visibility: true } })
      : null;
    const event = await this.updateEvent(id, input, user.id);
    if (previous?.visibility === EventVisibility.approval_required && input.visibility === EventVisibility.open) {
      await this.prisma.eventParticipant.updateMany({
        where: { eventId: id, status: EventParticipantStatus.requested },
        data: { status: EventParticipantStatus.accepted },
      });
    }
    return event;
  }

  async archiveEvent(id: string, userId?: string) {
    const tagIds = await this.getEventTagIds(id);
    const orders = await this.prisma.eventTicketOrder.findMany({ where: { eventId: id, status: TicketOrderStatus.paid }, include: { payment: true } });
    const reversals = new Map<string, number>();
    for (const order of orders) if (order.payment) reversals.set(order.payment.payeeId, (reversals.get(order.payment.payeeId) ?? 0) + Number(order.payment.netAmount));
    for (const [payeeId, amount] of reversals) {
      const account = await this.prisma.financialAccount.findUnique({ where: { userId: payeeId }, select: { availableBalance: true } });
      if (!account || Number(account.availableBalance) < amount) throw new BadRequestException("Etkinlik iptali ve otomatik bilet iadeleri için organizatör bakiyesi yetersiz.");
    }
    const event = await this.prisma.$transaction(async (tx) => {
      for (const [payeeId, amount] of reversals) await tx.financialAccount.update({ where: { userId: payeeId }, data: { availableBalance: { decrement: amount } } });
      for (const order of orders) {
        if (order.payment) {
          await tx.paymentTransaction.update({ where: { id: order.payment.id }, data: { status: PaymentStatus.refunded, refundedAmount: order.payment.grossAmount } });
          await tx.ticketRefund.create({ data: { eventId: id, userId: order.buyerId, paymentId: order.payment.id, amount: order.payment.grossAmount, currency: order.currency, provider: order.payment.provider, status: "refunded", reason: "Etkinlik organizatör tarafından iptal edildi." } });
        }
        await tx.ownedEventTicket.updateMany({ where: { orderId: order.id }, data: { status: OwnedTicketStatus.refunded } });
        await tx.eventTicketType.updateMany({ where: { id: order.ticketTypeId, soldCount: { gte: order.quantity } }, data: { soldCount: { decrement: order.quantity } } });
        await tx.eventTicketOrder.update({ where: { id: order.id }, data: { status: TicketOrderStatus.refunded } });
      }
      return tx.event.update({ where: { id }, data: { status: EventStatus.archived, updatedBy: userId ? { connect: { id: userId } } : undefined }, include: { tags: { orderBy: { sortOrder: "asc" as const }, include: { tag: true } } } });
    });

    await this.refreshTagUsageCounts(tagIds);

    return this.mapEvent(event);
  }

  async archiveManagedEvent(id: string, user: User) {
    await this.ensureCanManageParticipants(id, user);
    return this.archiveEvent(id, user.id);
  }

  private mapEvent(event: any) {
    const participantSummary = Array.isArray(event.participants) && event.participants.some((participant: any) => participant.user !== undefined)
      ? event.participants
      : null;
    const mapped = {
      ...event,
      price: Number(event.price),
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt?.toISOString() ?? null,
      latitude: event.latitude == null ? null : Number(event.latitude),
      longitude: event.longitude == null ? null : Number(event.longitude),
      attendeeCount: participantSummary
        ? participantSummary.filter((participant: any) => participant.status === "accepted" || participant.status === "attended").length
        : event._count?.participants ?? 0,
      invitedCount: participantSummary?.filter((participant: any) => participant.status === "invited").length ?? 0,
      followingAttendeeCount: participantSummary?.filter((participant: any) => participant.user?.followers?.length).length ?? 0,
      viewerParticipation: participantSummary ? null : event.participants?.[0] ?? null,
      tags: event.tags.map((eventTag: { tag: unknown }) => eventTag.tag),
      ticketTypes: Array.isArray(event.ticketTypeRecords)
        ? event.ticketTypeRecords.map((ticket: any) => ({
            name: ticket.name,
            ...(ticket.description ? { description: ticket.description } : {}),
            price: Number(ticket.price),
            currency: ticket.currency,
            salesPlatform: ticket.salesPlatform,
            ...(ticket.externalSalesUrl ? { externalSalesUrl: ticket.externalSalesUrl } : {}),
            capacity: ticket.capacity,
            ...(ticket.perUserLimit ? { perUserLimit: ticket.perUserLimit } : {}),
            ...(ticket.saleStartsAt ? { saleStartsAt: ticket.saleStartsAt.toISOString() } : {}),
            ...(ticket.saleEndsAt ? { saleEndsAt: ticket.saleEndsAt.toISOString() } : {}),
            ...(ticket.gateOpensAt ? { gateOpensAt: ticket.gateOpensAt.toISOString() } : {}),
            ...(ticket.gateClosesAt ? { gateClosesAt: ticket.gateClosesAt.toISOString() } : {}),
            status: ticket.status,
          }))
        : event.ticketTypes,
    };
    delete mapped.legacySlugs;
    delete mapped.participants;
    delete mapped._count;
    delete mapped.ticketTypeRecords;
    return mapped;
  }

  private hashCheckInToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private resolveSummary(
    input: Pick<CreateEventDto, "title" | "summary" | "description">,
  ) {
    const summary = input.summary?.trim();

    if (summary) {
      return summary;
    }

    const description = input.description.trim().replace(/\s+/g, " ");
    return description.length > 300
      ? `${description.slice(0, 297)}...`
      : description || input.title;
  }

  private resolveTimezone(city?: string | null, country?: string | null) {
    const location = `${city ?? ""} ${country ?? ""}`.toLowerCase();

    if (
      location.includes("istanbul") ||
      location.includes("turkey") ||
      location.includes("türkiye")
    ) {
      return "Europe/Istanbul";
    }

    return "UTC";
  }

  private async uniqueSlug(title: string, currentId?: string) {
    const base = toSlug(title) || "event";
    if (currentId) {
      const current = await this.prisma.event.findUnique({ where: { id: currentId }, select: { slug: true } });
      const publicCode = current?.slug.match(/-(\d{6,})$/)?.[1];
      if (publicCode) return `${base}-${publicCode}`;
    }
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const slug = `${base}-${randomInt(100000, 1000000)}`;
      const existing = await this.prisma.event.findFirst({ where: { slug, id: currentId ? { not: currentId } : undefined }, select: { id: true } });
      if (!existing) return slug;
    }
    return `${base}-${Date.now()}`;
  }

  private async getEventTagIds(eventId: string) {
    const eventTags = await this.prisma.eventTag.findMany({
      where: { eventId },
      select: { tagId: true },
    });

    return eventTags.map((eventTag) => eventTag.tagId);
  }

  private async refreshTagUsageCounts(tagIds: string[]) {
    const uniqueTagIds = [...new Set(tagIds)];

    await Promise.all(
      uniqueTagIds.map(async (tagId) => {
        const usageCount = await this.prisma.eventTag.count({
          where: {
            tagId,
            event: { status: { not: EventStatus.archived } },
          },
        });

        await this.prisma.tag.update({
          where: { id: tagId },
          data: { usageCount },
        });
      }),
    );
  }

  private async resolveInvitee(input: InviteParticipantDto) {
    if (input.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: input.userId },
      });

      if (!user) {
        throw new NotFoundException("Davet edilecek kullanıcı bulunamadı.");
      }

      return user;
    }

    if (input.username) {
      const username = input.username.trim().replace(/^@/, "").toLowerCase();
      const user = await this.prisma.user.findUnique({ where: { username } });
      if (!user)
        throw new NotFoundException("Davet edilecek kullanıcı adı bulunamadı.");
      return user;
    }

    if (input.phone) {
      const phone = input.phone.replace(/[\s()-]/g, "");
      const user = await this.prisma.user.findUnique({ where: { phone } });
      if (user) return user;
      const digest = createHash("sha256").update(phone).digest("hex").slice(0, 20);
      return this.prisma.user.create({
        data: {
          email: `phone-${digest}@invite.konnektora.local`,
          phone,
          name: input.name?.trim() || phone,
          passwordHash: await hash(randomUUID(), 10),
          role: "user",
          status: "invited",
        },
      });
    }

    if (input.name && !input.email) {
      const user = await this.prisma.user.findFirst({
        where: { name: { equals: input.name.trim(), mode: "insensitive" }, status: "active" },
        orderBy: { followerCount: "desc" },
      });
      if (!user)
        throw new NotFoundException("Bu ad soyad ile davet edilebilecek kullanıcı bulunamadı.");
      return user;
    }

    if (!input.email) {
      throw new BadRequestException(
        "Davet için kullanıcı adı, ad soyad, userId, telefon veya email gerekli.",
      );
    }

    const email = input.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      return existing;
    }

    return this.prisma.user.create({
      data: {
        email,
        name: input.name?.trim() || email.split("@")[0] || email,
        passwordHash: await hash(randomUUID(), 10),
        role: "user",
        status: "invited",
      },
    });
  }

  async listGuestLists(user: User) {
    await this.ensureCanUseGuestLists(user);
    return this.prisma.guestList.findMany({
      where: { ownerId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        members: {
          orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true, name: true, username: true, email: true, uploadedMedia: { where: { contentType: "user", status: "active", isProfilePicture: true }, select: { url: true }, take: 1 } } } },
        },
      },
    });
  }

  async createGuestList(name: string, user: User) {
    await this.ensureCanUseGuestLists(user);
    return this.prisma.guestList.create({ data: { ownerId: user.id, name: name.trim() }, include: { members: true } });
  }

  async renameGuestList(id: string, name: string, user: User) {
    await this.ensureCanUseGuestLists(user);
    await this.ensureOwnGuestList(id, user);
    return this.prisma.guestList.update({ where: { id }, data: { name: name.trim() } });
  }

  async deleteGuestList(id: string, user: User) {
    await this.ensureCanUseGuestLists(user);
    await this.ensureOwnGuestList(id, user);
    return this.prisma.guestList.delete({ where: { id } });
  }

  async addGuestListMember(id: string, memberId: string, user: User) {
    await this.ensureCanUseGuestLists(user);
    await this.ensureOwnGuestList(id, user);
    const member = await this.prisma.user.findFirst({ where: { id: memberId, status: "active" }, select: { id: true } });
    if (!member) throw new NotFoundException("Guest list'e eklenecek kullanıcı bulunamadı.");
    return this.prisma.guestListMember.upsert({
      where: { guestListId_userId: { guestListId: id, userId: memberId } },
      create: { guestListId: id, userId: memberId },
      update: {},
    });
  }

  async removeGuestListMember(id: string, memberId: string, user: User) {
    await this.ensureCanUseGuestLists(user);
    await this.ensureOwnGuestList(id, user);
    return this.prisma.guestListMember.deleteMany({ where: { guestListId: id, userId: memberId } });
  }

  private async ensureOwnGuestList(id: string, user: User) {
    const list = await this.prisma.guestList.findUnique({ where: { id }, select: { ownerId: true } });
    if (!list) throw new NotFoundException("Guest list bulunamadı.");
    if (list.ownerId !== user.id && !["admin", "super_admin"].includes(user.role)) throw new ForbiddenException("Bu guest list'i yönetme yetkiniz yok.");
  }

  private async ensureCanUseGuestLists(user: User) {
    if (canUseGuestListPlan(user)) return;
    const paidManagedEvent = await this.prisma.event.findFirst({
      where: {
        status: "published",
        OR: [
          { createdById: user.id },
          { participants: { some: { userId: user.id, status: "accepted", role: { in: ["organizer", "manager"] } } } },
        ],
        AND: [
          { OR: [{ endsAt: { gte: new Date() } }, { endsAt: null, startsAt: { gte: new Date() } }] },
          { OR: [{ price: { gt: 0 } }, { ticketTypeRecords: { some: { price: { gt: 0 }, status: "active" } } }] },
        ],
      },
      select: { id: true },
    });
    if (!paidManagedEvent) throw new ForbiddenException("Özel Guest List özelliği uygun işletme paketi veya devam eden ücretli bir etkinlik gerektirir.");
  }

  private async ensureCanManageParticipants(eventId: string, user: User, allowCurator = false) {
    if (!await this.canManageParticipants(eventId, user, allowCurator)) throw new ForbiddenException("Bu etkinliğin katılımcılarını yönetme yetkiniz yok.");
  }

  private async ensureEventCheckInOpen(eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { startsAt: true, endsAt: true } });
    if (!event) throw new NotFoundException("Etkinlik bulunamadı.");
    const cutoff = event.endsAt
      ? event.endsAt.getTime() + 12 * 60 * 60 * 1000
      : event.startsAt.getTime() + 24 * 60 * 60 * 1000;
    if (Date.now() > cutoff) throw new BadRequestException("Bitmiş bir etkinlik için check-in kontrolü yapamazsınız. Etkinlik Düzenle sayfasındaki etkinlik bitiş zamanını güncelleyerek tekrar deneyin.");
  }

  private async canManageParticipants(eventId: string, user: User, allowCurator = false) {
    if (["admin", "super_admin"].includes(user.role) || allowCurator && user.role === "curator") return true;
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { createdById: true } });
    if (!event) throw new NotFoundException("Etkinlik bulunamadı.");
    if (event.createdById === user.id) return true;
    const participant = await this.prisma.eventParticipant.findUnique({ where: { eventId_userId: { eventId, userId: user.id } }, select: { role: true, status: true } });
    return participant?.status === EventParticipantStatus.accepted && (participant.role === EventParticipantRole.organizer || participant.role === EventParticipantRole.manager);
  }
}

function ageBucket(birthDate: Date | null, now = new Date()) {
  if (!birthDate) return "belirtilmedi";
  let age = now.getFullYear() - birthDate.getFullYear();
  if (now.getMonth() < birthDate.getMonth() || now.getMonth() === birthDate.getMonth() && now.getDate() < birthDate.getDate()) age -= 1;
  if (age < 25) return "18_24";
  if (age < 35) return "25_34";
  if (age < 45) return "35_44";
  return "45_plus";
}

function distributionCount(values: string[], limit = 100) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort((left, right) => right[1] - left[1]).slice(0, limit));
}

function distributionSum(values: ReadonlyArray<readonly [string, number]>, limit = 100) {
  const totals = new Map<string, number>();
  for (const [key, value] of values) totals.set(key, (totals.get(key) ?? 0) + value);
  return Object.fromEntries([...totals.entries()].sort((left, right) => right[1] - left[1]).slice(0, limit));
}

function hourBucket(value: Date) {
  const hour = value.getHours();
  return hour < 6 ? "00_06" : hour < 12 ? "06_12" : hour < 18 ? "12_18" : "18_24";
}

function prefixMetrics(prefix: string, values: Record<string, number>) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [`${prefix}_${metricKey(key)}`, value]));
}

function metricKey(value: string) {
  return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "belirtilmedi";
}

function eventDistance(event: { latitude: unknown; longitude: unknown }, latitude: number, longitude: number) {
  if (event.latitude == null || event.longitude == null) return Number.POSITIVE_INFINITY;
  const toRadians = (value: number) => value * Math.PI / 180;
  const lat = Number(event.latitude);
  const lon = Number(event.longitude);
  const a = Math.sin(toRadians(lat - latitude) / 2) ** 2 + Math.cos(toRadians(latitude)) * Math.cos(toRadians(lat)) * Math.sin(toRadians(lon - longitude) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function eventNearScore(event: any, interestTagIds: Set<string>, latitude: number, longitude: number) {
  const distance = eventDistance(event, latitude, longitude);
  const proximity = Number.isFinite(distance) ? Math.max(0, 80 - distance) : 0;
  const commonInterests = (event.tags ?? []).filter((item: any) => interestTagIds.has(item.tagId ?? item.tag?.id)).length;
  const followedAttendees = (event.participants ?? []).filter((item: any) => item.status !== "invited" && item.user?.followers?.length).length;
  const attendeeCount = Number(event._count?.participants ?? 0);
  const hoursAway = Math.max(0, (new Date(event.startsAt).getTime() - Date.now()) / 3_600_000);
  const timing = Math.max(0, 18 - Math.min(hoursAway / 6, 18));
  return proximity + commonInterests * 24 + followedAttendees * 12 + Math.min(attendeeCount, 50) * 0.4 + timing;
}
