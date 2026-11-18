import { UnauthorizedException } from "@nestjs/common";
import { UserMessageType } from "@prisma/client";
import { MessagesService } from "./messages.service";

describe("MessagesService admin inbox permissions", () => {
  const userMessage = { findUnique: jest.fn(), update: jest.fn() };
  const user = { findUnique: jest.fn() };
  const service = new MessagesService({ userMessage, user } as never, {} as never, {} as never);
  const admin = { id: "admin-1", role: "admin" } as never;

  beforeEach(() => jest.clearAllMocks());

  it("allows the matching granular FAQ inbox permission", async () => {
    userMessage.findUnique.mockResolvedValue({ id: "message-1", type: UserMessageType.faq });
    user.findUnique.mockResolvedValue({ adminRoleGroup: { permissions: ["messages.faq.manage"] } });

    await expect(service.getAdminMessage("message-1", admin)).resolves.toMatchObject({ id: "message-1" });
  });

  it("does not let a Write to us admin open an FAQ inbox message", async () => {
    userMessage.findUnique.mockResolvedValue({ id: "message-1", type: UserMessageType.faq });
    user.findUnique.mockResolvedValue({ adminRoleGroup: { permissions: ["messages.write_to_us.manage"] } });

    await expect(service.getAdminMessage("message-1", admin)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  describe("data deletion inbox split (17/10 #1)", () => {
    const list = { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) };
    const inbox = new MessagesService({ userMessage: list } as never, {} as never, {} as never);

    it("lists only data deletion requests when asked", async () => {
      await inbox.listAdminMessages(UserMessageType.write_to_us, { dataDeletion: "only" });

      expect(list.count).toHaveBeenCalledWith({
        where: { type: "write_to_us", AND: [{ category: { startsWith: "Veri silme talebi" } }] }
      });
    });

    it("keeps uncategorised messages when data deletion requests are excluded", async () => {
      await inbox.listAdminMessages(UserMessageType.write_to_us, { dataDeletion: "exclude", status: "unread" as never });

      expect(list.count).toHaveBeenCalledWith({
        where: {
          type: "write_to_us",
          status: "unread",
          AND: [{ OR: [{ category: null }, { NOT: { category: { startsWith: "Veri silme talebi" } } }] }]
        }
      });
    });

    it("leaves the inbox unfiltered by default", async () => {
      await inbox.listAdminMessages(UserMessageType.faq, {});

      expect(list.count).toHaveBeenCalledWith({ where: { type: "faq" } });
    });
  });
});
