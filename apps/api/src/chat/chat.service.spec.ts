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
  const conversationPreference = { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn() };
  const notifications = { dispatch: jest.fn() };
  const messageReaction = { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() };
  const tx = { privateMessage, notification };
  const prisma = {
    privateMessage, userBlock, user, privacySettings, userFollow, notificationPreference, notification, conversationPreference, messageReaction,
    $transaction: jest.fn(async (operation: unknown) =>
      typeof operation === "function" ? operation(tx) : Promise.all(operation as Promise<unknown>[])
    )
  };
  const service = new ChatService(prisma as never, notifications as never);
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
    conversationPreference.findMany.mockResolvedValue([]);
    conversationPreference.findUnique.mockResolvedValue(null);
  });

  it("groups messages by peer and counts unread messages", async () => {
    const now = new Date();
    privateMessage.findMany.mockResolvedValue([
      { id: "m2", senderId: peer.id, recipientId: sender.id, body: "two", status: "active", readAt: null, createdAt: now, updatedAt: now, sender: peer, recipient: { ...peer, id: sender.id } },
      { id: "m1", senderId: sender.id, recipientId: peer.id, body: "one", status: "active", readAt: null, createdAt: now, updatedAt: now, sender: { ...peer, id: sender.id }, recipient: peer }
    ]);

    const result = await service.listConversations(sender.id);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ peer, unreadCount: 1, lastMessage: { id: "m2" }, preference: { pinned: false, muted: false, archived: false } });
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

  it("rejects an empty message when there is no attachment", async () => {
    await expect(service.send(sender, { recipientId: peer.id, body: "   " })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("accepts a media-only message without adding placeholder text", async () => {
    const file = { filename: "photo.jpg", mimetype: "image/jpeg", originalname: "photo.jpg", size: 128 } as Express.Multer.File;
    const message = { id: "m-media", senderId: sender.id, recipientId: peer.id, body: "", attachmentUrl: "/uploads/photo.jpg" };
    user.findUnique.mockResolvedValue(peer);
    privateMessage.create.mockResolvedValue(message);

    await expect(service.send(sender, { recipientId: peer.id, body: "" }, file)).resolves.toEqual(message);
    expect(privateMessage.create).toHaveBeenCalledWith({ data: expect.objectContaining({ body: "", attachmentUrl: "/uploads/photo.jpg" }) });
  });

  it("enforces the recipient's following-only message privacy", async () => {
    user.findUnique.mockResolvedValue(peer);
    privacySettings.findUnique.mockResolvedValue({ messageAudience: "following" });
    userFollow.findMany.mockResolvedValue([]);
    await expect(service.send(sender, { recipientId: peer.id, body: "hello" })).rejects.toBeInstanceOf(ForbiddenException);
    expect(privateMessage.create).not.toHaveBeenCalled();
  });

  it("stores a message and delegates channel delivery", async () => {
    const message = { id: "m1", senderId: sender.id, recipientId: peer.id, body: "hello" };
    user.findUnique.mockResolvedValue(peer);
    privateMessage.create.mockResolvedValue(message);

    await expect(service.send(sender, { recipientId: peer.id, body: " hello " })).resolves.toEqual(message);
    expect(privateMessage.create).toHaveBeenCalledWith({ data: expect.objectContaining({ senderId: sender.id, recipientId: peer.id, body: "hello" }) });
    expect(notifications.dispatch).toHaveBeenCalledWith(expect.objectContaining({ userId: peer.id, topic: "private_message" }));
  });

  it("hides a deleted conversation only for the current user", async () => {
    user.findUnique.mockResolvedValue(peer);
    conversationPreference.upsert.mockResolvedValue({});

    await expect(service.removeConversation(sender.id, peer.id)).resolves.toEqual({ ok: true });
    expect(conversationPreference.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_peerId: { userId: sender.id, peerId: peer.id } },
      update: expect.objectContaining({ hiddenBefore: expect.any(Date) })
    }));
    expect(privateMessage.updateMany).not.toHaveBeenCalled();
  });
});
