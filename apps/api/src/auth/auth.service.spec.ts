import { ConflictException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  const createService = () => {
    const prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn()
      },
      emailToken: {
        create: jest.fn().mockResolvedValue({})
      }
    };
    const jwtService = {
      signAsync: jest.fn().mockResolvedValue("signed-token")
    } as unknown as JwtService;
    const mailService = {
      sendAccountActivatedEmail: jest.fn().mockResolvedValue(undefined),
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined)
    };

    return {
      service: new AuthService(prisma as never, jwtService, mailService as never),
      prisma,
      mailService
    };
  };

  it("marks an invited user pending and sends verification when they register with the same email", async () => {
    const { service, prisma, mailService } = createService();
    const invitedUser = {
      id: "user-1",
      email: "invitee@example.com",
      name: "Invitee",
      passwordHash: "temporary-hash",
      role: "user",
      status: "invited"
    };
    const pendingUser = {
      ...invitedUser,
      name: "Active Invitee",
      passwordHash: "new-hash",
      status: "pending"
    };

    prisma.user.findUnique.mockResolvedValue(invitedUser);
    prisma.user.update.mockResolvedValue(pendingUser);

    const result = await service.register({
      email: "INVITEE@example.com",
      name: "Active Invitee",
      password: "StrongerPass123"
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: invitedUser.id },
      data: expect.objectContaining({
        name: "Active Invitee",
        status: "pending"
      })
    });
    expect(result).toEqual({
      accessToken: "signed-token",
      user: {
        id: pendingUser.id,
        email: pendingUser.email,
        name: pendingUser.name,
        role: pendingUser.role,
        status: pendingUser.status
      }
    });
    expect(mailService.sendVerificationEmail).toHaveBeenCalledWith({
      to: pendingUser.email,
      name: pendingUser.name,
      token: expect.any(String)
    });
  });

  it("rejects registration when the email already belongs to an active user", async () => {
    const { service, prisma } = createService();

    prisma.user.findUnique.mockResolvedValue({
      id: "user-2",
      email: "active@example.com",
      name: "Active User",
      passwordHash: "hash",
      role: "user",
      status: "active"
    });

    await expect(
      service.register({
        email: "active@example.com",
        name: "Active User",
        password: "StrongerPass123"
      })
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
