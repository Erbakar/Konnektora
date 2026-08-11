import { DeliveryChannel, NotificationTopic } from "@prisma/client";
import { NotificationsService } from "./notifications.service";

describe("NotificationsService", () => {
  const user = { findUnique: jest.fn() };
  const notificationPreference = { findUnique: jest.fn() };
  const notification = { create: jest.fn() };
  const notificationDelivery = { update: jest.fn() };
  const pushSubscription = { findMany: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() };
  const contentNotificationSubscription = { findUnique: jest.fn(), upsert: jest.fn() };
  const tag = { findUnique: jest.fn() }; const event = { findUnique: jest.fn() }; const place = { findUnique: jest.fn() };
  const prisma = { user, notificationPreference, notification, notificationDelivery, pushSubscription, contentNotificationSubscription, tag, event, place };
  const mail = { sendNotificationEmail: jest.fn() };
  const push = { send: jest.fn(), publicKey: jest.fn() };
  const service = new NotificationsService(prisma as never, mail as never, push as never);

  beforeEach(() => {
    jest.clearAllMocks();
    user.findUnique.mockResolvedValue({ id: "user-1", name: "Ada", email: "ada@example.com" });
    notificationPreference.findUnique.mockResolvedValue(null);
    notification.create.mockResolvedValue({ id: "notification-1" });
    notificationDelivery.update.mockResolvedValue({});
    pushSubscription.findMany.mockResolvedValue([]);
    mail.sendNotificationEmail.mockResolvedValue({ provider: "resend", providerId: "mail-1" });
  });

  it("delivers default social notifications through email and push channels", async () => {
    await service.dispatch({ userId: "user-1", topic: NotificationTopic.private_message, type: "private_message", title: "Yeni mesaj", body: "Merhaba" });

    expect(notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      deliveries: { create: [{ userId: "user-1", channel: "email" }, { userId: "user-1", channel: "push" }] }
    }) });
    expect(mail.sendNotificationEmail).toHaveBeenCalled();
    expect(notificationDelivery.update).toHaveBeenCalledTimes(2);
  });

  it("does not create or deliver notifications when the topic is disabled", async () => {
    notificationPreference.findUnique.mockResolvedValue({ channel: DeliveryChannel.none });
    await expect(service.dispatch({ userId: "user-1", topic: NotificationTopic.comment, type: "comment", title: "Yorum", body: "Yeni yorum" })).resolves.toBeNull();
    expect(notification.create).not.toHaveBeenCalled();
  });

  it("marks provider failures for retry visibility", async () => {
    notificationPreference.findUnique.mockResolvedValue({ channel: DeliveryChannel.email });
    mail.sendNotificationEmail.mockRejectedValue(new Error("provider unavailable"));
    await service.dispatch({ userId: "user-1", topic: NotificationTopic.login, type: "login", title: "Giriş", body: "Yeni giriş" });
    expect(notificationDelivery.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "failed", lastError: "provider unavailable" }) }));
  });

  it("persists content notification subscriptions", async () => {
    tag.findUnique.mockResolvedValue({ id: "tag-1" });
    contentNotificationSubscription.upsert.mockResolvedValue({ enabled: true });
    await expect(service.setContentSubscription("user-1", "tag", "tag-1", true)).resolves.toEqual({ enabled: true });
    expect(contentNotificationSubscription.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ targetType: "tag", enabled: true }) }));
  });

  it("supports notifications about another user profile", async () => {
    user.findUnique.mockResolvedValue({ id: "profile-2" });
    contentNotificationSubscription.upsert.mockResolvedValue({ enabled: true });
    await expect(service.setContentSubscription("user-1", "user", "profile-2", true)).resolves.toEqual({ enabled: true });
    expect(contentNotificationSubscription.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ targetType: "user", targetId: "profile-2" }) }));
  });
});
