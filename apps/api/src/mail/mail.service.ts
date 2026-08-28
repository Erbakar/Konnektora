import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
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

  async sendNotificationEmail(input: { to: string; name: string; title: string; body: string; targetType?: string; targetId?: string; targetUrl?: string }) {
    const appUrl = this.getAppUrl();
    const targetUrl = input.targetUrl ? `${appUrl}${input.targetUrl}` : `${appUrl}/feed`;
    const safeName = this.escapeHtml(input.name);
    const safeBody = this.escapeHtml(input.body);
    return this.send({
      to: input.to,
      subject: input.title,
      text: `Merhaba ${input.name}, ${input.body} ${targetUrl}`,
      html: `<p>Merhaba ${safeName},</p><p>${safeBody}</p><p><a href="${targetUrl}">Konnektora'da görüntüle</a></p>`
    });
  }

  async sendAccountActivatedEmail(input: { to: string; name: string }) {
    const appUrl = this.getAppUrl();
    const feedUrl = `${appUrl}/feed`;
    const safeName = this.escapeHtml(input.name);

    await this.send({
      to: input.to,
      subject: "Konnektora'ya hoş geldin — hesabın hazır",
      text: `Merhaba ${input.name}, Konnektora hesabın hazır. Akışı keşfet, ilgilendiğin etkinliklere katıl ve profilini tamamla: ${feedUrl}`,
      html: this.renderBrandedEmail({
        preheader: "Konnektora hesabın hazır. Güvenilir bağlantılar kurmaya başla.",
        eyebrow: "HOŞ GELDİN",
        title: `Bağlantıların şimdi başlıyor, ${safeName}.`,
        intro: "Hesabın aktif. İlgi alanlarına göre insanları ve etkinlikleri keşfedebilir, kendi topluluğunu büyütmeye başlayabilirsin.",
        buttonLabel: "Akışa git",
        buttonUrl: feedUrl,
        highlights: [
          { number: "01", title: "Akışını keşfet", body: "İlgi alanlarına ve bağlantılarına göre seçilen içeriklere göz at." },
          { number: "02", title: "Etkinliklere katıl", body: "Yeni buluşmaları keşfet, davetlerini ve katılımını tek yerden yönet." },
          { number: "03", title: "Profilini tamamla", body: "Doğru kişilerin seni bulabilmesi için ilgi alanlarını ve bilgilerini ekle." }
        ],
        footerNote: "Bu e-posta, Konnektora üyeliğin başarıyla etkinleştirildiği için gönderildi."
      })
    });
  }

  async sendVerificationEmail(input: { to: string; name: string; token: string }) {
    const appUrl = this.getAppUrl();
    const verifyUrl = `${appUrl}/verify-email?token=${encodeURIComponent(input.token)}`;
    const safeName = this.escapeHtml(input.name);

    await this.send({
      to: input.to,
      subject: "E-posta adresini doğrula — Konnektora",
      text: `Merhaba ${input.name}, Konnektora üyeliğine devam etmek için e-posta adresini 24 saat içinde doğrula: ${verifyUrl}`,
      html: this.renderBrandedEmail({
        preheader: "Konnektora üyeliğine devam etmek için e-posta adresini doğrula.",
        eyebrow: "SON BİR ADIM",
        title: `E-posta adresini doğrula, ${safeName}.`,
        intro: "Güvenilir bir topluluğun parçası olman için bu adresin sana ait olduğunu doğrulamamız gerekiyor.",
        buttonLabel: "E-posta adresimi doğrula",
        buttonUrl: verifyUrl,
        notice: "Bu bağlantı 24 saat boyunca geçerlidir. Ardından üyelik akışına kaldığın yerden devam edebilirsin.",
        footerNote: "Bu hesabı sen oluşturmadıysan e-postayı yok sayabilirsin; herhangi bir işlem yapılmaz."
      })
    });
  }

  async sendPasswordResetEmail(input: { to: string; name: string; token: string }) {
    const appUrl = this.getAppUrl();
    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(input.token)}`;
    const safeName = this.escapeHtml(input.name);

    await this.send({
      to: input.to,
      subject: "Şifreni güvenle yenile — Konnektora",
      text: `Merhaba ${input.name}, Konnektora şifreni yenilemek için bağlantıyı 30 dakika içinde aç: ${resetUrl}`,
      html: this.renderBrandedEmail({
        preheader: "Konnektora şifreni güvenli biçimde yenile.",
        eyebrow: "HESAP GÜVENLİĞİ",
        title: `Şifreni yenile, ${safeName}.`,
        intro: "Hesabın için bir şifre yenileme talebi aldık. Aşağıdaki güvenli bağlantıdan yeni şifreni belirleyebilirsin.",
        buttonLabel: "Şifremi yenile",
        buttonUrl: resetUrl,
        notice: "Bu bağlantı 30 dakika boyunca ve yalnızca bir kez kullanılabilir.",
        footerNote: "Bu talebi sen oluşturmadıysan e-postayı yok sayabilirsin; mevcut şifren değişmez."
      })
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

  async sendPlaceInviteEmail(input: { to: string; name: string; placeName: string; placeSlug: string; invitedByName: string; acceptToken?: string }) {
    const appUrl = this.getAppUrl();
    const placeUrl = `${appUrl}/places/${input.placeSlug}`;
    const acceptUrl = input.acceptToken ? `${appUrl}/accept-invite?token=${encodeURIComponent(input.acceptToken)}` : placeUrl;
    await this.send({
      to: input.to,
      subject: `${input.placeName} mekânına davetlisin`,
      text: `Merhaba ${input.name}, ${input.invitedByName} seni ${input.placeName} mekânına davet etti. Daveti görüntüle: ${acceptUrl}`,
      html: `<p>Merhaba ${this.escapeHtml(input.name)},</p><p><strong>${this.escapeHtml(input.invitedByName)}</strong> seni <strong>${this.escapeHtml(input.placeName)}</strong> mekânına davet etti.</p><p><a href="${acceptUrl}">Daveti görüntüle</a></p>`,
    });
  }

  async sendEventReminderEmail(input: { to: string; name: string; eventTitle: string; eventSlug: string; startsAt: Date }) {
    const eventUrl = `${this.getAppUrl()}/events/${input.eventSlug}`;
    return this.send({ to: input.to, subject: `${input.eventTitle} yarın başlıyor`, text: `Merhaba ${input.name}, ${input.eventTitle} etkinliği ${input.startsAt.toLocaleString("tr-TR")} tarihinde başlıyor. ${eventUrl}`, html: `<p>Merhaba ${this.escapeHtml(input.name)},</p><p><strong>${this.escapeHtml(input.eventTitle)}</strong> etkinliği yarın başlıyor.</p><p>${input.startsAt.toLocaleString("tr-TR")}</p><p><a href="${eventUrl}">Etkinliği görüntüle</a></p>` });
  }

  async sendContactInviteEmail(input: { to: string; name: string; invitedByName: string }) {
    const appUrl = this.getAppUrl();
    await this.send({
      to: input.to,
      subject: `${input.invitedByName} seni Konnektora'ya davet etti`,
      text: `Merhaba ${input.name}, ${input.invitedByName} seni Konnektora topluluğuna davet etti: ${appUrl}`,
      html: `<p>Merhaba ${input.name},</p><p><strong>${input.invitedByName}</strong> seni Konnektora topluluğuna davet etti.</p><p><a href="${appUrl}">Konnektora'yı keşfet</a></p>`
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

  async sendAdminUserInterventionEmail(input: { to: string; name: string; action: string; note?: string | null; until?: Date | null }) {
    const untilText = input.until ? ` Bitiş zamanı: ${input.until.toISOString()}.` : "";

    await this.send({
      to: input.to,
      subject: "Konnektora hesap müdahalesi",
      text: `Merhaba ${input.name}, hesabınla ilgili admin müdahalesi uygulandı: ${input.action}.${untilText} ${input.note ?? ""}`,
      html: `<p>Merhaba ${input.name},</p><p>Hesabınla ilgili admin müdahalesi uygulandı: <strong>${input.action}</strong>.</p>${input.until ? `<p>Bitiş zamanı: ${input.until.toISOString()}</p>` : ""}${input.note ? `<p>${input.note}</p>` : ""}`
    });
  }

  private async send(message: MailMessage): Promise<{ provider: string; providerId?: string }> {
    const apiKey = this.configService.get<string>("RESEND_API_KEY");
    const from = this.configService.get<string>("EMAIL_FROM");
    const replyTo = this.configService.get<string>("EMAIL_REPLY_TO");

    if (!apiKey || !from) {
      if (this.configService.get<string>("NODE_ENV") === "production") {
        this.logger.error("Canlı e-posta gönderimi için RESEND_API_KEY ve EMAIL_FROM gerekli.");
        throw new ServiceUnavailableException("E-posta servisi yapılandırılmamış.");
      }
      this.logger.log(`[mail:dev] ${message.subject} -> ${message.to}`);
      return { provider: "development" };
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
          html: message.html,
          ...(replyTo ? { reply_to: replyTo } : {})
        })
      });

      if (!response.ok) {
        const details = await response.text();
        this.logger.error(`Mail gönderilemedi: ${response.status} ${details}`);
        throw new Error(`E-posta sağlayıcısı ${response.status} yanıtı verdi.`);
      }
      const payload = await response.json() as { id?: string };
      this.logger.log(`E-posta Resend tarafından kabul edildi${payload.id ? ` (${payload.id})` : ""}.`);
      return { provider: "resend", providerId: payload.id };
    } catch (error) {
      this.logger.error("Mail provider'a ulaşılamadı.", error);
      throw error;
    }
  }

  private getAppUrl() {
    return this.configService.get<string>("PUBLIC_APP_URL")?.replace(/\/$/, "") ?? "http://localhost:5173";
  }

  private renderBrandedEmail(input: {
    preheader: string;
    eyebrow: string;
    title: string;
    intro: string;
    buttonLabel: string;
    buttonUrl: string;
    notice?: string;
    highlights?: Array<{ number: string; title: string; body: string }>;
    footerNote: string;
  }) {
    const highlights = input.highlights?.map((item) => `<tr><td style="padding:0 0 12px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;background:#f2f8f4;border:1px solid #dce7df;border-radius:14px;"><tr><td width="46" valign="top" style="padding:16px 0 16px 16px;color:#1d6545;font:800 12px/1.4 Arial,sans-serif;letter-spacing:.08em;">${item.number}</td><td style="padding:14px 16px 14px 8px;"><div style="color:#10231f;font:700 15px/1.4 Arial,sans-serif;">${item.title}</div><div style="padding-top:3px;color:#627169;font:400 13px/1.55 Arial,sans-serif;">${item.body}</div></td></tr></table></td></tr>`).join("") ?? "";
    const notice = input.notice ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border-collapse:separate;background:#f2f8f4;border-left:4px solid #38a96c;border-radius:10px;"><tr><td style="padding:14px 16px;color:#365148;font:400 13px/1.55 Arial,sans-serif;">${input.notice}</td></tr></table>` : "";

    return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${input.title}</title></head><body style="margin:0;padding:0;background:#f6f8f6;color:#10231f;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${input.preheader}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#f6f8f6;border-collapse:collapse;"><tr><td align="center" style="padding:28px 12px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:620px;border-collapse:separate;background:#ffffff;border:1px solid #dce7df;border-radius:24px;overflow:hidden;"><tr><td style="padding:24px 30px;background:#103c2c;"><table role="presentation" cellspacing="0" cellpadding="0"><tr><td width="42" height="42" align="center" style="width:42px;height:42px;border-radius:11px;background:#caff6a;color:#103c2c;font:900 21px/42px Arial,sans-serif;">K</td><td style="padding-left:12px;color:#ffffff;font:800 20px/1.2 Arial,sans-serif;letter-spacing:-.4px;">Konnektora</td></tr></table></td></tr><tr><td style="padding:42px 34px 34px;"><div style="margin-bottom:14px;color:#1d6545;font:800 11px/1.4 Arial,sans-serif;letter-spacing:.16em;">${input.eyebrow}</div><h1 style="margin:0;color:#10231f;font:800 32px/1.16 Arial,sans-serif;letter-spacing:-.8px;">${input.title}</h1><p style="margin:18px 0 0;color:#526159;font:400 16px/1.65 Arial,sans-serif;">${input.intro}</p><table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;"><tr><td style="border-radius:10px;background:#1d6545;"><a href="${input.buttonUrl}" style="display:inline-block;padding:14px 22px;color:#ffffff;font:700 15px/1.2 Arial,sans-serif;text-decoration:none;">${input.buttonLabel} →</a></td></tr></table>${notice}${highlights ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:28px;border-collapse:collapse;">${highlights}</table>` : ""}<p style="margin:28px 0 0;color:#7a8780;font:400 12px/1.6 Arial,sans-serif;">Buton çalışmıyorsa bu bağlantıyı tarayıcında aç:<br><a href="${input.buttonUrl}" style="color:#1d6545;text-decoration:underline;word-break:break-all;">${input.buttonUrl}</a></p></td></tr><tr><td style="padding:22px 34px;background:#f2f8f4;border-top:1px solid #dce7df;"><p style="margin:0;color:#627169;font:400 12px/1.6 Arial,sans-serif;">${input.footerNote}</p><p style="margin:10px 0 0;color:#87938d;font:400 11px/1.5 Arial,sans-serif;">© ${new Date().getFullYear()} Konnektora · Güvenilir bağlantılar, anlamlı topluluklar.</p></td></tr></table></td></tr></table></body></html>`;
  }

  private escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]!);
  }
}
