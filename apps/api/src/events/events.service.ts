import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { EventStatus, Prisma } from "@prisma/client";
import { toSlug } from "../common/slug";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEventDto, EventQueryDto } from "./events.dto";

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublicEvents(query: EventQueryDto) {
    const where: Prisma.EventWhereInput = {
      status: "published",
      startsAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24) }
    };

    if (query.language) {
      where.language = query.language;
    }

    if (query.format) {
      where.format = query.format;
    }

    if (query.tag) {
      where.tags = { some: { tag: { slug: query.tag, status: "active" } } };
    }

    return this.prisma.event.findMany({
      where,
      orderBy: { startsAt: "asc" },
      include: { tags: { include: { tag: true } } }
    }).then((events) => events.map(this.mapEvent));
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

  async createEvent(input: CreateEventDto, userId?: string) {
    const slug = toSlug(input.title);
    await this.ensureSlugAvailable(slug);

    const event = await this.prisma.event.create({
      data: {
        title: input.title,
        slug,
        summary: input.summary,
        description: input.description,
        status: input.status ?? "draft",
        startsAt: new Date(input.startsAt),
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        timezone: input.timezone,
        format: input.format,
        visibility: input.visibility ?? "open",
        locationName: input.locationName ?? null,
        locationAddress: input.locationAddress ?? null,
        city: input.city ?? null,
        country: input.country ?? null,
        language: input.language,
        organizerName: input.organizerName ?? null,
        externalRegistrationUrl: input.externalRegistrationUrl ?? null,
        coverImageUrl: input.coverImageUrl ?? null,
        capacity: input.capacity ?? null,
        createdBy: userId ? { connect: { id: userId } } : undefined,
        updatedBy: userId ? { connect: { id: userId } } : undefined,
        tags: {
          create: input.tagIds?.map((tagId) => ({ tagId })) ?? []
        }
      },
      include: { tags: { include: { tag: true } } }
    });

    await this.refreshTagUsageCounts(input.tagIds ?? []);

    return this.mapEvent(event);
  }

  async updateEvent(id: string, input: Partial<CreateEventDto>, userId?: string) {
    const previousTagIds = await this.getEventTagIds(id);
    const data: Prisma.EventUpdateInput = {
      title: input.title,
      summary: input.summary,
      description: input.description,
      status: input.status,
      startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
      endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
      timezone: input.timezone,
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
      capacity: input.capacity,
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

  private mapEvent(event: Prisma.EventGetPayload<{ include: { tags: { include: { tag: true } } } }>) {
    return {
      ...event,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt?.toISOString() ?? null,
      tags: event.tags.map((eventTag) => eventTag.tag)
    };
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
}
