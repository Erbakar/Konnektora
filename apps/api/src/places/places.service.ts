import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PlaceMemberRole, PlaceMemberStatus, Prisma, User } from "@prisma/client";
import { toSlug } from "../common/slug";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePlaceDto, InvitePlaceMemberDto, PlaceQueryDto, UpdatePlaceDto, UpdatePlaceMemberDto } from "./places.dto";

const memberUserSelect = { id: true, email: true, name: true, role: true, status: true } as const;

@Injectable()
export class PlacesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PlaceQueryDto, viewerId?: string) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;
    const blocked = viewerId
      ? await this.prisma.userBlock.findMany({ where: { userId: viewerId, targetType: "place" }, select: { targetId: true } })
      : [];
    const where: Prisma.PlaceWhereInput = {
      status: "active",
      id: { notIn: blocked.map((item) => item.targetId) },
      ...(query.q
        ? { OR: ["name", "description", "address"].map((field) => ({ [field]: { contains: query.q, mode: "insensitive" as const } })) }
        : {}),
      ...(query.city ? { city: { equals: query.city, mode: "insensitive" } } : {}),
      ...(query.country ? { country: { equals: query.country, mode: "insensitive" } } : {})
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.place.findMany({
        where,
        orderBy: [{ followerCount: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: this.viewerInclude(viewerId)
      }),
      this.prisma.place.count({ where })
    ]);
    return { items: items.map((place) => this.toPublicPlace(place)), total, page, pageSize, hasNextPage: page * pageSize < total };
  }

  async getBySlug(slug: string, viewerId?: string) {
    const identity = await this.prisma.place.findUnique({ where: { slug }, select: { id: true } });
    const blocked = viewerId && identity
      ? await this.prisma.userBlock.findUnique({ where: { userId_targetType_targetId: { userId: viewerId, targetType: "place", targetId: identity.id } } })
      : null;
    if (blocked) throw new NotFoundException("Mekân bulunamadı.");
    const place = await this.prisma.place.findFirst({ where: { slug, status: "active" }, include: this.viewerInclude(viewerId) });
    if (!place) throw new NotFoundException("Mekân bulunamadı.");
    return this.toPublicPlace(place);
  }

  async create(input: CreatePlaceDto, actor: User) {
    const slug = await this.uniqueSlug(input.name);
    const place = await this.prisma.$transaction(async (tx) => {
      const created = await tx.place.create({
        data: {
          name: input.name.trim(),
          slug,
          description: input.description?.trim() || null,
          country: input.country?.trim() || null,
          city: input.city?.trim() || null,
          address: input.address?.trim() || null,
          coverImageUrl: input.coverImageUrl?.trim() || null,
          createdById: actor.id,
          updatedById: actor.id
        }
      });
      await tx.placeMember.create({ data: { placeId: created.id, userId: actor.id, status: "accepted", role: "organizer" } });
      return created;
    });
    return this.getBySlug(place.slug, actor.id);
  }

  async listManaged(actor: User) {
    const places = await this.prisma.place.findMany({
      where: actor.role === "user"
        ? { OR: [{ createdById: actor.id }, { members: { some: { userId: actor.id, status: "accepted", role: { in: ["manager", "organizer"] } } } }] }
        : {},
      orderBy: { updatedAt: "desc" },
      include: this.viewerInclude(actor.id)
    });
    return places.map((place) => this.toPublicPlace(place));
  }

  async update(id: string, input: UpdatePlaceDto, actor: User) {
    const current = await this.ensureCanManage(id, actor);
    const slug = input.name && input.name.trim() !== current.name ? await this.uniqueSlug(input.name, id) : undefined;
    const updated = await this.prisma.place.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        slug,
        description: this.optionalText(input.description),
        country: this.optionalText(input.country),
        city: this.optionalText(input.city),
        address: this.optionalText(input.address),
        coverImageUrl: this.optionalText(input.coverImageUrl),
        updatedById: actor.id
      }
    });
    return this.getBySlug(updated.slug, actor.id);
  }

  async archive(id: string, actor: User) {
    const place = await this.prisma.place.findUnique({ where: { id } });
    if (!place) throw new NotFoundException("Mekân bulunamadı.");
    if (actor.role === "user" && place.createdById !== actor.id) throw new ForbiddenException("Mekânı yalnız sahibi arşivleyebilir.");
    return this.prisma.place.update({ where: { id }, data: { status: "archived", updatedById: actor.id } });
  }

  async follow(placeId: string, userId: string) {
    await this.ensureActive(placeId);
    const existing = await this.prisma.placeFollow.findUnique({ where: { placeId_userId: { placeId, userId } } });
    if (!existing) {
      try {
        await this.prisma.$transaction([
          this.prisma.placeFollow.create({ data: { placeId, userId } }),
          this.prisma.place.update({ where: { id: placeId }, data: { followerCount: { increment: 1 } } })
        ]);
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
      }
    }
    return { following: true };
  }

  async unfollow(placeId: string, userId: string) {
    const existing = await this.prisma.placeFollow.findUnique({ where: { placeId_userId: { placeId, userId } } });
    if (existing) {
      await this.prisma.$transaction([
        this.prisma.placeFollow.delete({ where: { placeId_userId: { placeId, userId } } }),
        this.prisma.place.updateMany({ where: { id: placeId, followerCount: { gt: 0 } }, data: { followerCount: { decrement: 1 } } })
      ]);
    }
    return { following: false };
  }

  async listMembers(placeId: string, actor: User) {
    await this.ensureCanManage(placeId, actor);
    return this.prisma.placeMember.findMany({ where: { placeId }, orderBy: [{ role: "desc" }, { createdAt: "asc" }], include: { user: { select: memberUserSelect } } });
  }

  async invite(placeId: string, input: InvitePlaceMemberDto, actor: User) {
    const place = await this.ensureCanManage(placeId, actor);
    if (!input.userId && !input.email) throw new BadRequestException("Kullanıcı veya e-posta belirtilmelidir.");
    const user = await this.prisma.user.findFirst({ where: input.userId ? { id: input.userId } : { email: input.email!.toLowerCase().trim() } });
    if (!user) throw new NotFoundException("Davet edilecek kullanıcı bulunamadı.");
    if (user.id === place.createdById) throw new BadRequestException("Mekân sahibi yeniden davet edilemez.");
    await this.ensureCanReceiveInvite(user.id, actor.id);
    const role = input.role ?? PlaceMemberRole.member;
    if (role === PlaceMemberRole.organizer && actor.role === "user" && place.createdById !== actor.id) {
      throw new ForbiddenException("Organizatör rolünü yalnız mekân sahibi verebilir.");
    }
    const existing = await this.prisma.placeMember.findUnique({ where: { placeId_userId: { placeId, userId: user.id } } });
    if (existing?.status === PlaceMemberStatus.accepted) throw new BadRequestException("Kullanıcı zaten bu mekânın aktif üyesidir.");
    const member = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.placeMember.upsert({
        where: { placeId_userId: { placeId, userId: user.id } },
        create: { placeId, userId: user.id, status: "invited", role },
        update: { status: "invited", role }
      });
      if (!existing) await tx.place.update({ where: { id: placeId }, data: { inviteCount: { increment: 1 } } });
      await tx.notification.create({
        data: {
          userId: user.id,
          type: role === PlaceMemberRole.manager || role === PlaceMemberRole.organizer ? "place_manager" : "place_invite",
          title: role === PlaceMemberRole.member ? "Mekân daveti" : "Mekân yöneticiliği daveti",
          body: `${place.name} mekânına davet edildiniz.`,
          targetType: "place",
          targetId: placeId
        }
      });
      return saved;
    });
    return { ...member, user: this.pickUser(user) };
  }

  async updateMember(placeId: string, userId: string, input: UpdatePlaceMemberDto, actor: User) {
    const place = await this.ensureCanManage(placeId, actor);
    const member = await this.prisma.placeMember.findUnique({ where: { placeId_userId: { placeId, userId } } });
    if (!member) throw new NotFoundException("Mekân üyesi bulunamadı.");
    if (place.createdById === userId && (input.status === "banned" || input.status === "declined" || (input.role && input.role !== "organizer"))) {
      throw new BadRequestException("Mekân sahibinin organizatör üyeliği kaldırılamaz.");
    }
    if (input.role && actor.role === "user" && place.createdById !== actor.id) {
      throw new ForbiddenException("Üye rollerini yalnız mekân sahibi değiştirebilir.");
    }
    const actorMembership = place.members[0];
    if (actor.role === "user" && actorMembership?.role === PlaceMemberRole.manager && member.role !== PlaceMemberRole.member) {
      throw new ForbiddenException("Yöneticiler diğer yönetici veya organizatörleri değiştiremez.");
    }
    return this.prisma.placeMember.update({
      where: { placeId_userId: { placeId, userId } },
      data: { status: input.status, role: input.role },
      include: { user: { select: memberUserSelect } }
    });
  }

  async respondToInvite(placeId: string, status: PlaceMemberStatus, userId: string) {
    if (status !== PlaceMemberStatus.accepted && status !== PlaceMemberStatus.declined) {
      throw new BadRequestException("Davet yalnız kabul veya reddedilebilir.");
    }
    const member = await this.prisma.placeMember.findUnique({ where: { placeId_userId: { placeId, userId } } });
    if (!member || member.status !== PlaceMemberStatus.invited) throw new NotFoundException("Aktif mekân daveti bulunamadı.");
    return this.prisma.placeMember.update({ where: { placeId_userId: { placeId, userId } }, data: { status } });
  }

  private async ensureActive(id: string) {
    const place = await this.prisma.place.findFirst({ where: { id, status: "active" }, select: { id: true } });
    if (!place) throw new NotFoundException("Mekân bulunamadı.");
  }

  private async ensureCanManage(id: string, actor: User) {
    const place = await this.prisma.place.findUnique({
      where: { id },
      include: { members: { where: { userId: actor.id, status: "accepted", role: { in: ["manager", "organizer"] } } } }
    });
    if (!place) throw new NotFoundException("Mekân bulunamadı.");
    if (actor.role === "user" && place.createdById !== actor.id && place.members.length === 0) throw new ForbiddenException("Bu mekânı yönetme yetkiniz yok.");
    return place;
  }

  private async ensureCanReceiveInvite(targetUserId: string, actorUserId: string) {
    const [privacy, block] = await Promise.all([
      this.prisma.privacySettings.findUnique({ where: { userId: targetUserId }, select: { placeInviteAudience: true } }),
      this.prisma.userBlock.findUnique({
        where: { userId_targetType_targetId: { userId: targetUserId, targetType: "user", targetId: actorUserId } }
      })
    ]);
    if (block) throw new ForbiddenException("Bu kullanıcı mekân daveti alamıyor.");
    const audience = privacy?.placeInviteAudience ?? "everybody";
    if (audience === "everybody") return;
    const direct = await this.prisma.userFollow.findMany({ where: { followerId: targetUserId }, select: { followingId: true } });
    if (direct.some((item) => item.followingId === actorUserId)) return;
    if (audience === "network" && direct.length > 0) {
      const secondDegree = await this.prisma.userFollow.findFirst({
        where: { followerId: { in: direct.map((item) => item.followingId) }, followingId: actorUserId },
        select: { followerId: true }
      });
      if (secondDegree) return;
    }
    throw new ForbiddenException("Kullanıcının mekân daveti gizlilik ayarı bu davete izin vermiyor.");
  }

  private viewerInclude(viewerId?: string) {
    return {
      followers: { where: { userId: viewerId ?? "" }, select: { userId: true } },
      members: { where: { userId: viewerId ?? "" }, select: { status: true, role: true } }
    } as const;
  }

  private toPublicPlace(place: any) {
    const { followers, members, updatedById: _updatedById, ...data } = place;
    return { ...data, isFollowing: followers.length > 0, viewerMembership: members[0] ?? null };
  }

  private async uniqueSlug(name: string, currentId?: string) {
    const base = toSlug(name) || "place";
    let slug = base;
    let suffix = 2;
    while (await this.prisma.place.findFirst({ where: { slug, id: currentId ? { not: currentId } : undefined }, select: { id: true } })) {
      slug = `${base}-${suffix++}`;
    }
    return slug;
  }

  private optionalText(value?: string) {
    return value === undefined ? undefined : value.trim() || null;
  }

  private pickUser(user: User) {
    return { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status };
  }
}
