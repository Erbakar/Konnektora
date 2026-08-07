import { ForbiddenException, Injectable } from "@nestjs/common";
import { User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CuratorApplicationDto } from "./curators.dto";

@Injectable()
export class CuratorsService {
  constructor(private readonly prisma: PrismaService) {}
  apply(input: CuratorApplicationDto, user?: User) { return this.prisma.curatorApplication.create({ data: { ...input, userId: user?.id } }); }
  async dashboard(user: User) {
    if (user.role !== "curator") throw new ForbiddenException("Küratör yetkisi gerekli.");
    const city = user.curatorCity || user.city;
    if (!city) throw new ForbiddenException("Küratör için sorumlu şehir tanımlanmalı.");
    const [events, places, organizers, revenue] = await Promise.all([
      this.prisma.event.findMany({ where: { city: { equals: city, mode: "insensitive" }, status: { in: ["draft", "published"] } }, orderBy: { startsAt: "asc" }, take: 100, select: { id: true, title: true, slug: true, status: true, startsAt: true, createdBy: { select: { id: true, name: true, username: true } } } }),
      this.prisma.place.findMany({ where: { city: { equals: city, mode: "insensitive" }, status: { in: ["draft", "published"] } }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, name: true, slug: true, status: true, createdBy: { select: { id: true, name: true, username: true } } } }),
      this.prisma.user.findMany({ where: { city: { equals: city, mode: "insensitive" }, accountType: "corporate", status: "active" }, orderBy: { name: "asc" }, take: 100, select: { id: true, name: true, username: true, companyName: true, businessCategory: true } }),
      this.prisma.paymentTransaction.aggregate({ where: { status: { in: ["succeeded", "partially_refunded"] }, event: { city: { equals: city, mode: "insensitive" } } }, _sum: { platformFee: true, netAmount: true }, _count: { _all: true } })
    ]);
    return { city, events, places, organizers, revenue: { transactionCount: revenue._count._all, platformRevenue: Number(revenue._sum.platformFee ?? 0), organizerRevenue: Number(revenue._sum.netAmount ?? 0) } };
  }
}
