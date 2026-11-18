import { AdminService } from "./admin.service";

function setup() {
  const prisma = {
    contentReport: {
      count: jest.fn().mockResolvedValue(5),
      groupBy: jest.fn().mockResolvedValue([
        { targetType: "event", targetId: "e1" },
        { targetType: "post", targetId: "p1" },
        { targetType: "user", targetId: "u1" }
      ])
    },
    userMessage: {
      count: jest.fn(async ({ where }: { where: { type: string; category?: unknown } }) => {
        if (where.type === "faq") return 4;
        if (where.type === "account_freeze") return 2;
        return where.category ? 1 : 3;
      })
    },
    corporateKycApplication: { count: jest.fn().mockResolvedValue(6) },
    event: {
      count: jest.fn(async ({ where }: { where: { AND?: unknown } }): Promise<number> => (where.AND ? 2 : 7))
    },
    announcement: { count: jest.fn().mockResolvedValue(9) },
    payout: {
      count: jest.fn(async ({ where }: { where: { user?: unknown } }): Promise<number> => (where.user ? 3 : 11))
    }
  };
  const service = new AdminService(prisma as never, {} as never, {} as never);
  return { prisma, service };
}

describe("AdminService.getBackofficeSummary (17/10 #1-#2)", () => {
  const now = new Date("2026-11-17T12:00:00.000Z");

  it("returns every dashboard counter and the header totals", async () => {
    const { service } = setup();

    await expect(service.getBackofficeSummary(now)).resolves.toEqual({
      openReports: 5,
      openReportGroups: 3,
      messages: { faq: 4, writeToUs: 3, accountFreeze: 2, dataDeletion: 1 },
      openMessages: 10,
      pendingKyc: 6,
      heldEvents: { expired: 2, notExpired: 5 },
      activeAnnouncements: 9,
      customerPayoutRequests: 8,
      curatorPayoutRequests: 3,
      pendingFinanceRequests: 6 + 2 + 5 + 8 + 3
    });
  });

  it("counts only open or reviewing complaints, grouped by reported target", async () => {
    const { service, prisma } = setup();
    await service.getBackofficeSummary(now);

    const active = { status: { in: ["open", "reviewing"] } };
    expect(prisma.contentReport.count).toHaveBeenCalledWith({ where: active });
    expect(prisma.contentReport.groupBy).toHaveBeenCalledWith({ by: ["targetType", "targetId"], where: active });
  });

  it("splits unread contact messages and keeps data deletion requests out of Write to us", async () => {
    const { service, prisma } = setup();
    await service.getBackofficeSummary(now);

    const wheres = prisma.userMessage.count.mock.calls.map(([args]) => args.where);
    expect(wheres).toHaveLength(4);
    expect(wheres.every((where) => (where as { status?: string }).status === "unread")).toBe(true);
    expect(wheres[1]).toEqual({
      status: "unread",
      type: "write_to_us",
      OR: [{ category: null }, { NOT: { category: { startsWith: "Veri silme talebi" } } }]
    });
    expect(wheres[3]).toEqual({ status: "unread", type: "write_to_us", category: { startsWith: "Veri silme talebi" } });
  });

  it("treats held events as expired once 72 hours have passed since the event ended", async () => {
    const { service, prisma } = setup();
    await service.getBackofficeSummary(now);

    const expiredWhere = prisma.event.count.mock.calls[0]![0].where as { AND: [unknown, { endsAt: { lte: Date } }] };
    expect(expiredWhere.AND[1].endsAt.lte.toISOString()).toBe("2026-11-14T12:00:00.000Z");
  });

  it("counts pending KYB/KYC, live announcements and pending withdrawals by requester type", async () => {
    const { service, prisma } = setup();
    await service.getBackofficeSummary(now);

    expect(prisma.corporateKycApplication.count).toHaveBeenCalledWith({ where: { status: "pending" } });
    expect(prisma.announcement.count).toHaveBeenCalledWith({
      where: { status: "active", publishAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }
    });
    expect(prisma.payout.count).toHaveBeenCalledWith({ where: { status: "pending", user: { curatorAgreements: { some: {} } } } });
    expect(prisma.payout.count).toHaveBeenCalledWith({ where: { status: "pending" } });
  });

  it("never reports negative counters when the two snapshots race", async () => {
    const { service, prisma } = setup();
    prisma.event.count.mockImplementation(async ({ where }: { where: { AND?: unknown } }) => (where.AND ? 4 : 3));
    prisma.payout.count.mockImplementation(async ({ where }: { where: { user?: unknown } }) => (where.user ? 5 : 4));

    const summary = await service.getBackofficeSummary(now);
    expect(summary.heldEvents.notExpired).toBe(0);
    expect(summary.customerPayoutRequests).toBe(0);
  });
});
