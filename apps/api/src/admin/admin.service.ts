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
        { name: { contains: query.q, mode: "insensitive" } },
        { email: { contains: query.q, mode: "insensitive" } }
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.role) {
      where.role = query.role;
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
        interestTags: { select: { tag: true } }
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
      role: true,
      status: true,
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
}
