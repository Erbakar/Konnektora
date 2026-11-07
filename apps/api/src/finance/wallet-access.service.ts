import { BadRequestException, ForbiddenException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { createHash, randomBytes, randomInt } from "crypto";
import { compare, hash } from "bcryptjs";
import { User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SmsService } from "../sms/sms.service";
import { MailService } from "../mail/mail.service";
import { quotaLock } from "../common/usage-quota";
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const WALLET_SESSION_MS = 15 * 60_000;
@Injectable()
export class WalletAccessService {
  constructor(private readonly prisma: PrismaService, private readonly sms: SmsService, private readonly mail: MailService) {}
  private eligible(user: User) {
    if (user.accountType !== "corporate" && user.role !== "curator") throw new ForbiddenException("Cüzdan yalnız kurumsal üyeler ve küratörler içindir.");
    if (!user.phone || !user.phoneVerified) throw new ForbiddenException("Önce hesap ayarlarından telefon numaranızı doğrulayın.");
  }
  async request(user: User, authorization: string) {
    this.eligible(user);
    if (!authorization) throw new ForbiddenException();
    return this.prisma.$transaction(async tx => {
      await quotaLock(tx, `wallet:${user.id}`);
      const state = await tx.walletAccess.findUnique({ where: { userId: user.id } });
      const now = Date.now();
      if (state?.lockedUntil && state.lockedUntil.getTime() > now) throw new ForbiddenException("Cüzdan üç hatalı deneme nedeniyle 8 saat kilitli.");
      if (state?.sentAt && now - state.sentAt.getTime() < 60_000) throw new BadRequestException("Yeni kod için en az 60 saniye bekleyin.");
      const code = String(randomInt(0, 100_000_000)).padStart(8, "0");
      const expiresAt = new Date(now + 180_000);
      await this.sms.sendWalletCode(user.phone!, code);
      const data = { codeHash: await hash(code, 10), codeExpiresAt: expiresAt, sessionHash: digest(authorization), phone: user.phone, sentAt: new Date(now), grantHash: null, grantExpiresAt: null, ...(state?.lockedUntil && state.lockedUntil.getTime() <= now ? { failures: 0, lockedUntil: null } : {}) };
      await tx.walletAccess.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
      return { expiresAt: expiresAt.toISOString(), phoneHint: `•••• ${user.phone!.slice(-4)}` };
    }, { timeout: 15_000 });
  }
  async verify(user: User, authorization: string, code: string, context: { ip: string; agent: string }) {
    this.eligible(user);
    const token = randomBytes(32).toString("hex");
    const result = await this.prisma.$transaction(async tx => {
      await quotaLock(tx, `wallet:${user.id}`);
      const state = await tx.walletAccess.findUnique({ where: { userId: user.id } });
      const now = Date.now();
      if (state?.lockedUntil && state.lockedUntil.getTime() > now) return { error: "Cüzdan üç hatalı deneme nedeniyle 8 saat kilitli." };
      if (!state?.codeHash || !state.codeExpiresAt || state.codeExpiresAt.getTime() <= now || state.sessionHash !== digest(authorization) || state.phone !== user.phone) return { error: "Kodun süresi doldu veya bu oturuma ait değil. Yeni kod isteyin." };
      if (!await compare(code, state.codeHash)) {
        const failures = state.failures + 1;
        await tx.walletAccess.update({ where: { userId: user.id }, data: { failures, ...(failures >= 3 ? { lockedUntil: new Date(now + 8 * 60 * 60_000), codeHash: null, grantHash: null, grantExpiresAt: null } : {}) } });
        // Return rather than throw inside the transaction: failed attempts must commit.
        return { error: failures >= 3 ? "Üç hatalı deneme: cüzdan 8 saat kilitlendi." : `Kod yanlış. ${3 - failures} deneme hakkınız kaldı.` };
      }
      const expiresAt = new Date(now + WALLET_SESSION_MS);
      await tx.walletAccess.update({ where: { userId: user.id }, data: { codeHash: null, codeExpiresAt: null, failures: 0, lockedUntil: null, grantHash: digest(token), grantExpiresAt: expiresAt } });
      return { expiresAt: expiresAt.toISOString() };
    });
    if (result.error) throw new ForbiddenException(result.error);
    try { await this.mail.sendWalletAccessEmail({ to: user.email, at: new Date(), ...context }); }
    catch {
      await this.prisma.walletAccess.updateMany({ where: { userId: user.id, grantHash: digest(token) }, data: { grantHash: null, grantExpiresAt: null } });
      throw new ServiceUnavailableException("Cüzdan erişim bildirimi gönderilemedi. Lütfen daha sonra yeniden deneyin.");
    }
    return { token, expiresAt: result.expiresAt! };
  }
  async authorize(user: User, authorization: string, token: string) {
    this.eligible(user);
    const state = await this.prisma.walletAccess.findUnique({ where: { userId: user.id } });
    if (!token || !state?.grantHash || state.grantHash !== digest(token) || state.sessionHash !== digest(authorization) || state.phone !== user.phone || !state.grantExpiresAt || state.grantExpiresAt.getTime() <= Date.now() || state.lockedUntil && state.lockedUntil.getTime() > Date.now()) throw new ForbiddenException("Cüzdana erişmek için SMS doğrulamasını tamamlayın.");
  }
  async close(user: User, authorization: string) {
    await this.prisma.walletAccess.updateMany({ where: { userId: user.id, sessionHash: digest(authorization) }, data: { grantHash: null, grantExpiresAt: null, codeHash: null } });
    return { ok: true };
  }
}
