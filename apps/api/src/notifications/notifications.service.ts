import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
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

const topicByType: Record<string, NotificationTopic> = {
  private_message: NotificationTopic.private_message,
  mention: NotificationTopic.mention,
  comment: NotificationTopic.comment,
  event_invite: NotificationTopic.event_invite,
  event_manager: NotificationTopic.event_manager,
  place_invite: NotificationTopic.place_invite,
  place_manager: NotificationTopic.place_manager,
  tag_request: NotificationTopic.tag_request,
  login: NotificationTopic.login,
  password_changed: NotificationTopic.password_changed,
  email_changed: NotificationTopic.email_changed,
  phone_changed: NotificationTopic.phone_changed,
  corporate_kyc: NotificationTopic.admin_message,
  admin_message: NotificationTopic.admin_message
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

  async getContentSubscription(userId: string, targetType: string, targetId: string) {
    this.assertContentTargetType(targetType);
    const subscription = await this.prisma.contentNotificationSubscription.findUnique({ where: { userId_targetType_targetId: { userId, targetType, targetId } } });
    return { enabled: subscription?.enabled ?? false };
  }

  async setContentSubscription(userId: string, targetType: string, targetId: string, enabled: boolean) {
    this.assertContentTargetType(targetType);
    const model = targetType === "tag" ? this.prisma.tag : targetType === "event" ? this.prisma.event : targetType === "place" ? this.prisma.place : this.prisma.user;
    const target = await (model as any).findUnique({ where: { id: targetId }, select: { id: true } });
    if (!target) throw new NotFoundException("Bildirim hedefi bulunamadı.");
    const subscription = await this.prisma.contentNotificationSubscription.upsert({
      where: { userId_targetType_targetId: { userId, targetType, targetId } },
      create: { userId, targetType, targetId, enabled },
      update: { enabled }
    });
    return { enabled: subscription.enabled };
  }

  private assertContentTargetType(targetType: string) {
    if (!["tag", "event", "place", "user"].includes(targetType)) throw new BadRequestException("Bildirim hedef türü geçersiz.");
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

  listDeliveries(status?: string) {
    return this.prisma.notificationDelivery.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        notification: { select: { type: true, title: true, body: true, targetType: true, targetId: true } },
        user: { select: { id: true, name: true, email: true } }
      }
    });
  }

  async retryDelivery(id: string) {
    const delivery = await this.prisma.notificationDelivery.findUnique({
      where: { id },
      include: {
        notification: true,
        user: { select: { id: true, name: true, email: true } }
      }
    });
    if (!delivery) return null;
    await this.prisma.notificationDelivery.update({ where: { id }, data: { status: "pending", lastError: null } });
    await this.deliver(delivery.notificationId, delivery.channel, delivery.user, {
      userId: delivery.userId,
      topic: topicByType[delivery.notification.type] ?? NotificationTopic.admin_message,
      type: delivery.notification.type,
      title: delivery.notification.title,
      body: delivery.notification.body,
      targetType: delivery.notification.targetType ?? undefined,
      targetId: delivery.notification.targetId ?? undefined
    });
    return this.prisma.notificationDelivery.findUnique({
      where: { id },
      include: {
        notification: { select: { type: true, title: true, body: true, targetType: true, targetId: true } },
        user: { select: { id: true, name: true, email: true } }
      }
    });
  }

  private async deliver(notificationId: string, channel: string, user: { id: string; name: string; email: string }, input: NotificationInput) {
    try {
      const targetUrl = await this.targetUrl(input);
      let provider = channel === "email" ? "resend" : "web-push";
      let providerId: string | undefined;
      let skipped = false;
      if (channel === "email") {
        const result = await this.mail.sendNotificationEmail({ to: user.email, name: user.name, title: input.title, body: input.body, targetType: input.targetType, targetId: input.targetId, targetUrl });
        provider = result.provider;
        providerId = result.providerId;
      } else {
        const subscriptions = await this.prisma.pushSubscription.findMany({ where: { userId: user.id } });
        if (!subscriptions.length) skipped = true;
        const results = await Promise.all(subscriptions.map((subscription) => this.push.send(subscription, { title: input.title, body: input.body, url: targetUrl })));
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

  private async targetUrl(input: NotificationInput) {
    if (input.targetType === "post" && input.targetId) return `/feed?post=${input.targetId}`;
    if (input.targetType === "user" && input.targetId) return `/users/id/${input.targetId}`;
    if (input.targetType === "event" && input.targetId) {
      const event = await this.prisma.event.findUnique({ where: { id: input.targetId }, select: { slug: true } });
      return event ? `/events/${event.slug}` : "/events";
    }
    if (input.targetType === "place" && input.targetId) {
      const place = await this.prisma.place.findUnique({ where: { id: input.targetId }, select: { slug: true } });
      return place ? `/places/${place.slug}` : "/places";
    }
    if (input.targetType === "tag" && input.targetId) {
      const tag = await this.prisma.tag.findUnique({ where: { id: input.targetId }, select: { slug: true } });
      return tag ? `/tags/${tag.slug}` : "/tags";
    }
    return "/feed";
  }
}
