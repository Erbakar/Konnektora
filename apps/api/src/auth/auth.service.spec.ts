import { ConflictException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { hash } from "bcryptjs";
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
      },
      event: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      place: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      userMessage: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn().mockImplementation((operations: unknown[]) => Promise.all(operations))
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

  it("changes the password after verifying the current password", async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({ id: "user-5", passwordHash: await hash("CurrentPass!1", 4) });
    prisma.user.update.mockResolvedValue({});

    await expect(
      service.changePassword("user-5", { currentPassword: "CurrentPass!1", newPassword: "NewStrongPass!2" })
    ).resolves.toEqual({ ok: true });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-5" },
      data: { passwordHash: expect.any(String) }
    });
  });

  it("freezes the account and archives content without another manager", async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({
      id: "user-6",
      name: "Leaving User",
      email: "leave@example.com",
      phone: null,
      passwordHash: await hash("CurrentPass!1", 4)
    });
    prisma.user.update.mockResolvedValue({});

    await expect(
      service.deactivate("user-6", { currentPassword: "CurrentPass!1", reason: "I need a break." })
    ).resolves.toEqual({ ok: true });
    expect(prisma.event.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ createdById: "user-6", participants: expect.any(Object) }) })
    );
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: "user-6" }, data: { status: "frozen" } });
    expect(prisma.userMessage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "account_freeze", body: "I need a break." })
    });
  });

  it("reactivates only a frozen account with valid credentials", async () => {
    const { service, prisma } = createService();
    const frozenUser = {
      id: "user-7",
      email: "return@example.com",
      name: "Returning User",
      passwordHash: await hash("CurrentPass!1", 4),
      role: "user",
      status: "frozen",
      accountType: "individual",
      emailVerified: true
    };
    prisma.user.findUnique.mockResolvedValue(frozenUser);
    prisma.user.update.mockResolvedValue({ ...frozenUser, status: "active" });

    const result = await service.reactivate({ email: frozenUser.email, password: "CurrentPass!1" });
    expect(result.user.status).toBe("active");
  });
});
