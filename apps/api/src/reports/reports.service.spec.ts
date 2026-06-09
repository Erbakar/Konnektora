import { BadRequestException } from "@nestjs/common";
import { EventStatus, ReportStatus, ReportTargetType } from "@prisma/client";
import { ModerationAction } from "./reports.dto";
import { ReportsService } from "./reports.service";

describe("ReportsService", () => {
  const createService = () => {
    const tx = {
      event: { update: jest.fn() },
      tag: { update: jest.fn() },
      user: { update: jest.fn() },
      contentReport: { update: jest.fn() }
    };
    const prisma = {
      contentReport: {
        findUnique: jest.fn()
      },
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx))
    };

    return {
      service: new ReportsService(prisma as never),
      prisma,
      tx
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
});
