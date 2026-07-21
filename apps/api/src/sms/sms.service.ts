import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService) {}

  async sendVerificationCode(phone: string, code: string) {
    const webhookUrl = this.config.get<string>("SMS_WEBHOOK_URL");
    const apiKey = this.config.get<string>("SMS_API_KEY");

    if (!webhookUrl) {
      if (this.config.get<string>("NODE_ENV") === "production") {
        throw new ServiceUnavailableException("SMS servisi yapılandırılmamış.");
      }
      this.logger.warn(`Development SMS code for ${phone}: ${code}`);
      return;
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({ to: phone, message: `Konnektora doğrulama kodunuz: ${code}. Kod 2 dakika geçerlidir.` })
    });

    if (!response.ok) {
      this.logger.error(`SMS provider returned ${response.status}.`);
      throw new ServiceUnavailableException("SMS gönderilemedi.");
    }
  }

  async sendContactInvite(phone: string, invitedByName: string) {
    const webhookUrl = this.config.get<string>("SMS_WEBHOOK_URL");
    if (!webhookUrl) {
      if (this.config.get<string>("NODE_ENV") === "production") throw new ServiceUnavailableException("SMS servisi yapılandırılmamış.");
      this.logger.log(`[sms:dev] Contact invitation -> ${phone}`);
      return;
    }
    const response = await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json", ...(this.config.get<string>("SMS_API_KEY") ? { Authorization: `Bearer ${this.config.get<string>("SMS_API_KEY")}` } : {}) }, body: JSON.stringify({ to: phone, message: `${invitedByName} seni Konnektora'ya davet etti. Topluluğu keşfet: ${this.config.get<string>("PUBLIC_APP_URL") ?? "https://konnektora.com"}` }) });
    if (!response.ok) throw new ServiceUnavailableException("SMS gönderilemedi.");
  }
}
