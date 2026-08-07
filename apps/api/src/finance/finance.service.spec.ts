import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { FinanceService } from "./finance.service";

describe("FinanceService", () => {
  const paymentTransaction = { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() };
  const event = { findUnique: jest.fn() };
  const financialAccount = { upsert: jest.fn(), update: jest.fn(), findUnique: jest.fn() };
  const eventParticipant = { upsert: jest.fn() };
  const ticketRefund = { create: jest.fn() };
  const payout = { create: jest.fn(), findMany: jest.fn() };
  const billingProfile = { findUnique: jest.fn(), upsert: jest.fn() };
  const user = { findUnique: jest.fn(), update: jest.fn() };
  const place = { count: jest.fn() };
  const tx = { paymentTransaction, financialAccount, eventParticipant, ticketRefund, payout, billingProfile };
  const prisma = { ...tx, event, user, place, $transaction: jest.fn(async (operation: any) => typeof operation === "function" ? operation(tx) : Promise.all(operation)) };
  const service = new FinanceService(prisma as never);
  const payer = { id: "11111111-1111-4111-8111-111111111111", role: "user", accountType: "individual" } as any;

  beforeEach(() => { jest.clearAllMocks(); paymentTransaction.findUnique.mockResolvedValue(null); });

  it("creates an idempotent payment with a five percent platform fee", async () => {
    event.findUnique.mockResolvedValue({ id: "event-1", title: "Paid event", status: "published", price: 100, currency: "TRY", createdById: "22222222-2222-4222-8222-222222222222" });
    paymentTransaction.create.mockImplementation(({ data }) => data);
    const result = await service.createPayment("event-1", payer, { idempotencyKey: "checkout-unique-1" });
    expect(result).toMatchObject({ grossAmount: 100, platformFee: 5, netAmount: 95, currency: "TRY" });
  });

  it("returns an existing transaction for the same idempotency key", async () => {
    const existing = { id: "payment-1", payerId: payer.id, eventId: "event-1" };
    paymentTransaction.findUnique.mockResolvedValue(existing);
    await expect(service.createPayment("event-1", payer, { idempotencyKey: "checkout-unique-1" })).resolves.toBe(existing);
    expect(paymentTransaction.create).not.toHaveBeenCalled();
  });

  it("rejects free events and foreign idempotency keys", async () => {
    paymentTransaction.findUnique.mockResolvedValue({ payerId: "other", eventId: "event-1" });
    await expect(service.createPayment("event-1", payer, { idempotencyKey: "checkout-unique-1" })).rejects.toBeInstanceOf(ForbiddenException);
    paymentTransaction.findUnique.mockResolvedValue(null);
    event.findUnique.mockResolvedValue({ id: "event-1", status: "published", price: 0, currency: "TRY", createdById: "other" });
    await expect(service.createPayment("event-1", payer, { idempotencyKey: "checkout-unique-2" })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("never accepts raw or invalid payment credentials", async () => {
    paymentTransaction.findUnique.mockResolvedValue({ id: "payment-1", payerId: payer.id, status: "pending" });
    await expect(service.confirm("payment-1", payer, { paymentMethodToken: "4111111111111111" })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("requires a corporate account and token for paid business plans", async () => {
    await expect(service.changeBusinessPlan(payer, { plan: "growth", paymentMethodToken: "pm_valid_123" })).rejects.toBeInstanceOf(ForbiddenException);
    const corporate = { ...payer, accountType: "corporate" };
    await expect(service.changeBusinessPlan(corporate, { plan: "growth", paymentMethodToken: "card-number" })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("activates the selected business plan", async () => {
    const startedAt = new Date();
    user.update.mockResolvedValue({ businessPlan: "scale", businessPlanStartedAt: startedAt });
    await expect(service.changeBusinessPlan({ ...payer, accountType: "corporate" }, { plan: "scale", paymentMethodToken: "pm_valid_123" })).resolves.toEqual({ plan: "scale", planStartedAt: startedAt });
    expect(user.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ businessPlan: "scale" }) }));
  });

  it("validates payment and persists an individual member plan", async () => {
    await expect(service.changeMemberPlan(payer, { plan: "plus", paymentMethodToken: "card-number" })).rejects.toBeInstanceOf(BadRequestException);
    const startedAt = new Date();
    user.update.mockResolvedValue({ memberPlan: "premium", memberPlanStartedAt: startedAt });
    await expect(service.changeMemberPlan(payer, { plan: "premium", paymentMethodToken: "pm_valid_123" })).resolves.toEqual({ plan: "premium", planStartedAt: startedAt });
    expect(user.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ memberPlan: "premium" }) }));
  });
});
