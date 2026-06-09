import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { EventStatus, Prisma, ReportStatus, ReportTargetType, TagStatus, User, UserStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateReportDto, ModerationAction, ResolveReportActionDto, UpdateReportDto } from "./reports.dto";

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

  async resolveWithAction(id: string, input: ResolveReportActionDto, admin: User) {
    const report = await this.prisma.contentReport.findUnique({ where: { id } });

    if (!report) {
      throw new NotFoundException("Rapor bulunamadı.");
    }

    this.ensureActionMatchesTarget(report.targetType, input.action);

    if (input.action === ModerationAction.disable_user && report.targetId === admin.id) {
      throw new BadRequestException("Admin kendi hesabını bu aksiyonla disable edemez.");
    }

    return this.prisma.$transaction(async (tx) => {
      if (input.action === ModerationAction.archive_event) {
        await tx.event.update({
          where: { id: report.targetId },
          data: {
            status: EventStatus.archived,
            updatedBy: { connect: { id: admin.id } }
          }
        });
      }

      if (input.action === ModerationAction.archive_tag) {
        await tx.tag.update({
          where: { id: report.targetId },
          data: {
            status: TagStatus.archived,
            updatedBy: { connect: { id: admin.id } }
          }
        });
      }

      if (input.action === ModerationAction.disable_user) {
        await tx.user.update({
          where: { id: report.targetId },
          data: { status: UserStatus.disabled }
        });
      }

      return tx.contentReport.update({
        where: { id },
        data: {
          status: ReportStatus.resolved,
          resolutionNote: input.resolutionNote?.trim() || this.defaultResolutionNote(input.action),
          resolvedBy: { connect: { id: admin.id } },
          resolvedAt: new Date()
        },
        include: REPORT_INCLUDE
      });
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

  private ensureActionMatchesTarget(targetType: ReportTargetType, action: ModerationAction) {
    if (targetType === ReportTargetType.event && action === ModerationAction.archive_event) {
      return;
    }

    if (targetType === ReportTargetType.tag && action === ModerationAction.archive_tag) {
      return;
    }

    if (targetType === ReportTargetType.user && action === ModerationAction.disable_user) {
      return;
    }

    throw new BadRequestException("Moderasyon aksiyonu rapor hedefiyle uyumlu değil.");
  }

  private defaultResolutionNote(action: ModerationAction) {
    if (action === ModerationAction.archive_event) {
      return "Rapor sonucunda etkinlik arşivlendi.";
    }

    if (action === ModerationAction.archive_tag) {
      return "Rapor sonucunda tag arşivlendi.";
    }

    return "Rapor sonucunda kullanıcı disable edildi.";
  }
}
