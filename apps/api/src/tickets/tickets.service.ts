import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { OwnedTicketStatus, PaymentStatus, TicketOrderStatus, User } from "@prisma/client";
import { hash } from "bcryptjs";
import { createHash, randomUUID } from "crypto";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { RefundTicketOrderDto, TransferTicketsDto } from "./tickets.dto";
import { ManageTicketTypeDto } from "./tickets.dto";

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  listEventTypes(eventId: string) { return this.prisma.eventTicketType.findMany({ where: { eventId, status: { not: "inactive" } }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }).then((items) => items.map(this.presentType)); }
  async createType(eventId: string, input: ManageTicketTypeDto, actor: User) { await this.ensureManager(eventId, actor.id); this.validatePlatform(input, actor); const type = await this.prisma.eventTicketType.create({ data: { eventId, ...this.typeData(input) } }); return this.presentType(type); }
  async updateType(eventId: string, id: string, input: ManageTicketTypeDto, actor: User) { await this.ensureManager(eventId, actor.id); this.validatePlatform(input, actor); const existing = await this.prisma.eventTicketType.findFirst({ where: { id, eventId } }); if (!existing) throw new NotFoundException("Bilet türü bulunamadı."); if (input.capacity < existing.soldCount) throw new BadRequestException("Kapasite satılmış bilet sayısından düşük olamaz."); const type = await this.prisma.eventTicketType.update({ where: { id }, data: this.typeData(input) }); return this.presentType(type); }

  async purchase(ticketTypeId: string, quantity: number, buyer: User) {
    const type = await this.prisma.eventTicketType.findUnique({ where: { id: ticketTypeId }, include: { event: { select: { id: true, title: true, slug: true, status: true, createdById: true, startsAt: true, endsAt: true, format: true, locationName: true, locationAddress: true, city: true, country: true, liveUrl: true } } } });
    if (!type || type.event.status !== "published" || type.status !== "active") throw new NotFoundException("Satıştaki bilet bulunamadı.");
    if (type.salesPlatform === "external") throw new BadRequestException("Bu bilet dış satış platformundan alınmalıdır.");
    const now = new Date();
    if (type.saleStartsAt && type.saleStartsAt > now) throw new BadRequestException("Bilet satışı henüz başlamadı.");
    if (type.saleEndsAt && type.saleEndsAt < now) throw new BadRequestException("Bilet satışı sona erdi.");
    if (!type.event.createdById || type.event.createdById === buyer.id) throw new BadRequestException("Bu bilet satın alınamaz.");
    if (type.perUserLimit) {
      const purchased = await this.prisma.eventTicketOrder.aggregate({ where: { buyerId: buyer.id, ticketTypeId: type.id, status: TicketOrderStatus.paid }, _sum: { quantity: true } });
      if ((purchased._sum.quantity ?? 0) + quantity > type.perUserLimit) throw new BadRequestException(`Bu bilet türünde kişi başı en fazla ${type.perUserLimit} bilet alınabilir.`);
    }
    if (type.soldCount + quantity > type.capacity) throw new BadRequestException(`Bu kategoride ${Math.max(0, type.capacity - type.soldCount)} adet bilet kalmıştır.`);
    const total = Number(type.price) * quantity;
    const qrTokens = Array.from({ length: quantity }, () => randomUUID());
    const order = await this.prisma.$transaction(async (tx) => {
      const reserved = await tx.eventTicketType.updateMany({ where: { id: type.id, status: "active", soldCount: { lte: type.capacity - quantity } }, data: { soldCount: { increment: quantity }, ...(type.soldCount + quantity === type.capacity ? { status: "sold_out" } : {}) } });
      if (!reserved.count) throw new BadRequestException("Biletler az önce tükendi.");
      const fee = Math.round(total * 0.05 * 100) / 100;
      const payment = total > 0 && type.salesPlatform === "konnektora" ? await tx.paymentTransaction.create({ data: { eventId: type.eventId, payerId: buyer.id, payeeId: type.event.createdById!, grossAmount: total, platformFee: fee, netAmount: total - fee, currency: type.currency, status: PaymentStatus.succeeded, provider: "sandbox", providerRef: `sandbox_${randomUUID()}`, idempotencyKey: `ticket_${randomUUID()}`, paidAt: now, metadata: { ticketTypeId: type.id, quantity } } }) : null;
      if (payment) await tx.financialAccount.upsert({ where: { userId: type.event.createdById! }, create: { userId: type.event.createdById!, preferredCurrency: type.currency, availableBalance: payment.netAmount }, update: { availableBalance: { increment: payment.netAmount } } });
      const created = await tx.eventTicketOrder.create({ data: { eventId: type.eventId, ticketTypeId: type.id, buyerId: buyer.id, paymentId: payment?.id, quantity, unitPrice: type.price, totalAmount: total, currency: type.currency, status: TicketOrderStatus.paid, purchasedAt: now, eventStartsAtSnapshot: type.event.startsAt, eventEndsAtSnapshot: type.event.endsAt, eventLocationSnapshot: this.eventLocationSignature(type.event), tickets: { create: qrTokens.map((token) => ({ eventId: type.eventId, ticketTypeId: type.id, ownerId: buyer.id, qrToken: token, qrTokenHash: this.hashToken(token) })) } }, include: { tickets: true } });
      await tx.eventParticipant.upsert({ where: { eventId_userId: { eventId: type.eventId, userId: buyer.id } }, create: { eventId: type.eventId, userId: buyer.id, status: "accepted", role: "attendee" }, update: { status: "accepted" } });
      return created;
    });
    return { ...order, totalAmount: Number(order.totalAmount), unitPrice: Number(order.unitPrice), tickets: order.tickets.map((ticket, index) => ({ ...ticket, qrPayload: `konnektora-ticket:${ticket.id}:${qrTokens[index]}` })) };
  }

  async mine(userId: string) {
    const orders = await this.prisma.eventTicketOrder.findMany({ where: { tickets: { some: { ownerId: userId } } }, include: { event: true, ticketType: true, tickets: { where: { ownerId: userId }, orderBy: { createdAt: "asc" } }, payment: true }, orderBy: { createdAt: "desc" } });
    return orders.map((order) => ({ id: order.id, status: order.status, quantity: order.tickets.length, unitPrice: Number(order.unitPrice), totalAmount: Number(order.totalAmount), currency: order.currency, purchasedAt: order.purchasedAt, eventChanged: Boolean(order.eventStartsAtSnapshot && (order.eventStartsAtSnapshot.getTime() !== order.event.startsAt.getTime() || (order.eventEndsAtSnapshot?.getTime() ?? null) !== (order.event.endsAt?.getTime() ?? null) || order.eventLocationSnapshot !== this.eventLocationSignature(order.event))), event: { id: order.event.id, title: order.event.title, slug: order.event.slug, status: order.event.status, startsAt: order.event.startsAt, endsAt: order.event.endsAt, city: order.event.city, country: order.event.country, coverImageUrl: order.event.coverImageUrl }, ticketType: this.presentType(order.ticketType), tickets: order.tickets.map((ticket) => ({ id: ticket.id, status: ticket.status, createdAt: ticket.createdAt, usedAt: ticket.usedAt, qrPayload: `konnektora-ticket:${ticket.id}:${ticket.qrToken}` })) }));
  }

  async transfer(input: TransferTicketsDto, from: User) {
    const target = await this.resolveTarget(input);
    if (target.id === from.id) throw new BadRequestException("Bilet kendinize devredilemez.");
    const tickets = await this.prisma.ownedEventTicket.findMany({ where: { id: { in: input.ticketIds }, ownerId: from.id, status: OwnedTicketStatus.active } });
    if (tickets.length !== input.ticketIds.length || new Set(tickets.map((item) => item.eventId)).size !== 1) throw new BadRequestException("Devredilecek aktif biletler bulunamadı.");
    await this.prisma.$transaction(async (tx) => { for (const ticket of tickets) { await tx.ticketTransfer.create({ data: { ticketId: ticket.id, fromUserId: from.id, toUserId: target.id } }); await tx.ownedEventTicket.update({ where: { id: ticket.id }, data: { ownerId: target.id, transferredAt: new Date() } }); } await tx.eventParticipant.upsert({ where: { eventId_userId: { eventId: tickets[0]!.eventId, userId: target.id } }, create: { eventId: tickets[0]!.eventId, userId: target.id, status: "accepted", role: "attendee" }, update: { status: "accepted" } }); });
    await this.notifications.dispatch({ userId: target.id, topic: "event_invite", type: "ticket_transfer", title: "Sana bilet devredildi", body: `${from.name} sana ${tickets.length} bilet devretti.`, targetType: "event", targetId: tickets[0]!.eventId });
    return { transferred: tickets.length, recipient: { id: target.id, name: target.name, username: target.username } };
  }

  async refund(orderId: string, user: User, input: RefundTicketOrderDto) {
    const order = await this.prisma.eventTicketOrder.findUnique({ where: { id: orderId }, include: { tickets: true, payment: true, event: true } });
    if (!order || order.buyerId !== user.id) throw new NotFoundException("Bilet siparişi bulunamadı.");
    if (order.status !== TicketOrderStatus.paid || order.tickets.some((ticket) => ticket.status === OwnedTicketStatus.used || ticket.ownerId !== user.id)) throw new BadRequestException("Kullanılmış veya devredilmiş bilet içeren sipariş iade edilemez.");
    return this.prisma.$transaction(async (tx) => { if (order.payment) { const reversal = Number(order.payment.netAmount); const account = await tx.financialAccount.findUnique({ where: { userId: order.payment.payeeId } }); if (!account || Number(account.availableBalance) < reversal) throw new BadRequestException("İade için organizatör bakiyesi yetersiz."); await tx.financialAccount.update({ where: { userId: order.payment.payeeId }, data: { availableBalance: { decrement: reversal } } }); await tx.paymentTransaction.update({ where: { id: order.payment.id }, data: { status: PaymentStatus.refunded, refundedAmount: order.payment.grossAmount } }); await tx.ticketRefund.create({ data: { eventId: order.eventId, userId: user.id, paymentId: order.payment.id, amount: order.payment.grossAmount, currency: order.currency, provider: order.payment.provider, status: "refunded", reason: input.reason } }); } await tx.ownedEventTicket.updateMany({ where: { orderId }, data: { status: OwnedTicketStatus.refunded } }); await tx.eventTicketType.update({ where: { id: order.ticketTypeId }, data: { soldCount: { decrement: order.quantity }, status: "active" } }); return tx.eventTicketOrder.update({ where: { id: orderId }, data: { status: TicketOrderStatus.refunded } }); });
  }

  async scan(qrPayload: string, actor: User) {
    const parts = qrPayload.split(":"); if (parts.length !== 3 || parts[0] !== "konnektora-ticket") throw new BadRequestException("Geçersiz bilet QR kodu.");
    const ticket = await this.prisma.ownedEventTicket.findUnique({ where: { id: parts[1] }, include: { event: true, owner: { select: { id: true, name: true, username: true } }, ticketType: true } });
    if (!ticket) throw new NotFoundException("Bilet bulunamadı.");
    const canManage = await this.prisma.eventParticipant.findFirst({ where: { eventId: ticket.eventId, userId: actor.id, status: "accepted", role: { in: ["organizer", "manager"] } } }); if (!canManage) throw new ForbiddenException("Bu bileti kontrol edemezsiniz.");
    if (ticket.qrTokenHash !== this.hashToken(parts[2]!)) throw new BadRequestException("Bilet QR doğrulaması başarısız.");
    if (ticket.status !== OwnedTicketStatus.active) throw new BadRequestException("Bilet aktif değil veya daha önce kullanılmış.");
    const updated = await this.prisma.ownedEventTicket.update({ where: { id: ticket.id }, data: { status: OwnedTicketStatus.used, usedAt: new Date() } }); return { ...updated, owner: ticket.owner, ticketType: this.presentType(ticket.ticketType), eventTitle: ticket.event.title };
  }

  private async resolveTarget(input: TransferTicketsDto) { const OR = [...(input.username ? [{ username: input.username.toLowerCase() }] : []), ...(input.email ? [{ email: input.email.toLowerCase() }] : []), ...(input.phone ? [{ phone: input.phone }] : [])]; if (!OR.length) throw new BadRequestException("Alıcı kullanıcı adı, e-posta veya telefonla belirtilmelidir."); const found = await this.prisma.user.findFirst({ where: { OR } }); if (found) return found; if (!input.email) throw new NotFoundException("Alıcı bulunamadı; üye olmayan alıcı için e-posta gerekir."); return this.prisma.user.create({ data: { email: input.email.toLowerCase(), name: input.name?.trim() || input.email.split("@")[0]!, phone: input.phone, passwordHash: await hash(randomUUID(), 10), status: "invited" } }); }
  private hashToken(value: string) { return createHash("sha256").update(value).digest("hex"); }
  private eventLocationSignature(event: { format?: unknown; locationName?: unknown; locationAddress?: unknown; city?: unknown; country?: unknown; liveUrl?: unknown }) { return JSON.stringify([event.format ?? null, event.locationName ?? null, event.locationAddress ?? null, event.city ?? null, event.country ?? null, event.liveUrl ?? null]); }
  private validatePlatform(input: ManageTicketTypeDto, actor: User) { if (input.salesPlatform === "konnektora" && actor.accountType !== "corporate" && !["admin", "super_admin"].includes(actor.role)) throw new BadRequestException('Sadece kurumsal üyeler "Konnektora online satış" ayarını tercih edebilir.'); if (input.salesPlatform === "external") { try { new URL(input.externalSalesUrl ?? ""); } catch { throw new BadRequestException("Geçerli bir dış satış URL'si girin."); } } }
  private typeData(input: ManageTicketTypeDto) { return { name: input.name.trim(), description: input.description?.trim() || null, capacity: input.capacity, perUserLimit: input.perUserLimit ?? null, price: input.price, currency: input.currency.toUpperCase(), salesPlatform: input.salesPlatform ?? "door", externalSalesUrl: input.salesPlatform === "external" ? input.externalSalesUrl?.trim() || null : null, saleStartsAt: input.saleStartsAt ? new Date(input.saleStartsAt) : null, saleEndsAt: input.saleEndsAt ? new Date(input.saleEndsAt) : null, gateOpensAt: input.gateOpensAt ? new Date(input.gateOpensAt) : null, gateClosesAt: input.gateClosesAt ? new Date(input.gateClosesAt) : null, status: input.status ?? "active" as const }; }
  private async ensureManager(eventId: string, userId: string) { const manager = await this.prisma.eventParticipant.findFirst({ where: { eventId, userId, status: "accepted", role: { in: ["organizer", "manager"] } } }); if (!manager) throw new ForbiddenException("Etkinlik biletlerini yönetemezsiniz."); }
  private presentType(type: any) { return { ...type, price: Number(type.price), remaining: Math.max(0, type.capacity - type.soldCount) }; }
}
