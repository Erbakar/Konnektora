import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Prisma, User, UserMessageStatus, UserMessageType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AdminMessageQueryDto, CreateUserMessageDto, UpdateUserMessageDto } from "./messages.dto";

const MESSAGE_INCLUDE = {
  user: { select: { id: true, email: true, name: true, role: true, status: true } },
  readBy: { select: { id: true, email: true, name: true, role: true, status: true } }
} satisfies Prisma.UserMessageInclude;

const MESSAGE_PERMISSION_BY_TYPE = {
  [UserMessageType.faq]: "messages.faq.manage",
  [UserMessageType.account_freeze]: "messages.account_freeze.manage",
  [UserMessageType.write_to_us]: "messages.write_to_us.manage"
} as const;

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async createMessage(input: CreateUserMessageDto, user?: User) {
    const linkedUser = user?.id
      ? await this.prisma.user.findUnique({ where: { id: user.id }, select: { id: true, name: true, email: true } })
      : null;

    return this.prisma.userMessage.create({
      data: {
        type: input.type,
        category: input.category?.trim() || null,
        userId: linkedUser?.id,
        name: input.name.trim() || linkedUser?.name || "Konnektora User",
        email: input.email.trim().toLowerCase() || linkedUser?.email || "",
        phone: input.phone?.trim() || null,
        body: input.body.trim(),
        appVersion: input.appVersion?.trim() || null,
        systemInfo: input.systemInfo?.trim() || null
      },
      include: MESSAGE_INCLUDE
    });
  }

  async listAdminMessages(type: UserMessageType, query: AdminMessageQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where: Prisma.UserMessageWhereInput = { type };

    if (query.status) {
      where.status = query.status;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: "insensitive" } },
        { email: { contains: query.q, mode: "insensitive" } },
        { phone: { contains: query.q, mode: "insensitive" } },
        { body: { contains: query.q, mode: "insensitive" } }
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.userMessage.count({ where }),
      this.prisma.userMessage.findMany({
        where,
        orderBy: [{ status: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: MESSAGE_INCLUDE
      })
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      hasNextPage: page * pageSize < total
    };
  }

  async getAdminMessage(id: string, admin?: User) {
    const message = await this.prisma.userMessage.findUnique({
      where: { id },
      include: MESSAGE_INCLUDE
    });

    if (!message) {
      throw new NotFoundException("Mesaj bulunamadı.");
    }

    if (admin) {
      await this.assertMessagePermission(admin, message.type);
    }

    return message;
  }

  async updateAdminMessage(id: string, input: UpdateUserMessageDto, admin: User) {
    await this.getAdminMessage(id, admin);

    return this.prisma.userMessage.update({
      where: { id },
      data:
        input.status === UserMessageStatus.read
          ? {
              status: input.status,
              readAt: new Date(),
              readById: admin.id
            }
          : {
              status: input.status,
              readAt: null,
              readById: null
            },
      include: MESSAGE_INCLUDE
    });
  }

  private async assertMessagePermission(admin: User, type: UserMessageType) {
    if (admin.role === "super_admin") {
      return;
    }

    const adminUser = await this.prisma.user.findUnique({
      where: { id: admin.id },
      include: { adminRoleGroup: true }
    });
    const permissions = new Set(adminUser?.adminRoleGroup?.permissions ?? []);
    const requiredPermission = MESSAGE_PERMISSION_BY_TYPE[type];

    if (permissions.has(requiredPermission) || permissions.has("messages.manage")) {
      return;
    }

    throw new UnauthorizedException("Bu mesaj grubu için yetki gerekli.");
  }
}
