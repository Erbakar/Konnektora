import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { User } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { AcceptInviteDto, EmailDto, LoginDto, RegisterDto, ResetPasswordDto, TokenDto } from "./auth.dto";

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
    private readonly mailService: MailService
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
          passwordHash: await hash(input.password, 10),
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
      data: { status: "active" }
    });

    await this.mailService.sendAccountActivatedEmail({ to: user.email, name: user.name });
    return this.createLoginResponse(user);
  }

  async requestPasswordReset(input: EmailDto) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email.toLowerCase().trim() } });

    if (!user || user.status === "disabled") {
      return { ok: true };
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
        passwordHash: await hash(input.password, 10),
        status: "active"
      }
    });

    return this.createLoginResponse(user);
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
        status: user.status
      }
    };
  }
}
