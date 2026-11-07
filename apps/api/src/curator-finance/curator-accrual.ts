import { BadRequestException } from "@nestjs/common";
import { type PaymentTransaction, Prisma } from "@prisma/client";
import { territoryMatches } from "./territory";
export { territoryMatches } from "./territory";
export async function accrueTicketCommission(tx: Prisma.TransactionClient, payment: PaymentTransaction) {
  if (Number(payment.platformFee) <= 0) return;
  const event = await tx.event.findUnique({ where: { id: payment.eventId }, select: { country: true, city: true, region: true, title: true } });
  if (!event) throw new BadRequestException("Gelir kaynağı etkinlik bulunamadı.");
  const contracts = await tx.curatorAgreement.findMany({ where: { effectiveAt: { lte: payment.paidAt ?? new Date() }, user: { role: "curator", status: "active" } }, orderBy: [{ userId: "asc" }, { version: "desc" }] });
  const seen = new Set<string>(); const rows: Prisma.CuratorLedgerEntryCreateManyInput[] = [];
  for (const contract of contracts) {
    if (seen.has(contract.userId)) continue; seen.add(contract.userId);
    if (!contract.active || !territoryMatches(contract.territories, event)) continue;
    const rate = Number((contract.rates as Record<string, number>).ticket_commission ?? 0);
    const amount = Math.round(Number(payment.platformFee) * rate) / 100;
    if (amount <= 0) continue;
    rows.push({ userId: contract.userId, agreementId: contract.id, paymentId: payment.id, eventId: payment.eventId, kind: "income", category: "ticket_commission", amount, currency: payment.currency, held: true, rate, description: `${event.title} · bilet komisyon payı`, sourceKey: `payment:${payment.id}:curator:${contract.userId}`, occurredAt: payment.paidAt ?? new Date() });
    const referral = Math.round(amount * Number(contract.referralRate)) / 100;
    if (contract.referrerId && referral > 0) rows.push({ userId: contract.referrerId, agreementId: contract.id, paymentId: payment.id, eventId: payment.eventId, kind: "income", category: "referral", amount: referral, currency: payment.currency, held: true, rate: contract.referralRate, description: `${event.title} · referans küratör payı`, sourceKey: `payment:${payment.id}:referral:${contract.userId}`, occurredAt: payment.paidAt ?? new Date() });
  }
  if (Math.round(rows.reduce((sum, row) => sum + Number(row.amount), 0) * 100) > Math.round(Number(payment.platformFee) * 100)) throw new BadRequestException("Küratör paylarının toplamı platform komisyonunu aşıyor. Anlaşma oranları düzeltilmeli.");
  if (rows.length) await tx.curatorLedgerEntry.createMany({ data: rows, skipDuplicates: true });
}
export async function reverseCuratorCommission(tx: Prisma.TransactionClient, payment: PaymentTransaction, refundAmount: number) {
  const entries = await tx.curatorLedgerEntry.findMany({ where: { paymentId: payment.id, kind: "income" }, orderBy: { id: "asc" } });
  for (const entry of entries) {
    // Lock against release so a reversal always uses the same held/available bucket as its income.
    const locked = await tx.curatorLedgerEntry.updateMany({ where: { id: entry.id, held: entry.held }, data: { held: entry.held } });
    if (!locked.count) throw new BadRequestException("Küratör geliri başka bir işlemle değişti. Yeniden deneyin.");
    const gross = Number(payment.grossAmount); const before = Number(payment.refundedAmount); const after = Math.min(gross, before + refundAmount);
    const amount = (Math.round(Number(entry.amount) * before / gross * 100) - Math.round(Number(entry.amount) * after / gross * 100)) / 100;
    if (amount === 0) continue;
    await tx.curatorLedgerEntry.create({ data: { userId: entry.userId, agreementId: entry.agreementId, paymentId: entry.paymentId, eventId: entry.eventId, kind: "refund", category: entry.category, description: `İade: ${entry.description}`, amount, currency: entry.currency, held: entry.held, rate: entry.rate, sourceKey: `refund:${payment.id}:${entry.id}:${Math.round(after * 100)}` } });
  }
}
