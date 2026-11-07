import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { FinanceService } from "./finance.service";

function setup() {
  const payment = { id: "pay1", payerId: "payer", payeeId: "seller", eventId: "event", status: "succeeded", grossAmount: 100, netAmount: 80, refundedAmount: 0, currency: "TRY", platformFee: 20, provider: "sandbox", releasedAt: new Date() as Date | null };
  const account = { userId: "seller", preferredCurrency: "TRY", availableBalance: 80, pendingBalance: 20, heldBalance: 0, kycStatus: "approved", bankAccountLast4: "1234" };
  const withdrawal = { id: "p1", userId: "seller", currency: "TRY", amount: 20, status: "pending" };
  const tx = {
    platformRevenue: { updateMany: jest.fn().mockResolvedValue({count:1}) },
    curatorAgreement: { findMany: jest.fn().mockResolvedValue([]) }, curatorLedgerEntry: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn().mockResolvedValue({ count: 0 }), create: jest.fn() },
    paymentTransaction: { findUnique: jest.fn().mockResolvedValue(payment), findUniqueOrThrow: jest.fn().mockResolvedValue(payment), updateMany: jest.fn().mockResolvedValue({ count: 1 }), findMany: jest.fn().mockResolvedValue([]) },
    financialAccount: { findUnique: jest.fn().mockResolvedValue(account), findUniqueOrThrow: jest.fn().mockResolvedValue(account), upsert: jest.fn().mockResolvedValue(account), update: jest.fn().mockResolvedValue(account), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    ticketRefund: { create: jest.fn() }, eventParticipant: { upsert: jest.fn() }, billingProfile: { upsert: jest.fn(), findUnique: jest.fn().mockResolvedValue(null) },
    payout: { findUnique: jest.fn().mockResolvedValue(withdrawal), findUniqueOrThrow: jest.fn().mockResolvedValue(withdrawal), create: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }), findMany: jest.fn().mockResolvedValue([]) },
    user: { findUnique: jest.fn().mockResolvedValue(null) }, event: { count: jest.fn().mockResolvedValue(0), findUnique: jest.fn().mockResolvedValue({ status: "published", endsAt: new Date(Date.now() - 73 * 60 * 60 * 1000) }) }, place: { count: jest.fn().mockResolvedValue(0) },
  };
  const prisma = { ...tx, $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) };
  const seller = { id: "seller", role: "user", accountType: "corporate" };
  return { service: new FinanceService(prisma as never), tx, payment, account, withdrawal, seller };
}

