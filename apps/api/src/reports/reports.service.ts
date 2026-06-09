import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, ReportStatus, ReportTargetType, User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateReportDto, UpdateReportDto } from "./reports.dto";

const REPORT_INCLUDE = {
  reporter: { select: { id: true, email: true, name: true, role: true, status: true } },
  resolvedBy: { select: { id: true, email: true, name: true, role: true, status: true } }
} satisfies Prisma.ContentReportInclude;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReport(input: CreateReportDto, reporter: User) {
    await this.ensureTargetExists(input.targetType, input.targetId);

    return this.prisma.contentReport.create({
      data: {
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason.trim(),
        details: input.details?.trim() || null,
        reporter: { connect: { id: reporter.id } }
      },
      include: REPORT_INCLUDE
    });
  }

  listAdminReports() {
    return this.prisma.contentReport.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: REPORT_INCLUDE
    });
  }

  async updateReport(id: string, input: UpdateReportDto, admin: User) {
    const existing = await this.prisma.contentReport.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException("Rapor bulunamadı.");
    }

    const isClosed = input.status === ReportStatus.resolved || input.status === ReportStatus.dismissed;

    return this.prisma.contentReport.update({
      where: { id },
      data: {
        status: input.status,
        resolutionNote: input.resolutionNote?.trim() || null,
        resolvedBy: isClosed ? { connect: { id: admin.id } } : { disconnect: true },
        resolvedAt: isClosed ? new Date() : null
      },
      include: REPORT_INCLUDE
    });
  }

  private async ensureTargetExists(targetType: ReportTargetType, targetId: string) {
    if (targetType === ReportTargetType.event) {
      const event = await this.prisma.event.findUnique({ where: { id: targetId }, select: { id: true } });

      if (!event) {
        throw new NotFoundException("Raporlanacak etkinlik bulunamadı.");
      }

      return;
    }

    if (targetType === ReportTargetType.tag) {
      const tag = await this.prisma.tag.findUnique({ where: { id: targetId }, select: { id: true } });

      if (!tag) {
        throw new NotFoundException("Raporlanacak tag bulunamadı.");
      }

      return;
    }

    if (targetType === ReportTargetType.user) {
      const user = await this.prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });

      if (!user) {
        throw new NotFoundException("Raporlanacak kullanıcı bulunamadı.");
      }

      return;
    }

    throw new BadRequestException("Desteklenmeyen rapor hedefi.");
  }
}
