import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { EventStatus, ReportStatus, ReportTargetType, TagStatus, User, UserStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateReportDto,
  CreateReportRuleDto,
  CreateModerationDecisionDto,
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

  async createModerationDecision(
    targetType: ReportTargetType,
    targetId: string,
    input: CreateModerationDecisionDto,
    admin: User
  ) {
    await this.ensureTargetExists(targetType, targetId);
    this.ensureDecisionActionMatchesTarget(targetType, input.action);

    if (targetType === ReportTargetType.user && targetId === admin.id && (input.action === "suspend_user" || input.action === "ban_user")) {
      throw new BadRequestException("Admin kendi hesabını askıya alamaz veya yasaklayamaz.");
    }

    return this.prisma.$transaction(async (tx) => {
      let userId: string | null = targetType === ReportTargetType.user ? targetId : null;

      if (targetType === ReportTargetType.event && input.action === "archive_event") {
        const event = await tx.event.update({
          where: { id: targetId },
          data: { status: EventStatus.archived, updatedBy: { connect: { id: admin.id } } },
          select: { createdById: true }
        });
        userId = event.createdById;
      }

      if (targetType === ReportTargetType.tag && input.action === "archive_tag") {
        const tag = await tx.tag.update({
          where: { id: targetId },
          data: { status: TagStatus.archived, updatedBy: { connect: { id: admin.id } } },
          select: { createdById: true }
        });
        userId = tag.createdById;
      }

      if (targetType === ReportTargetType.user && (input.action === "suspend_user" || input.action === "ban_user")) {
        await tx.user.update({
          where: { id: targetId },
          data: { status: UserStatus.disabled }
        });
      }

      const decision = await (tx as any).moderationDecision.create({
        data: {
          targetType,
          targetId,
          decision: input.decision,
          action: input.action,
          penaltyScore: input.penaltyScore,
          note: input.note?.trim() || null,
          suspensionEndsAt: input.suspensionEndsAt ? new Date(input.suspensionEndsAt) : null,
          user: userId ? { connect: { id: userId } } : undefined,
          issuedBy: { connect: { id: admin.id } }
        },
        include: {
          user: { select: { id: true, email: true, name: true, role: true, status: true } },
          issuedBy: { select: { id: true, email: true, name: true, role: true, status: true } }
        }
      });

      await tx.contentReport.updateMany({
        where: { targetType, targetId, status: { in: [ReportStatus.open, ReportStatus.reviewing] } },
        data: {
          status: input.decision === "violation" ? ReportStatus.resolved : ReportStatus.dismissed,
          resolutionNote: input.note?.trim() || this.defaultDecisionNote(input),
          resolvedById: admin.id,
          resolvedAt: new Date()
        }
      });

      return decision;
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
        const decisions = await (this.prisma as any).moderationDecision.findMany({
          where: { targetType, targetId },
          orderBy: [{ createdAt: "desc" }],
          include: {
            user: { select: { id: true, email: true, name: true, role: true, status: true } },
            issuedBy: { select: { id: true, email: true, name: true, role: true, status: true } }
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
          note,
          decisions
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

  private ensureDecisionActionMatchesTarget(targetType: ReportTargetType, action: string) {
    if (action === "none") {
      return;
    }

    if (targetType === ReportTargetType.event && action === "archive_event") {
      return;
    }

    if (targetType === ReportTargetType.tag && action === "archive_tag") {
      return;
    }

    if (targetType === ReportTargetType.user && (action === "warn_user" || action === "suspend_user" || action === "ban_user")) {
      return;
    }

    throw new BadRequestException("Ceza aksiyonu şikayet hedefiyle uyumlu değil.");
  }

  private defaultDecisionNote(input: CreateModerationDecisionDto) {
    if (input.decision === "no_violation") {
      return "İhlal bulunmadı.";
    }

    return `${input.action} aksiyonu uygulandı.`;
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
