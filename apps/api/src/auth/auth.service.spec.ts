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
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        update: jest.fn()
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
      accountType: "individual",
      emailVerified: false,
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
      password: "StrongerPass123!"
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
        accountType: pendingUser.accountType,
        emailVerified: pendingUser.emailVerified,
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
        password: "StrongerPass123!"
      })
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("persists the selected corporate account type for a new registration", async () => {
    const { service, prisma } = createService();
    const corporateUser = {
      id: "user-3",
      email: "team@example.com",
      name: "Example Company",
      passwordHash: "hash",
      role: "user",
      status: "pending",
      accountType: "corporate",
      emailVerified: false
    };

    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(corporateUser);

    await service.register({
      email: corporateUser.email,
      name: corporateUser.name,
      password: "StrongerPass123!",
      accountType: "corporate",
      companyName: "Example",
      tradeName: "Example Company Ltd.",
      companyType: "limited_or_corporation",
      businessCategory: "event_organizer"
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accountType: "corporate",
        companyName: "Example",
        tradeName: "Example Company Ltd.",
        companyType: "limited_or_corporation",
        businessCategory: "event_organizer"
      })
    });
  });

  it("marks the email verified when a verification token is consumed", async () => {
    const { service, prisma } = createService();
    const user = {
      id: "user-4",
      email: "verified@example.com",
      name: "Verified User",
      passwordHash: "hash",
      role: "user",
      status: "active",
      accountType: "individual",
      emailVerified: true
    };
    prisma.emailToken.findUnique.mockResolvedValue({
      id: "token-1",
      userId: user.id,
      type: "verify_email",
      tokenHash: "hash",
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null
    });
    prisma.emailToken.update.mockResolvedValue({ userId: user.id });
    prisma.user.update.mockResolvedValue(user);

    await service.confirmEmail({ token: "raw-token" });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { status: "active", emailVerified: true }
    });
  });
});
