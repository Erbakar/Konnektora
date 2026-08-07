import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrivateMessage, User, UserStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { ConversationMessagesQueryDto, ConversationPreferenceDto, EditPrivateMessageDto, MessageReactionDto, SendPrivateMessageDto } from "./chat.dto";

const peerSelect = { id: true, name: true, username: true, status: true } as const;

@Injectable()
export class ChatService {
  private readonly typing = new Map<string, number>();
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  async listConversations(userId: string) {
    const [messages, blocks, preferences] = await Promise.all([
      this.prisma.privateMessage.findMany({
        where: { status: "active", OR: [{ senderId: userId }, { recipientId: userId }] },
        orderBy: { createdAt: "desc" },
        take: 2000,
        include: { sender: { select: peerSelect }, recipient: { select: peerSelect } }
      }),
      this.prisma.userBlock.findMany({
        where: { targetType: "user", OR: [{ userId }, { targetId: userId }] },
        select: { userId: true, targetId: true }
      }),
      this.prisma.conversationPreference.findMany({ where: { userId } })
    ]);
    const blockedIds = new Set(blocks.map((block) => block.userId === userId ? block.targetId : block.userId));
    const preferenceMap = new Map(preferences.map((item) => [item.peerId, item]));
    const conversations = new Map<string, { peer: NonNullable<(typeof messages)[number]["sender"]>; lastMessage: PrivateMessage; unreadCount: number }>();
    for (const message of messages) {
      const peer = message.senderId === userId ? message.recipient : message.sender;
      if (!peer || blockedIds.has(peer.id) || peer.status !== UserStatus.active) continue;
      const hiddenBefore = preferenceMap.get(peer.id)?.hiddenBefore;
      if (hiddenBefore && message.createdAt <= hiddenBefore) continue;
      const current = conversations.get(peer.id);
      const unread = message.recipientId === userId && !message.readAt ? 1 : 0;
      if (current) current.unreadCount += unread;
      else conversations.set(peer.id, { peer, lastMessage: this.stripRelations(message), unreadCount: unread });
    }
    const items = [...conversations.values()].map((item) => ({ ...item, preference: preferenceMap.get(item.peer.id) ?? { pinned: false, muted: false, archived: false } }))
      .sort((left, right) => Number(right.preference.pinned) - Number(left.preference.pinned) || new Date(right.lastMessage.createdAt).getTime() - new Date(left.lastMessage.createdAt).getTime());
    return { items, totalUnread: items.reduce((sum, item) => sum + item.unreadCount, 0) };
  }

