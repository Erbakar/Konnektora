import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { User } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { createHash, randomBytes, randomInt } from "crypto";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { SmsService } from "../sms/sms.service";
import { AcceptInviteDto, AvailabilityQueryDto, ChangePasswordDto, ConfirmPhoneVerificationDto, DeactivateAccountDto, EmailDto, LoginDto, RegisterDto, RequestPhoneVerificationDto, ResetPasswordDto, TokenDto } from "./auth.dto";

const EMAIL_TOKEN_TTL_MS = {
  verify_email: 1000 * 60 * 60 * 24,
  password_reset: 1000 * 60 * 30,
  invite_accept: 1000 * 60 * 60 * 24 * 14
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly smsService: SmsService
  ) {}

  async login(input: LoginDto, options: { adminOnly?: boolean } = {}) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });

    if (!user || user.status !== "active") {
      throw new UnauthorizedException("Geçersiz kullanıcı hesabı.");
    }

    if (options.adminOnly && !["admin", "super_admin"].includes(user.role)) {
      throw new UnauthorizedException("Admin yetkisi gerekli.");
    }

    const passwordMatches = await compare(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException("Geçersiz kullanıcı hesabı.");
    }

    return this.createLoginResponse(user);
  }

  async register(input: RegisterDto) {
    const email = input.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      if (existing.status === "active") {
        throw new ConflictException("Bu email adresi zaten kullanılıyor.");
      }

      const activatedUser = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          name: input.name.trim(),
          accountType: input.accountType ?? existing.accountType,
          companyName: input.accountType === "corporate" ? input.companyName?.trim() : null,
          tradeName: input.accountType === "corporate" ? input.tradeName?.trim() : null,
          companyType: input.accountType === "corporate" ? input.companyType : null,
          businessCategory: input.accountType === "corporate" ? input.businessCategory : null,
          passwordHash: await hash(input.password, 10),
          emailVerified: false,
          status: "pending"
        }
      });

      const token = await this.createEmailToken(activatedUser.id, "verify_email");
      await this.mailService.sendVerificationEmail({
        to: activatedUser.email,
        name: activatedUser.name,
        token
      });

      return this.createLoginResponse(activatedUser);
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        name: input.name.trim(),
        passwordHash: await hash(input.password, 10),
        accountType: input.accountType ?? "individual",
        companyName: input.accountType === "corporate" ? input.companyName?.trim() : null,
        tradeName: input.accountType === "corporate" ? input.tradeName?.trim() : null,
        companyType: input.accountType === "corporate" ? input.companyType : null,
        businessCategory: input.accountType === "corporate" ? input.businessCategory : null,
        role: "user",
        status: "pending"
      }
    });

    const token = await this.createEmailToken(user.id, "verify_email");
    await this.mailService.sendVerificationEmail({
      to: user.email,
      name: user.name,
      token
    });

    return this.createLoginResponse(user);
  }

  async requestEmailVerification(input: EmailDto) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email.toLowerCase().trim() } });

    if (!user || user.status === "active") {
      return { ok: true };
    }

    const token = await this.createEmailToken(user.id, "verify_email");
    await this.mailService.sendVerificationEmail({ to: user.email, name: user.name, token });
    return { ok: true };
  }

  async confirmEmail(input: TokenDto) {
    const token = await this.consumeEmailToken(input.token, "verify_email");
    const user = await this.prisma.user.update({
      where: { id: token.userId },
      data: { status: "active", emailVerified: true }
    });

    await this.mailService.sendAccountActivatedEmail({ to: user.email, name: user.name });
    return this.createLoginResponse(user);
  }

  async requestPasswordReset(input: EmailDto) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email.toLowerCase().trim() } });

    if (!user || ["disabled", "suspended", "banned", "deleted"].includes(user.status)) {
      return { ok: true };
    }

    const token = await this.createEmailToken(user.id, "password_reset");
    await this.mailService.sendPasswordResetEmail({ to: user.email, name: user.name, token });
    return { ok: true };
  }

  async sendVerificationForUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException("Kullanıcı bulunamadı.");
    }

    const token = await this.createEmailToken(user.id, "verify_email");
    await this.mailService.sendVerificationEmail({ to: user.email, name: user.name, token });
    return { ok: true };
  }

  async sendPasswordResetForUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException("Kullanıcı bulunamadı.");
    }

    const token = await this.createEmailToken(user.id, "password_reset");
    await this.mailService.sendPasswordResetEmail({ to: user.email, name: user.name, token });
    return { ok: true };
  }

  async resetPassword(input: ResetPasswordDto) {
    const token = await this.consumeEmailToken(input.token, "password_reset");
    const user = await this.prisma.user.update({
      where: { id: token.userId },
      data: {
        passwordHash: await hash(input.password, 10)
      }
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
      data: { passwordHash: await hash(input.newPassword, 10) }
    });
    return { ok: true };
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
              status: { in: ["accepted", "attended"] }
            }
          }
        },
        data: { status: "archived" }
      }),
      this.prisma.place.updateMany({ where: { createdById: userId, status: "active" }, data: { status: "archived" } }),
      this.prisma.userMessage.create({
        data: {
          type: "account_freeze",
          userId,
          name: user.name,
          email: user.email,
          phone: user.phone,
          body: input.reason.trim()
        }
      }),
      this.prisma.user.update({ where: { id: userId }, data: { status: "frozen" } })
    ]);

    return { ok: true };
  }

  async reactivate(input: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email.toLowerCase().trim() } });
    if (!user || user.status !== "frozen" || !(await compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException("Dondurulmuş hesap bilgileri geçersiz.");
    }

    const activeUser = await this.prisma.user.update({ where: { id: user.id }, data: { status: "active" } });
    return this.createLoginResponse(activeUser);
  }

  async requestPhoneVerification(userId: string, input: RequestPhoneVerificationDto) {
    const owner = await this.prisma.user.findFirst({ where: { phone: input.phone, id: { not: userId } }, select: { id: true } });
    if (owner) {
      throw new ConflictException("Bu telefon numarası zaten kullanılıyor.");
    }

    const latest = await this.prisma.phoneVerification.findFirst({
      where: { userId, phone: input.phone },
      orderBy: { createdAt: "desc" }
    });
    if (latest && Date.now() - latest.createdAt.getTime() < 60_000) {
      throw new BadRequestException("Yeni kod istemeden önce 60 saniye bekleyin.");
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    await this.smsService.sendVerificationCode(input.phone, code);
    await this.prisma.phoneVerification.create({
      data: {
        userId,
        phone: input.phone,
        codeHash: this.hashToken(code),
        expiresAt: new Date(Date.now() + 120_000)
      }
    });

    return {
      ok: true as const,
      expiresInSeconds: 120,
      ...(process.env.NODE_ENV === "production" ? {} : { developmentCode: code })
    };
  }

  async confirmPhoneVerification(userId: string, input: ConfirmPhoneVerificationDto) {
    const owner = await this.prisma.user.findFirst({ where: { phone: input.phone, id: { not: userId } }, select: { id: true } });
    if (owner) {
      throw new ConflictException("Bu telefon numarası artık başka bir hesapta kullanılıyor.");
    }

    const verification = await this.prisma.phoneVerification.findFirst({
      where: { userId, phone: input.phone, consumedAt: null },
      orderBy: { createdAt: "desc" }
    });
    if (!verification || verification.expiresAt.getTime() < Date.now() || verification.attempts >= 5) {
      throw new BadRequestException("Kod geçersiz veya süresi dolmuş.");
    }
    if (verification.codeHash !== this.hashToken(input.code)) {
      await this.prisma.phoneVerification.update({ where: { id: verification.id }, data: { attempts: { increment: 1 } } });
      throw new BadRequestException("Kod hatalı.");
    }

    const [, user] = await this.prisma.$transaction([
      this.prisma.phoneVerification.update({ where: { id: verification.id }, data: { consumedAt: new Date() } }),
      this.prisma.user.update({ where: { id: userId }, data: { phone: input.phone, phoneVerified: true } })
    ]);
    return { ok: true as const, phone: user.phone, phoneVerified: user.phoneVerified };
  }

  async createInviteAcceptToken(userId: string) {
    return this.createEmailToken(userId, "invite_accept");
  }

  async acceptInvite(input: AcceptInviteDto) {
    const token = await this.consumeEmailToken(input.token, "invite_accept");
    const user = await this.prisma.user.update({
      where: { id: token.userId },
      data: {
        name: input.name?.trim() || undefined,
        passwordHash: await hash(input.password, 10),
        status: "active"
      }
    });

    await this.mailService.sendAccountActivatedEmail({ to: user.email, name: user.name });
    return this.createLoginResponse(user);
  }

  private async createEmailToken(userId: string, type: keyof typeof EMAIL_TOKEN_TTL_MS) {
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(rawToken);

    await (this.prisma as any).emailToken.create({
      data: {
        userId,
        type,
        tokenHash,
        expiresAt: new Date(Date.now() + EMAIL_TOKEN_TTL_MS[type])
      }
    });

    return rawToken;
  }

  private async consumeEmailToken(rawToken: string, type: keyof typeof EMAIL_TOKEN_TTL_MS) {
    const token = await (this.prisma as any).emailToken.findUnique({
      where: { tokenHash: this.hashToken(rawToken) }
    });

    if (!token || token.type !== type || token.consumedAt || new Date(token.expiresAt).getTime() < Date.now()) {
      throw new NotFoundException("Token geçersiz veya süresi dolmuş.");
    }

    return (this.prisma as any).emailToken.update({
      where: { id: token.id },
      data: { consumedAt: new Date() }
    });
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private async createLoginResponse(user: User) {
    return {
      accessToken: await this.jwtService.signAsync({ sub: user.id, role: user.role }),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        accountType: user.accountType as "individual" | "corporate",
        emailVerified: user.emailVerified,
        status: user.status
      }
    };
  }

  async availability(input: AvailabilityQueryDto) {
    if (!input.email && !input.phone && !input.username) throw new BadRequestException("Kontrol edilecek bir alan gerekli.");
    const [emailOwner, phoneOwner, usernameOwner] = await Promise.all([
      input.email ? this.prisma.user.findUnique({ where: { email: input.email.toLowerCase().trim() }, select: { id: true } }) : null,
      input.phone ? this.prisma.user.findUnique({ where: { phone: input.phone }, select: { id: true } }) : null,
      input.username ? this.prisma.user.findFirst({ where: { username: { equals: input.username.trim(), mode: "insensitive" } }, select: { id: true } }) : null
    ]);
    return { emailAvailable: input.email ? !emailOwner : null, phoneAvailable: input.phone ? !phoneOwner : null, usernameAvailable: input.username ? !usernameOwner : null };
  }
}
