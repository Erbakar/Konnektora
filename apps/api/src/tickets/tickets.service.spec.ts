import { BadRequestException } from "@nestjs/common";
import { TicketsService } from "./tickets.service";

describe("TicketsService", () => {
  const eventTicketType = { findUnique: jest.fn(), updateMany: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() };
  const paymentTransaction = { create: jest.fn() };
  const financialAccount = { upsert: jest.fn(), findUnique: jest.fn(), update: jest.fn() };
  const eventTicketOrder = { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), aggregate: jest.fn() };
  const eventParticipant = { upsert: jest.fn(), findFirst: jest.fn() };
  const ownedEventTicket = { findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn() };
  const ticketTransfer = { create: jest.fn() };
  const user = { findFirst: jest.fn(), create: jest.fn() };
  const event = { findUnique: jest.fn() };
  const prisma: any = { eventTicketType, paymentTransaction, financialAccount, eventTicketOrder, eventParticipant, ownedEventTicket, ticketTransfer, user, event, $transaction: jest.fn((callback) => callback(prisma)) };
  const notifications = { dispatch: jest.fn() };
  const auth = { createInviteAcceptToken: jest.fn() };
  const mail = { sendTicketTransferEmail: jest.fn() };
  const sms = { sendTicketTransfer: jest.fn() };
  const service = new TicketsService(prisma, notifications as never, auth as never, mail as never, sms as never);
  const buyer = { id: "buyer-1", name: "Ada" } as never;
  const type = { id: "type-1", eventId: "event-1", name: "General", price: 100, currency: "TRY", capacity: 5, soldCount: 1, status: "active", saleStartsAt: null, saleEndsAt: null, event: { id: "event-1", title: "Demo", slug: "demo", status: "published", createdById: "owner-1" } };

  beforeEach(() => {
    jest.clearAllMocks();
    eventTicketType.findUnique.mockResolvedValue(type);
    eventTicketType.updateMany.mockResolvedValue({ count: 1 });
    paymentTransaction.create.mockResolvedValue({ id: "payment-1", netAmount: 190 });
    eventTicketOrder.create.mockResolvedValue({ id: "order-1", totalAmount: 200, unitPrice: 100, tickets: [{ id: "ticket-1" }, { id: "ticket-2" }] });
    user.findFirst.mockResolvedValue({ id: "recipient-1", name: "Ece", username: "ece", email: "ece@example.com", phone: "+905551110002", status: "active" });
    event.findUnique.mockResolvedValue({ title: "Demo" });
    auth.createInviteAcceptToken.mockResolvedValue("accept-token");
  });

  it("atomically reserves capacity and creates one owned ticket per quantity", async () => {
    const result = await service.purchase("type-1", 2, buyer);
    expect(eventTicketType.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ soldCount: { lte: 3 } }), data: expect.objectContaining({ soldCount: { increment: 2 } }) }));
    expect(eventTicketOrder.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ quantity: 2, totalAmount: 200, tickets: { create: expect.arrayContaining([expect.objectContaining({ ownerId: "buyer-1" })]) } }) }));
    expect(result.tickets).toHaveLength(2);
  });

  it("rejects quantities exceeding remaining stock", async () => {
    await expect(service.purchase("type-1", 5, buyer)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("issues a free ticket without creating a payment transaction", async () => {
    eventTicketType.findUnique.mockResolvedValue({ ...type, price: 0, soldCount: 0, event: { ...type.event, createdById: "buyer-1" } });
    eventTicketOrder.create.mockResolvedValue({ id: "order-free", totalAmount: 0, unitPrice: 0, tickets: [{ id: "ticket-free" }] });

    const result = await service.purchase("type-1", 1, buyer);

    expect(paymentTransaction.create).not.toHaveBeenCalled();
    expect(eventTicketOrder.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ totalAmount: 0, paymentId: undefined }) }));
    expect(result.tickets).toHaveLength(1);
  });

  it("does not sell a paid ticket when its payment recipient is missing", async () => {
    eventTicketType.findUnique.mockResolvedValue({ ...type, event: { ...type.event, createdById: null } });

    await expect(service.purchase("type-1", 1, buyer)).rejects.toBeInstanceOf(BadRequestException);
    expect(eventTicketType.updateMany).not.toHaveBeenCalled();
  });

  it("enforces the organizer's per-user ticket limit across purchases", async () => {
    eventTicketType.findUnique.mockResolvedValue({ ...type, perUserLimit: 2, soldCount: 0 });
    eventTicketOrder.aggregate.mockResolvedValue({ _sum: { quantity: 2 } });

    await expect(service.purchase("type-1", 1, buyer)).rejects.toBeInstanceOf(BadRequestException);
    expect(eventTicketType.updateMany).not.toHaveBeenCalled();
  });

  it("transfers any selected quantity, deducts ownership from the sender and adds the recipient as a participant", async () => {
    const ticketIds = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"];
    ownedEventTicket.findMany.mockResolvedValue(ticketIds.map((id) => ({ id, eventId: "event-1" })));

    const result = await service.transfer({ ticketIds, username: "@ECE" }, buyer);

    expect(user.findFirst).toHaveBeenCalledWith({ where: { OR: [{ username: "ece" }] } });
    expect(ticketTransfer.create).toHaveBeenCalledTimes(2);
    expect(ownedEventTicket.update).toHaveBeenCalledTimes(2);
    expect(ownedEventTicket.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ ownerId: "recipient-1" }) }));
    expect(eventParticipant.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ userId: "recipient-1", status: "accepted" }) }));
    expect(notifications.dispatch).toHaveBeenCalledWith(expect.objectContaining({ userId: "recipient-1", type: "ticket_transfer" }));
    expect(result.transferred).toBe(2);
  });

  it("allows a ticket that was transferred before to be transferred again by its current owner", async () => {
    const ticketId = "33333333-3333-4333-8333-333333333333";
    ownedEventTicket.findMany.mockResolvedValue([{ id: ticketId, eventId: "event-1", transferredAt: new Date() }]);

    await service.transfer({ ticketIds: [ticketId], email: "ece@example.com" }, { id: "current-owner", name: "Can" } as never);

    expect(ownedEventTicket.findMany).toHaveBeenCalledWith({ where: { id: { in: [ticketId] }, ownerId: "current-owner", status: "active" } });
    expect(ticketTransfer.create).toHaveBeenCalledWith({ data: { ticketId, fromUserId: "current-owner", toUserId: "recipient-1" } });
  });

  it("creates an invited account for a non-member phone number and sends a ticket claim link", async () => {
    const ticketId = "44444444-4444-4444-8444-444444444444";
    user.findFirst.mockResolvedValue(null);
    user.create.mockImplementation(({ data }) => Promise.resolve({ id: "invited-phone", username: null, ...data }));
    ownedEventTicket.findMany.mockResolvedValue([{ id: ticketId, eventId: "event-1" }]);

    await service.transfer({ ticketIds: [ticketId], phone: "+905551112233", name: "Deniz" }, buyer);

    expect(user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ email: expect.stringMatching(/^phone-.+@invite\.konnektora\.local$/), phone: "+905551112233", status: "invited" }) });
    expect(auth.createInviteAcceptToken).toHaveBeenCalledWith("invited-phone");
    expect(sms.sendTicketTransfer).toHaveBeenCalledWith("+905551112233", "Ada", "Demo", 1, "accept-token");
    expect(notifications.dispatch).not.toHaveBeenCalled();
  });

  it("emails a ticket claim link to a non-member email address", async () => {
    const ticketId = "55555555-5555-4555-8555-555555555555";
    user.findFirst.mockResolvedValue(null);
    user.create.mockImplementation(({ data }) => Promise.resolve({ id: "invited-email", username: null, ...data }));
    ownedEventTicket.findMany.mockResolvedValue([{ id: ticketId, eventId: "event-1" }]);

    await service.transfer({ ticketIds: [ticketId], email: "NEW@example.com", name: "Yeni Üye" }, buyer);

    expect(mail.sendTicketTransferEmail).toHaveBeenCalledWith({ to: "new@example.com", name: "Yeni Üye", eventTitle: "Demo", invitedByName: "Ada", quantity: 1, acceptToken: "accept-token" });
  });

  it("rejects ticket ids that are not all active and owned by the sender", async () => {
    ownedEventTicket.findMany.mockResolvedValue([]);

    await expect(service.transfer({ ticketIds: ["66666666-6666-4666-8666-666666666666"], username: "ece" }, buyer)).rejects.toBeInstanceOf(BadRequestException);
    expect(ticketTransfer.create).not.toHaveBeenCalled();
  });
});
