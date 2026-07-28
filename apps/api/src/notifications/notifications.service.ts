import { Injectable } from "@nestjs/common";
import { DeliveryChannel, NotificationTopic } from "@prisma/client";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { RegisterPushSubscriptionDto } from "./notifications.dto";
import { PushService } from "./push.service";

type NotificationInput = {
  userId: string;
  topic: NotificationTopic;
  type: string;
  title: string;
  body: string;
  targetType?: string;
  targetId?: string;
};

const emailOnly = new Set<NotificationTopic>([
  NotificationTopic.password_changed,
  NotificationTopic.email_changed,
  NotificationTopic.phone_changed,
  NotificationTopic.login
]);

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly push: PushService
  ) {}

  async dispatch(input: NotificationInput) {
    const [user, preference] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: input.userId }, select: { id: true, name: true, email: true } }),
      this.prisma.notificationPreference.findUnique({ where: { userId_topic: { userId: input.userId, topic: input.topic } } })
    ]);
    if (!user) return null;
    const channel = preference?.channel ?? (emailOnly.has(input.topic) ? DeliveryChannel.email : DeliveryChannel.both);
    if (channel === DeliveryChannel.none) return null;

    const channels = channel === DeliveryChannel.both ? ["email", "push"] : [channel];
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        targetType: input.targetType,
        targetId: input.targetId,
        deliveries: { create: channels.map((item) => ({ userId: input.userId, channel: item })) }
      }
    });

    await Promise.all(channels.map((item) => this.deliver(notification.id, item, user, input)));
    return notification;
  }

  async registerPushSubscription(userId: string, input: RegisterPushSubscriptionDto, userAgent?: string) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: { userId, ...input, userAgent },
      update: { userId, p256dh: input.p256dh, auth: input.auth, userAgent }
    });
  }

  async removePushSubscription(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
    return { ok: true };
  }

  publicKey() {
    return { publicKey: this.push.publicKey() };
  }

  private async deliver(notificationId: string, channel: string, user: { id: string; name: string; email: string }, input: NotificationInput) {
    try {
      let provider = channel === "email" ? "resend" : "web-push";
      let providerId: string | undefined;
      let skipped = false;
      if (channel === "email") {
        const result = await this.mail.sendNotificationEmail({ to: user.email, name: user.name, title: input.title, body: input.body, targetType: input.targetType, targetId: input.targetId });
        provider = result.provider;
        providerId = result.providerId;
      } else {
        const subscriptions = await this.prisma.pushSubscription.findMany({ where: { userId: user.id } });
        if (!subscriptions.length) skipped = true;
        const results = await Promise.all(subscriptions.map((subscription) => this.push.send(subscription, { title: input.title, body: input.body, url: this.targetUrl(input) })));
        skipped ||= results.every((result) => result.skipped);
        providerId = results.find((result) => !result.skipped)?.providerId;
      }
      await this.prisma.notificationDelivery.update({
        where: { notificationId_channel: { notificationId, channel } },
        data: { status: skipped ? "skipped" : "sent", provider, providerId, attempts: { increment: 1 }, sentAt: skipped ? null : new Date(), lastError: null }
      });
    } catch (error) {
      await this.prisma.notificationDelivery.update({
        where: { notificationId_channel: { notificationId, channel } },
        data: { status: "failed", attempts: { increment: 1 }, lastError: error instanceof Error ? error.message.slice(0, 1000) : "Bilinmeyen teslimat hatası" }
      });
    }
  }

  private targetUrl(input: NotificationInput) {
    if (input.targetType === "post" && input.targetId) return `/feed?post=${input.targetId}`;
    if (input.targetType === "user" && input.targetId) return `/users/${input.targetId}`;
    if (input.targetType === "event" && input.targetId) return `/events/${input.targetId}`;
    if (input.targetType === "place" && input.targetId) return `/places/${input.targetId}`;
    return "/account";
  }
}
