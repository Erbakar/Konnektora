import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { EventStatus, ReportStatus, ReportTargetType, TagStatus, User, UserStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateReportDto,
  CreateReportRuleDto,
  ModerationAction,
  ResolveReportActionDto,
  UpdateReportDto,
  UpdateReportGroupNoteDto,
  UpdateReportRuleDto
} from "./reports.dto";

const REPORT_INCLUDE = {
  reporter: { select: { id: true, email: true, name: true, role: true, status: true } },
  resolvedBy: { select: { id: true, email: true, name: true, role: true, status: true } },
  rule: true
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReport(input: CreateReportDto, reporter: User) {
    await this.ensureTargetExists(input.targetType, input.targetId);
    const rule = input.ruleId ? await this.ensureRuleMatchesTarget(input.ruleId, input.targetType, true) : null;

    return this.prisma.contentReport.create({
      data: {
        targetType: input.targetType,
        targetId: input.targetId,
        rule: rule ? { connect: { id: rule.id } } : undefined,
        reason: input.reason.trim(),
        details: input.details?.trim() || null,
        reporter: { connect: { id: reporter.id } }
      } as any,
      include: REPORT_INCLUDE as any
    });
  }

  listAdminReports() {
    return this.prisma.contentReport.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: REPORT_INCLUDE as any
    });
  }

  async listAdminReportGroups(scope: "active" | "old" = "active") {
    const activeStatuses = [ReportStatus.open, ReportStatus.reviewing];
    const statusFilter = scope === "active" ? { in: activeStatuses } : { notIn: activeStatuses };
    const reports = await this.prisma.contentReport.findMany({
      where: { status: statusFilter },
      orderBy: [{ createdAt: "desc" }],
      include: REPORT_INCLUDE as any
    });

    return this.buildReportGroups(reports);
  }

  async getAdminReportGroup(targetType: ReportTargetType, targetId: string) {
    const reports = await this.prisma.contentReport.findMany({
      where: { targetType, targetId },
      orderBy: [{ createdAt: "desc" }],
      include: REPORT_INCLUDE as any
    });

    if (reports.length === 0) {
      throw new NotFoundException("Şikayet grubu bulunamadı.");
    }

    const [group] = await this.buildReportGroups(reports);

    return {
      ...group,
      reports
    };
  }

  async updateGroupNote(targetType: ReportTargetType, targetId: string, input: UpdateReportGroupNoteDto, admin: User) {
    await this.ensureTargetExists(targetType, targetId);

    return (this.prisma as any).reportGroupNote.upsert({
      where: { targetType_targetId: { targetType, targetId } },
      create: {
        targetType,
        targetId,
        note: input.note.trim(),
        updatedBy: { connect: { id: admin.id } }
      },
      update: {
        note: input.note.trim(),
        updatedBy: { connect: { id: admin.id } }
      },
      include: {
        updatedBy: { select: { id: true, email: true, name: true, role: true, status: true } }
      }
    });
  }

  listPublicRules(targetType?: ReportTargetType) {
    return (this.prisma as any).reportRule.findMany({
      where: {
        status: "active",
        targetType
      },
      orderBy: [{ targetType: "asc" }, { violationScore: "desc" }, { title: "asc" }]
    });
  }

  listAdminRules() {
    return (this.prisma as any).reportRule.findMany({
      orderBy: [{ status: "asc" }, { targetType: "asc" }, { violationScore: "desc" }, { title: "asc" }]
    });
  }

  createRule(input: CreateReportRuleDto) {
    return (this.prisma as any).reportRule.create({
      data: {
        targetType: input.targetType,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        violationScore: input.violationScore
      }
    });
  }

  async updateRule(id: string, input: UpdateReportRuleDto) {
    const existing = await (this.prisma as any).reportRule.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException("Şikayet kuralı bulunamadı.");
    }

    return (this.prisma as any).reportRule.update({
      where: { id },
      data: {
        targetType: input.targetType,
        title: input.title?.trim(),
        description: input.description === undefined ? undefined : input.description?.trim() || null,
        violationScore: input.violationScore,
        status: input.status
      }
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
      include: REPORT_INCLUDE as any
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
        include: REPORT_INCLUDE as any
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

  private async buildReportGroups(reports: any[]) {
    const grouped = new Map<string, any[]>();

    for (const report of reports) {
      const key = `${report.targetType}:${report.targetId}`;
      grouped.set(key, [...(grouped.get(key) ?? []), report]);
    }

    const groups = await Promise.all(
      [...grouped.entries()].map(async ([key, groupReports]) => {
        const [targetType, targetId] = key.split(":") as [ReportTargetType, string];
        const note = await (this.prisma as any).reportGroupNote.findUnique({
          where: { targetType_targetId: { targetType, targetId } },
          include: {
            updatedBy: { select: { id: true, email: true, name: true, role: true, status: true } }
          }
        });
        const activeStatuses = new Set([ReportStatus.open, ReportStatus.reviewing]);
        const activeCount = groupReports.filter((report) => activeStatuses.has(report.status)).length;
        const oldCount = groupReports.length - activeCount;
        const violationScore = groupReports.reduce((total, report) => total + (report.rule?.violationScore ?? 0), 0);

        return {
          targetType,
          targetId,
          totalReports: groupReports.length,
          activeReports: activeCount,
          oldReports: oldCount,
          violationScore,
          latestReportAt: groupReports[0]?.createdAt ?? new Date(),
          statuses: [...new Set(groupReports.map((report) => report.status))],
          reasons: [...new Set(groupReports.map((report) => report.reason))],
          note
        };
      })
    );

    return groups.sort((first, second) => {
      if (second.activeReports !== first.activeReports) {
        return second.activeReports - first.activeReports;
      }

      return new Date(second.latestReportAt).getTime() - new Date(first.latestReportAt).getTime();
    });
  }

  private async ensureRuleMatchesTarget(ruleId: string, targetType: ReportTargetType, requireActive = false) {
    const rule = await (this.prisma as any).reportRule.findUnique({ where: { id: ruleId } });

    if (!rule) {
      throw new NotFoundException("Şikayet kuralı bulunamadı.");
    }

    if (rule.targetType !== targetType) {
      throw new BadRequestException("Şikayet kuralı rapor hedefiyle uyumlu değil.");
    }

    if (requireActive && rule.status !== "active") {
      throw new BadRequestException("Pasif şikayet kuralı kullanılamaz.");
    }

    return rule;
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
