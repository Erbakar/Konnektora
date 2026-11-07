import { notifyRegistration } from "../notifications/activity-events";
import { OAuth2Client } from "google-auth-library";
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { User } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { createHash, randomBytes, randomInt } from "crypto";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { SmsService } from "../sms/sms.service";
import { AcceptInviteDto, AvailabilityQueryDto, ChangeEmailDto, ChangePasswordDto, ConfirmPhoneVerificationDto, DeactivateAccountDto, EmailDto, LoginDto, PasswordResetRequestDto, RegisterDto, RequestPhoneVerificationDto, ResetPasswordDto, SocialAuthDto, TokenDto } from "./auth.dto";

const EMAIL_TOKEN_TTL_MS = {
  verify_email: 1000 * 60 * 60 * 24,
  password_reset: 1000 * 60 * 30,
  invite_accept: 1000 * 60 * 60 * 24 * 14,
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly smsService: SmsService,
    private readonly config: ConfigService,
  ) {}

  async login(input: LoginDto, options: { adminOnly?: boolean } = {}) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.trim().toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException("Geçersiz kullanıcı hesabı.");
    }

    const passwordMatches = await compare(input.password, user.passwordHash);
    if (!passwordMatches) throw new UnauthorizedException("Geçersiz kullanıcı hesabı.");
    if (user.status === "frozen") {
      throw new UnauthorizedException("Dondurulmuş hesap yeniden etkinleştirme onayı gerektiriyor.");
    }
    if (!["active", "pending"].includes(user.status)) throw new UnauthorizedException("Geçersiz kullanıcı hesabı.");

    if (options.adminOnly && !["admin", "super_admin"].includes(user.role)) {
      throw new UnauthorizedException("Admin yetkisi gerekli.");
    }

    const loggedInUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastOnlineAt: new Date() },
    });
    return this.createLoginResponse(loggedInUser);
  }

  async register(input: RegisterDto) {
    const email = input.email.toLowerCase().trim();
    const emailOwner = await this.prisma.user.findUnique({ where: { email } });
    const phoneOwner = await this.prisma.user.findFirst({ where: { phone: input.phone, email: { not: email } } });
    if (phoneOwner) throw new ConflictException("Bu telefon numarası zaten kullanılıyor. Davet aldıysanız davet bağlantısını kullanın.");
    if (emailOwner) {
      // Registration must never replace credentials or disclose an existing account.
      throw new ConflictException("Bu e-posta adresi zaten kullanılıyor. Giriş, şifre sıfırlama veya davet bağlantısını kullanın.");
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        name: input.name.trim(),
        phone: input.phone,
        phoneVerified: false,
        passwordHash: await hash(input.password, 10),
        accountType: input.accountType ?? "individual",
        companyName: input.accountType === "corporate" ? input.companyName?.trim() : null,
        tradeName: input.accountType === "corporate" ? input.tradeName?.trim() : null,
        companyType: input.accountType === "corporate" ? input.companyType : null,
        businessCategory: input.accountType === "corporate" ? input.businessCategory : null,
        role: "user",
        status: "pending",
      },
    });

    await notifyRegistration(this.prisma, user);
    const token = await this.createEmailToken(user.id, "verify_email");
    const verificationEmailSent = await this.sendVerificationEmailSafely({
      to: user.email,
      name: user.name,
      token,
    });

    return {
      ...(await this.createLoginResponse(user)),
      verificationEmailSent,
    };
  }

  async socialLogin(input: SocialAuthDto) {
    const identity = await this.verifySocialCredential(input);
    const linked = await this.prisma.socialAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: input.provider,
          providerUserId: identity.id,
        },
      },
      include: { user: true },
    });
    if (linked) {
      if (!["active", "pending"].includes(linked.user.status)) throw new UnauthorizedException("Bu hesapla giriş yapılamıyor.");
      await this.prisma.socialAccount.update({
        where: { id: linked.id },
        data: {
          lastUsedAt: new Date(),
          email: identity.email,
          displayName: identity.name,
          avatarUrl: identity.avatarUrl,
        },
      });
      return this.createLoginResponse(linked.user);
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: identity.email },
    });
    if (existing) throw new ConflictException("Bu e-posta ile bir hesap mevcut. Önce mevcut hesabınıza giriş yapıp Ayarlar bölümünden sosyal hesabınızı bağlayın.");
    const user = await this.prisma.user.create({
      data: {
        email: identity.email,
        name: identity.name,
        accountType: input.accountType ?? "individual",
        passwordHash: await hash(randomBytes(32).toString("hex"), 10),
        emailVerified: true,
        status: "pending",
        socialAccounts: {
          create: {
            provider: input.provider,
            providerUserId: identity.id,
            email: identity.email,
            displayName: identity.name,
            avatarUrl: identity.avatarUrl,
          },
        },
      },
    });
    await notifyRegistration(this.prisma, user);
    return this.createLoginResponse(user);
  }

  async listSocialAccounts(userId: string) {
    return this.prisma.socialAccount.findMany({
      where: { userId },
      select: {
        provider: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        connectedAt: true,
        lastUsedAt: true,
      },
      orderBy: { provider: "asc" },
    });
  }

  async connectSocialAccount(userId: string, input: SocialAuthDto) {
    const identity = await this.verifySocialCredential(input);
    const owned = await this.prisma.socialAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: input.provider,
          providerUserId: identity.id,
        },
      },
    });
    if (owned && owned.userId !== userId) throw new ConflictException("Bu sosyal hesap başka bir üyeye bağlı.");
    await this.prisma.socialAccount.upsert({
      where: { userId_provider: { userId, provider: input.provider } },
      create: {
        userId,
        provider: input.provider,
        providerUserId: identity.id,
        email: identity.email,
        displayName: identity.name,
        avatarUrl: identity.avatarUrl,
      },
      update: {
        providerUserId: identity.id,
        email: identity.email,
        displayName: identity.name,
        avatarUrl: identity.avatarUrl,
        lastUsedAt: new Date(),
      },
    });
    return this.listSocialAccounts(userId);
  }

  async removeSocialAccount(userId: string, provider: "google" | "facebook") {
    await this.prisma.socialAccount.deleteMany({ where: { userId, provider } });
    return this.listSocialAccounts(userId);
  }

  private async verifySocialCredential(input: SocialAuthDto) {
    if (this.config.get("NODE_ENV") === "test" && input.credential === `demo-${input.provider}`) {
      const provider = input.provider;
      return {
        id: `${provider}-demo-user`,
        email: `demo.${provider}@konnektora.local`,
        name: `${provider === "google" ? "Google" : "Facebook"} Demo`,
        avatarUrl: null as string | null,
      };
    }
    const googleClientId = this.config.get<string>("GOOGLE_CLIENT_ID");
    const facebookAppId = this.config.get<string>("FACEBOOK_APP_ID");
    const facebookAppSecret = this.config.get<string>("FACEBOOK_APP_SECRET");
    if (input.provider === "google" && !googleClientId) throw new UnauthorizedException("Google girişi yapılandırılmamış.");
    if (input.provider === "facebook" && (!facebookAppId || !facebookAppSecret)) throw new UnauthorizedException("Facebook girişi yapılandırılmamış.");
    try {
      if (input.provider === "google") {
        const ticket = await new OAuth2Client().verifyIdToken({ idToken: input.credential, audience: googleClientId });
        const data = ticket.getPayload();
        if (!data?.sub || !data.email || !data.email_verified) throw new UnauthorizedException("Doğrulanmış Google e-postası gerekli.");
        return { id: data.sub, email: data.email.trim().toLowerCase(), name: data.name || data.email, avatarUrl: data.picture || null };
      }
      const debug = await fetch(`https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(input.credential)}&access_token=${encodeURIComponent(`${facebookAppId}|${facebookAppSecret}`)}`, { signal: AbortSignal.timeout(10000) });
      const payload = await debug.json() as { data?: { is_valid?: boolean; app_id?: string; user_id?: string; expires_at?: number; data_access_expires_at?: number } };
      const token = payload.data;
      const now = Date.now() / 1000;
      if (!debug.ok || !token?.is_valid || token.app_id !== facebookAppId || !token.user_id || (token.expires_at && token.expires_at <= now) || (token.data_access_expires_at && token.data_access_expires_at <= now)) throw new UnauthorizedException("Facebook oturumu geçersiz veya süresi dolmuş.");
      const response = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(input.credential)}`, { signal: AbortSignal.timeout(10000) });
      const data = await response.json() as { id?: string; email?: string; name?: string; picture?: { data?: { url?: string } } };
      if (!response.ok || data.id !== token.user_id) throw new UnauthorizedException("Facebook hesabı doğrulanamadı.");
      if (!data.email) throw new UnauthorizedException("Facebook hesabınızda e-posta bulunmalı ve e-posta paylaşımına izin vermelisiniz.");
      return { id: data.id, email: data.email.trim().toLowerCase(), name: data.name || data.email, avatarUrl: data.picture?.data?.url || null };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException("Sosyal hesap doğrulanamadı. Lütfen yeniden giriş yapın.");
    }
  }

  async requestEmailVerification(input: EmailDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });

    if (!user || user.status === "active") {
      return { ok: true };
    }

    const token = await this.createEmailToken(user.id, "verify_email");
    const sent = await this.sendVerificationEmailSafely({
      to: user.email,
      name: user.name,
      token,
    });
    return { ok: true, sent };
  }

  async confirmEmail(input: TokenDto) {
    const token = await this.consumeEmailToken(input.token, "verify_email");
    const user = await this.prisma.user.update({
      where: { id: token.userId },
      data: { emailVerified: true },
    });
    return this.createLoginResponse(user);
  }

  async requestPasswordReset(input: PasswordResetRequestDto) {
    const channel = input.channel ?? "email";
    const user = channel === "phone"
      ? await this.prisma.user.findFirst({ where: { phone: input.phone?.trim() } })
      : await this.prisma.user.findUnique({ where: { email: input.email!.toLowerCase().trim() } });

    if (!user || ["disabled", "suspended", "banned", "deleted"].includes(user.status)) {
      return { ok: true };
    }

    const token = await this.createEmailToken(user.id, "password_reset");
    if (channel === "phone" && user.phone) {
      await this.smsService.sendPasswordResetLink(user.phone, token);
    } else {
      await this.mailService.sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        token,
      });
    }
    return { ok: true };
  }

  async sendVerificationForUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException("Kullanıcı bulunamadı.");
    }

    const token = await this.createEmailToken(user.id, "verify_email");
    const sent = await this.sendVerificationEmailSafely({
      to: user.email,
      name: user.name,
      token,
    });
    return { ok: true, sent };
  }

  async sendPasswordResetForUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException("Kullanıcı bulunamadı.");
    }

    const token = await this.createEmailToken(user.id, "password_reset");
    await this.mailService.sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      token,
    });
    return { ok: true };
  }

  async resetPassword(input: ResetPasswordDto) {
    const token = await this.consumeEmailToken(input.token, "password_reset");
    const user = await this.prisma.user.update({
      where: { id: token.userId },
      data: {
        passwordHash: await hash(input.password, 10),
        sessionVersion: { increment: 1 },
      },
    });

    return this.createLoginResponse(user);
  }

  async changePassword(userId: string, input: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await compare(input.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException("Mevcut şifre hatalı.");
    }

    if (await compare(input.newPassword, user.passwordHash)) {
      throw new ConflictException("Yeni şifre mevcut şifreden farklı olmalıdır.");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hash(input.newPassword, 10), sessionVersion: { increment: 1 } },
    });
    return { ok: true };
  }

  async changeEmail(userId: string, input: ChangeEmailDto) {
    const email = input.email.toLowerCase().trim();
    const [user, existing] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.user.findUnique({ where: { email }, select: { id: true } }),
    ]);
    if (!user || !(await compare(input.currentPassword, user.passwordHash)))
      throw new UnauthorizedException("Mevcut şifre hatalı.");
    if (existing && existing.id !== userId)
      throw new ConflictException("Bu e-posta adresi zaten kullanımda.");
    if (user.email === email) return { ok: true, sent: true, email };
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { email, emailVerified: false },
    });
    const token = await this.createEmailToken(userId, "verify_email");
    const sent = await this.sendVerificationEmailSafely({
      to: email,
      name: updated.name,
      token,
    });
    return { ok: true, sent, email };
  }

  async deactivate(userId: string, input: DeactivateAccountDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await compare(input.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException("Mevcut şifre hatalı.");
    }

    await this.prisma.$transaction([
      this.prisma.event.updateMany({
        where: {
          createdById: userId,
          status: { in: ["draft", "published"] },
          participants: {
            none: {
              userId: { not: userId },
              role: { in: ["organizer", "manager"] },
              status: { in: ["accepted", "attended"] },
            },
          },
        },
        data: { status: "archived" },
      }),
      this.prisma.place.updateMany({
        where: { createdById: userId, status: "active" },
        data: { status: "archived" },
      }),
      this.prisma.userMessage.create({
        data: {
          type: "account_freeze",
          userId,
          name: user.name,
          email: user.email,
          phone: user.phone,
          body: input.reason.trim(),
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { status: "frozen" },
      }),
    ]);

    return { ok: true };
  }

  async reactivate(input: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });
    if (!user || user.status !== "frozen" || !(await compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException("Dondurulmuş hesap bilgileri geçersiz.");
    }

    const activeUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { status: "active" },
    });
    return this.createLoginResponse(activeUser);
  }

  async requestPhoneVerification(userId: string, input: RequestPhoneVerificationDto) {
    const account = await this.prisma.user.findUnique({ where: { id: userId }, select: { phone: true, phoneVerified: true } });
    const previousPhone = account?.phoneVerified && account.phone && account.phone !== input.phone ? account.phone : null;
    const demoMode =
      !this.config.get<string>("SMS_WEBHOOK_URL") &&
      this.config.get<string>("ALLOW_SMS_VERIFICATION_BYPASS") === "true";
    const owner = await this.prisma.user.findFirst({
      where: { phone: input.phone, id: { not: userId } },
      select: { id: true },
    });
    if (owner) {
      throw new ConflictException("Bu telefon numarası zaten kullanılıyor.");
    }

    const latest = await this.prisma.phoneVerification.findFirst({
      where: { userId, phone: input.phone },
      orderBy: { createdAt: "desc" },
    });
    if (latest && Date.now() - latest.createdAt.getTime() < 60_000) {
      throw new BadRequestException("Yeni kod istemeden önce 60 saniye bekleyin.");
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    if (previousPhone) await this.smsService.sendPhoneChangeCode(previousPhone, code);
    else await this.smsService.sendVerificationCode(input.phone, code);
    await this.prisma.phoneVerification.create({
      data: {
        userId,
        phone: input.phone,
        previousPhone,
        purpose: previousPhone ? "current_phone" : "new_phone",
        codeHash: this.hashToken(code),
        expiresAt: new Date(Date.now() + 120_000),
      },
    });

    return {
      ok: true as const,
      expiresInSeconds: 120,
      ...(previousPhone ? { stage: "current_phone" as const } : {}),
      verificationMode: demoMode ? ("demo" as const) : ("sms" as const),
      ...(demoMode ? { demoCode: code } : {}),
      ...(this.config.get<string>("NODE_ENV") === "production" || demoMode ? {} : { developmentCode: code }),
    };
  }

  async confirmPhoneVerification(userId: string, input: ConfirmPhoneVerificationDto) {
    const [owner, account] = await Promise.all([
      this.prisma.user.findFirst({
        where: { phone: input.phone, id: { not: userId } },
        select: { id: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true, status: true, phone: true, phoneVerified: true },
      }),
    ]);
    if (owner) {
      throw new ConflictException("Bu telefon numarası artık başka bir hesapta kullanılıyor.");
    }
    if (!account) throw new NotFoundException("Kullanıcı bulunamadı.");

    const verification = await this.prisma.phoneVerification.findFirst({
      where: { userId, phone: input.phone, consumedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (!verification || verification.expiresAt.getTime() < Date.now() || verification.attempts >= 5) {
      throw new BadRequestException("Kod geçersiz veya süresi dolmuş.");
    }
    if (verification.codeHash !== this.hashToken(input.code)) {
      await this.prisma.phoneVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException("Kod hatalı.");
    }

    const changingVerifiedPhone = account.phoneVerified && account.phone && account.phone !== input.phone;
    if (changingVerifiedPhone && verification.previousPhone !== account.phone) throw new BadRequestException("Mevcut telefon numaranız doğrulanmalıdır. İşlemi yeniden başlatın.");
    if (verification.purpose === "current_phone") {
      if (!changingVerifiedPhone) throw new BadRequestException("Telefon bilgisi değişti. İşlemi yeniden başlatın.");
      const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
      await this.smsService.sendVerificationCode(input.phone, code);
      await this.prisma.phoneVerification.update({ where: { id: verification.id }, data: { purpose: "new_phone", codeHash: this.hashToken(code), attempts: 0, expiresAt: new Date(Date.now() + 120_000) } });
      const demoMode = !this.config.get<string>("SMS_WEBHOOK_URL") && this.config.get<string>("ALLOW_SMS_VERIFICATION_BYPASS") === "true";
      return { ok: true as const, phone: input.phone, phoneVerified: false, stage: "new_phone" as const, ...(demoMode ? { demoCode: code } : {}), ...(this.config.get<string>("NODE_ENV") !== "production" && !demoMode ? { developmentCode: code } : {}) };
    }

    const [, user] = await this.prisma.$transaction([
      this.prisma.phoneVerification.update({
        where: { id: verification.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { phone: input.phone, phoneVerified: true },
      }),
    ]);
    return {
      ok: true as const,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
    };
  }

  async createInviteAcceptToken(userId: string) {
    return this.createEmailToken(userId, "invite_accept");
  }

  async acceptInvite(input: AcceptInviteDto) {
    const token = await this.findValidEmailToken(input.token, "invite_accept");
    const invitedUser = await this.prisma.user.findUnique({ where: { id: token.userId } });
    if (!invitedUser) throw new NotFoundException("Davet hesabı bulunamadı.");
    const phoneInvitation = invitedUser.email.endsWith("@invite.konnektora.local");
    const email = input.email?.trim().toLowerCase();
    if (phoneInvitation && !email) throw new BadRequestException("Telefon davetini tamamlamak için e-posta adresi gereklidir.");
    if (email && email !== invitedUser.email) {
      const emailOwner = await this.prisma.user.findUnique({ where: { email } });
      if (emailOwner && emailOwner.id !== invitedUser.id) throw new ConflictException("Bu email adresi zaten kullanılıyor.");
    }
    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: token.userId },
        data: {
          email: email ?? invitedUser.email,
          name: input.name?.trim() || undefined,
          passwordHash: await hash(input.password, 10),
          emailVerified: phoneInvitation ? false : true,
          phoneVerified: phoneInvitation && Boolean(invitedUser.phone) ? true : invitedUser.phoneVerified,
          status: "active",
        },
      }),
      (this.prisma as any).emailToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } }),
    ]);

    await notifyRegistration(this.prisma, user);
    await this.sendAccountActivatedEmailOnce({
      userId: user.id,
      to: user.email,
      name: user.name,
    });
    return this.createLoginResponse(user);
  }

  async sendAccountActivatedEmailOnce(input: { userId: string; to: string; name: string }) {
    let delivery: { id: string };
    try {
      delivery = await this.prisma.automatedMessageDelivery.create({
        data: {
          userId: input.userId,
          targetType: "user",
          targetId: input.userId,
          messageType: "account_activated",
          channel: "email",
          status: "pending",
        },
        select: { id: true },
      });
    } catch (error: any) {
      if (error?.code === "P2002") return false;
      this.logger.error("Hoş geldin e-postası teslimat kaydı oluşturulamadı; aktivasyon tamamlandı.", error);
      return false;
    }

    try {
      const result = await this.mailService.sendAccountActivatedEmail({ to: input.to, name: input.name });
      await this.prisma.automatedMessageDelivery.update({
        where: { id: delivery.id },
        data: { status: "sent", providerId: result?.providerId },
      });
      return true;
    } catch (error) {
      await this.prisma.automatedMessageDelivery.update({
        where: { id: delivery.id },
        data: { status: "failed" },
      }).catch(() => undefined);
      this.logger.error("Hoş geldin e-postası gönderilemedi; aktivasyon tamamlandı.", error);
      return false;
    }
  }

  private async createEmailToken(userId: string, type: keyof typeof EMAIL_TOKEN_TTL_MS) {
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(rawToken);

    await (this.prisma as any).emailToken.create({
      data: {
        userId,
        type,
        tokenHash,
        expiresAt: new Date(Date.now() + EMAIL_TOKEN_TTL_MS[type]),
      },
    });

    return rawToken;
  }

  private async consumeEmailToken(rawToken: string, type: keyof typeof EMAIL_TOKEN_TTL_MS) {
    const token = await this.findValidEmailToken(rawToken, type);

    return (this.prisma as any).emailToken.update({
      where: { id: token.id },
      data: { consumedAt: new Date() },
    });
  }

  private async findValidEmailToken(rawToken: string, type: keyof typeof EMAIL_TOKEN_TTL_MS) {
    const token = await (this.prisma as any).emailToken.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
    });
    if (!token || token.type !== type || token.consumedAt || new Date(token.expiresAt).getTime() < Date.now()) {
      throw new NotFoundException("Token geçersiz veya süresi dolmuş.");
    }
    return token;
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private async sendVerificationEmailSafely(input: { to: string; name: string; token: string }) {
    try {
      await this.mailService.sendVerificationEmail(input);
      return true;
    } catch (error) {
      this.logger.error("Doğrulama e-postası gönderilemedi; üyelik akışı açık bırakıldı.", error);
      return false;
    }
  }

  private async createLoginResponse(user: User) {
    const avatar = this.prisma.mediaFile
      ? await this.prisma.mediaFile.findFirst({
          where: { contentType: "user", contentId: user.id, status: "active", type: "image", isProfilePicture: true },
          select: { url: true },
        })
      : null;
    return {
      accessToken: await this.jwtService.signAsync({
        sub: user.id,
        role: user.role,
        sessionVersion: user.sessionVersion ?? 0,
      }),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        city: user.city,
        country: user.country,
        role: user.role,
        accountType: user.accountType as "individual" | "corporate",
        emailVerified: user.emailVerified,
        status: user.status,
        onboardingCompleted: Boolean(user.onboardingCompletedAt),
        avatarUrl: avatar?.url ?? null,
      },
    };
  }

  async availability(input: AvailabilityQueryDto) {
    if (!input.email && !input.phone && !input.username) throw new BadRequestException("Kontrol edilecek bir alan gerekli.");
    const [emailOwner, phoneOwner, usernameOwner] = await Promise.all([
      input.email
        ? this.prisma.user.findUnique({
            where: { email: input.email.toLowerCase().trim() },
            select: { id: true },
          })
        : null,
      input.phone
        ? this.prisma.user.findUnique({
            where: { phone: input.phone },
            select: { id: true },
          })
        : null,
      input.username
        ? this.prisma.user.findFirst({
            where: {
              username: { equals: input.username.trim(), mode: "insensitive" },
            },
            select: { id: true },
          })
        : null,
    ]);
    return {
      emailAvailable: input.email ? !emailOwner : null,
      phoneAvailable: input.phone ? !phoneOwner : null,
      usernameAvailable: input.username ? !usernameOwner : null,
    };
  }
}
