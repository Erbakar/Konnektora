import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { UserStatus } from "@prisma/client";
import { ChatService } from "./chat.service";

describe("ChatService", () => {
  const privateMessage = { findMany: jest.fn(), count: jest.fn(), create: jest.fn(), updateMany: jest.fn() };
  const userBlock = { findMany: jest.fn(), findFirst: jest.fn() };
  const user = { findUnique: jest.fn() };
  const privacySettings = { findUnique: jest.fn() };
  const userFollow = { findMany: jest.fn(), findFirst: jest.fn() };
  const notificationPreference = { findUnique: jest.fn() };
  const notification = { create: jest.fn() };
  const tx = { privateMessage, notification };
  const prisma = {
    privateMessage, userBlock, user, privacySettings, userFollow, notificationPreference, notification,
    $transaction: jest.fn(async (operation: unknown) =>
      typeof operation === "function" ? operation(tx) : Promise.all(operation as Promise<unknown>[])
    )
  };
  const service = new ChatService(prisma as never);
  const sender = { id: "11111111-1111-4111-8111-111111111111", name: "Sender" } as any;
  const peer = { id: "22222222-2222-4222-8222-222222222222", name: "Peer", username: "peer", status: UserStatus.active };

  beforeEach(() => {
    jest.clearAllMocks();
    userBlock.findMany.mockResolvedValue([]);
    userBlock.findFirst.mockResolvedValue(null);
    privacySettings.findUnique.mockResolvedValue(null);
    userFollow.findMany.mockResolvedValue([]);
    userFollow.findFirst.mockResolvedValue(null);
    notificationPreference.findUnique.mockResolvedValue(null);
  });

  it("groups messages by peer and counts unread messages", async () => {
    const now = new Date();
    privateMessage.findMany.mockResolvedValue([
      { id: "m2", senderId: peer.id, recipientId: sender.id, body: "two", status: "active", readAt: null, createdAt: now, updatedAt: now, sender: peer, recipient: { ...peer, id: sender.id } },
      { id: "m1", senderId: sender.id, recipientId: peer.id, body: "one", status: "active", readAt: null, createdAt: now, updatedAt: now, sender: { ...peer, id: sender.id }, recipient: peer }
    ]);

    const result = await service.listConversations(sender.id);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ peer, unreadCount: 1, lastMessage: { id: "m2" } });
    expect(result.totalUnread).toBe(1);
  });

  it("hides conversations when either user has blocked the other", async () => {
    const now = new Date();
    privateMessage.findMany.mockResolvedValue([
      { id: "m1", senderId: peer.id, recipientId: sender.id, body: "hidden", status: "active", readAt: null, createdAt: now, updatedAt: now, sender: peer, recipient: { ...peer, id: sender.id } }
    ]);
    userBlock.findMany.mockResolvedValue([{ userId: peer.id, targetId: sender.id }]);
    await expect(service.listConversations(sender.id)).resolves.toEqual({ items: [], totalUnread: 0 });
  });

  it("rejects messages to self", async () => {
    await expect(service.send(sender, { recipientId: sender.id, body: "hello" })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("enforces the recipient's following-only message privacy", async () => {
    user.findUnique.mockResolvedValue(peer);
    privacySettings.findUnique.mockResolvedValue({ messageAudience: "following" });
    userFollow.findMany.mockResolvedValue([]);
    await expect(service.send(sender, { recipientId: peer.id, body: "hello" })).rejects.toBeInstanceOf(ForbiddenException);
    expect(privateMessage.create).not.toHaveBeenCalled();
  });

  it("stores a message without notification when the recipient opted out", async () => {
    const message = { id: "m1", senderId: sender.id, recipientId: peer.id, body: "hello" };
    user.findUnique.mockResolvedValue(peer);
    notificationPreference.findUnique.mockResolvedValue({ channel: "none" });
    privateMessage.create.mockResolvedValue(message);

    await expect(service.send(sender, { recipientId: peer.id, body: " hello " })).resolves.toEqual(message);
    expect(privateMessage.create).toHaveBeenCalledWith({ data: { senderId: sender.id, recipientId: peer.id, body: "hello" } });
    expect(notification.create).not.toHaveBeenCalled();
  });
});
