import { actorLabel, isUndiscoverable, notifyMembershipInvite } from "../notifications/activity-events";
import { ticketSalesEligibility, ticketSalesRequirement } from "../common/ticket-sales-eligibility";
import { ticketAmounts } from "../finance/ticket-pricing";
import { createTransferPdf } from "./ticket-pdf";
import { publicName } from "../common/public-name";
import { requireSandboxEnvironment } from "../finance/payment-availability";
import { accrueTicketCommission } from "../curator-finance/curator-accrual";
import { reverseStoredPayment } from "../finance/payment-ledger";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { OwnedTicketStatus, PaymentStatus, TicketOrderStatus, User } from "@prisma/client";
import { hash } from "bcryptjs";
import { createHash, randomUUID } from "crypto";
import { AuthService } from "../auth/auth.service";
import { MailService } from "../mail/mail.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { SmsService } from "../sms/sms.service";
import { RefundTicketOrderDto, TransferTicketsDto } from "./tickets.dto";
import { ManageTicketTypeDto } from "./tickets.dto";

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly auth: AuthService,
    private readonly mail: MailService,
    private readonly sms: SmsService,
  ) {}

  listEventTypes(eventId: string) { return this.prisma.eventTicketType.findMany({ where: { eventId, status: { not: "inactive" } }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }).then((items) => items.map(this.presentType)); }
  async createType(eventId: string, input: ManageTicketTypeDto, actor: User) { await this.ensureManager(eventId, actor.id); await this.validatePlatform(input, actor); const type = await this.prisma.eventTicketType.create({ data: { eventId, ...this.typeData(input) } }); return this.presentType(type); }
  async updateType(eventId: string, id: string, input: ManageTicketTypeDto, actor: User) { await this.ensureManager(eventId, actor.id); await this.validatePlatform(input, actor); const existing = await this.prisma.eventTicketType.findFirst({ where: { id, eventId } }); if (!existing) throw new NotFoundException("Bilet türü bulunamadı."); if (input.capacity < existing.soldCount) throw new BadRequestException("Kapasite satılmış bilet sayısından düşük olamaz."); const type = await this.prisma.eventTicketType.update({ where: { id }, data: this.typeData(input) }); return this.presentType(type); }

  async purchase(ticketTypeId: string, quantity: number, buyer: User) {
    const type = await this.prisma.eventTicketType.findUnique({ where: { id: ticketTypeId }, include: { event: { select: { id: true, title: true, slug: true, status: true, createdById: true, startsAt: true, endsAt: true, format: true, locationName: true, locationAddress: true, city: true, country: true, liveUrl: true } } } });
    if (!type || type.event.status !== "published" || type.status !== "active") throw new NotFoundException("Satıştaki bilet bulunamadı.");
    if (type.salesPlatform === "external") throw new BadRequestException("Bu bilet dış satış platformundan alınmalıdır.");
    const now = new Date();
    if (type.saleStartsAt && type.saleStartsAt > now) throw new BadRequestException("Bilet satışı henüz başlamadı.");
    if (type.saleEndsAt && type.saleEndsAt < now) throw new BadRequestException("Bilet satışı sona erdi.");
    if (Number(type.price) > 0 && (!type.event.createdById || type.event.createdById === buyer.id)) throw new BadRequestException("Bu bilet satın alınamaz.");
    if (type.perUserLimit) {
      const purchased = await this.prisma.eventTicketOrder.aggregate({ where: { buyerId: buyer.id, ticketTypeId: type.id, status: TicketOrderStatus.paid }, _sum: { quantity: true } });
      if ((purchased._sum.quantity ?? 0) + quantity > type.perUserLimit) throw new BadRequestException(`Bu bilet türünde kişi başı en fazla ${type.perUserLimit} bilet alınabilir.`);
    }
    if (type.soldCount + quantity > type.capacity) throw new BadRequestException(`Bu kategoride ${Math.max(0, type.capacity - type.soldCount)} adet bilet kalmıştır.`);
    const total = Number(type.price) * quantity;
    if (total > 0) requireSandboxEnvironment();
    const qrTokens = Array.from({ length: quantity }, () => randomUUID());
    const order = await this.prisma.$transaction(async (tx) => {
      const reserved = await tx.eventTicketType.updateMany({ where: { id: type.id, status: "active", soldCount: { lte: type.capacity - quantity } }, data: { soldCount: { increment: quantity }, ...(type.soldCount + quantity === type.capacity ? { status: "sold_out" } : {}) } });
      if (!reserved.count) throw new BadRequestException("Biletler az önce tükendi.");
      const { fee, net } = ticketAmounts(total);
      const payment = total > 0 && type.salesPlatform === "konnektora" ? await tx.paymentTransaction.create({ data: { eventId: type.eventId, payerId: buyer.id, payeeId: type.event.createdById!, grossAmount: total, platformFee: fee, netAmount: net, currency: type.currency, status: PaymentStatus.succeeded, provider: "sandbox", providerRef: `sandbox_${randomUUID()}`, idempotencyKey: `ticket_${randomUUID()}`, paidAt: now, metadata: { ticketTypeId: type.id, quantity } } }) : null;
      if (payment) {
        await tx.financialAccount.upsert({ where: { userId: type.event.createdById! }, create: { userId: type.event.createdById!, preferredCurrency: type.currency }, update: {} });
        const credited = await tx.financialAccount.updateMany({ where: { userId: type.event.createdById!, preferredCurrency: type.currency }, data: { heldBalance: { increment: payment.netAmount } } });
        if (!credited.count) throw new BadRequestException("Bilet para birimi organizatörün finans hesabıyla eşleşmiyor.");
        await accrueTicketCommission(tx, payment);
      }
      const created = await tx.eventTicketOrder.create({ data: { eventId: type.eventId, ticketTypeId: type.id, buyerId: buyer.id, paymentId: payment?.id, quantity, unitPrice: type.price, totalAmount: total, currency: type.currency, status: TicketOrderStatus.paid, purchasedAt: now, eventStartsAtSnapshot: type.event.startsAt, eventEndsAtSnapshot: type.event.endsAt, eventLocationSnapshot: this.eventLocationSignature(type.event), tickets: { create: qrTokens.map((token) => ({ eventId: type.eventId, ticketTypeId: type.id, ownerId: buyer.id, qrToken: token, qrTokenHash: this.hashToken(token) })) } }, include: { tickets: true } });
      await tx.eventParticipant.upsert({ where: { eventId_userId: { eventId: type.eventId, userId: buyer.id } }, create: { eventId: type.eventId, userId: buyer.id, status: "accepted", role: "attendee" }, update: { status: "accepted" } });
      return created;
    });
    return { ...order, totalAmount: Number(order.totalAmount), unitPrice: Number(order.unitPrice), tickets: order.tickets.map((ticket, index) => ({ ...ticket, qrPayload: `konnektora-ticket:${ticket.id}:${qrTokens[index]}` })) };
  }

  async mine(userId: string) {
    const orders = await this.prisma.eventTicketOrder.findMany({ where: { tickets: { some: { ownerId: userId } } }, include: { event: { include: { place: { select: { name: true, address: true, city: true, country: true } } } }, ticketType: true, tickets: { where: { ownerId: userId }, orderBy: { createdAt: "asc" } }, payment: true }, orderBy: { createdAt: "desc" } });
    return orders.map((order) => ({ id: order.id, status: order.status, quantity: order.tickets.length, unitPrice: Number(order.unitPrice), totalAmount: Number(order.totalAmount), currency: order.currency, purchasedAt: order.purchasedAt, eventChanged: Boolean(order.eventStartsAtSnapshot && (order.eventStartsAtSnapshot.getTime() !== order.event.startsAt.getTime() || (order.eventEndsAtSnapshot?.getTime() ?? null) !== (order.event.endsAt?.getTime() ?? null) || order.eventLocationSnapshot !== this.eventLocationSignature(order.event))), event: { id: order.event.id, title: order.event.title, slug: order.event.slug, status: order.event.status, startsAt: order.event.startsAt, endsAt: order.event.endsAt, city: order.event.city, country: order.event.country, coverImageUrl: order.event.coverImageUrl, locationName: order.event.place?.name ?? order.event.locationName, locationAddress: order.event.place?.address ?? order.event.locationAddress }, ticketType: this.presentType(order.ticketType), tickets: order.tickets.map((ticket) => ({ id: ticket.id, status: ticket.status, createdAt: ticket.createdAt, usedAt: ticket.usedAt, qrPayload: `konnektora-ticket:${ticket.id}:${ticket.qrToken}` })) }));
  }

  async transfer(input: TransferTicketsDto, from: User) {
    const tickets = await this.prisma.ownedEventTicket.findMany({ where: { id: { in: input.ticketIds }, ownerId: from.id, status: OwnedTicketStatus.active }, include: { ticketType: true, event: { include: { place: true } } } });
    if (tickets.length !== input.ticketIds.length || new Set(tickets.map((item) => item.eventId)).size !== 1) throw new BadRequestException("Devredilecek aktif biletler bulunamadı.");
    const target = await this.resolveTarget(input);
    if (target.id === from.id) throw new BadRequestException("Bilet kendinize devredilemez.");
    const updatedTickets = tickets.map((ticket) => ({ ...ticket, qrToken: randomUUID() }));
    const emailRecipient = !input.phone && !target.email.endsWith("@invite.konnektora.local");
    const pdf = emailRecipient ? await createTransferPdf({ recipientName: target.status === "invited" ? input.name || "Davetli" : target.name, event: tickets[0]!.event, tickets: updatedTickets }, this.mail.getAppUrl()) : undefined;
    await this.prisma.$transaction(async (tx) => {
      for (const ticket of updatedTickets) {
        const changed = await tx.ownedEventTicket.updateMany({ where: { id: ticket.id, ownerId: from.id, status: OwnedTicketStatus.active, qrToken: tickets.find((original) => original.id === ticket.id)!.qrToken }, data: { ownerId: target.id, transferredAt: new Date(), qrToken: ticket.qrToken, qrTokenHash: this.hashToken(ticket.qrToken) } });
        if (changed.count !== 1) throw new BadRequestException("Biletin durumu değişti. Biletlerinizi yenileyip tekrar deneyin.");
        await tx.ticketTransfer.create({ data: { ticketId: ticket.id, fromUserId: from.id, toUserId: target.id } });
      }
      await tx.eventParticipant.upsert({ where: { eventId_userId: { eventId: tickets[0]!.eventId, userId: target.id } }, create: { eventId: tickets[0]!.eventId, userId: target.id, status: "accepted", role: "attendee" }, update: { status: "accepted" } });
    });
    const senderName = from.username ? `@${from.username}` : "Bir üye";
    let deliveryFailed = false;
    try {
      await this.notifications.dispatch({ userId: target.id, topic: "event_invite", type: "ticket_transfer", context: { actorId: from.id, ticketCount: tickets.length, hiddenDiscovery: Boolean((input.phone || input.email) && await isUndiscoverable(this.prisma, target.id)), targetLabel: "Biletlerime git", targetUrl: "/tickets" }, title: "Sana bilet devredildi", body: `${senderName} sana ${tickets.length} bilet devretti.`, targetType: "event", targetId: tickets[0]!.eventId, skipEmail: emailRecipient });
      if (target.status === "invited") {
        await notifyMembershipInvite(this.prisma, from, target, `transfer:${tickets[0]!.id}`);
        if(input.phone && target.phone)await this.sms.sendContactInvite(target.phone,actorLabel(from));
        else if(emailRecipient)await this.mail.sendContactInviteEmail({to:target.email,name:target.name,invitedByName:actorLabel(from)});
      }
      const acceptToken = target.status === "invited" ? await this.auth.createInviteAcceptToken(target.id) : undefined;
      if (input.phone && target.phone) {
        await this.sms.sendTicketTransfer(target.phone, senderName, tickets[0]!.event.title, tickets.length, acceptToken);
      } else if (emailRecipient) {
        await this.mail.sendTicketTransferEmail({ to: target.email, name: target.status === "invited" ? input.name || "Davetli" : target.name, eventTitle: tickets[0]!.event.title, invitedByName: senderName, quantity: tickets.length, acceptToken, pdf });
      }
    } catch {
      deliveryFailed = true;
    }
    return { transferred: tickets.length, deliveryFailed, recipient: { id: target.id, name: publicName(target), username: target.username } };
  }

  async refund(orderId: string, user: User, input: RefundTicketOrderDto) {
    const order = await this.prisma.eventTicketOrder.findUnique({ where: { id: orderId }, include: { tickets: true, payment: true, event: true } });
    if (!order || order.buyerId !== user.id) throw new NotFoundException("Bilet siparişi bulunamadı.");
    if (order.status !== TicketOrderStatus.paid || order.tickets.some((ticket) => ticket.status === OwnedTicketStatus.used || ticket.ownerId !== user.id)) throw new BadRequestException("Kullanılmış veya devredilmiş bilet içeren sipariş iade edilemez.");
    const eventChanged = order.eventStartsAtSnapshot && (order.eventStartsAtSnapshot.getTime() !== order.event.startsAt.getTime() || (order.eventEndsAtSnapshot?.getTime() ?? null) !== (order.event.endsAt?.getTime() ?? null) || order.eventLocationSnapshot !== this.eventLocationSignature(order.event));
    if (!eventChanged) throw new BadRequestException("Etkinliğin yeri veya zamanı değişmediği için bu bilet iade edilemez.");
    return this.prisma.$transaction(async (tx) => { if (order.payment) { const refundAmount = await reverseStoredPayment(tx, order.payment); if (refundAmount > 0) await tx.ticketRefund.create({ data: { eventId: order.eventId, userId: user.id, paymentId: order.payment.id, amount: refundAmount, currency: order.currency, provider: order.payment.provider, status: "refunded", reason: input.reason } }); } await tx.ownedEventTicket.updateMany({ where: { orderId }, data: { status: OwnedTicketStatus.refunded } }); await tx.eventTicketType.update({ where: { id: order.ticketTypeId }, data: { soldCount: { decrement: order.quantity }, status: "active" } }); return tx.eventTicketOrder.update({ where: { id: orderId }, data: { status: TicketOrderStatus.refunded } }); });
  }

  async scan(qrPayload: string, actor: User) {
    const parts = qrPayload.split(":"); if (parts.length !== 3 || parts[0] !== "konnektora-ticket") throw new BadRequestException("Geçersiz bilet QR kodu.");
    const ticket = await this.prisma.ownedEventTicket.findUnique({ where: { id: parts[1] }, include: { event: true, owner: { select: { id: true, name: true, username: true } }, ticketType: true } });
    if (!ticket) throw new NotFoundException("Bilet bulunamadı.");
    const canManage = await this.prisma.eventParticipant.findFirst({ where: { eventId: ticket.eventId, userId: actor.id, status: { in: ["accepted", "attended", "not_attending"] }, role: { in: ["organizer", "manager"] } } }); if (!canManage) throw new ForbiddenException("Bu bileti kontrol edemezsiniz.");
    if (ticket.qrTokenHash !== this.hashToken(parts[2]!)) throw new BadRequestException("Bilet QR doğrulaması başarısız.");
    if (ticket.status !== OwnedTicketStatus.active) throw new BadRequestException("Bilet aktif değil veya daha önce kullanılmış.");
    const updated = await this.prisma.ownedEventTicket.update({ where: { id: ticket.id }, data: { status: OwnedTicketStatus.used, usedAt: new Date() } }); return { ...updated, owner: ticket.owner, ticketType: this.presentType(ticket.ticketType), eventTitle: ticket.event.title };
  }

  private async resolveTarget(input: TransferTicketsDto) {
    const username = input.username?.trim().replace(/^@/, "").toLowerCase();
    const email = input.email?.trim().toLowerCase();
    const phone = input.phone?.trim();
    const OR = [...(username ? [{ username }] : []), ...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])];
    if (!OR.length) throw new BadRequestException("Alıcı kullanıcı adı, e-posta veya telefonla belirtilmelidir.");
    const found = await this.prisma.user.findFirst({ where: { OR }, include: { privacySettings: { select: { profileNameAudience: true } } } });
    if (found) return found;
    if (!email && !phone) throw new NotFoundException("Alıcı bulunamadı. Üye olmayan alıcı için e-posta veya telefon gerekir.");
    const placeholderEmail = email ?? `phone-${this.hashToken(phone!).slice(0, 24)}@invite.konnektora.local`;
    return this.prisma.user.create({ data: { email: placeholderEmail, name: input.name?.trim() || email?.split("@")[0] || phone!, phone, passwordHash: await hash(randomUUID(), 10), status: "invited" } });
  }
  private hashToken(value: string) { return createHash("sha256").update(value).digest("hex"); }
  private eventLocationSignature(event: { format?: unknown; locationName?: unknown; locationAddress?: unknown; city?: unknown; country?: unknown; liveUrl?: unknown }) { return JSON.stringify([event.format ?? null, event.locationName ?? null, event.locationAddress ?? null, event.city ?? null, event.country ?? null, event.liveUrl ?? null]); }
  private async validatePlatform(input: ManageTicketTypeDto, actor: User) { if (input.salesPlatform === "konnektora" && !(await ticketSalesEligibility(this.prisma, actor)).eligible) throw new BadRequestException(ticketSalesRequirement); if (input.salesPlatform === "external") { try { new URL(input.externalSalesUrl ?? ""); } catch { throw new BadRequestException("Geçerli bir dış satış URL'si girin."); } } }
  private typeData(input: ManageTicketTypeDto) { return { name: input.name.trim(), description: input.description?.trim() || null, capacity: input.capacity, perUserLimit: input.perUserLimit ?? null, price: input.price, currency: input.currency.toUpperCase(), salesPlatform: input.salesPlatform ?? "door", externalSalesUrl: input.salesPlatform === "external" ? input.externalSalesUrl?.trim() || null : null, saleStartsAt: input.saleStartsAt ? new Date(input.saleStartsAt) : null, saleEndsAt: input.saleEndsAt ? new Date(input.saleEndsAt) : null, gateOpensAt: input.gateOpensAt ? new Date(input.gateOpensAt) : null, gateClosesAt: input.gateClosesAt ? new Date(input.gateClosesAt) : null, status: input.status ?? "active" as const }; }
  private async ensureManager(eventId: string, userId: string) { const manager = await this.prisma.eventParticipant.findFirst({ where: { eventId, userId, status: { in: ["accepted", "attended", "not_attending"] }, role: { in: ["organizer", "manager"] } } }); if (!manager) throw new ForbiddenException("Etkinlik biletlerini yönetemezsiniz."); }
  private presentType(type: any) { return { ...type, price: Number(type.price), remaining: Math.max(0, type.capacity - type.soldCount) }; }
}
