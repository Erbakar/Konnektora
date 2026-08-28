import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, User, UserStatus } from "@prisma/client";
import { AuthService } from "../auth/auth.service";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { AdminActivityLogQueryDto, AdminUserActionDto, AdminUserQueryDto, CreateAdminRoleGroupDto, UpdateAdminRoleGroupDto, UpdateAdminUserDto } from "./admin.dto";

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly mailService: MailService
  ) {}

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

  async listActivityLogs(query: AdminActivityLogQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const where: Prisma.AdminActivityLogWhereInput = {
      ...(query.category ? { targetType: query.category } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.action ? { action: { contains: query.action, mode: "insensitive" } } : {}),
      ...(query.from || query.to ? { createdAt: { gte: query.from ? new Date(query.from) : undefined, lte: query.to ? new Date(query.to) : undefined } } : {}),
      ...(query.q ? { OR: [
        { action: { contains: query.q, mode: "insensitive" } },
        { targetType: { contains: query.q, mode: "insensitive" } },
        { targetId: { contains: query.q, mode: "insensitive" } },
        { actor: { is: { OR: [
          { username: { contains: query.q, mode: "insensitive" } },
          { name: { contains: query.q, mode: "insensitive" } },
          { email: { contains: query.q, mode: "insensitive" } },
        ] } } },
      ] } : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.adminActivityLog.count({ where }),
      this.prisma.adminActivityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { actor: { select: { id: true, username: true, name: true, email: true, role: true } } },
      }),
    ]);
    return { items, total, page, pageSize, hasNextPage: page * pageSize < total };
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

    if (query.ageFrom !== undefined || query.ageTo !== undefined) {
      const now = new Date();
      where.birthDate = {
        lte: query.ageFrom !== undefined ? this.birthDateForAge(now, query.ageFrom) : undefined,
        gte: query.ageTo !== undefined ? this.birthDateForAge(now, query.ageTo + 1) : undefined
      };
    }

    const orderBy = this.resolveUserOrderBy(query.sortBy, query.sortDir);

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy,
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

  async runUserAction(id: string, input: AdminUserActionDto, admin: User) {
    if (id === admin.id && ["suspend_7_days", "suspend_30_days", "ban_user"].includes(input.action)) {
      throw new BadRequestException("Admin kendi hesabına bu müdahaleyi uygulayamaz.");
    }

    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException("Üye bulunamadı.");
    }

    if (input.action === "send_verification_email") {
      await this.authService.sendVerificationForUser(id);
      await this.createAdminActivity(admin.id, "send_verification_email", "user", id, input.note);
      return this.getUser(id);
    }

    if (input.action === "send_password_reset") {
      await this.authService.sendPasswordResetForUser(id);
      await this.createAdminActivity(admin.id, "send_password_reset", "user", id, input.note);
      return this.getUser(id);
    }

    const actionData = this.resolveUserActionData(input.action);
    const updated = await this.prisma.user.update({
      where: { id },
      data: actionData.data,
      select: this.userListSelect()
    });

    if (actionData.shouldNotify) {
      await (this.prisma as any).notification.create({
        data: {
          userId: id,
          type: "admin_user_action",
          title: "Hesap müdahalesi",
          body: input.note?.trim() || input.action,
          targetType: "user",
          targetId: id
        }
      });
      await this.mailService.sendAdminUserInterventionEmail({
        to: user.email,
        name: user.name,
        action: input.action,
        note: input.note,
        until: actionData.until
      });
    }

    await this.createAdminActivity(admin.id, input.action, "user", id, input.note, { status: updated.status });

    return updated;
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

  private resolveUserActionData(action: AdminUserActionDto["action"]) {
    if (action === "reset_username") {
      return {
        data: { username: `User${Date.now().toString().slice(-8)}` },
        shouldNotify: true,
        until: null
      };
    }

    if (action === "remove_website") {
      return {
        data: { website: null },
        shouldNotify: true,
        until: null
      };
    }

    if (action === "suspend_7_days" || action === "suspend_30_days") {
      const days = action === "suspend_7_days" ? 7 : 30;
      return {
        data: { status: UserStatus.suspended },
        shouldNotify: true,
        until: new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      };
    }

    if (action === "ban_user") {
      return {
        data: { status: UserStatus.banned },
        shouldNotify: true,
        until: null
      };
    }

    if (action === "activate_user") {
      return {
        data: { status: UserStatus.active },
        shouldNotify: true,
        until: null
      };
    }

    throw new BadRequestException("Desteklenmeyen üye aksiyonu.");
  }

  private birthDateForAge(now: Date, age: number) {
    return new Date(Date.UTC(now.getUTCFullYear() - age, now.getUTCMonth(), now.getUTCDate()));
  }

  private resolveUserOrderBy(sortBy?: string, sortDir: "asc" | "desc" = "desc"): Prisma.UserOrderByWithRelationInput {
    if (sortBy === "username") {
      return { username: sortDir };
    }

    if (sortBy === "followers") {
      return { followerCount: sortDir };
    }

    if (sortBy === "following") {
      return { followingCount: sortDir };
    }

    if (sortBy === "lastOnlineAt") {
      return { lastOnlineAt: sortDir };
    }

    return { createdAt: sortDir };
  }

  private createAdminActivity(
    actorId: string,
    action: string,
    targetType: string,
    targetId: string,
    note?: string | null,
    metadata?: Record<string, unknown>
  ) {
    return (this.prisma as any).adminActivityLog.create({
      data: {
        actorId,
        action,
        targetType,
        targetId,
        note: note?.trim() || null,
        metadata: metadata ?? undefined
      }
    });
  }
}