  async listMessages(userId: string, peerId: string, query: ConversationMessagesQueryDto) {
    await this.ensureConversationVisible(userId, peerId);
    const preference = await this.prisma.conversationPreference.findUnique({ where: { userId_peerId: { userId, peerId } }, select: { hiddenBefore: true } });
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const where = {
      status: "active",
      OR: [
        { senderId: userId, recipientId: peerId },
        { senderId: peerId, recipientId: userId }
      ],
      ...(preference?.hiddenBefore ? { createdAt: { gt: preference.hiddenBefore } } : {})
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.privateMessage.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include: { replyTo: { select: { id: true, body: true, senderId: true, status: true } }, reactions: { select: { emoji: true, userId: true } } } }),
      this.prisma.privateMessage.count({ where })
    ]);
    return { items: items.reverse(), total, page, pageSize, hasNextPage: page * pageSize < total };
  }

  async send(sender: User, input: SendPrivateMessageDto, file?: Express.Multer.File) {
    if (sender.id === input.recipientId) throw new BadRequestException("Kullanıcı kendisine mesaj gönderemez.");
    const recipient = await this.prisma.user.findUnique({ where: { id: input.recipientId }, select: peerSelect });
    if (!recipient || recipient.status !== UserStatus.active) throw new NotFoundException("Alıcı bulunamadı.");
    await this.ensureMessagingAllowed(sender.id, recipient.id);
    if (input.replyToId) {
      const reply = await this.prisma.privateMessage.findFirst({ where: { id: input.replyToId, status: "active", OR: [{ senderId: sender.id, recipientId: recipient.id }, { senderId: recipient.id, recipientId: sender.id }] }, select: { id: true } });
      if (!reply) throw new BadRequestException("Yanıtlanan mesaj bu konuşmada bulunamadı.");
    }
    const message = await this.prisma.$transaction(async (tx) => {
      const message = await tx.privateMessage.create({
        data: { senderId: sender.id, recipientId: recipient.id, body: input.body.trim(), replyToId: input.replyToId, attachmentUrl: file ? `/uploads/${file.filename}` : undefined, attachmentType: file?.mimetype, attachmentName: file?.originalname, attachmentSize: file?.size }
      });
      return message;
    });
    await this.notifications.dispatch({
      userId: recipient.id,
      topic: "private_message",
      type: "private_message",
      title: `${sender.name} sana mesaj gönderdi`,
      body: input.body.trim().slice(0, 160),
      targetType: "user",
      targetId: sender.id
    });
    return message;
  }

  async search(userId: string, query: string) {
    const term = query.trim();
    if (term.length < 2) return [];
    const items = await this.prisma.privateMessage.findMany({ where: { status: "active", body: { contains: term, mode: "insensitive" }, OR: [{ senderId: userId }, { recipientId: userId }] }, orderBy: { createdAt: "desc" }, take: 50, include: { sender: { select: peerSelect }, recipient: { select: peerSelect } } });
    return items.map((message) => ({ ...this.stripRelations(message), peer: message.senderId === userId ? message.recipient : message.sender }));
  }

  async edit(userId: string, id: string, input: EditPrivateMessageDto) {
    const message = await this.prisma.privateMessage.findUnique({ where: { id } });
    if (!message || message.status !== "active") throw new NotFoundException("Mesaj bulunamadı.");
    if (message.senderId !== userId) throw new ForbiddenException("Yalnız kendi mesajınızı düzenleyebilirsiniz.");
    if (Date.now() - message.createdAt.getTime() > 15 * 60_000) throw new BadRequestException("Mesajlar yalnız ilk 15 dakika düzenlenebilir.");
    return this.prisma.privateMessage.update({ where: { id }, data: { body: input.body.trim(), editedAt: new Date() }, include: { replyTo: { select: { id: true, body: true, senderId: true, status: true } }, reactions: { select: { emoji: true, userId: true } } } });
  }

  async remove(userId: string, id: string) {
    const message = await this.prisma.privateMessage.findUnique({ where: { id } });
    if (!message || message.status !== "active") throw new NotFoundException("Mesaj bulunamadı.");
    if (message.senderId !== userId) throw new ForbiddenException("Yalnız kendi mesajınızı silebilirsiniz.");
    return this.prisma.privateMessage.update({ where: { id }, data: { status: "deleted", body: "Bu mesaj silindi", attachmentUrl: null, attachmentType: null, attachmentName: null, attachmentSize: null, deletedAt: new Date() } });
  }

  async toggleReaction(userId: string, id: string, input: MessageReactionDto) {
    const message = await this.prisma.privateMessage.findFirst({ where: { id, status: "active", OR: [{ senderId: userId }, { recipientId: userId }] }, select: { id: true } });
    if (!message) throw new NotFoundException("Mesaj bulunamadı.");
    const key = { messageId_userId_emoji: { messageId: id, userId, emoji: input.emoji } };
    const existing = await this.prisma.messageReaction.findUnique({ where: key });
    if (existing) await this.prisma.messageReaction.delete({ where: key });
    else await this.prisma.messageReaction.create({ data: { messageId: id, userId, emoji: input.emoji } });
    return { active: !existing, emoji: input.emoji };
  }

  setTyping(userId: string, peerId: string) { this.typing.set(`${userId}:${peerId}`, Date.now() + 6000); return { ok: true }; }
  getTyping(userId: string, peerId: string) { return { typing: (this.typing.get(`${peerId}:${userId}`) ?? 0) > Date.now() }; }
  async setPreference(userId: string, peerId: string, input: ConversationPreferenceDto) { await this.ensureConversationVisible(userId, peerId); return this.prisma.conversationPreference.upsert({ where: { userId_peerId: { userId, peerId } }, create: { userId, peerId, ...input }, update: input }); }

  async removeConversation(userId: string, peerId: string) {
    await this.ensureConversationVisible(userId, peerId);
    await this.prisma.conversationPreference.upsert({
      where: { userId_peerId: { userId, peerId } },
      create: { userId, peerId, hiddenBefore: new Date() },
      update: { hiddenBefore: new Date(), pinned: false }
    });
    return { ok: true };
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
    const data = { ...message };
    delete data.sender;
    delete data.recipient;
    return data;
  }
}
