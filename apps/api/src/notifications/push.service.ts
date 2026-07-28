import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import webpush from "web-push";

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(private readonly config: ConfigService) {}

  publicKey() {
    return this.config.get<string>("VAPID_PUBLIC_KEY") ?? null;
  }

  async send(subscription: { endpoint: string; p256dh: string; auth: string }, payload: Record<string, unknown>) {
    const publicKey = this.config.get<string>("VAPID_PUBLIC_KEY");
    const privateKey = this.config.get<string>("VAPID_PRIVATE_KEY");
    if (!publicKey || !privateKey) return { skipped: true as const };
    webpush.setVapidDetails(this.config.get<string>("VAPID_SUBJECT") ?? "mailto:support@konnektora.com", publicKey, privateKey);
    const result = await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 }
    );
    this.logger.debug(`Push delivered with status ${result.statusCode}.`);
    return { skipped: false as const, providerId: result.headers.location };
  }
}
