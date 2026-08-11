import {
  BadRequestException,
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
import { PrismaService } from "../prisma/prisma.service";
import {
  CreatePlaceDto,
  InvitePlaceMemberDto,
  PlaceQueryDto,
  UpdatePlaceDto,
  UpdatePlaceMemberDto,
} from "./places.dto";
import { NotificationsService } from "../notifications/notifications.service";
import { IdentityService } from "../identity/identity.service";

const memberUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
} as const;

@Injectable()
export class PlacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly identity: IdentityService,
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
    const personalTagIds = query.scope === "for_you" && viewerId ? (await this.prisma.userInterestTag.findMany({ where: { userId: viewerId, sentiment: { in: ["like", "ok"] } }, select: { tagId: true }, take: 100 })).map((item) => item.tagId) : [];
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
      ? [...foundItems].sort((a, b) => placeDistance(a, query.latitude!, query.longitude!) - placeDistance(b, query.latitude!, query.longitude!)).slice((page - 1) * pageSize, page * pageSize)
      : foundItems;
    return {
      items: items.map((place) => this.toPublicPlace(place)),
      total,
      page,
      pageSize,
      hasNextPage: page * pageSize < total,
    };
  }

  async getBySlug(slug: string, viewerId?: string) {
    const identity = await this.prisma.place.findUnique({
      where: { slug },
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
      where: { slug, status: "active", OR: [{ visibility: { not: "invite_only" } }, ...(viewerId ? [{ members: { some: { userId: viewerId, status: { in: [PlaceMemberStatus.invited, PlaceMemberStatus.accepted] } } } } as Prisma.PlaceWhereInput] : [])] },
      include: this.viewerInclude(viewerId, true),
    });
    if (!place) throw new NotFoundException("Mekân bulunamadı.");
    const managers = await this.prisma.placeMember.findMany({
      where: { placeId: place.id, status: "accepted", role: { in: ["organizer", "manager"] } },
      orderBy: [{ role: "desc" }, { createdAt: "asc" }],
      select: { role: true, user: { select: { id: true, name: true, username: true, uploadedMedia: { where: { contentType: "user", status: "active", isProfilePicture: true }, select: { url: true }, take: 1 } } } },
    });
    return { ...this.toPublicPlace(place), managers: (managers ?? []).map((item) => ({ id: item.user.id, name: item.user.name, username: item.user.username, role: item.role, avatarUrl: item.user.uploadedMedia?.[0]?.url ?? null })) };
  }

  async getInteractionStats(placeId: string, actor?: User) {
    if (actor && !["admin", "super_admin", "curator"].includes(actor.role)) await this.ensureCanManage(placeId, actor);
    const place = await this.prisma.place.findUnique({
      where: { id: placeId },
      select: { id: true, followerCount: true, inviteCount: true },
    });
    if (!place) throw new NotFoundException("Mekân bulunamadı.");
    const [members, checkedIn, comments, reactions, views, events] = await Promise.all([
      this.prisma.placeMember.count({ where: { placeId, status: "accepted" } }),
      this.prisma.placeMember.count({ where: { placeId, checkedInAt: { not: null } } }),
      this.prisma.contentComment.count({
        where: { targetType: "place", targetId: placeId, status: "active" },
      }),
      this.prisma.contentReaction.count({
        where: { targetType: "place", targetId: placeId },
      }),
      this.prisma.contentView.count({
        where: { targetType: "place", targetId: placeId },
      }),
      this.prisma.event.count({ where: { placeId, status: "published" } }),
    ]);
    return {
      followers: place.followerCount,
      invites: place.inviteCount,
      members,
      checkedIn,
      comments,
      reactions,
      views,
      events,
      checkInRate: members > 0 ? Math.round(checkedIn / members * 100) : 0,
      engagementRate: views > 0 ? Math.round((comments + reactions) / views * 100) : 0,
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
            ? { create: input.tagIds.map((tagId) => ({ tagId })) }
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
    return places.map((place) => this.toPublicPlace(place));
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
          ? { deleteMany: {}, create: input.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
    });
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
    await this.ensureActive(placeId);
    const existing = await this.prisma.placeFollow.findUnique({
      where: { placeId_userId: { placeId, userId } },
    });
    if (!existing) {
      try {
        await this.prisma.$transaction([
          this.prisma.placeFollow.create({ data: { placeId, userId } }),
          this.prisma.place.update({
            where: { id: placeId },
            data: { followerCount: { increment: 1 } },
          }),
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
    return this.prisma.placeMember.findMany({
      where: { placeId },
      orderBy: [{ role: "desc" }, { createdAt: "asc" }],
      include: { user: { select: memberUserSelect } },
    });
  }

  async listRelatedUsers(placeId: string, actor?: User) {
    const place = await this.prisma.place.findFirst({
      where: { id: placeId, status: "active" },
      select: { id: true },
    });
    if (!place) throw new NotFoundException("Mekân bulunamadı.");
    const [members, viewerInterests] = await Promise.all([this.prisma.placeMember.findMany({
      where: { placeId, status: PlaceMemberStatus.accepted },
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
    return members.map((member) => ({
      id: member.user.id,
      name: member.user.name,
      username: member.user.username,
      city: actor?.id === member.user.id || member.user.privacySettings?.locationAudience === "everybody" ? member.user.city : null,
      country: actor?.id === member.user.id || member.user.privacySettings?.locationAudience === "everybody" ? member.user.country : null,
      gender: actor?.id === member.user.id || member.user.privacySettings?.demographicsAudience === "everybody" ? member.user.gender : null,
      birthDate: actor?.id === member.user.id || member.user.privacySettings?.demographicsAudience === "everybody" ? member.user.birthDate : null,
      profileVerifiedAt: member.user.profileVerifiedAt,
      commonTagCount: (member.user.interestTags ?? []).filter((item) => viewerTagIds.has(item.tagId)).length,
      relation: member.role,
      checkedIn: Boolean(member.checkedInAt),
    }));
  }

  async invite(placeId: string, input: InvitePlaceMemberDto, actor: User) {
    const place = await this.ensureCanManage(placeId, actor);
    if (!input.userId && !input.email && !input.username && !input.phone)
      throw new BadRequestException(
        "Kullanıcı adı, telefon veya e-posta belirtilmelidir.",
      );
    const user = await this.prisma.user.findFirst({
      where: input.userId
        ? { id: input.userId }
        : input.username
          ? { username: input.username.replace(/^@/, "").toLowerCase().trim() }
          : input.phone
            ? { phone: input.phone.replace(/[\s()-]/g, "") }
            : { email: input.email!.toLowerCase().trim() },
    });
    if (!user)
      throw new NotFoundException("Davet edilecek kullanıcı bulunamadı.");
    if (user.id === place.createdById)
      throw new BadRequestException("Mekân sahibi yeniden davet edilemez.");
    await this.ensureCanReceiveInvite(user.id, actor.id);
    const role = input.role ?? PlaceMemberRole.member;
    if (
      role === PlaceMemberRole.organizer &&
      actor.role === "user" &&
      place.createdById !== actor.id
    ) {
      throw new ForbiddenException(
        "Organizatör rolünü yalnız mekân sahibi verebilir.",
      );
    }
    const existing = await this.prisma.placeMember.findUnique({
      where: { placeId_userId: { placeId, userId: user.id } },
    });
    if (existing?.status === PlaceMemberStatus.accepted)
      throw new BadRequestException(
        "Kullanıcı zaten bu mekânın aktif üyesidir.",
      );
    const member = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.placeMember.upsert({
        where: { placeId_userId: { placeId, userId: user.id } },
        create: { placeId, userId: user.id, status: "invited", role },
        update: { status: "invited", role },
      });
      if (!existing)
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
    return { ...member, user: this.pickUser(user) };
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
    if (input.role && actor.role === "user" && place.createdById !== actor.id) {
      throw new ForbiddenException(
        "Üye rollerini yalnız mekân sahibi değiştirebilir.",
      );
    }
    const actorMembership = place.members[0];
    if (
      actor.role === "user" &&
      actorMembership?.role === PlaceMemberRole.manager &&
      member.role !== PlaceMemberRole.member
    ) {
      throw new ForbiddenException(
        "Yöneticiler diğer yönetici veya organizatörleri değiştiremez.",
      );
    }
    return this.prisma.placeMember.update({
      where: { placeId_userId: { placeId, userId } },
      data: { status: input.status, role: input.role },
      include: { user: { select: memberUserSelect } },
    });
  }

  async checkInMember(placeId: string, userId: string, actor: User) {
    await this.ensureCanManage(placeId, actor);
    const member = await this.prisma.placeMember.findUnique({
      where: { placeId_userId: { placeId, userId } },
    });
    if (!member || member.status !== PlaceMemberStatus.accepted)
      throw new NotFoundException("Check-in için uygun üye bulunamadı.");
    return this.prisma.placeMember.update({
      where: { placeId_userId: { placeId, userId } },
      data: { checkedInAt: new Date() },
      include: { user: { select: memberUserSelect } },
    });
  }

  async checkInMemberPass(placeId: string, payload: string, actor: User) {
    const memberId = await this.identity.resolveMemberPass(payload);
    return this.checkInMember(placeId, memberId, actor);
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
    return this.prisma.placeMember.update({
      where: { placeId_userId: { placeId, userId } },
      data: { status },
    });
  }

  private async ensureActive(id: string) {
    const place = await this.prisma.place.findFirst({
      where: { id, status: "active" },
      select: { id: true },
    });
    if (!place) throw new NotFoundException("Mekân bulunamadı.");
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
        where: { userId: viewerId ?? "" },
        select: { status: true, role: true },
      },
      tags: { include: { tag: true } },
      _count: {
        select: {
          followers: viewerId
            ? { where: { user: { followers: { some: { followerId: viewerId } } } } }
            : true,
        },
      },
      ...(includeEvents ? { events: { where: { status: EventStatus.published, startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" as const }, take: 6, include: { tags: { include: { tag: true } }, participants: { where: { status: { in: [EventParticipantStatus.accepted, EventParticipantStatus.attended] } }, select: { id: true } } } } } : {}),
    } as const;
  }

  private toPublicPlace(place: any) {
    const { followers, members, tags, events, _count, ...data } = place;
    delete data.updatedById;
    return {
      ...data,
      tags: (tags ?? []).map((item: any) => item.tag),
      events: events?.map((event: any) => ({ ...event, tags: (event.tags ?? []).map((item: any) => item.tag), attendeeCount: event.participants?.length ?? 0, participants: undefined, latitude: event.latitude == null ? null : Number(event.latitude), longitude: event.longitude == null ? null : Number(event.longitude), price: Number(event.price) })),
      latitude: data.latitude == null ? null : Number(data.latitude),
      longitude: data.longitude == null ? null : Number(data.longitude),
      isFollowing: followers.length > 0,
      followingMemberCount: viewerIdSafeCount(_count?.followers),
      viewerMembership: members[0] ?? null,
    };
  }

  private async uniqueSlug(name: string, currentId?: string) {
    const base = toSlug(name) || "place";
    let slug = base;
    let suffix = 2;
    while (
      await this.prisma.place.findFirst({
        where: { slug, id: currentId ? { not: currentId } : undefined },
        select: { id: true },
      })
    ) {
      slug = `${base}-${suffix++}`;
    }
    return slug;
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
