import { territoriesOverlap, Territory } from "./territory";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CuratorAgreementDto, CuratorEntryDto, incomeCategories } from "./curator-finance.dto";

@Injectable()
export class CuratorFinanceService {
  constructor(private readonly prisma: PrismaService) {}
  events(q: string) { return this.prisma.event.findMany({ where: { status: "published", title: { contains: q, mode: "insensitive" } }, orderBy: { startsAt: "desc" }, take: 30, select: { id: true, title: true, startsAt: true } }); }
  candidates(q: string) { return this.prisma.user.findMany({ where: { role: { in: ["user", "curator"] }, status: "active", OR: [{ username: { contains: q.replace(/^@/, ""), mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] }, take: 20, select: { id: true, name: true, username: true } }); }
  list() { return this.prisma.user.findMany({ where: { role: "curator" }, orderBy: { name: "asc" }, select: { id: true, name: true, username: true, status: true, curatorCity: true, curatorAgreements: { orderBy: { version: "desc" }, take: 1 } } }); }
  agreements(userId: string) { return this.prisma.curatorAgreement.findMany({ where: { userId }, orderBy: { version: "desc" } }); }
  async saveAgreement(userId: string, input: CuratorAgreementDto, actor: User) {
    const territories = input.territories.map(row => ({ country: row.country.trim(), city: row.city.trim(), region: row.region?.trim() || "" }));
    if (territories.some(row => !row.country)) throw new BadRequestException("En az bir ülke zorunludur. Şehir ve bölge boşsa ülkenin tamamı kapsanır.");
    for (const [key, rate] of Object.entries(input.rates)) if (!incomeCategories.includes(key as never) || !Number.isFinite(rate) || rate < 0 || rate > 100 || Math.abs(rate * 100 - Math.round(rate * 100)) > 0.000001) throw new BadRequestException("Pay oranları 0–100 arasında ve en fazla iki ondalık olmalı.");
    if ((input.referralRate ?? 0) > 0 && !input.referrerId) throw new BadRequestException("Referans payı için referans küratör seçilmeli.");
    if (input.referrerId === userId) throw new BadRequestException("Küratör kendisini referans gösteremez.");
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(413311400)`;
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || !["user", "curator"].includes(user.role) || user.status !== "active") throw new BadRequestException("Aktif bir üye veya küratör seçin.");
      if (input.referrerId && !await tx.user.findFirst({ where: { id: input.referrerId, role: "curator", status: "active" } })) throw new BadRequestException("Referans küratör bulunamadı.");
      await tx.user.update({ where: { id: userId }, data: { role: "curator", curatorCity: territories[0]?.city ?? null } });
      const previous = await tx.curatorAgreement.findFirst({ where: { userId }, orderBy: { version: "desc" } });
      if (input.active) {
        const contracts = await tx.curatorAgreement.findMany({ where: { userId: { not: userId }, user: { role: "curator", status: "active" } }, orderBy: [{ userId: "asc" }, { version: "desc" }] });
        const seen = new Set<string>(); const current = contracts.filter(contract => { if (seen.has(contract.userId)) return false; seen.add(contract.userId); return contract.active; });
        for (const territory of territories) {
          const overlap = current.filter(contract => Array.isArray(contract.territories) && (contract.territories as Territory[]).some(row => territoriesOverlap(row, territory)));
          for (const category of incomeCategories.filter(key => key !== "referral")) {
            const total = Number(input.rates[category] ?? 0) * (1 + (input.referrerId ? Number(input.referralRate ?? 0) / 100 : 0)) + overlap.reduce((sum, contract) => sum + Number((contract.rates as Record<string,number>)[category] ?? 0) * (1 + (contract.referrerId ? Number(contract.referralRate) / 100 : 0)), 0);
            if (total > 100.000001) throw new BadRequestException(`${territory.city || territory.region || territory.country} için ${category} toplam payı %100'ü aşamaz.`);
          }
        }
      }
      return tx.curatorAgreement.create({ data: { ...input, territories, rates: input.rates as Prisma.InputJsonValue, userId, version: (previous?.version ?? 0) + 1, createdById: actor.id, effectiveAt: new Date(), referralRate: input.referralRate ?? 0, iban: input.iban?.replace(/\s/g, "").toUpperCase() } });
    });
  }
  async ledger(userId: string, query: Record<string, string> = {}) {
    const page = Math.max(1, Number(query.page) || 1); const pageSize = Math.min(200, Math.max(1, Number(query.pageSize) || 100));
    const rows = await this.prisma.curatorLedgerEntry.findMany({ where: { userId, ...(query.snapshot ? { createdAt: { lte: new Date(query.snapshot) } } : {}) }, orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }, { id: "asc" }], include: { event: { select: { title: true, slug: true } } } });
    const balances: Record<string, { available: number; held: number; total: number }> = {};
    const dated = rows.map(row => { const current = balances[row.currency] ?? { available: 0, held: 0, total: 0 }; const amount = Number(row.amount); current[row.held ? "held" : "available"] = round(current[row.held ? "held" : "available"] + amount); current.total = round(current.total + amount); balances[row.currency] = current; return { ...row, amount, rate: row.rate === null ? null : Number(row.rate), balance: current.total }; });
    const end = query.until ? new Date(`${query.until}T00:00:00`) : null; if (end) end.setDate(end.getDate() + 1);
    const filtered = dated.filter(row => (!query.kind || row.kind === query.kind) && (!query.currency || row.currency === query.currency) && (!query.q || `${row.description} ${row.event?.title ?? ""}`.toLocaleLowerCase("tr").includes(query.q.toLocaleLowerCase("tr"))) && (!query.from || row.occurredAt >= new Date(`${query.from}T00:00:00`)) && (!end || row.occurredAt < end)).reverse();
    return { items: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize, balances };
  }
  async ownLedger(user: User, query: Record<string, string>) { if (user.role !== "curator") throw new ForbiddenException("Küratör yetkisi gerekli."); return this.ledger(user.id, query); }
  async manual(userId: string, input: CuratorEntryDto, actor: User, replacesId?: string) {
    if (!input.description.trim() || !Number.isFinite(input.amount) || input.amount <= 0 || Math.abs(input.amount * 100 - Math.round(input.amount * 100)) > 0.000001) throw new BadRequestException("Geçerli açıklama ve tutar girin.");
    if (new Date(input.occurredAt).getTime() > Date.now()) throw new BadRequestException("Gerçekleşmemiş işlem tarihi kullanılamaz.");
    return this.prisma.$transaction(async tx => {
      const user = await tx.user.findFirst({ where: { id: userId, role: "curator" } }); if (!user) throw new NotFoundException("Küratör bulunamadı.");
      await tx.user.update({ where: { id: userId }, data: { updatedAt: new Date() } });
      const sourceKey = `manual:${input.requestId}`;
      const existing = await tx.curatorLedgerEntry.findUnique({ where: { sourceKey } });
      if (existing) { if (existing.userId !== userId || existing.createdById !== actor.id) throw new ForbiddenException("İşlem anahtarı başka kayda ait."); return existing; }
      const original = replacesId ? await tx.curatorLedgerEntry.findUnique({ where: { id: replacesId } }) : null;
      if (replacesId && (!original || original.userId !== userId || !original.sourceKey.startsWith("manual:") || !["income", "payment"].includes(original.kind) || await tx.curatorLedgerEntry.findUnique({ where: { replacesId } }))) throw new BadRequestException("Bu hareket düzeltilemez veya daha önce düzeltildi.");
      const event = input.eventId ? await tx.event.findUnique({ where: { id: input.eventId }, select: { id: true, status: true, endsAt: true, payments: { where: { releasedAt: { not: null } }, take: 1, select: { id: true } } } }) : null;
      const eventIncome = input.kind === "income" && ["event_gate", "sponsorship", "ticket_commission"].includes(input.category);
      if (eventIncome && !event) throw new BadRequestException("Etkinlik gelirine kaynak etkinlik seçilmeli.");
      if (input.eventId && !event) throw new NotFoundException("Kaynak etkinlik bulunamadı.");
      const amount = input.kind === "payment" ? -input.amount : input.amount;
      const held = Boolean(eventIncome); // Every new manual event earning needs explicit admin release too.
      if (original) { const locked = await tx.curatorLedgerEntry.updateMany({ where: { id: original.id, held: original.held }, data: { held: original.held } }); if (!locked.count) throw new BadRequestException("Hareket değişti. Yeniden yükleyin."); }
      if (original) await tx.curatorLedgerEntry.create({ data: { userId, kind: "adjustment", category: original.category, amount: -Number(original.amount), currency: original.currency, held: original.held, description: `Düzeltme: ${original.description}`, sourceKey: `${sourceKey}:reverse`, eventId: original.eventId, occurredAt: new Date(), createdById: actor.id } });
      const buckets = [{ currency: input.currency, held }, ...(original ? [{ currency: original.currency, held: original.held }] : [])];
      const checked = new Set<string>();
      for (const bucket of buckets) {
        const key = `${bucket.currency}:${bucket.held}`; if (checked.has(key)) continue; checked.add(key);
        const current = await tx.curatorLedgerEntry.aggregate({ where: { userId, currency: bucket.currency, held: bucket.held }, _sum: { amount: true } });
        const before = Number(current._sum.amount ?? 0) + (original && original.currency === bucket.currency && original.held === bucket.held ? Number(original.amount) : 0);
        const after = Number(current._sum.amount ?? 0) + (input.currency === bucket.currency && held === bucket.held ? amount : 0);
        if (round(after) < 0 && round(after) < round(before)) throw new BadRequestException("Ödeme veya düzeltme kullanılabilir bakiyeyi aşamaz.");
      }
      return tx.curatorLedgerEntry.create({ data: { userId, kind: input.kind, category: input.category, amount, currency: input.currency, held, description: `${input.description.trim()}${input.kind === "payment" ? ` · ${{ bank_transfer: "Banka havalesi", cash: "Nakit", other: "Diğer" }[input.method] ?? "Diğer"}` : ""}`, sourceKey, replacesId, eventId: input.eventId, occurredAt: new Date(input.occurredAt), createdById: actor.id } });
    });
  }
}
function round(value: number) { return Math.round(value * 100) / 100; }
