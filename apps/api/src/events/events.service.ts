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
  OwnedTicketStatus,
  PaymentStatus,
  Prisma,
  TicketOrderStatus,
  User,
} from "@prisma/client";
import { hash } from "bcryptjs";
import { createHash, randomBytes, randomUUID } from "crypto";
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
      where.participants = {
        some: {
          userId: userId ?? "",
          status: { in: ["invited", "accepted", "attended"] },
        },
      };
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
    const slug = toSlug(input.title);
    await this.ensureSlugAvailable(slug);

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
                price: ticket.price,
                currency: ticket.currency,
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
      city: actor?.id === participant.user.id || participant.user.privacySettings?.locationAudience === "everybody" ? participant.user.city : null,
      country: actor?.id === participant.user.id || participant.user.privacySettings?.locationAudience === "everybody" ? participant.user.country : null,
      gender: actor?.id === participant.user.id || participant.user.privacySettings?.demographicsAudience === "everybody" ? participant.user.gender : null,
      birthDate: actor?.id === participant.user.id || participant.user.privacySettings?.demographicsAudience === "everybody" ? participant.user.birthDate : null,
      profileVerifiedAt: participant.user.profileVerifiedAt,
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
    await this.ensureCanManageParticipants(eventId, actor);
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
    await this.ensureCanManageParticipants(eventId, actor);
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
        role: input.role ?? EventParticipantRole.attendee,
      },
      create: {
        eventId,
        userId: invitee.id,
        status: EventParticipantStatus.invited,
        role: input.role ?? EventParticipantRole.attendee,
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
      const slug = toSlug(input.title);
      await this.ensureSlugAvailable(slug, id);
      data.slug = slug;
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

    await this.refreshTagUsageCounts([
      ...previousTagIds,
      ...(input.tagIds ?? []),
    ]);

    return this.mapEvent(event);
  }

  async updateManagedEvent(
    id: string,
    input: Partial<CreateEventDto>,
    user: User,
  ) {
    await this.ensureCanManageParticipants(id, user);
    return this.updateEvent(id, input, user.id);
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

  private async ensureSlugAvailable(slug: string, currentId?: string) {
    const existing = await this.prisma.event.findUnique({ where: { slug } });

    if (existing && existing.id !== currentId) {
      throw new ConflictException(
        "Bu etkinlik başlığı için slug zaten kullanılıyor.",
      );
    }
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

    if (!input.email) {
      throw new BadRequestException(
        "Davet için kullanıcı adı, userId, telefon veya email gerekli.",
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

  private async ensureCanManageParticipants(eventId: string, user: User, allowCurator = false) {
    if (["admin", "super_admin"].includes(user.role) || allowCurator && user.role === "curator") {
      return;
    }

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { createdById: true },
    });

    if (!event) {
      throw new NotFoundException("Etkinlik bulunamadı.");
    }

    if (event.createdById === user.id) {
      return;
    }

    const participant = await this.prisma.eventParticipant.findUnique({
      where: { eventId_userId: { eventId, userId: user.id } },
      select: { role: true, status: true },
    });

    if (
      participant?.status === EventParticipantStatus.accepted &&
      (participant.role === EventParticipantRole.organizer ||
        participant.role === EventParticipantRole.manager)
    ) {
      return;
    }

    throw new ForbiddenException(
      "Bu etkinliğin katılımcılarını yönetme yetkiniz yok.",
    );
  }
}
