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
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateEventDto,
  EventQueryDto,
  InviteParticipantDto,
} from "./events.dto";

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly authService: AuthService,
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
      where.OR = [
        { title: { contains: query.q, mode: "insensitive" } },
        { summary: { contains: query.q, mode: "insensitive" } },
        { description: { contains: query.q, mode: "insensitive" } },
        { organizerName: { contains: query.q, mode: "insensitive" } },
      ];
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
      where.OR = [
        { createdById: userId ?? "" },
        { participants: { some: { userId: userId ?? "", status: { in: ["accepted", "attended"] } } } },
        { ticketOrders: { some: { buyerId: userId ?? "", status: "paid" } } },
      ];
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

    const orderBy: Prisma.EventOrderByWithRelationInput[] =
      query.scope === "popular"
        ? [{ participants: { _count: "desc" } }, { startsAt: "asc" }]
        : [{ startsAt: "asc" }];

    const [total, events] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          tags: { include: { tag: true } },
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

    return {
      items: events.map(this.mapEvent),
      total,
      page,
      pageSize,
      hasNextPage: page * pageSize < total,
    };
  }

  async getPublicEvent(slug: string, userId?: string) {
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
        slug,
        status: "published",
        NOT: [
          { id: { in: blocked("event") } },
          { createdById: { in: blocked("user") } },
          { tags: { some: { tagId: { in: blocked("tag") } } } },
        ],
      },
      include: {
        tags: { include: { tag: true } },
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
      include: { tags: { include: { tag: true } } },
    });

    return events.map(this.mapEvent);
  }

  async listManagedEvents(user: User) {
    const events = await this.prisma.event.findMany({
      where: {
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
      include: { tags: { include: { tag: true } } },
    });

    return events.map(this.mapEvent);
  }

  async getInteractionStats(eventId: string, actor?: User) {
    if (actor) await this.ensureCanManageParticipants(eventId, actor, true);
    const exists = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException("Etkinlik bulunamadı.");
    const [participants, comments, reactions, views, ticketOrders, refunds] = await Promise.all([
      this.prisma.eventParticipant.groupBy({
        by: ["status"],
        where: { eventId },
        _count: { _all: true },
      }),
      this.prisma.contentComment.count({
        where: { targetType: "event", targetId: eventId, status: "active" },
      }),
      this.prisma.contentReaction.count({
        where: { targetType: "event", targetId: eventId },
      }),
      this.prisma.contentView.count({
        where: { targetType: "event", targetId: eventId },
      }),
      this.prisma.eventTicketOrder.aggregate({
        where: { eventId, status: "paid" },
        _sum: { quantity: true, totalAmount: true },
        _count: { _all: true },
      }),
      this.prisma.ticketRefund.count({ where: { eventId } }),
    ]);
    const count = (status: string) =>
      participants.find((item) => item.status === status)?._count._all ?? 0;
    const accepted = count("accepted");
    const attended = count("attended");
    const requested = count("requested");
    const invited = count("invited");
    return {
      accepted,
      attended,
      requested,
      invited,
      comments,
      reactions,
      views,
      ticketsSold: ticketOrders._sum.quantity ?? 0,
      ticketOrders: ticketOrders._count._all,
      ticketRevenue: Number(ticketOrders._sum.totalAmount ?? 0),
      refunds,
      rsvpRate: invited + requested > 0 ? Math.round((accepted + attended) / (invited + requested + accepted + attended) * 100) : 0,
      attendanceRate: accepted + attended > 0 ? Math.round(attended / (accepted + attended) * 100) : 0,
      engagementRate: views > 0 ? Math.round((comments + reactions) / views * 100) : 0,
    };
  }

  async createEvent(input: CreateEventDto, userId?: string) {
    await this.validateTicketPlatforms(input.ticketTypes, userId);
    const slug = await this.uniqueSlug(input.title);

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
          create: input.tagIds?.map((tagId) => ({ tagId })) ?? [],
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
      include: { tags: { include: { tag: true } } },
    });

    await this.refreshTagUsageCounts(input.tagIds ?? []);

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
      include: { event: { include: { tags: { include: { tag: true } } } } },
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

    return this.prisma.eventParticipant.findMany({
      where: { eventId },
      orderBy: [{ role: "desc" }, { status: "asc" }, { createdAt: "asc" }],
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
    const canSeeInvites = Boolean(actor && (["admin", "super_admin", "curator"].includes(actor.role) || event.createdById === actor.id || viewerParticipant?.status === "accepted" && ["organizer", "manager"].includes(viewerParticipant.role)));
    const [participants, viewerInterests] = await Promise.all([this.prisma.eventParticipant.findMany({
      where: {
        eventId,
        status: { in: canSeeInvites ? [EventParticipantStatus.accepted, EventParticipantStatus.attended, EventParticipantStatus.invited, EventParticipantStatus.requested] : [EventParticipantStatus.accepted, EventParticipantStatus.attended] },
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
    return this.prisma.eventParticipant.update({
      where: { id: participant.id },
      data: {
        status: EventParticipantStatus.attended,
        checkedInAt: new Date(),
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
      select: { id: true, title: true, slug: true },
    });

    if (!event) {
      throw new NotFoundException("Etkinlik bulunamadı.");
    }

    const invitee = await this.resolveInvitee(input);

    const participant = await this.prisma.eventParticipant.upsert({
      where: { eventId_userId: { eventId, userId: invitee.id } },
      update: {
        status: EventParticipantStatus.invited,
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

    await this.mailService.sendEventInviteEmail({
      to: invitee.email,
      name: invitee.name,
      eventTitle: event.title,
      eventSlug: event.slug,
      invitedByName: actor.name,
      acceptToken,
    });

    return participant;
  }

  async updateParticipantStatus(
    eventId: string,
    userId: string,
    status: EventParticipantStatus,
    actor: User,
  ) {
    await this.ensureCanManageParticipants(eventId, actor);

    const participant = await this.prisma.eventParticipant.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (!participant) {
      throw new NotFoundException("Katılımcı bulunamadı.");
    }

    return this.prisma.eventParticipant.update({
      where: { eventId_userId: { eventId, userId } },
      data: { status },
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

  async checkInParticipant(eventId: string, userId: string, actor: User) {
    await this.ensureCanManageParticipants(eventId, actor);

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

    return this.prisma.eventParticipant.update({
      where: { eventId_userId: { eventId, userId } },
      data: {
        status: EventParticipantStatus.attended,
        checkedInAt: new Date(),
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
      data.slug = await this.uniqueSlug(input.title, id);
    }

    if (input.tagIds) {
      data.tags = {
        deleteMany: {},
        create: input.tagIds.map((tagId) => ({ tagId })),
      };
    }

    const event = await this.prisma.event.update({
      where: { id },
      data,
      include: { tags: { include: { tag: true } } },
    });

    if (input.ticketTypes) await this.syncTicketTypes(id, input.ticketTypes);

    await this.refreshTagUsageCounts([
      ...previousTagIds,
      ...(input.tagIds ?? []),
    ]);

    return this.mapEvent(event);
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
      return tx.event.update({ where: { id }, data: { status: EventStatus.archived, updatedBy: userId ? { connect: { id: userId } } : undefined }, include: { tags: { include: { tag: true } } } });
    });

    await this.refreshTagUsageCounts(tagIds);

    return this.mapEvent(event);
  }

  async archiveManagedEvent(id: string, user: User) {
    await this.ensureCanManageParticipants(id, user);
    return this.archiveEvent(id, user.id);
  }

  private mapEvent(event: any) {
    return {
      ...event,
      price: Number(event.price),
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt?.toISOString() ?? null,
      latitude: event.latitude == null ? null : Number(event.latitude),
      longitude: event.longitude == null ? null : Number(event.longitude),
      attendeeCount: event._count?.participants ?? 0,
      viewerParticipation: event.participants?.[0] ?? null,
      tags: event.tags.map((eventTag: { tag: unknown }) => eventTag.tag),
    };
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
      if (!user)
        throw new NotFoundException(
          "Bu telefon numarasıyla bulunabilir bir Konnektora üyesi yok. Üyelik daveti için rehber davetini kullanın.",
        );
      return user;
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

  createGuestList(name: string, user: User) {
    return this.prisma.guestList.create({ data: { ownerId: user.id, name: name.trim() }, include: { members: true } });
  }

  async renameGuestList(id: string, name: string, user: User) {
    await this.ensureOwnGuestList(id, user);
    return this.prisma.guestList.update({ where: { id }, data: { name: name.trim() } });
  }

  async deleteGuestList(id: string, user: User) {
    await this.ensureOwnGuestList(id, user);
    return this.prisma.guestList.delete({ where: { id } });
  }

  async addGuestListMember(id: string, memberId: string, user: User) {
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
    await this.ensureOwnGuestList(id, user);
    return this.prisma.guestListMember.deleteMany({ where: { guestListId: id, userId: memberId } });
  }

  private async ensureOwnGuestList(id: string, user: User) {
    const list = await this.prisma.guestList.findUnique({ where: { id }, select: { ownerId: true } });
    if (!list) throw new NotFoundException("Guest list bulunamadı.");
    if (list.ownerId !== user.id && !["admin", "super_admin"].includes(user.role)) throw new ForbiddenException("Bu guest list'i yönetme yetkiniz yok.");
  }

  private async ensureCanManageParticipants(eventId: string, user: User, allowCurator = false) {
    if (!await this.canManageParticipants(eventId, user, allowCurator)) throw new ForbiddenException("Bu etkinliğin katılımcılarını yönetme yetkiniz yok.");
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
