import { conversationUsage } from "../chat/conversation-quota";
import { platformReport } from "./platform-report";
import { effectivePlan, activeGift } from "../plans/plan-runtime";
import { limitsFor, planPeriod } from "../common/plan-policy";
import { ticketAmounts } from "./ticket-pricing";
import { requireSandboxEnvironment } from "./payment-availability";
import { accrueTicketCommission, reverseCuratorCommission } from "../curator-finance/curator-accrual";
import { remainingPaymentNet as remainingNet } from "./payment-ledger";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { KycStatus, PaymentStatus, PayoutStatus, User, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { BusinessPlanDto, ConfirmPaymentDto, CreatePaymentDto, FinanceSettingsDto, MemberPlanDto, PayoutDto, RefundPaymentDto } from "./finance.dto";

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(user: User) {
    const [account, billing, transactions, payouts, business, managedEventCount, managedPlaceCount, revenueRows] = await Promise.all([
      this.prisma.financialAccount.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} }),
      this.prisma.billingProfile.findUnique({ where: { userId: user.id } }),
      this.prisma.paymentTransaction.findMany({ where: { OR: [{ payerId: user.id }, { payeeId: user.id }] }, orderBy: { createdAt: "desc" }, take: 100, include: { event: { select: { id: true, title: true, slug: true } }, payer: { select: { id: true, name: true } }, payee: { select: { id: true, name: true } } } }),
      this.prisma.payout.findMany({ where: { userId: user.id }, orderBy: { requestedAt: "desc" }, take: 50 }),
      this.prisma.user.findUnique({ where: { id: user.id }, select: { businessPlan: true, businessPlanStartedAt: true, memberPlan: true, memberPlanStartedAt: true, companyName: true, tradeName: true, businessCategory: true } }),
      this.prisma.event.count({ where: { OR: [{ createdById: user.id }, { participants: { some: { userId: user.id, status: "accepted", role: { in: ["organizer", "manager"] } } } }] } }),
      this.prisma.place.count({ where: { OR: [{ createdById: user.id }, { members: { some: { userId: user.id, status: "accepted", role: { in: ["organizer", "manager"] } } } }] } }),
      this.prisma.paymentTransaction.findMany({ where: { payeeId: user.id, status: { in: [PaymentStatus.succeeded, PaymentStatus.partially_refunded] } }, select: { grossAmount: true, netAmount: true, refundedAmount: true, currency: true } })
    ]);
    const received = revenueRows.filter(item => item.currency === account.preferredCurrency).reduce((sum, item) => sum + remainingNet(item), 0);
    return { account, billing, transactions, payouts, member: { plan: business?.memberPlan ?? "free", planStartedAt: business?.memberPlanStartedAt ?? null }, business: { plan: business?.businessPlan ?? "free", planStartedAt: business?.businessPlanStartedAt ?? null, companyName: business?.companyName ?? business?.tradeName ?? null, category: business?.businessCategory ?? null, managedEventCount, managedPlaceCount }, summary: { availableBalance: Number(account.availableBalance), pendingBalance: Number(account.pendingBalance), heldBalance: Number(account.heldBalance), lifetimeNetRevenue: Math.max(0, received), currency: account.preferredCurrency } };
  }

  async membership(user: User) {
    const period = planPeriod(user.createdAt);
    const [events, tags, invites, chats] = await Promise.all([
      this.prisma.planUsage.count({ where: { userId: user.id, kind: "event", createdAt: { gte: period.start, lt: period.end } } }),
      this.prisma.planUsage.count({ where: { userId: user.id, kind: "tag", scope: period.start.toISOString() } }),
      this.prisma.planUsage.groupBy({ by: ["scope"], where: { userId: user.id, kind: "invite" }, _count: { _all: true } }),
      conversationUsage(this.prisma, user.id),
    ]);
    return { member: { plan: effectivePlan(user).audience === "individual" ? effectivePlan(user).key : user.memberPlan }, business: { plan: effectivePlan(user).audience === "corporate" ? effectivePlan(user).key : user.businessPlan }, capabilities: { advanced: effectivePlan(user).definition.advanced || ["admin", "super_admin", "curator"].includes(user.role), guest: effectivePlan(user).definition.guest, profileViews: effectivePlan(user).definition.profileViews }, gift: activeGift(user, effectivePlan(user).audience), researcherGift: activeGift(user, "researcher"), limits: limitsFor(user), period, used: { events, tags }, chats, eventInvites: invites.map(row => ({ eventId: row.scope, used: row._count._all })) };
  }

  async changeBusinessPlan(user: User, input: BusinessPlanDto) {
    if (input.plan !== "free") {
      requireSandboxEnvironment();
      if (user.accountType !== "corporate") throw new ForbiddenException("Ücretli işletme paketleri yalnız kurumsal hesaplarda kullanılabilir.");
      if (!input.paymentMethodToken?.startsWith("pm_")) throw new BadRequestException("Ücretli paket için geçerli ödeme yöntemi gereklidir.");
    }
    const updated = await this.prisma.user.update({ where: { id: user.id }, data: { businessPlan: input.plan, businessPlanStartedAt: new Date() }, select: { businessPlan: true, businessPlanStartedAt: true } });
    return { plan: updated.businessPlan, planStartedAt: updated.businessPlanStartedAt };
  }

  async changeMemberPlan(user: User, input: MemberPlanDto) {
    if (input.plan !== "free") requireSandboxEnvironment();
    if (input.plan !== "free" && !input.paymentMethodToken?.startsWith("pm_")) throw new BadRequestException("Ücretli paket için geçerli ödeme yöntemi gereklidir.");
    const updated = await this.prisma.user.update({ where: { id: user.id }, data: { memberPlan: input.plan, memberPlanStartedAt: new Date() }, select: { memberPlan: true, memberPlanStartedAt: true } });
    return { plan: updated.memberPlan, planStartedAt: updated.memberPlanStartedAt };
  }

  async updateSettings(user: User, input: FinanceSettingsDto) {
    if (user.accountType !== "corporate") throw new ForbiddenException("Finans ayarları yalnız kurumsal hesaplar içindir.");
    const { preferredCurrency, bankProvider, bankAccountLabel, bankAccountLast4, ...billing } = input;
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.financialAccount.upsert({ where: { userId: user.id }, create: { userId: user.id, preferredCurrency }, update: {} });
      if (current.preferredCurrency !== preferredCurrency && (Number(current.availableBalance) !== 0 || Number(current.pendingBalance) !== 0 || Number(current.heldBalance) !== 0)) throw new BadRequestException("Bakiyesi bulunan hesabın para birimi değiştirilemez.");
      const changed = await tx.financialAccount.updateMany({ where: { userId: user.id, OR: [{ preferredCurrency }, { availableBalance: 0, pendingBalance: 0, heldBalance: 0 }] }, data: { preferredCurrency, bankProvider, bankAccountLabel, bankAccountLast4 } });
      if (!changed.count) throw new BadRequestException("Bakiyesi bulunan hesabın para birimi değiştirilemez.");
      const account = await tx.financialAccount.findUniqueOrThrow({ where: { userId: user.id } });
      const profile = await tx.billingProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...billing }, update: billing });
      return { account, billing: profile };
    });
  }

  async startKyc(user: User) {
    requireSandboxEnvironment();
    if (user.accountType !== "corporate") throw new ForbiddenException("KYC yalnız kurumsal hesaplar içindir.");
    return this.prisma.financialAccount.upsert({ where: { userId: user.id }, create: { userId: user.id, kycStatus: "pending", kycProvider: "sandbox_kyc" }, update: { kycStatus: "pending", kycProvider: "sandbox_kyc" } });
  }

  async createPayment(eventId: string, payer: User, input: CreatePaymentDto) {
    requireSandboxEnvironment();
    const existing = await this.prisma.paymentTransaction.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) { if (existing.payerId !== payer.id || existing.eventId !== eventId) throw new ForbiddenException("Idempotency anahtarı başka bir işleme ait."); return existing; }
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { id: true, title: true, status: true, price: true, currency: true, createdById: true } });
    if (!event || event.status !== "published") throw new NotFoundException("Ödeme yapılacak etkinlik bulunamadı.");
    if (!event.createdById || event.createdById === payer.id) throw new BadRequestException("Bu etkinlik için ödeme oluşturulamaz.");
    const gross = Number(event.price); if (gross <= 0) throw new BadRequestException("Bu etkinlik ücretsizdir.");
    const { fee, net } = ticketAmounts(gross);
    return this.prisma.paymentTransaction.create({ data: { eventId, payerId: payer.id, payeeId: event.createdById, grossAmount: gross, platformFee: fee, netAmount: net, currency: event.currency, idempotencyKey: input.idempotencyKey, metadata: { eventTitle: event.title } } });
  }

  async confirm(id: string, user: User, input: ConfirmPaymentDto) {
    requireSandboxEnvironment();
    const payment = await this.prisma.paymentTransaction.findUnique({ where: { id } });
    if (!payment || payment.payerId !== user.id) throw new NotFoundException("Ödeme bulunamadı.");
    if (payment.status === PaymentStatus.succeeded) return payment;
    if (payment.status !== PaymentStatus.pending) throw new BadRequestException("Ödeme onaylanabilir durumda değil.");
    if (!input.paymentMethodToken.startsWith("pm_")) throw new BadRequestException("Geçersiz ödeme yöntemi tokenı.");
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.paymentTransaction.updateMany({ where: { id, status: PaymentStatus.pending }, data: { status: PaymentStatus.succeeded, providerRef: `sandbox_${randomUUID()}`, paidAt: new Date() } });
      if (!claimed.count) return tx.paymentTransaction.findUniqueOrThrow({ where: { id } });
      const account = await tx.financialAccount.upsert({ where: { userId: payment.payeeId }, create: { userId: payment.payeeId, preferredCurrency: payment.currency }, update: {} });
      if (account.preferredCurrency !== payment.currency) throw new BadRequestException("Ödeme para birimi alıcının finans hesabıyla eşleşmiyor.");
      const credited = await tx.financialAccount.updateMany({ where: { userId: payment.payeeId, preferredCurrency: payment.currency }, data: { heldBalance: { increment: payment.netAmount } } });
      if (!credited.count) throw new BadRequestException("Ödeme para birimi alıcının finans hesabıyla eşleşmiyor.");
      await tx.eventParticipant.upsert({ where: { eventId_userId: { eventId: payment.eventId, userId: user.id } }, create: { eventId: payment.eventId, userId: user.id, status: "accepted", role: "attendee" }, update: { status: "accepted" } });
      const settled = await tx.paymentTransaction.findUniqueOrThrow({ where: { id } });
      await accrueTicketCommission(tx, settled);
      return settled;
    });
  }

  async refund(id: string, actor: User, input: RefundPaymentDto) {
    requireSandboxEnvironment();
    const payment = await this.prisma.paymentTransaction.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException("Ödeme bulunamadı.");
    if (payment.payeeId !== actor.id && !["admin", "super_admin"].includes(actor.role)) throw new ForbiddenException("Bu ödeme iade edilemez.");
    if (payment.status !== PaymentStatus.succeeded && payment.status !== PaymentStatus.partially_refunded) throw new BadRequestException("Ödeme iade edilebilir durumda değil.");
    const remaining = Number(payment.grossAmount) - Number(payment.refundedAmount); const amount = input.amount ?? remaining;
    if (!validMoney(amount) || amount > remaining) throw new BadRequestException("İade tutarı kalan tutarı aşamaz.");
    const netReversal = Math.round((remainingNet(payment) - remainingNet({ ...payment, refundedAmount: Number(payment.refundedAmount) + amount })) * 100) / 100;
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.paymentTransaction.updateMany({ where: { id, status: payment.status, refundedAmount: payment.refundedAmount, releasedAt: payment.releasedAt }, data: { refundedAmount: { increment: amount }, status: amount === remaining ? PaymentStatus.refunded : PaymentStatus.partially_refunded } });
      if (!claimed.count) throw new BadRequestException("Ödeme başka bir işlemle değişti. Güncel tutarla yeniden deneyin.");
      const balance = payment.releasedAt ? "availableBalance" : "heldBalance";
      const debited = await tx.financialAccount.updateMany({ where: { userId: payment.payeeId, preferredCurrency: payment.currency, [balance]: { gte: netReversal } }, data: { [balance]: { decrement: netReversal } } });
      if (!debited.count) throw new BadRequestException("İade için kullanılabilir bakiye yetersiz veya para birimi uyumsuz.");
      await reverseCuratorCommission(tx, payment, amount);
      await tx.ticketRefund.create({ data: { eventId: payment.eventId, userId: payment.payerId, paymentId: payment.id, amount, currency: payment.currency, provider: payment.provider, status: "refunded", reason: input.reason } });
      return tx.paymentTransaction.findUniqueOrThrow({ where: { id } });
    });
  }

  async payout(user: User, input: PayoutDto) {
    requireSandboxEnvironment();
    if (user.accountType !== "corporate") throw new ForbiddenException("Para çekme yalnız kurumsal hesaplar içindir.");
    if (!validMoney(input.amount)) throw new BadRequestException("Geçerli bir para çekme tutarı girin.");
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.financialAccount.findUnique({ where: { userId: user.id } });
      if (!account || account.kycStatus !== "approved" || !account.bankAccountLast4) throw new BadRequestException("Para çekmek için onaylı KYC ve banka hesabı gerekir.");
      const debited = await tx.financialAccount.updateMany({ where: { userId: user.id, preferredCurrency: account.preferredCurrency, kycStatus: "approved", bankAccountLast4: account.bankAccountLast4, availableBalance: { gte: input.amount } }, data: { availableBalance: { decrement: input.amount }, pendingBalance: { increment: input.amount } } });
      if (!debited.count) throw new BadRequestException("Kullanılabilir bakiye yetersiz veya hesap bilgileri değişti.");
      return tx.payout.create({ data: { userId: user.id, amount: input.amount, currency: account.preferredCurrency } });
    });
  }

  platformReport(query: Record<string,string>) { return platformReport(this.prisma,query); }

  listHeldEvents() {
    return this.prisma.event.findMany({
      where: { OR: [{ platformRevenues: { some: { held: true } } }, { payments: { some: { releasedAt: null, status: { in: [PaymentStatus.succeeded, PaymentStatus.partially_refunded] } } } }, { curatorLedger: { some: { held: true } } }] },
      orderBy: { endsAt: "asc" }, take: 100,
      select: { id: true, title: true, slug: true, status: true, endsAt: true, startsAt: true, createdAt: true, country: true, region: true, city: true, locationName: true, createdBy: {select:{username:true}},
        payments: { where: { releasedAt: null, status: { in: [PaymentStatus.succeeded, PaymentStatus.partially_refunded] } }, select: { id: true, grossAmount: true, netAmount: true, refundedAmount: true, currency: true } },
        curatorLedger: { where: { held: true }, select: { amount: true, currency: true } },
      },
    }).then(events => events.map(event => {
      const totals: Record<string, number> = {}; const curatorTotals: Record<string, number> = {};
      for (const payment of event.payments) totals[payment.currency] = Math.round(((totals[payment.currency] ?? 0) + remainingNet(payment)) * 100) / 100;
      for (const entry of event.curatorLedger) curatorTotals[entry.currency] = Math.round(((curatorTotals[entry.currency] ?? 0) + Number(entry.amount)) * 100) / 100;
      return { id: event.id, title: event.title, slug: event.slug, status: event.status, endsAt: event.endsAt, startsAt: event.startsAt, createdAt: event.createdAt, country: event.country, region: event.region, city: event.city, locationName: event.locationName, creatorUsername: event.createdBy?.username ?? null,
        eligibleAt: event.endsAt ? new Date(event.endsAt.getTime() + 72 * 60 * 60 * 1000) : null,
        totals: Object.entries(totals).map(([currency, amount]) => ({ currency, amount })),
        curatorTotals: Object.entries(curatorTotals).map(([currency, amount]) => ({ currency, amount })),
      };
    }));
  }

  async heldEventDetail(id:string) {
    const event=await this.prisma.event.findUnique({where:{id},select:{id:true,title:true,slug:true,status:true,coverImageUrl:true,createdAt:true,startsAt:true,endsAt:true,timezone:true,locationName:true,locationAddress:true,country:true,region:true,city:true,createdBy:{select:{id:true,username:true}},participants:{where:{role:{in:["organizer","manager"]},status:{in:["accepted","attended"]}},select:{user:{select:{id:true,username:true}}}},ticketTypeRecords:{select:{id:true,name:true,description:true,price:true,currency:true,capacity:true,soldCount:true,status:true,tickets:{where:{usedAt:{not:null}},select:{id:true}}}},revisions:{orderBy:{createdAt:"desc"},take:100}}});
    if(!event)throw new NotFoundException("Etkinlik bulunamadı.");
    const [comments,views,uniqueViews,reports,invitations]=await Promise.all([
      this.prisma.contentComment.count({where:{targetType:"event",targetId:id,status:"active"}}),
      this.prisma.contentView.count({where:{targetType:"event",targetId:id,kind:"detail"}}),
      this.prisma.contentView.groupBy({by:["userId"],where:{targetType:"event",targetId:id,kind:"detail",userId:{not:null}}}),
      this.prisma.contentReport.count({where:{targetType:"event",targetId:id}}),
      this.prisma.eventInvitation.count({where:{eventId:id}}),
    ]);
    return {...event,ticketTypeRecords:event.ticketTypeRecords.map(({tickets,...row})=>({...row,price:Number(row.price),checkedIn:tickets.length,checkInPercent:row.soldCount?Math.round(tickets.length/row.soldCount*100):0})),counts:{comments,views,uniqueViewers:uniqueViews.length,reports,invitations}};
  }

  async releaseEventIncome(eventId: string, actor: User) {
    return this.prisma.$transaction(async tx => {
      const event = await tx.event.findUnique({ where: { id: eventId }, select: { status: true, endsAt: true } });
      if (!event) throw new NotFoundException("Etkinlik bulunamadı.");
      if (event.status !== "published" || !event.endsAt || Date.now() < event.endsAt.getTime() + 72 * 60 * 60 * 1000) throw new BadRequestException("Gelir yalnız yayımlanmış etkinliğin bitişinden 72 saat sonra serbest bırakılabilir.");
      const payments = await tx.paymentTransaction.findMany({ where: { eventId, releasedAt: null, status: { in: [PaymentStatus.succeeded, PaymentStatus.partially_refunded] } }, orderBy: { id: "asc" } });
      let released = 0;
      for (const payment of payments) {
        const claimed = await tx.paymentTransaction.updateMany({ where: { id: payment.id, releasedAt: null, status: payment.status, refundedAmount: payment.refundedAmount }, data: { releasedAt: new Date(), releasedById: actor.id } });
        if (!claimed.count) throw new BadRequestException("Gelir veya iade başka bir işlemle değişti. Güncel kayıtları yükleyin.");
        const amount = remainingNet(payment);
        const moved = await tx.financialAccount.updateMany({ where: { userId: payment.payeeId, preferredCurrency: payment.currency, heldBalance: { gte: amount } }, data: { heldBalance: { decrement: amount }, availableBalance: { increment: amount } } });
        if (!moved.count) throw new BadRequestException("Blokeli gelir veya hesap para birimi eşleşmiyor.");
        released += 1;
      }
      const sources = await tx.platformRevenue.updateMany({where:{eventId,held:true},data:{held:false}});
      await tx.curatorLedgerEntry.updateMany({ where: { eventId, held: true }, data: { held: false } });
      return { released, releasedSources: sources.count };
    });
  }

  async transactionsPage(query: Record<string,string>, user?: User) {
    const page = Math.max(1, Math.trunc(Number(query.page)) || 1); const pageSize = Math.min(200, Math.max(1, Math.trunc(Number(query.pageSize)) || 100));
    const end = query.until ? new Date(`${query.until}T00:00:00`) : null; if (end) end.setDate(end.getDate() + 1);
    const and: Prisma.PaymentTransactionWhereInput[] = [];
    if (user) and.push({ OR: [{ payerId: user.id }, { payeeId: user.id }] });
    if (query.q) and.push({ OR: [{ event: { title: { contains: query.q, mode: "insensitive" } } }, { payer: { name: { contains: query.q, mode: "insensitive" } } }, { payer: { username: { contains: query.q.replace(/^@/, ""), mode: "insensitive" } } }, { payee: { name: { contains: query.q, mode: "insensitive" } } }] });
    if (query.status && !Object.values(PaymentStatus).includes(query.status as PaymentStatus)) throw new BadRequestException("Geçersiz işlem durumu.");
    const snapshot = query.snapshot ? new Date(query.snapshot) : null;
    const start = query.from ? new Date(`${query.from}T00:00:00`) : null;
    if ([start, end, snapshot].some(date => date && !Number.isFinite(date.getTime()))) throw new BadRequestException("Geçersiz tarih filtresi.");
    const where: Prisma.PaymentTransactionWhereInput = { AND: and, ...(query.currency ? { currency: query.currency } : {}), ...(query.status ? { status: query.status as PaymentStatus } : {}), createdAt: { ...(start ? { gte: start } : {}), ...(end ? { lt: end } : {}), ...(snapshot ? { lte: snapshot } : {}) }, ...(query.country || query.city ? { event: { ...(query.country ? { country: { equals: query.country, mode: "insensitive" } } : {}), ...(query.city ? { city: { equals: query.city, mode: "insensitive" } } : {}) } } : {}) };
    const [items, total] = await this.prisma.$transaction([this.prisma.paymentTransaction.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: [{ createdAt: "desc" }, { id: "desc" }], include: { event: { select: { id: true, title: true, slug: true } }, payer: { select: { id: true, name: true } }, payee: { select: { id: true, name: true } } } }), this.prisma.paymentTransaction.count({ where })]);
    return { items, total, page, pageSize };
  }

  listAdminTransactions() { return this.prisma.paymentTransaction.findMany({ take: 200, orderBy: { createdAt: "desc" }, include: { event: { select: { id: true, title: true, slug: true } }, payer: { select: { id: true, name: true } }, payee: { select: { id: true, name: true } } } }); }
  listAdminAccounts() { return this.prisma.financialAccount.findMany({ take: 200, orderBy: { updatedAt: "desc" }, include: { user: { select: { id: true, name: true, email: true, accountType: true } } } }); }
  listAdminPayouts() { return this.prisma.payout.findMany({ take: 200, orderBy: { requestedAt: "desc" }, include: { user: { select: { id: true, name: true, email: true } } } }); }
  updateKyc(userId: string, status: KycStatus) { return this.prisma.financialAccount.update({ where: { userId }, data: { kycStatus: status } }); }
  async updatePayout(id: string, status: PayoutStatus) {
    if (status === PayoutStatus.paid) requireSandboxEnvironment();
    return this.prisma.$transaction(async (tx) => {
      const payout = await tx.payout.findUnique({ where: { id } });
      if (!payout) throw new NotFoundException("Para çekme talebi bulunamadı.");
      if (payout.status === status) return payout;
      if ([PayoutStatus.paid, PayoutStatus.failed, PayoutStatus.cancelled].includes(payout.status as "paid" | "failed" | "cancelled")) throw new BadRequestException("Sonuçlanan para çekme talebi tekrar değiştirilemez.");
      if (status === PayoutStatus.pending) throw new BadRequestException("İşlenen talep bekleyen duruma döndürülemez.");
      const finished = status === PayoutStatus.paid || status === PayoutStatus.failed || status === PayoutStatus.cancelled;
      const claimed = await tx.payout.updateMany({ where: { id, status: payout.status }, data: { status, processedAt: finished ? new Date() : null, providerRef: status === PayoutStatus.paid ? `sandbox_payout_${randomUUID()}` : undefined } });
      if (!claimed.count) throw new BadRequestException("Talep başka bir işlemle değişti. Yeniden yükleyin.");
      if (finished) {
        const settled = await tx.financialAccount.updateMany({ where: { userId: payout.userId, preferredCurrency: payout.currency, pendingBalance: { gte: payout.amount } }, data: { pendingBalance: { decrement: payout.amount }, ...(status === PayoutStatus.paid ? {} : { availableBalance: { increment: payout.amount } }) } });
        if (!settled.count) throw new BadRequestException("Blokeli bakiye veya hesap para birimi talep ile uyuşmuyor.");
      }
      return tx.payout.findUniqueOrThrow({ where: { id } });
    });
  }
}

function validMoney(amount: number) {
  return Number.isFinite(amount) && amount > 0 && Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001;
}
