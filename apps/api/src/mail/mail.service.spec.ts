import { MailService } from "./mail.service";

describe("MailService branded account emails", () => {
  const config = { get: jest.fn((key: string) => ({ RESEND_API_KEY: "re_test", EMAIL_FROM: "Konnektora <noreply@konnektora.com>", EMAIL_REPLY_TO: "support@konnektora.com", PUBLIC_APP_URL: "https://konnektora.com", NODE_ENV: "production" })[key]) };
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "email-1" }) });
  let service: MailService;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as typeof fetch;
    service = new MailService(config as never);
  });

  it("sends a branded verification email with an escaped name and token link", async () => {
    await service.sendVerificationEmail({ to: "user@example.com", name: "Ada <Admin>", token: "a+b" });
    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(request.subject).toBe("E-posta adresini doğrula — Konnektora");
    expect(request.html).toContain("Ada &lt;Admin&gt;");
    expect(request.html).toContain("/verify-email?token=a%2Bb");
    expect(request.html).toContain("Bu bağlantı 24 saat boyunca geçerlidir");
    expect(request.html).toContain("background:#103c2c");
    expect(request.reply_to).toBe("support@konnektora.com");
  });

  it("sends a branded welcome email that links to the feed", async () => {
    await service.sendAccountActivatedEmail({ to: "user@example.com", name: "Ada" });
    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(request.subject).toContain("hoş geldin");
    expect(request.html).toContain("https://konnektora.com/feed");
    expect(request.html).toContain("Akışını keşfet");
    expect(request.html).toContain("Profilini tamamla");
  });

  it("renders password reset as a branded security email", async () => {
    await service.sendPasswordResetEmail({ to: "user@example.com", name: "Ada", token: "reset-token" });
    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(request.subject).toBe("Şifreni güvenle yenile — Konnektora");
    expect(request.html).toContain("HESAP GÜVENLİĞİ");
    expect(request.html).toContain("/reset-password?token=reset-token");
    expect(request.html).toContain("30 dakika");
  });

  it("uses the corporate template for event invitations", async () => {
    await service.sendEventInviteEmail({ to: "user@example.com", name: "Ada", eventTitle: "Tasarım Buluşması", eventSlug: "tasarim-bulusmasi", invitedByName: "Deniz" });
    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(request.html).toContain("ETKİNLİK DAVETİ");
    expect(request.html).toContain("background:#103c2c");
    expect(request.html).toContain("/notifications?tab=waiting");
  });

  it("sends detailed curator applications to the curator inbox and replies to the applicant", async () => {
    await service.sendCuratorApplicationEmail({ applicationId: "application-1", name: "Ada", email: "ada@example.com", city: "İstanbul", country: "Türkiye", motivation: "Topluluğu büyütmek ve yerel etkinlikleri desteklemek istiyorum.", cvUrl: "https://example.com/cv", userId: "user-1", preferredLanguage: "tr", submittedAt: new Date("2026-09-28T10:00:00.000Z") });
    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(request.to).toEqual(["curator@konnektora.com"]);
    expect(request.reply_to).toBe("ada@example.com");
    expect(request.html).toContain("YENİ KÜRATÖR BAŞVURUSU");
    expect(request.html).toContain("Varsayılan dil");
    expect(request.html).toContain("https://example.com/cv");
  });

  it("sends a manager invitation with the registration link for an unregistered place manager", async () => {
    await service.sendPlaceInviteEmail({ to: "user@example.com", name: "Ada", placeName: "Studio", placeSlug: "studio", invitedByName: "@deniz", manager: true, acceptToken: "manager-token" });
    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(request.subject).toBe("Mekân yöneticiliği daveti — Studio");
    expect(request.html).toContain("yönetici olarak");
    expect(request.html).toContain("accept-invite?token=manager-token");
  });

  it("attaches the transferred ticket PDF and links existing members to their tickets", async () => {
    const pdf = Buffer.from("%PDF-test-ticket");
    await service.sendTicketTransferEmail({ to: "user@example.com", name: "Ada", eventTitle: "Konser", invitedByName: "@deniz", quantity: 2, pdf });
    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(request.attachments).toEqual([{ filename: "konnektora-biletler.pdf", content: pdf.toString("base64") }]);
    expect(request.html).toContain("https://konnektora.com/tickets");
    expect(request.html).not.toContain("accept-invite");
  });

  it("fails visibly when production mail credentials are missing", async () => {
    const productionService = new MailService({ get: jest.fn((key: string) => key === "NODE_ENV" ? "production" : undefined) } as never);
    await expect(productionService.sendVerificationEmail({ to: "user@example.com", name: "Ada", token: "token" })).rejects.toThrow("E-posta servisi yapılandırılmamış");
  });
  it.each([["suspend_7_days",7],["suspend_30_days",30]])("explains %s and links the rules",async(action,days)=>{
    await service.sendAdminUserInterventionEmail({to:"user@example.com",name:"Ada",action});
    const message=JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(message.subject).toContain(`${days} günlüğüne`);expect(message.html).toContain("kalıcı olarak kapatılacaktır");expect(message.html).toContain("https://konnektora.com/help/rules");
  });
  it("explains a permanent account closure",async()=>{
    await service.sendAdminUserInterventionEmail({to:"user@example.com",name:"Ada",action:"ban_user"});
    const message=JSON.parse(fetchMock.mock.calls[0][1].body as string);expect(message.subject).toContain("kapatılmıştır");expect(message.html).toContain("kalıcı olarak kapatılmıştır");
  });

});
