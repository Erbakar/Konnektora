import { MessagesService } from "./messages.service";

describe("data deletion email confirmation", () => {
  const record = { id: "request-1", email: "ada@example.com", category: "Veri silme talebi · E-posta onayı bekleniyor" };
  const prisma = { userMessage: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() } };
  const jwt = { signAsync: jest.fn(), verifyAsync: jest.fn() };
  const mail = { sendDataDeletionConfirmation: jest.fn() };
  const service = new MessagesService(prisma as never, jwt as never, mail as never);
  beforeEach(() => { jest.resetAllMocks(); prisma.userMessage.create.mockResolvedValue(record); jwt.signAsync.mockResolvedValue("confirmation-token"); mail.sendDataDeletionConfirmation.mockResolvedValue({}); });
  it("stores a pending request and emails a purpose-bound expiring confirmation", async () => {
    await service.createMessage({ type: "write_to_us", category: "Veri silme talebi", name: "Ada", email: record.email, body: "account" } as never);
    expect(prisma.userMessage.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ category: record.category }) }));
    expect(jwt.signAsync).toHaveBeenCalledWith(expect.objectContaining({ purpose: "confirm-data-deletion-request", requestId: record.id, email: record.email }), { expiresIn: "24h" });
    expect(mail.sendDataDeletionConfirmation).toHaveBeenCalledWith({ to: record.email, token: "confirmation-token" });
  });
  it("does not acknowledge successful delivery when email fails", async () => {
    mail.sendDataDeletionConfirmation.mockRejectedValue(new Error("delivery failed"));
    await expect(service.createMessage({ type: "write_to_us", category: "Veri silme talebi", name: "Ada", email: record.email, body: "account" } as never)).rejects.toThrow("delivery failed");
  });
  it("confirms the matching email without deleting the account", async () => {
    jwt.verifyAsync.mockResolvedValue({ purpose: "confirm-data-deletion-request", requestId: record.id, email: record.email });
    prisma.userMessage.findUnique.mockResolvedValue(record);
    await expect(service.confirmDeletionRequest("token")).resolves.toEqual({ ok: true });
    expect(prisma.userMessage.update).toHaveBeenCalledWith({ where: { id: record.id }, data: { category: "Veri silme talebi · E-posta doğrulandı" } });
  });
  it.each(["wrong-purpose", "mismatched-email", "expired"])("rejects %s tokens", async condition => {
    jwt.verifyAsync.mockResolvedValue({ purpose: condition === "wrong-purpose" ? "login" : "confirm-data-deletion-request", requestId: record.id, email: condition === "mismatched-email" ? "someone@example.com" : record.email });
    if (condition === "expired") jwt.verifyAsync.mockRejectedValue(new Error("expired"));
    prisma.userMessage.findUnique.mockResolvedValue(record);
    await expect(service.confirmDeletionRequest("token")).rejects.toThrow();
    expect(prisma.userMessage.update).not.toHaveBeenCalled();
  });
});
