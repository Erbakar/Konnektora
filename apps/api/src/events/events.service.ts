import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { EventParticipantRole, EventParticipantStatus, EventStatus, Prisma, User } from "@prisma/client";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { toSlug } from "../common/slug";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEventDto, EventQueryDto, InviteParticipantDto } from "./events.dto";

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService
  ) {}

  async listPublicEvents(query: EventQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 24;
    const where: Prisma.EventWhereInput = {
      status: "published",
      startsAt: {
        gte: query.dateFrom ? new Date(query.dateFrom) : new Date(Date.now() - 1000 * 60 * 60 * 24)
      }
    };

    if (query.dateTo) {
      where.startsAt = {
        ...(typeof where.startsAt === "object" ? where.startsAt : {}),
        lte: new Date(query.dateTo)
      };
    }

    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: "insensitive" } },
        { summary: { contains: query.q, mode: "insensitive" } },
        { description: { contains: query.q, mode: "insensitive" } },
        { organizerName: { contains: query.q, mode: "insensitive" } }
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

    const [total, events] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.findMany({
        where,
        orderBy: { startsAt: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { tags: { include: { tag: true } } }
      })
    ]);

    return {
      items: events.map(this.mapEvent),
      total,
      page,
      pageSize,
      hasNextPage: page * pageSize < total
    };
  }

  async getPublicEvent(slug: string) {
    const event = await this.prisma.event.findFirst({
      where: { slug, status: "published" },
      include: { tags: { include: { tag: true } } }
    });

    if (!event) {
      throw new NotFoundException("Etkinlik bulunamadı.");
    }

    return this.mapEvent(event);
  }

  async listAdminEvents() {
    const events = await this.prisma.event.findMany({
      orderBy: { startsAt: "desc" },
      include: { tags: { include: { tag: true } } }
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
                role: { in: [EventParticipantRole.organizer, EventParticipantRole.manager] }
              }
            }
          }
        ]
      },
      orderBy: { startsAt: "desc" },
      include: { tags: { include: { tag: true } } }
    });

    return events.map(this.mapEvent);
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
        timezone: input.timezone ?? this.resolveTimezone(input.city, input.country),
        format: input.format,
        visibility: input.visibility ?? "open",
        locationName: input.locationName ?? null,
        locationAddress: input.locationAddress ?? null,
        city: input.city ?? null,
        country: input.country ?? null,
        language: input.language ?? "en",
        organizerName: input.organizerName ?? null,
        externalRegistrationUrl: input.externalRegistrationUrl ?? null,
        coverImageUrl: input.coverImageUrl ?? null,
        capacity: null,
        createdBy: userId ? { connect: { id: userId } } : undefined,
        updatedBy: userId ? { connect: { id: userId } } : undefined,
        tags: {
          create: input.tagIds?.map((tagId) => ({ tagId })) ?? []
        },
        participants: userId
          ? {
              create: {
                userId,
                role: EventParticipantRole.organizer,
                status: EventParticipantStatus.accepted
              }
            }
          : undefined
      },
      include: { tags: { include: { tag: true } } }
    });

    await this.refreshTagUsageCounts(input.tagIds ?? []);

    return this.mapEvent(event);
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
            status: true
          }
        }
      }
    });
  }

  async requestAttendance(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });

    if (!event || event.status !== EventStatus.published) {
      throw new NotFoundException("Etkinlik bulunamadı.");
    }

    const status =
      event.visibility === "open" ? EventParticipantStatus.accepted : EventParticipantStatus.requested;

    return this.prisma.eventParticipant.upsert({
      where: { eventId_userId: { eventId, userId } },
      update: { status },
      create: {
        eventId,
        userId,
        status,
        role: EventParticipantRole.attendee
      }
    });
  }

  async inviteParticipant(eventId: string, input: InviteParticipantDto, actor: User) {
    await this.ensureCanManageParticipants(eventId, actor);
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, slug: true }
    });

    if (!event) {
      throw new NotFoundException("Etkinlik bulunamadı.");
    }

    const invitee = await this.resolveInvitee(input);

    const participant = await this.prisma.eventParticipant.upsert({
      where: { eventId_userId: { eventId, userId: invitee.id } },
      update: {
        status: EventParticipantStatus.invited,
        role: input.role ?? EventParticipantRole.attendee
      },
      create: {
        eventId,
        userId: invitee.id,
        status: EventParticipantStatus.invited,
        role: input.role ?? EventParticipantRole.attendee
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true
          }
        }
      }
    });

    await this.mailService.sendEventInviteEmail({
      to: invitee.email,
      name: invitee.name,
      eventTitle: event.title,
      eventSlug: event.slug,
      invitedByName: actor.name
    });

    return participant;
  }

  async updateParticipantStatus(eventId: string, userId: string, status: EventParticipantStatus, actor: User) {
    await this.ensureCanManageParticipants(eventId, actor);

    const participant = await this.prisma.eventParticipant.findUnique({
      where: { eventId_userId: { eventId, userId } }
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
            status: true
          }
        }
      }
    });
  }

  async checkInParticipant(eventId: string, userId: string, actor: User) {
    await this.ensureCanManageParticipants(eventId, actor);

    const participant = await this.prisma.eventParticipant.findUnique({
      where: { eventId_userId: { eventId, userId } }
    });

    if (
      !participant ||
      (participant.status !== EventParticipantStatus.accepted && participant.status !== EventParticipantStatus.invited)
    ) {
      throw new NotFoundException("Check-in için uygun katılımcı bulunamadı.");
    }

    return this.prisma.eventParticipant.update({
      where: { eventId_userId: { eventId, userId } },
      data: {
        status: EventParticipantStatus.attended,
        checkedInAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true
          }
        }
      }
    });
  }

  async updateEvent(id: string, input: Partial<CreateEventDto>, userId?: string) {
    const previousTagIds = await this.getEventTagIds(id);
    const data: Prisma.EventUpdateInput = {
      title: input.title,
      summary: input.summary ? this.resolveSummary(input as CreateEventDto) : undefined,
      description: input.description,
      status: input.status,
      startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
      endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
      timezone: input.timezone ?? (input.city !== undefined || input.country !== undefined ? this.resolveTimezone(input.city, input.country) : undefined),
      format: input.format,
      visibility: input.visibility,
      locationName: input.locationName,
      locationAddress: input.locationAddress,
      city: input.city,
      country: input.country,
      language: input.language,
      organizerName: input.organizerName,
      externalRegistrationUrl: input.externalRegistrationUrl,
      coverImageUrl: input.coverImageUrl,
      capacity: undefined,
      updatedBy: userId ? { connect: { id: userId } } : undefined
    };

    if (input.title) {
      const slug = toSlug(input.title);
      await this.ensureSlugAvailable(slug, id);
      data.slug = slug;
    }

    if (input.tagIds) {
      data.tags = {
        deleteMany: {},
        create: input.tagIds.map((tagId) => ({ tagId }))
      };
    }

    const event = await this.prisma.event.update({
      where: { id },
      data,
      include: { tags: { include: { tag: true } } }
    });

    await this.refreshTagUsageCounts([...previousTagIds, ...(input.tagIds ?? [])]);

    return this.mapEvent(event);
  }

  async updateManagedEvent(id: string, input: Partial<CreateEventDto>, user: User) {
    await this.ensureCanManageParticipants(id, user);
    return this.updateEvent(id, input, user.id);
  }

  async archiveEvent(id: string, userId?: string) {
    const tagIds = await this.getEventTagIds(id);
    const event = await this.prisma.event.update({
      where: { id },
      data: {
        status: EventStatus.archived,
        updatedBy: userId ? { connect: { id: userId } } : undefined
      },
      include: { tags: { include: { tag: true } } }
    });

    await this.refreshTagUsageCounts(tagIds);

    return this.mapEvent(event);
  }

  async archiveManagedEvent(id: string, user: User) {
    await this.ensureCanManageParticipants(id, user);
    return this.archiveEvent(id, user.id);
  }

  private mapEvent(event: Prisma.EventGetPayload<{ include: { tags: { include: { tag: true } } } }>) {
    return {
      ...event,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt?.toISOString() ?? null,
      tags: event.tags.map((eventTag) => eventTag.tag)
    };
  }

  private resolveSummary(input: Pick<CreateEventDto, "title" | "summary" | "description">) {
    const summary = input.summary?.trim();

    if (summary) {
      return summary;
    }

    const description = input.description.trim().replace(/\s+/g, " ");
    return description.length > 300 ? `${description.slice(0, 297)}...` : description || input.title;
  }

  private resolveTimezone(city?: string | null, country?: string | null) {
    const location = `${city ?? ""} ${country ?? ""}`.toLowerCase();

    if (location.includes("istanbul") || location.includes("turkey") || location.includes("türkiye")) {
      return "Europe/Istanbul";
    }

    return "UTC";
  }

  private async ensureSlugAvailable(slug: string, currentId?: string) {
    const existing = await this.prisma.event.findUnique({ where: { slug } });

    if (existing && existing.id !== currentId) {
      throw new ConflictException("Bu etkinlik başlığı için slug zaten kullanılıyor.");
    }
  }

  private async getEventTagIds(eventId: string) {
    const eventTags = await this.prisma.eventTag.findMany({
      where: { eventId },
      select: { tagId: true }
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
            event: { status: { not: EventStatus.archived } }
          }
        });

        await this.prisma.tag.update({ where: { id: tagId }, data: { usageCount } });
      })
    );
  }

  private async resolveInvitee(input: InviteParticipantDto) {
    if (input.userId) {
      const user = await this.prisma.user.findUnique({ where: { id: input.userId } });

      if (!user) {
        throw new NotFoundException("Davet edilecek kullanıcı bulunamadı.");
      }

      return user;
    }

    if (!input.email) {
      throw new BadRequestException("Davet için userId veya email gerekli.");
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
        status: "invited"
      }
    });
  }

  private async ensureCanManageParticipants(eventId: string, user: User) {
    if (["admin", "super_admin"].includes(user.role)) {
      return;
    }

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { createdById: true }
    });

    if (!event) {
      throw new NotFoundException("Etkinlik bulunamadı.");
    }

    if (event.createdById === user.id) {
      return;
    }

    const participant = await this.prisma.eventParticipant.findUnique({
      where: { eventId_userId: { eventId, userId: user.id } },
      select: { role: true, status: true }
    });

    if (
      participant?.status === EventParticipantStatus.accepted &&
      (participant.role === EventParticipantRole.organizer || participant.role === EventParticipantRole.manager)
    ) {
      return;
    }

    throw new ForbiddenException("Bu etkinliğin katılımcılarını yönetme yetkiniz yok.");
  }
}
