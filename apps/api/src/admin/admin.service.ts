import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, User, UserStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AdminUserQueryDto, CreateAdminRoleGroupDto, UpdateAdminRoleGroupDto, UpdateAdminUserDto } from "./admin.dto";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const [publishedEvents, draftEvents, activeTags, upcomingEvents] = await Promise.all([
      this.prisma.event.count({ where: { status: "published" } }),
      this.prisma.event.count({ where: { status: "draft" } }),
      this.prisma.tag.count({ where: { status: "active" } }),
      this.prisma.event.count({
        where: {
          status: "published",
          startsAt: { gte: new Date() }
        }
      })
    ]);

    return {
      publishedEvents,
      draftEvents,
      activeTags,
      upcomingEvents
    };
  }

  async listUsers(query: AdminUserQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where: Prisma.UserWhereInput = {};

    if (query.q) {
      where.OR = [
        { username: { contains: query.q, mode: "insensitive" } },
        { name: { contains: query.q, mode: "insensitive" } },
        { email: { contains: query.q, mode: "insensitive" } },
        { phone: { contains: query.q, mode: "insensitive" } },
        { city: { contains: query.q, mode: "insensitive" } },
        { country: { contains: query.q, mode: "insensitive" } },
        { companyName: { contains: query.q, mode: "insensitive" } },
        { tradeName: { contains: query.q, mode: "insensitive" } }
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.role) {
      where.role = query.role;
    }

    if (query.accountType) {
      where.accountType = query.accountType;
    }

    if (query.country) {
      where.country = { contains: query.country, mode: "insensitive" };
    }

    if (query.city) {
      where.city = { contains: query.city, mode: "insensitive" };
    }

    if (query.gender) {
      where.gender = query.gender;
    }

    if (query.email) {
      where.email = { contains: query.email, mode: "insensitive" };
    }

    if (query.phone) {
      where.phone = { contains: query.phone, mode: "insensitive" };
    }

    if (query.joinedFrom || query.joinedTo) {
      where.createdAt = {
        gte: query.joinedFrom ? new Date(query.joinedFrom) : undefined,
        lte: query.joinedTo ? new Date(query.joinedTo) : undefined
      };
    }

    if (query.lastOnlineFrom || query.lastOnlineTo) {
      where.lastOnlineAt = {
        gte: query.lastOnlineFrom ? new Date(query.lastOnlineFrom) : undefined,
        lte: query.lastOnlineTo ? new Date(query.lastOnlineTo) : undefined
      };
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: this.userListSelect()
      })
    ]);

    return {
      items: users,
      total,
      page,
      pageSize,
      hasNextPage: page * pageSize < total
    };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...this.userListSelect(),
        adminRoleGroup: true,
        createdEvents: { select: { id: true } },
        eventParticipations: { select: { id: true } },
        submittedReports: { select: { id: true } },
        resolvedReports: { select: { id: true } },
        interestTags: { select: { tag: true } },
        invitedBy: { select: this.basicUserSelect() },
        invitedUsers: { take: 20, orderBy: { createdAt: "desc" }, select: this.basicUserSelect() }
      }
    });

    if (!user) {
      throw new NotFoundException("Üye bulunamadı.");
    }

    return {
      ...user,
      stats: {
        createdEvents: user.createdEvents.length,
        eventParticipations: user.eventParticipations.length,
        submittedReports: user.submittedReports.length,
        resolvedReports: user.resolvedReports.length
      },
      interestTags: user.interestTags.map((interest) => interest.tag),
      createdEvents: undefined,
      eventParticipations: undefined,
      submittedReports: undefined,
      resolvedReports: undefined
    };
  }

  async updateUser(id: string, input: UpdateAdminUserDto, admin: User) {
    if (id === admin.id && input.status && input.status !== UserStatus.active) {
      throw new BadRequestException("Admin kendi hesabını pasifleştiremez.");
    }

    if (id === admin.id && input.role && input.role !== admin.role) {
      throw new BadRequestException("Admin kendi rolünü değiştiremez.");
    }

    const existing = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });

    if (!existing) {
      throw new NotFoundException("Üye bulunamadı.");
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        status: input.status,
        role: input.role,
        username: input.username === undefined ? undefined : input.username.trim() || null,
        name: input.name?.trim(),
        email: input.email?.trim(),
        phone: input.phone === undefined ? undefined : input.phone.trim() || null,
        country: input.country === undefined ? undefined : input.country.trim() || null,
        city: input.city === undefined ? undefined : input.city.trim() || null,
        district: input.district === undefined ? undefined : input.district.trim() || null,
        address: input.address === undefined ? undefined : input.address.trim() || null,
        gender: input.gender === undefined ? undefined : input.gender.trim() || null,
        birthDate: input.birthDate === undefined ? undefined : input.birthDate ? new Date(input.birthDate) : null,
        website: input.website === undefined ? undefined : input.website.trim() || null,
        accountType: input.accountType,
        companyName: input.companyName === undefined ? undefined : input.companyName.trim() || null,
        tradeName: input.tradeName === undefined ? undefined : input.tradeName.trim() || null,
        companyType: input.companyType === undefined ? undefined : input.companyType.trim() || null,
        businessCategory: input.businessCategory === undefined ? undefined : input.businessCategory.trim() || null,
        followerCount: input.followerCount,
        followingCount: input.followingCount,
        penaltyScoreLastYear: input.penaltyScoreLastYear,
        penaltyScoreAllTime: input.penaltyScoreAllTime,
        adminRoleGroup:
          input.adminRoleGroupId !== undefined
            ? input.adminRoleGroupId
              ? { connect: { id: input.adminRoleGroupId } }
              : { disconnect: true }
            : undefined
      },
      select: this.userListSelect()
    });
  }

  listRoleGroups() {
    return this.prisma.adminRoleGroup.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: { _count: { select: { users: true } } }
    });
  }

  createRoleGroup(input: CreateAdminRoleGroupDto) {
    return this.prisma.adminRoleGroup.create({
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        permissions: [...new Set(input.permissions)]
      },
      include: { _count: { select: { users: true } } }
    });
  }

  async updateRoleGroup(id: string, input: UpdateAdminRoleGroupDto) {
    const existing = await this.prisma.adminRoleGroup.findUnique({ where: { id }, select: { id: true } });

    if (!existing) {
      throw new NotFoundException("Rol grubu bulunamadı.");
    }

    return this.prisma.adminRoleGroup.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        description: input.description === undefined ? undefined : input.description?.trim() || null,
        permissions: input.permissions ? [...new Set(input.permissions)] : undefined,
        status: input.status
      },
      include: { _count: { select: { users: true } } }
    });
  }

  private userListSelect() {
    return {
      id: true,
      email: true,
      name: true,
      username: true,
      role: true,
      status: true,
      accountType: true,
      phone: true,
      country: true,
      city: true,
      district: true,
      address: true,
      gender: true,
      birthDate: true,
      website: true,
      companyName: true,
      tradeName: true,
      companyType: true,
      businessCategory: true,
      followerCount: true,
      followingCount: true,
      lastOnlineAt: true,
      emailVerified: true,
      invitedById: true,
      penaltyScoreLastYear: true,
      penaltyScoreAllTime: true,
      createdAt: true,
      updatedAt: true,
      adminRoleGroupId: true,
      adminRoleGroup: true,
      _count: {
        select: {
          createdEvents: true,
          eventParticipations: true,
          submittedReports: true
        }
      }
    } satisfies Prisma.UserSelect;
  }

  private basicUserSelect() {
    return {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true
    } satisfies Prisma.UserSelect;
  }
}
