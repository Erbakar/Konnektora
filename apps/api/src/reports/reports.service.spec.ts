import { BadRequestException } from "@nestjs/common";
import { EventStatus, ReportStatus, ReportTargetType, UserStatus } from "@prisma/client";
import { ModerationAction } from "./reports.dto";
import { ReportsService } from "./reports.service";

describe("ReportsService", () => {
  const createService = () => {
    const tx = {
      event: { update: jest.fn() },
      tag: { update: jest.fn() },
      user: { update: jest.fn() },
      place: { update: jest.fn() },
      mediaFile: { update: jest.fn() },
      contentComment: { update: jest.fn() },
      privateMessage: { update: jest.fn() },
      eventParticipant: { findMany: jest.fn().mockResolvedValue([]) },
      contentReport: {
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([])
      },
      moderationDecision: {
        create: jest.fn().mockResolvedValue({
          id: "decision-1",
          userId: "owner-1",
          user: { id: "owner-1", email: "owner@example.com", name: "Owner" }
        })
      },
      notification: { createMany: jest.fn() },
      adminActivityLog: { create: jest.fn() },
      ticketRefund: { createMany: jest.fn() }
    };
    const prisma = {
      contentReport: {
        findUnique: jest.fn()
      },
      event: { findUnique: jest.fn() },
      tag: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
      place: { findUnique: jest.fn() },
      mediaFile: { findUnique: jest.fn() },
      contentComment: { findUnique: jest.fn(), count: jest.fn() },
      privateMessage: { findUnique: jest.fn() },
      contentView: { count: jest.fn(), findMany: jest.fn() },
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx))
    };

    const mailService = {
      sendModerationDecisionEmail: jest.fn().mockResolvedValue(undefined),
      sendReportFeedbackEmail: jest.fn().mockResolvedValue(undefined)
    };

    return {
      service: new ReportsService(prisma as never, mailService as never),
      prisma,
      tx,
      mailService
    };
  };

  const admin = {
    id: "admin-1",
    email: "admin@example.com",
    name: "Admin",
    role: "admin",
    status: "active"
  };

  it("archives an event and resolves the report", async () => {
    const { service, prisma, tx } = createService();
    const report = {
      id: "report-1",
      targetType: ReportTargetType.event,
      targetId: "event-1"
    };

    prisma.contentReport.findUnique.mockResolvedValue(report);
    tx.contentReport.update.mockResolvedValue({ ...report, status: ReportStatus.resolved });

    await service.resolveWithAction(
      report.id,
      { action: ModerationAction.archive_event, resolutionNote: "Archived after review." },
      admin as never
    );

    expect(tx.event.update).toHaveBeenCalledWith({
      where: { id: report.targetId },
      data: {
        status: EventStatus.archived,
        updatedBy: { connect: { id: admin.id } }
      }
    });
    expect(tx.contentReport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: report.id },
        data: expect.objectContaining({
          status: ReportStatus.resolved,
          resolutionNote: "Archived after review."
        })
      })
    );
  });

  it("rejects a moderation action that does not match the target type", async () => {
    const { service, prisma, tx } = createService();

    prisma.contentReport.findUnique.mockResolvedValue({
      id: "report-2",
      targetType: ReportTargetType.tag,
      targetId: "tag-1"
    });

    await expect(
      service.resolveWithAction("report-2", { action: ModerationAction.archive_event }, admin as never)
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.event.update).not.toHaveBeenCalled();
  });

  it("rejects content actions that do not match the report target", async () => {
    const { service, prisma } = createService();
    prisma.event.findUnique.mockResolvedValue({ id: "event-1" });

    await expect(
      service.createModerationDecision(
        ReportTargetType.event,
        "event-1",
        {
          decision: "violation",
          action: "archive_tag",
          penaltyScore: 1
        },
        admin as never
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("requires suspension end time when suspending a user", async () => {
    const { service, prisma } = createService();
    prisma.event.findUnique.mockResolvedValue({ id: "event-1" });

    await expect(
      service.createModerationDecision(
        ReportTargetType.event,
        "event-1",
        {
          decision: "violation",
          action: "archive_event",
          userAction: "suspend_user",
          penaltyScore: 5
        },
        admin as never
      )
    ).rejects.toThrow("Askıya alma için askı bitiş zamanı zorunludur.");
  });

  it("applies content action and separate user suspension together", async () => {
    const { service, prisma, tx } = createService();
    prisma.event.findUnique.mockResolvedValue({ id: "event-1" });
    tx.event.update.mockResolvedValue({ createdById: "owner-1" });
    tx.user.update.mockResolvedValue({ id: "owner-1" });

    await service.createModerationDecision(
      ReportTargetType.event,
      "event-1",
      {
        decision: "violation",
        action: "archive_event",
        userAction: "suspend_user",
        penaltyScore: 10,
        suspensionEndsAt: "2026-08-01T12:00:00.000Z",
        note: "Spam event"
      },
      admin as never
    );

    expect(tx.event.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "event-1" },
        data: expect.objectContaining({ status: EventStatus.archived })
      })
    );
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "owner-1" },
        data: { status: UserStatus.suspended }
      })
    );
    expect(tx.moderationDecision.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "archive_event",
          suspensionEndsAt: new Date("2026-08-01T12:00:00.000Z")
        })
      })
    );
  });
});
