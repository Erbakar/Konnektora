import { publicName } from "../common/public-name";
import { ForbiddenException, Injectable } from "@nestjs/common";
import { User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { CuratorApplicationDto } from "./curators.dto";

@Injectable()
export class CuratorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async apply(input: CuratorApplicationDto, user?: User) {
    const { preferredLanguage, ...applicationData } = input;
    const application = await this.prisma.curatorApplication.create({
      data: { ...applicationData, userId: user?.id },
    });
    await this.mailService.sendCuratorApplicationEmail({
      ...applicationData,
      applicationId: application.id,
      userId: user?.id,
      preferredLanguage: user?.preferredLanguage ?? preferredLanguage ?? "tr",
      submittedAt: application.createdAt,
    });
    return application;
  }
  async dashboard(user: User) {
    if (user.role !== "curator") throw new ForbiddenException("Küratör yetkisi gerekli.");
    const contract = await this.prisma.curatorAgreement.findFirst({ where: { userId: user.id, effectiveAt: { lte: new Date() } }, orderBy: { version: "desc" } });
    if (contract && !contract.active) throw new ForbiddenException("Küratör anlaşması pasif.");
    const territories = contract && Array.isArray(contract.territories) ? contract.territories as Array<{ country: string; city?: string; region?: string }> : [];
    const city = territories.length ? territories.map(row => row.city || row.region || row.country).join(", ") : user.curatorCity || user.city;
    if (!city) throw new ForbiddenException("Küratör için sorumlu şehir tanımlanmalı.");
    const scope = territories.length ? { OR: territories.map(row => ({ country: { equals: row.country, mode: "insensitive" as const }, ...(row.city ? { city: { equals: row.city, mode: "insensitive" as const } } : {}), ...(row.region ? { region: { equals: row.region, mode: "insensitive" as const } } : {}) })) } : { city: { equals: city, mode: "insensitive" as const } };
    const entityScope = scope;
    const [events, places, organizers, revenue] = await Promise.all([
      this.prisma.event.findMany({ where: { ...scope, status: { in: ["draft", "published"] } }, orderBy: { startsAt: "asc" }, take: 100, select: { id: true, title: true, slug: true, status: true, startsAt: true, createdBy: { select: { id: true, name: true, username: true, accountType: true, companyName: true, privacySettings: { select: { profileNameAudience: true } } } } } }),
      this.prisma.place.findMany({ where: { ...entityScope, status: "active" }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, name: true, slug: true, status: true, createdBy: { select: { id: true, name: true, username: true, accountType: true, companyName: true, privacySettings: { select: { profileNameAudience: true } } } } } }),
      this.prisma.user.findMany({ where: { ...entityScope, accountType: "corporate", status: "active" }, orderBy: { name: "asc" }, take: 100, select: { id: true, name: true, username: true, companyName: true, accountType: true, privacySettings: { select: { profileNameAudience: true } }, businessCategory: true } }),
      this.prisma.paymentTransaction.findMany({ where: { status: { in: ["succeeded", "partially_refunded", "refunded"] }, event: scope }, select: { currency: true, grossAmount: true, platformFee: true, netAmount: true, refundedAmount: true } })
    ]);
    const totals = new Map<string, { currency: string; platformRevenue: number; organizerRevenue: number }>();
    for (const payment of revenue) { const row = totals.get(payment.currency) ?? { currency: payment.currency, platformRevenue: 0, organizerRevenue: 0 }; const ratio = Number(payment.grossAmount) > 0 ? Math.max(0, Number(payment.grossAmount) - Number(payment.refundedAmount)) / Number(payment.grossAmount) : 0; row.platformRevenue += Math.round(Number(payment.platformFee) * ratio * 100) / 100; row.organizerRevenue += Math.round(Number(payment.netAmount) * ratio * 100) / 100; totals.set(payment.currency, row); }
    const byCurrency = [...totals.values()].map(row => ({ ...row, platformRevenue: Math.round(row.platformRevenue * 100) / 100, organizerRevenue: Math.round(row.organizerRevenue * 100) / 100 }));
    return { city, events: events.map(row => ({ ...row, createdBy: row.createdBy ? { id: row.createdBy.id, username: row.createdBy.username, name: publicName(row.createdBy) } : null })), places: places.map(row => ({ ...row, createdBy: row.createdBy ? { id: row.createdBy.id, username: row.createdBy.username, name: publicName(row.createdBy) } : null })), organizers: organizers.map(({ privacySettings, ...row }) => ({ ...row, name: publicName({ ...row, privacySettings }) })), revenue: { transactionCount: revenue.length, platformRevenue: byCurrency.length === 1 ? byCurrency[0]!.platformRevenue : 0, organizerRevenue: byCurrency.length === 1 ? byCurrency[0]!.organizerRevenue : 0, byCurrency } };

  }
}
