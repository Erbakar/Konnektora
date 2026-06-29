import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendAccountActivatedEmail(input: { to: string; name: string }) {
    const appUrl = this.getAppUrl();

    await this.send({
      to: input.to,
      subject: "Konnektora hesabın hazır",
      text: `Merhaba ${input.name}, Konnektora hesabın aktif. Etkinlikleri keşfetmek ve kendi etkinliğini yayınlamak için giriş yapabilirsin: ${appUrl}/account`,
      html: `<p>Merhaba ${input.name},</p><p>Konnektora hesabın aktif. Etkinlikleri keşfetmek ve kendi etkinliğini yayınlamak için giriş yapabilirsin.</p><p><a href="${appUrl}/account">Konnektora'ya gir</a></p>`
    });
  }

  async sendVerificationEmail(input: { to: string; name: string; token: string }) {
    const appUrl = this.getAppUrl();
    const verifyUrl = `${appUrl}/verify-email?token=${encodeURIComponent(input.token)}`;

    await this.send({
      to: input.to,
      subject: "Konnektora email doğrulama",
      text: `Merhaba ${input.name}, Konnektora hesabını doğrulamak için linki aç: ${verifyUrl}`,
      html: `<p>Merhaba ${input.name},</p><p>Konnektora hesabını doğrulamak için aşağıdaki linki aç.</p><p><a href="${verifyUrl}">Email adresimi doğrula</a></p>`
    });
  }

  async sendPasswordResetEmail(input: { to: string; name: string; token: string }) {
    const appUrl = this.getAppUrl();
    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(input.token)}`;

    await this.send({
      to: input.to,
      subject: "Konnektora şifre sıfırlama",
      text: `Merhaba ${input.name}, şifreni sıfırlamak için linki aç: ${resetUrl}`,
      html: `<p>Merhaba ${input.name},</p><p>Şifreni sıfırlamak için aşağıdaki linki aç.</p><p><a href="${resetUrl}">Şifremi sıfırla</a></p>`
    });
  }

  async sendEventInviteEmail(input: {
    to: string;
    name: string;
    eventTitle: string;
    eventSlug: string;
    invitedByName: string;
    acceptToken?: string;
  }) {
    const appUrl = this.getAppUrl();
    const eventUrl = `${appUrl}/events/${input.eventSlug}`;
    const acceptUrl = input.acceptToken ? `${appUrl}/accept-invite?token=${encodeURIComponent(input.acceptToken)}` : eventUrl;

    await this.send({
      to: input.to,
      subject: `${input.eventTitle} etkinliğine davetlisin`,
      text: `Merhaba ${input.name}, ${input.invitedByName} seni ${input.eventTitle} etkinliğine davet etti. Daveti kabul et: ${acceptUrl}`,
      html: `<p>Merhaba ${input.name},</p><p>${input.invitedByName} seni <strong>${input.eventTitle}</strong> etkinliğine davet etti.</p><p><a href="${acceptUrl}">Daveti görüntüle</a></p>`
    });
  }

  async sendModerationDecisionEmail(input: { to: string; name: string; decision: string; action: string; note?: string | null }) {
    await this.send({
      to: input.to,
      subject: "Konnektora moderasyon kararı",
      text: `Merhaba ${input.name}, içerikle ilgili moderasyon kararı: ${input.decision}. Aksiyon: ${input.action}. ${input.note ?? ""}`,
      html: `<p>Merhaba ${input.name},</p><p>İçerikle ilgili moderasyon kararı: <strong>${input.decision}</strong>.</p><p>Aksiyon: <strong>${input.action}</strong></p>${input.note ? `<p>${input.note}</p>` : ""}`
    });
  }

  async sendReportFeedbackEmail(input: { to: string; name: string; decision: string; note?: string | null }) {
    await this.send({
      to: input.to,
      subject: "Konnektora şikayet geri bildirimi",
      text: `Merhaba ${input.name}, bildirdiğin içerik incelendi. Karar: ${input.decision}. ${input.note ?? ""}`,
      html: `<p>Merhaba ${input.name},</p><p>Bildirdiğin içerik incelendi. Karar: <strong>${input.decision}</strong>.</p>${input.note ? `<p>${input.note}</p>` : ""}`
    });
  }

  private async send(message: MailMessage) {
    const apiKey = this.configService.get<string>("RESEND_API_KEY");
    const from = this.configService.get<string>("EMAIL_FROM");

    if (!apiKey || !from) {
      this.logger.log(`[mail:dev] ${message.subject} -> ${message.to}`);
      return;
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html
        })
      });

      if (!response.ok) {
        const details = await response.text();
        this.logger.error(`Mail gönderilemedi: ${response.status} ${details}`);
      }
    } catch (error) {
      this.logger.error("Mail provider'a ulaşılamadı.", error);
    }
  }

  private getAppUrl() {
    return this.configService.get<string>("PUBLIC_APP_URL")?.replace(/\/$/, "") ?? "http://localhost:5173";
  }
}
