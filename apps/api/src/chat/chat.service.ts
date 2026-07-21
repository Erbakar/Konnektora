import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrivateMessage, User, UserStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ConversationMessagesQueryDto, SendPrivateMessageDto } from "./chat.dto";

const peerSelect = { id: true, name: true, username: true, status: true } as const;

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async listConversations(userId: string) {
    const [messages, blocks] = await Promise.all([
      this.prisma.privateMessage.findMany({
        where: { status: "active", OR: [{ senderId: userId }, { recipientId: userId }] },
        orderBy: { createdAt: "desc" },
        take: 2000,
        include: { sender: { select: peerSelect }, recipient: { select: peerSelect } }
      }),
      this.prisma.userBlock.findMany({
        where: { targetType: "user", OR: [{ userId }, { targetId: userId }] },
        select: { userId: true, targetId: true }
      })
    ]);
    const blockedIds = new Set(blocks.map((block) => block.userId === userId ? block.targetId : block.userId));
    const conversations = new Map<string, { peer: NonNullable<(typeof messages)[number]["sender"]>; lastMessage: PrivateMessage; unreadCount: number }>();
    for (const message of messages) {
      const peer = message.senderId === userId ? message.recipient : message.sender;
      if (!peer || blockedIds.has(peer.id) || peer.status !== UserStatus.active) continue;
      const current = conversations.get(peer.id);
      const unread = message.recipientId === userId && !message.readAt ? 1 : 0;
      if (current) current.unreadCount += unread;
      else conversations.set(peer.id, { peer, lastMessage: this.stripRelations(message), unreadCount: unread });
    }
    const items = [...conversations.values()];
    return { items, totalUnread: items.reduce((sum, item) => sum + item.unreadCount, 0) };
  }

  async listMessages(userId: string, peerId: string, query: ConversationMessagesQueryDto) {
    await this.ensureConversationVisible(userId, peerId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const where = {
      status: "active",
      OR: [
        { senderId: userId, recipientId: peerId },
        { senderId: peerId, recipientId: userId }
      ]
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.privateMessage.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.privateMessage.count({ where })
    ]);
    return { items: items.reverse(), total, page, pageSize, hasNextPage: page * pageSize < total };
  }

  async send(sender: User, input: SendPrivateMessageDto) {
    if (sender.id === input.recipientId) throw new BadRequestException("Kullanıcı kendisine mesaj gönderemez.");
    const recipient = await this.prisma.user.findUnique({ where: { id: input.recipientId }, select: peerSelect });
    if (!recipient || recipient.status !== UserStatus.active) throw new NotFoundException("Alıcı bulunamadı.");
    await this.ensureMessagingAllowed(sender.id, recipient.id);
    const preference = await this.prisma.notificationPreference.findUnique({
      where: { userId_topic: { userId: recipient.id, topic: "private_message" } }, select: { channel: true }
    });
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.privateMessage.create({
        data: { senderId: sender.id, recipientId: recipient.id, body: input.body.trim() }
      });
      if (preference?.channel !== "none") {
        await tx.notification.create({
          data: {
            userId: recipient.id,
            type: "private_message",
            title: `${sender.name} sana mesaj gönderdi`,
            body: input.body.trim().slice(0, 160),
            targetType: "user",
            targetId: sender.id
          }
        });
      }
      return message;
    });
  }

  async markRead(userId: string, peerId: string) {
    await this.ensureConversationVisible(userId, peerId);
    const result = await this.prisma.privateMessage.updateMany({
      where: { status: "active", senderId: peerId, recipientId: userId, readAt: null },
      data: { readAt: new Date() }
    });
    return { updated: result.count };
  }

  private async ensureConversationVisible(userId: string, peerId: string) {
    const peer = await this.prisma.user.findUnique({ where: { id: peerId }, select: { id: true, status: true } });
    if (!peer || peer.status !== UserStatus.active) throw new NotFoundException("Kullanıcı bulunamadı.");
    const block = await this.prisma.userBlock.findFirst({
      where: { targetType: "user", OR: [{ userId, targetId: peerId }, { userId: peerId, targetId: userId }] }, select: { userId: true }
    });
    if (block) throw new ForbiddenException("Engellenen kullanıcılarla mesajlaşma görüntülenemez.");
  }

  private async ensureMessagingAllowed(senderId: string, recipientId: string) {
    const [block, privacy] = await Promise.all([
      this.prisma.userBlock.findFirst({
        where: { targetType: "user", OR: [{ userId: senderId, targetId: recipientId }, { userId: recipientId, targetId: senderId }] },
        select: { userId: true }
      }),
      this.prisma.privacySettings.findUnique({ where: { userId: recipientId }, select: { messageAudience: true } })
    ]);
    if (block) throw new ForbiddenException("Engellenen kullanıcılarla mesajlaşılamaz.");
    const audience = privacy?.messageAudience ?? "everybody";
    if (audience === "everybody") return;
    const direct = await this.prisma.userFollow.findMany({ where: { followerId: recipientId }, select: { followingId: true } });
    if (direct.some((follow) => follow.followingId === senderId)) return;
    if (audience === "network" && direct.length) {
      const secondDegree = await this.prisma.userFollow.findFirst({
        where: { followerId: { in: direct.map((follow) => follow.followingId) }, followingId: senderId }, select: { followerId: true }
      });
      if (secondDegree) return;
    }
    throw new ForbiddenException("Alıcının mesaj gizlilik ayarı bu mesaja izin vermiyor.");
  }

  private stripRelations<T extends { sender?: unknown; recipient?: unknown }>(message: T) {
    const { sender: _sender, recipient: _recipient, ...data } = message;
    return data;
  }
}
