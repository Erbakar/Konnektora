import { UnauthorizedException } from "@nestjs/common";
import { UserMessageType } from "@prisma/client";
import { MessagesService } from "./messages.service";

describe("MessagesService admin inbox permissions", () => {
  const userMessage = { findUnique: jest.fn(), update: jest.fn() };
  const user = { findUnique: jest.fn() };
  const service = new MessagesService({ userMessage, user } as never);
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
});
