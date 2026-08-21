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

  it("fails visibly when production mail credentials are missing", async () => {
    const productionService = new MailService({ get: jest.fn((key: string) => key === "NODE_ENV" ? "production" : undefined) } as never);
    await expect(productionService.sendVerificationEmail({ to: "user@example.com", name: "Ada", token: "token" })).rejects.toThrow("E-posta servisi yapılandırılmamış");
  });
});
