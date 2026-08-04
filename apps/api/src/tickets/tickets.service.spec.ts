import { BadRequestException } from "@nestjs/common";
import { TicketsService } from "./tickets.service";

describe("TicketsService", () => {
  const eventTicketType = { findUnique: jest.fn(), updateMany: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() };
  const paymentTransaction = { create: jest.fn() };
  const financialAccount = { upsert: jest.fn(), findUnique: jest.fn(), update: jest.fn() };
  const eventTicketOrder = { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() };
  const eventParticipant = { upsert: jest.fn(), findFirst: jest.fn() };
  const prisma: any = { eventTicketType, paymentTransaction, financialAccount, eventTicketOrder, eventParticipant, $transaction: jest.fn((callback) => callback(prisma)) };
  const notifications = { dispatch: jest.fn() };
  const service = new TicketsService(prisma, notifications as never);
  const buyer = { id: "buyer-1", name: "Ada" } as never;
  const type = { id: "type-1", eventId: "event-1", name: "General", price: 100, currency: "TRY", capacity: 5, soldCount: 1, status: "active", saleStartsAt: null, saleEndsAt: null, event: { id: "event-1", title: "Demo", slug: "demo", status: "published", createdById: "owner-1" } };

  beforeEach(() => { jest.clearAllMocks(); eventTicketType.findUnique.mockResolvedValue(type); eventTicketType.updateMany.mockResolvedValue({ count: 1 }); paymentTransaction.create.mockResolvedValue({ id: "payment-1", netAmount: 190 }); eventTicketOrder.create.mockResolvedValue({ id: "order-1", totalAmount: 200, unitPrice: 100, tickets: [{ id: "ticket-1" }, { id: "ticket-2" }] }); });

  it("atomically reserves capacity and creates one owned ticket per quantity", async () => {
    const result = await service.purchase("type-1", 2, buyer);
    expect(eventTicketType.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ soldCount: { lte: 3 } }), data: expect.objectContaining({ soldCount: { increment: 2 } }) }));
    expect(eventTicketOrder.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ quantity: 2, totalAmount: 200, tickets: { create: expect.arrayContaining([expect.objectContaining({ ownerId: "buyer-1" })]) } }) }));
    expect(result.tickets).toHaveLength(2);
  });

  it("rejects quantities exceeding remaining stock", async () => {
    await expect(service.purchase("type-1", 5, buyer)).rejects.toBeInstanceOf(BadRequestException);
  });
});
