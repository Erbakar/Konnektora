import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { KycStatus, PaymentStatus, PayoutStatus, User } from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { BusinessPlanDto, ConfirmPaymentDto, CreatePaymentDto, FinanceSettingsDto, MemberPlanDto, PayoutDto, RefundPaymentDto } from "./finance.dto";

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(user: User) {
    const [account, billing, transactions, payouts, business, managedEventCount, managedPlaceCount] = await Promise.all([
      this.prisma.financialAccount.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} }),
      this.prisma.billingProfile.findUnique({ where: { userId: user.id } }),
      this.prisma.paymentTransaction.findMany({ where: { OR: [{ payerId: user.id }, { payeeId: user.id }] }, orderBy: { createdAt: "desc" }, take: 100, include: { event: { select: { id: true, title: true, slug: true } }, payer: { select: { id: true, name: true } }, payee: { select: { id: true, name: true } } } }),
      this.prisma.payout.findMany({ where: { userId: user.id }, orderBy: { requestedAt: "desc" }, take: 50 }),
      this.prisma.user.findUnique({ where: { id: user.id }, select: { businessPlan: true, businessPlanStartedAt: true, memberPlan: true, memberPlanStartedAt: true, companyName: true, tradeName: true, businessCategory: true } }),
      this.prisma.event.count({ where: { OR: [{ createdById: user.id }, { participants: { some: { userId: user.id, status: "accepted", role: { in: ["organizer", "manager"] } } } }] } }),
      this.prisma.place.count({ where: { OR: [{ createdById: user.id }, { members: { some: { userId: user.id, status: "accepted", role: { in: ["organizer", "manager"] } } } }] } })
    ]);
    const received = transactions.filter((item) => item.payeeId === user.id && (item.status === PaymentStatus.succeeded || item.status === PaymentStatus.partially_refunded)).reduce((sum, item) => sum + Number(item.netAmount) - Number(item.refundedAmount), 0);
    return { account, billing, transactions, payouts, member: { plan: business?.memberPlan ?? "free", planStartedAt: business?.memberPlanStartedAt ?? null }, business: { plan: business?.businessPlan ?? "starter", planStartedAt: business?.businessPlanStartedAt ?? null, companyName: business?.companyName ?? business?.tradeName ?? null, category: business?.businessCategory ?? null, managedEventCount, managedPlaceCount }, summary: { availableBalance: Number(account.availableBalance), pendingBalance: Number(account.pendingBalance), lifetimeNetRevenue: Math.max(0, received), currency: account.preferredCurrency } };
  }

  async changeBusinessPlan(user: User, input: BusinessPlanDto) {
    if (input.plan !== "starter") {
      if (user.accountType !== "corporate") throw new ForbiddenException("Ücretli işletme paketleri yalnız kurumsal hesaplarda kullanılabilir.");
      if (!input.paymentMethodToken?.startsWith("pm_")) throw new BadRequestException("Ücretli paket için geçerli ödeme yöntemi gereklidir.");
    }
    const updated = await this.prisma.user.update({ where: { id: user.id }, data: { businessPlan: input.plan, businessPlanStartedAt: new Date() }, select: { businessPlan: true, businessPlanStartedAt: true } });
    return { plan: updated.businessPlan, planStartedAt: updated.businessPlanStartedAt };
  }

  async changeMemberPlan(user: User, input: MemberPlanDto) {
    if (input.plan !== "free" && !input.paymentMethodToken?.startsWith("pm_")) throw new BadRequestException("Ücretli paket için geçerli ödeme yöntemi gereklidir.");
    const updated = await this.prisma.user.update({ where: { id: user.id }, data: { memberPlan: input.plan, memberPlanStartedAt: new Date() }, select: { memberPlan: true, memberPlanStartedAt: true } });
    return { plan: updated.memberPlan, planStartedAt: updated.memberPlanStartedAt };
  }

  async updateSettings(user: User, input: FinanceSettingsDto) {
    if (user.accountType !== "corporate") throw new ForbiddenException("Finans ayarları yalnız kurumsal hesaplar içindir.");
    const { preferredCurrency, bankProvider, bankAccountLabel, bankAccountLast4, ...billing } = input;
    const [account, profile] = await this.prisma.$transaction([
      this.prisma.financialAccount.upsert({ where: { userId: user.id }, create: { userId: user.id, preferredCurrency, bankProvider, bankAccountLabel, bankAccountLast4 }, update: { preferredCurrency, bankProvider, bankAccountLabel, bankAccountLast4 } }),
      this.prisma.billingProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...billing }, update: billing })
    ]);
    return { account, billing: profile };
  }

  async startKyc(user: User) {
    if (user.accountType !== "corporate") throw new ForbiddenException("KYC yalnız kurumsal hesaplar içindir.");
    return this.prisma.financialAccount.upsert({ where: { userId: user.id }, create: { userId: user.id, kycStatus: "pending", kycProvider: "sandbox_kyc" }, update: { kycStatus: "pending", kycProvider: "sandbox_kyc" } });
  }

  async createPayment(eventId: string, payer: User, input: CreatePaymentDto) {
    const existing = await this.prisma.paymentTransaction.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) { if (existing.payerId !== payer.id || existing.eventId !== eventId) throw new ForbiddenException("Idempotency anahtarı başka bir işleme ait."); return existing; }
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { id: true, title: true, status: true, price: true, currency: true, createdById: true } });
    if (!event || event.status !== "published") throw new NotFoundException("Ödeme yapılacak etkinlik bulunamadı.");
    if (!event.createdById || event.createdById === payer.id) throw new BadRequestException("Bu etkinlik için ödeme oluşturulamaz.");
    const gross = Number(event.price); if (gross <= 0) throw new BadRequestException("Bu etkinlik ücretsizdir.");
    const fee = Math.round(gross * 0.05 * 100) / 100;
    return this.prisma.paymentTransaction.create({ data: { eventId, payerId: payer.id, payeeId: event.createdById, grossAmount: gross, platformFee: fee, netAmount: gross - fee, currency: event.currency, idempotencyKey: input.idempotencyKey, metadata: { eventTitle: event.title } } });
  }

  async confirm(id: string, user: User, input: ConfirmPaymentDto) {
    const payment = await this.prisma.paymentTransaction.findUnique({ where: { id } });
    if (!payment || payment.payerId !== user.id) throw new NotFoundException("Ödeme bulunamadı.");
    if (payment.status === PaymentStatus.succeeded) return payment;
    if (payment.status !== PaymentStatus.pending) throw new BadRequestException("Ödeme onaylanabilir durumda değil.");
    if (!input.paymentMethodToken.startsWith("pm_")) throw new BadRequestException("Geçersiz ödeme yöntemi tokenı.");
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.paymentTransaction.update({ where: { id }, data: { status: PaymentStatus.succeeded, providerRef: `sandbox_${randomUUID()}`, paidAt: new Date(), metadata: { tokenFingerprint: input.paymentMethodToken.slice(-6) } } });
      await tx.financialAccount.upsert({ where: { userId: payment.payeeId }, create: { userId: payment.payeeId, preferredCurrency: payment.currency, availableBalance: payment.netAmount }, update: { availableBalance: { increment: payment.netAmount } } });
      await tx.eventParticipant.upsert({ where: { eventId_userId: { eventId: payment.eventId, userId: user.id } }, create: { eventId: payment.eventId, userId: user.id, status: "accepted", role: "attendee" }, update: { status: "accepted" } });
      return updated;
    });
  }

  async refund(id: string, actor: User, input: RefundPaymentDto) {
    const payment = await this.prisma.paymentTransaction.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException("Ödeme bulunamadı.");
    if (payment.payeeId !== actor.id && !["admin", "super_admin"].includes(actor.role)) throw new ForbiddenException("Bu ödeme iade edilemez.");
    if (payment.status !== PaymentStatus.succeeded && payment.status !== PaymentStatus.partially_refunded) throw new BadRequestException("Ödeme iade edilebilir durumda değil.");
    const remaining = Number(payment.grossAmount) - Number(payment.refundedAmount); const amount = input.amount ?? remaining;
    if (amount <= 0 || amount > remaining) throw new BadRequestException("İade tutarı kalan tutarı aşamaz.");
    const netReversal = Math.round(amount * 0.95 * 100) / 100;
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.financialAccount.findUnique({ where: { userId: payment.payeeId } });
      if (!account || Number(account.availableBalance) < netReversal) throw new BadRequestException("İade için kullanılabilir bakiye yetersiz.");
      await tx.ticketRefund.create({ data: { eventId: payment.eventId, userId: payment.payerId, paymentId: payment.id, amount, currency: payment.currency, provider: payment.provider, status: "refunded", reason: input.reason } });
      await tx.financialAccount.update({ where: { userId: payment.payeeId }, data: { availableBalance: { decrement: netReversal } } });
      return tx.paymentTransaction.update({ where: { id }, data: { refundedAmount: { increment: amount }, status: amount === remaining ? PaymentStatus.refunded : PaymentStatus.partially_refunded } });
    });
  }

  async payout(user: User, input: PayoutDto) {
    const account = await this.prisma.financialAccount.findUnique({ where: { userId: user.id } });
    if (!account || account.kycStatus !== "approved" || !account.bankAccountLast4) throw new BadRequestException("Para çekmek için onaylı KYC ve banka hesabı gerekir.");
    if (input.amount > Number(account.availableBalance)) throw new BadRequestException("Kullanılabilir bakiye yetersiz.");
    return this.prisma.$transaction(async (tx) => { await tx.financialAccount.update({ where: { userId: user.id }, data: { availableBalance: { decrement: input.amount }, pendingBalance: { increment: input.amount } } }); return tx.payout.create({ data: { userId: user.id, amount: input.amount, currency: account.preferredCurrency } }); });
  }

  listAdminAccounts() { return this.prisma.financialAccount.findMany({ orderBy: { updatedAt: "desc" }, include: { user: { select: { id: true, name: true, email: true, accountType: true } } } }); }
  listAdminPayouts() { return this.prisma.payout.findMany({ orderBy: { requestedAt: "desc" }, include: { user: { select: { id: true, name: true, email: true } } } }); }
  updateKyc(userId: string, status: KycStatus) { return this.prisma.financialAccount.update({ where: { userId }, data: { kycStatus: status } }); }
  async updatePayout(id: string, status: PayoutStatus) {
    const payout = await this.prisma.payout.findUnique({ where: { id } }); if (!payout) throw new NotFoundException("Para çekme talebi bulunamadı.");
    const finished = status === PayoutStatus.paid || status === PayoutStatus.failed || status === PayoutStatus.cancelled;
    return this.prisma.$transaction(async (tx) => { const updated = await tx.payout.update({ where: { id }, data: { status, processedAt: finished ? new Date() : null, providerRef: status === PayoutStatus.paid ? `sandbox_payout_${randomUUID()}` : undefined } }); if (status === PayoutStatus.paid) await tx.financialAccount.update({ where: { userId: payout.userId }, data: { pendingBalance: { decrement: payout.amount } } }); if (status === PayoutStatus.failed || status === PayoutStatus.cancelled) await tx.financialAccount.update({ where: { userId: payout.userId }, data: { pendingBalance: { decrement: payout.amount }, availableBalance: { increment: payout.amount } } }); return updated; });
  }
}
