import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { SmsService } from "../sms/sms.service";

@Injectable()
export class AutomationsService {
  constructor(private readonly prisma: PrismaService, private readonly mail: MailService, private readonly sms: SmsService, private readonly config: ConfigService) {}
  assertSecret(secret?: string) { const expected = this.config.get<string>("CRON_SECRET"); if (!expected || secret !== expected) throw new UnauthorizedException("Otomasyon anahtarı geçersiz."); }
  async sendEventReminders(now = new Date()) {
    const from = new Date(now.getTime() + 23 * 60 * 60 * 1000); const to = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const participants = await this.prisma.eventParticipant.findMany({ where: { status: { in: ["accepted", "invited"] }, event: { status: "published", startsAt: { gte: from, lte: to } } }, include: { event: { select: { id: true, title: true, slug: true, startsAt: true } }, user: { select: { id: true, name: true, email: true, phone: true, phoneVerified: true, notificationPreferences: { where: { topic: "event_invite" }, select: { channel: true } } } } } });
    let sent = 0; let skipped = 0; let failed = 0;
    for (const participant of participants) {
      const channel = participant.user.notificationPreferences[0]?.channel ?? "both";
      const channels = channel === "none" ? [] : channel === "both" ? ["email", "sms"] : channel === "push" ? [] : [channel];
      for (const deliveryChannel of channels) {
        if (deliveryChannel === "sms" && (!participant.user.phone || !participant.user.phoneVerified)) { skipped++; continue; }
        try {
          const delivery = await this.prisma.automatedMessageDelivery.create({ data: { userId: participant.user.id, targetType: "event", targetId: participant.event.id, messageType: "24_hour_reminder", channel: deliveryChannel, status: "pending" } });
          const result = deliveryChannel === "email" ? await this.mail.sendEventReminderEmail({ to: participant.user.email, name: participant.user.name, eventTitle: participant.event.title, eventSlug: participant.event.slug, startsAt: participant.event.startsAt }) : await this.sms.sendEventReminder(participant.user.phone!, participant.event.title, participant.event.startsAt, participant.event.slug);
          const providerId = result && "providerId" in result && typeof result.providerId === "string" ? result.providerId : undefined;
          await this.prisma.automatedMessageDelivery.update({ where: { id: delivery.id }, data: { status: "sent", providerId } }); sent++;
        } catch (error: any) {
          if (error?.code === "P2002") { skipped++; continue; }
          failed++;
        }
      }
    }
    return { candidates: participants.length, sent, skipped, failed, window: { from, to } };
  }
}
