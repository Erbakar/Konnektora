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
      }
    };
    const jwtService = {
      signAsync: jest.fn().mockResolvedValue("signed-token")
    } as unknown as JwtService;

    return {
      service: new AuthService(prisma as never, jwtService),
      prisma
    };
  };

  it("activates an invited user when they register with the same email", async () => {
    const { service, prisma } = createService();
    const invitedUser = {
      id: "user-1",
      email: "invitee@example.com",
      name: "Invitee",
      passwordHash: "temporary-hash",
      role: "user",
      status: "invited"
    };
    const activatedUser = {
      ...invitedUser,
      name: "Active Invitee",
      passwordHash: "new-hash",
      status: "active"
    };

    prisma.user.findUnique.mockResolvedValue(invitedUser);
    prisma.user.update.mockResolvedValue(activatedUser);

    const result = await service.register({
      email: "INVITEE@example.com",
      name: "Active Invitee",
      password: "StrongerPass123"
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: invitedUser.id },
      data: expect.objectContaining({
        name: "Active Invitee",
        status: "active"
      })
    });
    expect(result).toEqual({
      accessToken: "signed-token",
      user: {
        id: activatedUser.id,
        email: activatedUser.email,
        name: activatedUser.name,
        role: activatedUser.role,
        status: activatedUser.status
      }
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
