import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { EventStatus, Prisma, ReportStatus, ReportTargetType, TagStatus, User, UserStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import {
  CreateReportDto,
  CreateReportGroupCommentDto,
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

const TARGET_OWNER_SELECT = {
  id: true,
  email: true,
  name: true,
  username: true,
  role: true,
  status: true,
  accountType: true,
  phone: true,
  country: true,
  city: true,
  district: true,
  address: true,
  website: true,
  companyName: true,
  followerCount: true,
  followingCount: true,
  lastOnlineAt: true,
  emailVerified: true,
  penaltyScoreLastYear: true,
  penaltyScoreAllTime: true,
  createdAt: true
} satisfies Prisma.UserSelect;

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService
  ) {}

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
    const reports = await this.prisma.contentReport.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: REPORT_INCLUDE as any
    });
    const groups = await this.buildReportGroups(reports);

    if (scope === "active") {
      return groups.filter((group) => group.activeReports > 0);
    }

    return groups.filter((group) => group.activeReports === 0 && group.oldReports > 0);
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

    const note = await (this.prisma as any).reportGroupNote.upsert({
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

    await this.createActivityLog({
      actorId: admin.id,
      action: "report_group_note_updated",
      targetType,
      targetId,
      note: input.note.trim()
    });

    return note;
  }

  async createGroupComment(targetType: ReportTargetType, targetId: string, input: CreateReportGroupCommentDto, admin: User) {
    await this.ensureTargetExists(targetType, targetId);

    const comment = await (this.prisma as any).reportGroupComment.create({
      data: {
        targetType,
        targetId,
        body: input.body.trim(),
        createdBy: { connect: { id: admin.id } }
      },
      include: {
        createdBy: { select: { id: true, email: true, name: true, role: true, status: true } }
      }
    });

    await this.createActivityLog({
      actorId: admin.id,
      action: "report_group_comment_created",
      targetType,
      targetId,
      note: input.body.trim()
    });

    return comment;
  }

  async createModerationDecision(
    targetType: ReportTargetType,
    targetId: string,
    input: CreateModerationDecisionDto,
    admin: User
  ) {
    await this.ensureTargetExists(targetType, targetId);
    this.ensureDecisionActionMatchesTarget(targetType, input.action);
    const userAction = input.userAction && input.userAction !== "none" ? input.userAction : null;

    if (userAction) {
      this.ensureUserActionAllowed(userAction);
    }

    if (
      (input.action === "suspend_user" || userAction === "suspend_user") &&
      !input.suspensionEndsAt
    ) {
      throw new BadRequestException("Askıya alma için askı bitiş zamanı zorunludur.");
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
        await this.createSimulatedRefunds(tx, targetId, admin.id, input.note);
      }

      if (targetType === ReportTargetType.tag && input.action === "archive_tag") {
        const tag = await tx.tag.update({
          where: { id: targetId },
          data: { status: TagStatus.archived, updatedBy: { connect: { id: admin.id } } },
          select: { createdById: true }
        });
        userId = tag.createdById;
      }

      if (targetType === ReportTargetType.place && input.action === "archive_place") {
        const place = await tx.place.update({
          where: { id: targetId },
          data: { status: "archived", updatedBy: { connect: { id: admin.id } } },
          select: { createdById: true }
        });
        userId = place.createdById;
      }

      if (targetType === ReportTargetType.media && input.action === "remove_media") {
        const media = await tx.mediaFile.update({
          where: { id: targetId },
          data: { status: "hidden" },
          select: { uploadedById: true }
        });
        userId = media.uploadedById;
      }

      if (["tag_comment", "event_comment", "place_comment", "comment_reply"].includes(targetType) && input.action === "remove_comment") {
        const comment = await tx.contentComment.update({
          where: { id: targetId },
          data: { status: "hidden" },
          select: { authorId: true }
        });
        userId = comment.authorId;
      }

      if (targetType === ReportTargetType.private_message && input.action === "remove_private_messages") {
        const message = await tx.privateMessage.update({
          where: { id: targetId },
          data: { status: "hidden" },
          select: { senderId: true }
        });
        userId = message.senderId;
      }

      if (targetType === ReportTargetType.username && input.action === "reset_username") {
        const user = await tx.user.update({
          where: { id: targetId },
          data: { username: `User${Date.now().toString().slice(-8)}` },
          select: { id: true }
        });
        userId = user.id;
      }

      if (targetType === ReportTargetType.website_url && input.action === "remove_website") {
        const user = await tx.user.update({
          where: { id: targetId },
          data: { website: null },
          select: { id: true }
        });
        userId = user.id;
      }

      if (!userId) {
        const summary = await this.resolveTargetSummary(targetType, targetId);
        userId = summary?.owner?.id ?? null;
      }

      const effectiveUserPenalty =
        targetType === ReportTargetType.user
          ? input.action
          : userAction;

      if (userId && (effectiveUserPenalty === "suspend_user" || effectiveUserPenalty === "ban_user" || effectiveUserPenalty === "warn_user")) {
        if (userId === admin.id && (effectiveUserPenalty === "suspend_user" || effectiveUserPenalty === "ban_user")) {
          throw new BadRequestException("Admin kendi hesabını askıya alamaz veya yasaklayamaz.");
        }

        if (effectiveUserPenalty === "suspend_user" || effectiveUserPenalty === "ban_user") {
          await tx.user.update({
            where: { id: userId },
            data: { status: effectiveUserPenalty === "ban_user" ? UserStatus.banned : UserStatus.suspended }
          });
        }

        if (input.penaltyScore > 0) {
          await tx.user.update({
            where: { id: userId },
            data: {
              penaltyScoreLastYear: { increment: input.penaltyScore },
              penaltyScoreAllTime: { increment: input.penaltyScore }
            }
          });
        }
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

      const affectedReports = await tx.contentReport.findMany({
        where: { targetType, targetId },
        include: { reporter: { select: { email: true, name: true } } }
      });
      const uniqueReporters = new Map(affectedReports.map((report) => [report.reporter.email, report.reporter]));

      const notificationRows = [
        ...(decision.userId
          ? [
              {
                userId: decision.userId,
                type: "moderation_decision",
                title: "Moderasyon kararı",
                body: input.note?.trim() || this.defaultDecisionNote(input),
                targetType,
                targetId
              }
            ]
          : []),
        ...affectedReports.map((report) => ({
          userId: report.reporterId,
          type: "report_feedback",
          title: "Şikayet geri bildirimi",
          body: input.note?.trim() || this.defaultDecisionNote(input),
          targetType,
          targetId
        }))
      ];

      if (notificationRows.length > 0 && (tx as any).notification) {
        await (tx as any).notification.createMany({ data: notificationRows, skipDuplicates: true });
      }

      if ((tx as any).adminActivityLog) {
        await (tx as any).adminActivityLog.create({
          data: {
            actorId: admin.id,
            action: "moderation_decision_created",
            targetType,
            targetId,
            note: input.note?.trim() || this.defaultDecisionNote(input),
            metadata: {
              decision: input.decision,
              action: input.action,
              userAction: userAction ?? "none",
              penaltyScore: input.penaltyScore,
              suspensionEndsAt: input.suspensionEndsAt ?? null
            }
          }
        });
      }

      await Promise.all([
        decision.user
          ? this.mailService.sendModerationDecisionEmail({
              to: decision.user.email,
              name: decision.user.name,
              decision: input.decision,
              action: userAction && userAction !== input.action ? `${input.action} + ${userAction}` : input.action,
              note: input.note
            })
          : Promise.resolve(),
        ...[...uniqueReporters.values()].map((reporter) =>
          this.mailService.sendReportFeedbackEmail({
            to: reporter.email,
            name: reporter.name,
            decision: input.decision,
            note: input.note
          })
        )
      ]);

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
        await this.createSimulatedRefunds(tx, report.targetId, admin.id, input.resolutionNote);
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

      if ((tx as any).adminActivityLog) {
        await (tx as any).adminActivityLog.create({
        data: {
          actorId: admin.id,
          action: "report_action_resolved",
          targetType: report.targetType,
          targetId: report.targetId,
          note: input.resolutionNote?.trim() || this.defaultResolutionNote(input.action),
          metadata: { action: input.action }
        }
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
    if (targetType === ReportTargetType.post) {
      const post = await this.prisma.post.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!post) throw new NotFoundException("Raporlanacak gönderi bulunamadı.");
      return;
    }

    if (targetType === ReportTargetType.post_comment) {
      const comment = await this.prisma.postComment.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!comment) throw new NotFoundException("Raporlanacak gönderi yorumu bulunamadı.");
      return;
    }

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

    if (targetType === ReportTargetType.place) {
      const place = await this.prisma.place.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!place) throw new NotFoundException("Raporlanacak mekan bulunamadı.");
      return;
    }

    if (targetType === ReportTargetType.media) {
      const media = await this.prisma.mediaFile.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!media) throw new NotFoundException("Raporlanacak medya bulunamadı.");
      return;
    }

    if (["tag_comment", "event_comment", "place_comment", "comment_reply"].includes(targetType)) {
      const comment = await this.prisma.contentComment.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!comment) throw new NotFoundException("Raporlanacak yorum bulunamadı.");
      return;
    }

    if (targetType === ReportTargetType.private_message) {
      const message = await this.prisma.privateMessage.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!message) throw new NotFoundException("Raporlanacak özel mesaj bulunamadı.");
      return;
    }

    if (targetType === ReportTargetType.username || targetType === ReportTargetType.website_url) {
      const user = await this.prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!user) throw new NotFoundException("Raporlanacak profil alanı bulunamadı.");
      return;
    }

    return;
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
        const comments = await (this.prisma as any).reportGroupComment.findMany({
          where: { targetType, targetId },
          orderBy: [{ createdAt: "desc" }],
          include: {
            createdBy: { select: { id: true, email: true, name: true, role: true, status: true } }
          }
        });
        const activityLogs = await (this.prisma as any).adminActivityLog.findMany({
          where: { targetType: String(targetType), targetId },
          orderBy: [{ createdAt: "desc" }],
          take: 50,
          include: {
            actor: { select: { id: true, email: true, name: true, role: true, status: true } }
          }
        });
        const activeStatuses = new Set([ReportStatus.open, ReportStatus.reviewing]);
        const activeCount = groupReports.filter((report) => activeStatuses.has(report.status)).length;
        const oldCount = groupReports.length - activeCount;
        const violationScore = groupReports.reduce((total, report) => total + (report.rule?.violationScore ?? 0), 0);
        const targetSummary = await this.resolveTargetSummary(targetType, targetId);

        return {
          targetType,
          targetId,
          targetSummary,
          totalReports: groupReports.length,
          activeReports: activeCount,
          oldReports: oldCount,
          violationScore,
          latestReportAt: groupReports[0]?.createdAt ?? new Date(),
          statuses: [...new Set(groupReports.map((report) => report.status))],
          reasons: [...new Set(groupReports.map((report) => report.reason))],
          note,
          comments,
          activityLogs,
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

  private async resolveTargetSummary(targetType: ReportTargetType, targetId: string) {
    if (targetType === ReportTargetType.post) {
      const post = await this.prisma.post.findUnique({ where: { id: targetId }, include: { author: { select: TARGET_OWNER_SELECT }, _count: { select: { media: true } } } as any });
      if (!post) return null;
      return { title: post.body.slice(0, 120), subtitle: "Sosyal gönderi", status: post.status, owner: post.author, metrics: { likes: post.likeCount, comments: post.commentCount, media: (post as any)._count?.media ?? 0 }, payload: { visibility: post.visibility } };
    }

    if (targetType === ReportTargetType.post_comment) {
      const comment = await this.prisma.postComment.findUnique({ where: { id: targetId }, include: { author: { select: TARGET_OWNER_SELECT } } as any });
      if (!comment) return null;
      return { title: comment.body.slice(0, 120), subtitle: "Gönderi yorumu", status: comment.status, owner: comment.author, metrics: {}, payload: { postId: comment.postId } };
    }

    if (targetType === ReportTargetType.event) {
      const event = await this.prisma.event.findUnique({
        where: { id: targetId },
        include: {
          createdBy: { select: TARGET_OWNER_SELECT },
          _count: { select: { participants: true, media: true } }
        } as any
      });
      if (!event) return null;
      const eventCounts = (event as any)._count ?? {};
      const refundCount = (this.prisma as any).ticketRefund
        ? await (this.prisma as any).ticketRefund.count({ where: { eventId: targetId } })
        : 0;
      return {
        title: event.title,
        subtitle: [event.locationName, event.city, event.country].filter(Boolean).join(" - ") || event.format,
        status: event.status,
        owner: event.createdBy,
        metrics: {
          participants: eventCounts.participants ?? 0,
          media: eventCounts.media ?? 0,
          simulatedRefunds: refundCount
        },
        payload: {
          startsAt: event.startsAt,
          timezone: event.timezone,
          coverImageUrl: event.coverImageUrl
        }
      };
    }

    if (targetType === ReportTargetType.tag) {
      const tag = await this.prisma.tag.findUnique({
        where: { id: targetId },
        include: {
          createdBy: { select: TARGET_OWNER_SELECT },
          _count: { select: { events: true, interestedUsers: true } }
        } as any
      });
      if (!tag) return null;
      const [commentCount, viewCount, viewerCount] = await Promise.all([
        this.prisma.contentComment.count({ where: { targetType: "tag" as any, targetId } }),
        this.prisma.contentView.count({ where: { targetType: "tag" as any, targetId } }),
        this.prisma.contentView
          .findMany({ where: { targetType: "tag" as any, targetId, userId: { not: null } }, distinct: ["userId"], select: { userId: true } })
          .then((items) => items.length)
      ]);
      const tagCounts = (tag as any)._count ?? {};
      return {
        title: tag.name,
        subtitle: tag.slug,
        status: tag.status,
        owner: tag.createdBy,
        metrics: {
          interestedUsers: tagCounts.interestedUsers ?? 0,
          events: tagCounts.events ?? 0,
          comments: commentCount,
          views: viewCount,
          viewers: viewerCount
        }
      };
    }

    if (targetType === ReportTargetType.user || targetType === ReportTargetType.username || targetType === ReportTargetType.website_url) {
      const user = await this.prisma.user.findUnique({ where: { id: targetId }, select: TARGET_OWNER_SELECT });
      if (!user) return null;
      return {
        title: user.username ? `@${user.username}` : user.name,
        subtitle: [user.city, user.country].filter(Boolean).join(" - ") || user.email,
        status: user.status,
        owner: user,
        metrics: {
          followers: user.followerCount,
          following: user.followingCount,
          penaltyLastYear: user.penaltyScoreLastYear,
          penaltyAllTime: user.penaltyScoreAllTime
        }
      };
    }

    if (targetType === ReportTargetType.place) {
      const place = await this.prisma.place.findUnique({
        where: { id: targetId },
        include: { createdBy: { select: TARGET_OWNER_SELECT } } as any
      });
      if (!place) return null;
      return {
        title: place.name,
        subtitle: [place.city, place.country].filter(Boolean).join(" - ") || place.address,
        status: place.status,
        owner: place.createdBy,
        metrics: {
          followers: place.followerCount,
          invites: place.inviteCount
        },
        payload: { coverImageUrl: place.coverImageUrl }
      };
    }

    if (targetType === ReportTargetType.media) {
      const media = await this.prisma.mediaFile.findUnique({
        where: { id: targetId },
        include: { uploadedBy: { select: TARGET_OWNER_SELECT } } as any
      });
      if (!media) return null;
      return {
        title: media.url,
        subtitle: `${media.contentType} · ${media.contentId}`,
        status: media.status,
        owner: media.uploadedBy,
        metrics: {},
        payload: { type: media.type, url: media.url }
      };
    }

    if (["tag_comment", "event_comment", "place_comment", "comment_reply"].includes(targetType)) {
      const comment = await this.prisma.contentComment.findUnique({
        where: { id: targetId },
        include: {
          author: { select: TARGET_OWNER_SELECT },
          parent: { select: { id: true, body: true, author: { select: TARGET_OWNER_SELECT } } },
          _count: { select: { replies: true } }
        } as any
      });
      if (!comment) return null;
      const commentCounts = (comment as any)._count ?? {};
      return {
        title: comment.body,
        subtitle: `${comment.targetType} · ${comment.targetId}`,
        status: comment.status,
        owner: comment.author,
        metrics: {
          likes: comment.likeCount,
          replies: commentCounts.replies ?? 0
        },
        payload: { parent: comment.parent }
      };
    }

    if (targetType === ReportTargetType.private_message) {
      const message = await this.prisma.privateMessage.findUnique({
        where: { id: targetId },
        include: { sender: { select: TARGET_OWNER_SELECT }, recipient: { select: TARGET_OWNER_SELECT } } as any
      });
      if (!message) return null;
      const sender = (message as any).sender;
      const recipient = (message as any).recipient;
      return {
        title: message.body,
        subtitle: `${sender?.email ?? "Bilinmiyor"} - ${recipient?.email ?? "Bilinmiyor"}`,
        status: message.status,
        owner: sender,
        metrics: {},
        payload: { recipient }
      };
    }

    return null;
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

    if (
      (targetType === ReportTargetType.media && action === "remove_media") ||
      (targetType === ReportTargetType.place && action === "archive_place") ||
      (["tag_comment", "event_comment", "place_comment", "comment_reply"].includes(targetType) && action === "remove_comment") ||
      (targetType === ReportTargetType.username && action === "reset_username") ||
      (targetType === ReportTargetType.website_url && action === "remove_website") ||
      (targetType === ReportTargetType.private_message && action === "remove_private_messages")
    ) {
      return;
    }

    throw new BadRequestException("İçerik aksiyonu şikayet hedefiyle uyumlu değil.");
  }

  private ensureUserActionAllowed(action: string) {
    if (action === "warn_user" || action === "suspend_user" || action === "ban_user") {
      return;
    }

    throw new BadRequestException("Geçersiz kullanıcı müdahalesi.");
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

  private createActivityLog(input: {
    actorId?: string | null;
    action: string;
    targetType: ReportTargetType | string;
    targetId: string;
    note?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    return (this.prisma as any).adminActivityLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        targetType: String(input.targetType),
        targetId: input.targetId,
        note: input.note ?? null,
        metadata: input.metadata ?? undefined
      }
    });
  }

  private async createSimulatedRefunds(tx: any, eventId: string, adminId: string, reason?: string | null) {
    if (!tx.ticketRefund) {
      return;
    }

    const participants = await tx.eventParticipant.findMany({
      where: { eventId, status: { in: ["accepted", "attended"] } },
      select: { userId: true }
    });

    if (participants.length === 0) {
      await tx.adminActivityLog?.create({
        data: {
          actorId: adminId,
          action: "simulated_ticket_refund_skipped",
          targetType: "event",
          targetId: eventId,
          note: "İade edilecek kabul edilmiş katılımcı bulunamadı.",
          metadata: { provider: "simulated" }
        }
      });
      return;
    }

    await tx.ticketRefund.createMany({
      data: participants.map((participant: { userId: string }) => ({
        eventId,
        userId: participant.userId,
        amount: 0,
        currency: "TRY",
        provider: "simulated",
        status: "simulated_refunded",
        reason: reason?.trim() || "Etkinlik moderasyon kararıyla arşivlendi."
      })),
      skipDuplicates: true
    });

    await tx.notification?.createMany({
      data: participants.map((participant: { userId: string }) => ({
        userId: participant.userId,
        type: "ticket_refund",
        title: "Bilet iadesi işlendi",
        body: "Etkinlik kaldırıldığı için bilet iaden simüle edildi.",
        targetType: "event",
        targetId: eventId
      })),
      skipDuplicates: true
    });

    await tx.adminActivityLog?.create({
      data: {
        actorId: adminId,
        action: "simulated_ticket_refunds_created",
        targetType: "event",
        targetId: eventId,
        note: `${participants.length} katılımcı için simüle iade kaydı oluşturuldu.`,
        metadata: { provider: "simulated", count: participants.length }
      }
    });
  }
}