describe("Finance balance integrity", () => {
  it("repeated payout completion does not settle the balance twice", async () => {
    const { service, tx, withdrawal } = setup(); withdrawal.status = "paid";
    await service.updatePayout("p1", "paid");
    expect(tx.financialAccount.updateMany).not.toHaveBeenCalled();
    expect(tx.payout.updateMany).not.toHaveBeenCalled();
  });
  it.each(["paid", "failed", "cancelled"])("does not reopen a %s withdrawal", async status => {
    const { service, withdrawal, tx } = setup(); withdrawal.status = status;
    await expect(service.updatePayout("p1", "processing")).rejects.toThrow(BadRequestException);
    expect(tx.financialAccount.updateMany).not.toHaveBeenCalled();
  });
  it("does not settle a withdrawal claimed by a concurrent request", async () => {
    const { service, tx } = setup(); tx.payout.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.updatePayout("p1", "paid")).rejects.toThrow(BadRequestException);
    expect(tx.financialAccount.updateMany).not.toHaveBeenCalled();
  });
  it("returns funds only once when a pending withdrawal fails", async () => {
    const { service, tx } = setup(); await service.updatePayout("p1", "failed");
    expect(tx.financialAccount.updateMany).toHaveBeenCalledWith({ where: { userId: "seller", preferredCurrency: "TRY", pendingBalance: { gte: 20 } }, data: { pendingBalance: { decrement: 20 }, availableBalance: { increment: 20 } } });
  });
  it("checks and reserves the balance atomically for withdrawals", async () => {
    const { service, tx, seller } = setup(); tx.financialAccount.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.payout(seller as never, { amount: 60 })).rejects.toThrow(BadRequestException);
    expect(tx.payout.create).not.toHaveBeenCalled();
    expect(tx.financialAccount.updateMany.mock.calls[0][0].where.availableBalance).toEqual({ gte: 60 });
  });
  it.each([NaN, Infinity, -1, 0, 1.001])("rejects invalid withdrawal amount %s", async amount => {
    const { service, seller, tx } = setup();
    await expect(service.payout(seller as never, { amount })).rejects.toThrow(BadRequestException);
    expect(tx.financialAccount.updateMany).not.toHaveBeenCalled();
  });
  it("rejects individual withdrawals even with approved KYC", async () => {
    const { service, seller } = setup();
    await expect(service.payout({ ...seller, accountType: "individual" } as never, { amount: 10 })).rejects.toThrow(ForbiddenException);
  });
  it("reverses the actual stored commission, rather than a fixed five percent", async () => {
    const { service, tx, seller } = setup(); await service.refund("pay1", seller as never, { amount: 50 });
    expect(tx.financialAccount.updateMany.mock.calls[0][0].data.availableBalance).toEqual({ decrement: 40 });
  });
  it("uses the remainder on the final refund to avoid rounding residue", async () => {
    const { service, tx, seller, payment } = setup(); payment.grossAmount = 3; payment.netAmount = 2; payment.refundedAmount = 2;
    await service.refund("pay1", seller as never, { amount: 1 });
    expect(tx.financialAccount.updateMany.mock.calls[0][0].data.availableBalance).toEqual({ decrement: 0.67 });
  });
  it("stops a stale concurrent refund before changing balances or creating a refund", async () => {
    const { service, tx, seller } = setup(); tx.paymentTransaction.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.refund("pay1", seller as never, { amount: 50 })).rejects.toThrow(BadRequestException);
    expect(tx.financialAccount.updateMany).not.toHaveBeenCalled(); expect(tx.ticketRefund.create).not.toHaveBeenCalled();
  });
  it("only credits the account once for simultaneous payment confirmations", async () => {
    const { service, tx, payment } = setup(); payment.status = "pending"; tx.paymentTransaction.updateMany.mockResolvedValue({ count: 0 });
    await service.confirm("pay1", { id: "payer" } as never, { paymentMethodToken: "pm_token123" });
    expect(tx.financialAccount.updateMany).not.toHaveBeenCalled(); expect(tx.eventParticipant.upsert).not.toHaveBeenCalled();
  });
  it("rejects currency changes when balances exist", async () => {
    const { service, seller, tx } = setup();
    await expect(service.updateSettings(seller as never, { preferredCurrency: "EUR" })).rejects.toThrow(BadRequestException);
    expect(tx.financialAccount.update).not.toHaveBeenCalled();
  });
  it("calculates lifetime income from all payments and excludes other currencies", async () => {
    const { service, tx, seller, payment } = setup();
    tx.paymentTransaction.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ ...payment, refundedAmount: 50 }, { ...payment, currency: "EUR" }]);
    const result = await service.dashboard(seller as never);
    expect(result.summary.lifetimeNetRevenue).toBe(40);
    expect(tx.paymentTransaction.findMany.mock.calls[1][0]).not.toHaveProperty("take");
  });
  it("keeps new confirmed event income in the held balance", async () => {
    const { service, tx, payment } = setup(); payment.status = "pending";
    await service.confirm("pay1", { id: "payer" } as never, { paymentMethodToken: "pm_token123" });
    expect(tx.financialAccount.updateMany).toHaveBeenCalledWith({ where: { userId: "seller", preferredCurrency: "TRY" }, data: { heldBalance: { increment: 80 } } });
  });
  it.each([null, new Date(Date.now() - 71 * 60 * 60 * 1000)])("does not release missing or recent event endings", async endsAt => {
    const { service, tx, seller } = setup(); tx.event.findUnique.mockResolvedValue({ status: "published", endsAt } as never);
    await expect(service.releaseEventIncome("event", seller as never)).rejects.toThrow(BadRequestException);
    expect(tx.paymentTransaction.updateMany).not.toHaveBeenCalled();
  });
  it("does not release cancelled event income", async () => {
    const { service, tx, seller } = setup(); tx.event.findUnique.mockResolvedValue({ status: "archived", endsAt: new Date(0) });
    await expect(service.releaseEventIncome("event", seller as never)).rejects.toThrow(BadRequestException);
  });
  it("releases only the net remainder and records the approving administrator", async () => {
    const { service, tx, payment } = setup(); payment.releasedAt = null; payment.refundedAmount = 50; tx.paymentTransaction.findMany.mockResolvedValue([payment] as never);
    expect(await service.releaseEventIncome("event", { id: "admin1" } as never)).toEqual({ released: 1, releasedSources: 1 });
    expect(tx.financialAccount.updateMany).toHaveBeenCalledWith({ where: { userId: "seller", preferredCurrency: "TRY", heldBalance: { gte: 40 } }, data: { heldBalance: { decrement: 40 }, availableBalance: { increment: 40 } } });
    expect(tx.paymentTransaction.updateMany.mock.calls[0][0].data).toEqual(expect.objectContaining({ releasedById: "admin1", releasedAt: expect.any(Date) }));
  });
  it("prevents concurrent release from moving the held income twice", async () => {
    const { service, tx, payment, seller } = setup(); tx.paymentTransaction.findMany.mockResolvedValue([payment] as never); tx.paymentTransaction.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.releaseEventIncome("event", seller as never)).rejects.toThrow(BadRequestException);
    expect(tx.financialAccount.updateMany).not.toHaveBeenCalled();
  });
  it("refunds unreleased payments from held balance", async () => {
    const { service, tx, payment, seller } = setup(); payment.releasedAt = null;
    await service.refund("pay1", seller as never, { amount: 50 });
    expect(tx.financialAccount.updateMany.mock.calls[0][0].data).toEqual({ heldBalance: { decrement: 40 } });
  });

});
