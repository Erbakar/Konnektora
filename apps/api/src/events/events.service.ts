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
  Prisma,
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
      startsAt: {
        gte: query.dateFrom
          ? new Date(query.dateFrom)
          : new Date(Date.now() - 1000 * 60 * 60 * 24),
      },
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

  async getInteractionStats(eventId: string) {
    const exists = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException("Etkinlik bulunamadı.");
    const [participants, comments, reactions, views] = await Promise.all([
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
    ]);
    const count = (status: string) =>
      participants.find((item) => item.status === status)?._count._all ?? 0;
    return {
      accepted: count("accepted"),
      attended: count("attended"),
      requested: count("requested"),
      invited: count("invited"),
      comments,
      reactions,
      views,
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

  async listRelatedUsers(eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, status: "published" },
      select: { id: true },
    });
    if (!event) throw new NotFoundException("Etkinlik bulunamadı.");
    const participants = await this.prisma.eventParticipant.findMany({
      where: {
        eventId,
        status: {
          in: [
            EventParticipantStatus.accepted,
            EventParticipantStatus.attended,
          ],
        },
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
            profileVerifiedAt: true,
          },
        },
      },
    });
    return participants.map((participant) => ({
      ...participant.user,
      relation: participant.role,
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
    const event = await this.prisma.event.update({
      where: { id },
      data: {
        status: EventStatus.archived,
        updatedBy: userId ? { connect: { id: userId } } : undefined,
      },
      include: { tags: { include: { tag: true } } },
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

    if (!input.email) {
      throw new BadRequestException(
        "Davet için kullanıcı adı, userId veya email gerekli.",
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

  private async ensureCanManageParticipants(eventId: string, user: User) {
    if (["admin", "super_admin"].includes(user.role)) {
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
