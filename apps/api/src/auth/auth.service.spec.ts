import { BadRequestException, ConflictException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { hash } from "bcryptjs";
import { createHash } from "crypto";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  const createService = (config: Record<string, string | undefined> = {}) => {
    const prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      emailToken: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      event: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      place: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      userMessage: { create: jest.fn().mockResolvedValue({}) },
      phoneVerification: {
        findFirst: jest.fn(),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn(),
      },
      socialAccount: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((operations: unknown[]) => Promise.all(operations)),
    };
    const jwtService = {
      signAsync: jest.fn().mockResolvedValue("signed-token"),
    } as unknown as JwtService;
    const mailService = {
      sendAccountActivatedEmail: jest.fn().mockResolvedValue(undefined),
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    };
    const smsService = {
      sendVerificationCode: jest.fn().mockResolvedValue(undefined),
    };

    return {
      service: new AuthService(
        prisma as never,
        jwtService,
        mailService as never,
        smsService as never,
        {
          get: jest.fn((key: string) => config[key] ?? (key === "NODE_ENV" ? "development" : undefined)),
        } as unknown as ConfigService,
      ),
      prisma,
      mailService,
      smsService,
    };
  };

  it("keeps a new social account pending until basic profile completion", async () => {
    const { service, prisma } = createService();
    prisma.socialAccount.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: "social-user",
        role: "user",
        accountType: "individual",
        ...data,
      }),
    );
    prisma.socialAccount.create.mockResolvedValue({});
    const result = await service.socialLogin({
      provider: "google",
      credential: "demo-google",
    });
    expect(result.user.email).toBe("demo.google@konnektora.local");
    expect(result.user.status).toBe("pending");
    expect(prisma.socialAccount.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: "google",
        providerUserId: "google-demo-user",
      }),
    });
  });

  it("keeps an invited user pending until email or phone verification and sends email verification", async () => {
    const { service, prisma, mailService } = createService();
    const invitedUser = {
      id: "user-1",
      email: "invitee@example.com",
      name: "Invitee",
      passwordHash: "temporary-hash",
      role: "user",
      accountType: "individual",
      emailVerified: false,
      status: "invited",
    };
    const pendingUser = {
      ...invitedUser,
      name: "Active Invitee",
      passwordHash: "new-hash",
      status: "pending",
    };

    prisma.user.findUnique.mockResolvedValue(invitedUser);
    prisma.user.update.mockResolvedValue(pendingUser);

    const result = await service.register({
      email: "INVITEE@example.com",
      name: "Active Invitee",
      phone: "+905551110001",
      password: "StrongerPass123!",
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: invitedUser.id },
      data: expect.objectContaining({
        name: "Active Invitee",
        status: "pending",
      }),
    });
    expect(result).toEqual({
      accessToken: "signed-token",
      verificationEmailSent: true,
      user: {
        id: pendingUser.id,
        email: pendingUser.email,
        name: pendingUser.name,
        role: pendingUser.role,
        accountType: pendingUser.accountType,
        emailVerified: pendingUser.emailVerified,
        status: pendingUser.status,
        avatarUrl: null,
        username: undefined,
        city: undefined,
        country: undefined,
        onboardingCompleted: false,
      },
    });
    expect(mailService.sendVerificationEmail).toHaveBeenCalledWith({
      to: pendingUser.email,
      name: pendingUser.name,
      token: expect.any(String),
    });
  });

  it("claims a phone-only invited account during registration so its tickets and invitations stay attached", async () => {
    const { service, prisma } = createService();
    const invitedUser = {
      id: "phone-invite-1",
      email: "phone-placeholder@invite.konnektora.local",
      phone: "+905551112233",
      name: "+905551112233",
      passwordHash: "temporary-hash",
      role: "user",
      accountType: "individual",
      emailVerified: false,
      status: "invited",
    };
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(invitedUser);
    prisma.user.update.mockImplementation(({ data }) => Promise.resolve({ ...invitedUser, ...data }));

    await service.register({
      email: "deniz@example.com",
      name: "Deniz Kaya",
      phone: "+905551112233",
      password: "StrongerPass123!",
    });

    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "phone-invite-1" },
      data: expect.objectContaining({ email: "deniz@example.com", phone: "+905551112233", status: "pending" }),
    }));
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("turns a phone invitation into a reusable account without losing attached tickets or memberships", async () => {
    const { service, prisma, mailService } = createService();
    const invitedUser = {
      id: "phone-invite-2",
      email: "phone-placeholder@invite.konnektora.local",
      phone: "+905551112233",
      phoneVerified: false,
      name: "+905551112233",
      role: "user",
      accountType: "individual",
      status: "invited",
    };
    prisma.emailToken.findUnique.mockResolvedValue({ id: "token-1", userId: invitedUser.id, type: "invite_accept", expiresAt: new Date(Date.now() + 60_000), consumedAt: null });
    prisma.user.findUnique.mockImplementation(({ where }) => Promise.resolve(where.id ? invitedUser : null));
    prisma.user.update.mockImplementation(({ data }) => Promise.resolve({ ...invitedUser, ...data }));
    prisma.emailToken.update.mockResolvedValue({});

    const result = await service.acceptInvite({ token: "raw-token", name: "Deniz Kaya", email: "DENIZ@example.com", password: "StrongerPass123!" });

    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: invitedUser.id },
      data: expect.objectContaining({ email: "deniz@example.com", phoneVerified: true, emailVerified: false, status: "active" }),
    }));
    expect(prisma.emailToken.update).toHaveBeenCalledWith({ where: { id: "token-1" }, data: { consumedAt: expect.any(Date) } });
    expect(result.user.email).toBe("deniz@example.com");
    expect(mailService.sendAccountActivatedEmail).toHaveBeenCalledWith({ to: "deniz@example.com", name: "Deniz Kaya" });
  });

  it("does not consume a phone invitation token before the required real email is supplied", async () => {
    const { service, prisma } = createService();
    prisma.emailToken.findUnique.mockResolvedValue({ id: "token-2", userId: "phone-invite-3", type: "invite_accept", expiresAt: new Date(Date.now() + 60_000), consumedAt: null });
    prisma.user.findUnique.mockResolvedValue({ id: "phone-invite-3", email: "phone-placeholder@invite.konnektora.local", phone: "+905551112233", status: "invited" });

    await expect(service.acceptInvite({ token: "raw-token", password: "StrongerPass123!" })).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.emailToken.update).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects registration when the email already belongs to an active user", async () => {
    const { service, prisma } = createService();

    prisma.user.findUnique.mockResolvedValue({
      id: "user-2",
      email: "active@example.com",
      name: "Active User",
      passwordHash: "hash",
      role: "user",
      status: "active",
    });

    await expect(
      service.register({
        email: "active@example.com",
        name: "Active User",
        phone: "+905551110002",
        password: "StrongerPass123!",
      }),
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
      emailVerified: false,
    };

    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(corporateUser);

    await service.register({
      email: corporateUser.email,
      name: corporateUser.name,
      phone: "+905551110003",
      password: "StrongerPass123!",
      accountType: "corporate",
      companyName: "Example",
      tradeName: "Example Company Ltd.",
      companyType: "limited_or_corporation",
      businessCategory: "event_organizer",
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accountType: "corporate",
        companyName: "Example",
        tradeName: "Example Company Ltd.",
        companyType: "limited_or_corporation",
        businessCategory: "event_organizer",
      }),
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
      status: "pending",
      accountType: "individual",
      emailVerified: true,
    };
    prisma.emailToken.findUnique.mockResolvedValue({
      id: "token-1",
      userId: user.id,
      type: "verify_email",
      tokenHash: "hash",
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
    });
    prisma.emailToken.update.mockResolvedValue({ userId: user.id });
    prisma.user.update.mockResolvedValue(user);

    await service.confirmEmail({ token: "raw-token" });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { emailVerified: true },
    });
  });

  it("changes the password after verifying the current password", async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({
      id: "user-5",
      passwordHash: await hash("CurrentPass!1", 4),
    });
    prisma.user.update.mockResolvedValue({});

    await expect(
      service.changePassword("user-5", {
        currentPassword: "CurrentPass!1",
        newPassword: "NewStrongPass!2",
      }),
    ).resolves.toEqual({ ok: true });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-5" },
      data: { passwordHash: expect.any(String) },
    });
  });

  it("changes an account email securely and sends a new verification link", async () => {
    const { service, prisma, mailService } = createService();
    const current = {
      id: "user-6",
      email: "old@example.com",
      name: "Member",
      passwordHash: await hash("CurrentPass!1", 4),
    };
    prisma.user.findUnique.mockResolvedValueOnce(current).mockResolvedValueOnce(null);
    prisma.user.update.mockResolvedValue({ ...current, email: "new@example.com" });

    await expect(service.changeEmail("user-6", {
      email: "New@Example.com",
      currentPassword: "CurrentPass!1",
    })).resolves.toEqual({ ok: true, sent: true, email: "new@example.com" });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-6" },
      data: { email: "new@example.com", emailVerified: false },
    });
    expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "new@example.com" }));
  });

  it("freezes the account and archives content without another manager", async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({
      id: "user-6",
      name: "Leaving User",
      email: "leave@example.com",
      phone: null,
      passwordHash: await hash("CurrentPass!1", 4),
    });
    prisma.user.update.mockResolvedValue({});

    await expect(
      service.deactivate("user-6", {
        currentPassword: "CurrentPass!1",
        reason: "I need a break.",
      }),
    ).resolves.toEqual({ ok: true });
    expect(prisma.event.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdById: "user-6",
          participants: expect.any(Object),
        }),
      }),
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-6" },
      data: { status: "frozen" },
    });
    expect(prisma.userMessage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "account_freeze",
        body: "I need a break.",
      }),
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
      emailVerified: true,
    };
    prisma.user.findUnique.mockResolvedValue(frozenUser);
    prisma.user.update.mockResolvedValue({ ...frozenUser, status: "active" });

    const result = await service.reactivate({
      email: frozenUser.email,
      password: "CurrentPass!1",
    });
    expect(result.user.status).toBe("active");
  });

  it("creates and sends a six-digit phone verification code", async () => {
    const { service, prisma, smsService } = createService();
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.phoneVerification.findFirst.mockResolvedValue(null);

    const result = await service.requestPhoneVerification("user-8", {
      phone: "+905551112233",
    });

    expect(result.expiresInSeconds).toBe(120);
    expect(result.developmentCode).toMatch(/^\d{6}$/);
    expect(prisma.phoneVerification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-8",
        phone: "+905551112233",
        codeHash: expect.any(String),
      }),
    });
    expect(smsService.sendVerificationCode).toHaveBeenCalledWith("+905551112233", result.developmentCode);
  });

  it("verifies the code and assigns the phone to the user", async () => {
    const { service, prisma } = createService();
    const code = "123456";
    prisma.user.findUnique.mockResolvedValue({
      email: "member@example.com",
      name: "Member",
      status: "active",
    });
    prisma.phoneVerification.findFirst.mockResolvedValue({
      id: "verification-1",
      codeHash: createHash("sha256").update(code).digest("hex"),
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.phoneVerification.update.mockResolvedValue({});
    prisma.user.update.mockResolvedValue({
      phone: "+905551112233",
      phoneVerified: true,
    });

    await expect(
      service.confirmPhoneVerification("user-8", {
        phone: "+905551112233",
        code,
      }),
    ).resolves.toEqual({
      ok: true,
      phone: "+905551112233",
      phoneVerified: true,
    });
  });

  it("returns a generated demo code in production when SMS is intentionally bypassed", async () => {
    const { service, prisma, smsService } = createService({
      NODE_ENV: "production",
      ALLOW_SMS_VERIFICATION_BYPASS: "true",
    });
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.phoneVerification.findFirst.mockResolvedValue(null);

    const result = await service.requestPhoneVerification("user-8", {
      phone: "+905551112233",
    });

    expect(result).toEqual({
      ok: true,
      expiresInSeconds: 120,
      verificationMode: "demo",
      demoCode: expect.stringMatching(/^\d{6}$/),
    });
    expect(result).not.toHaveProperty("developmentCode");
    expect(smsService.sendVerificationCode).toHaveBeenCalledWith(
      "+905551112233",
      result.demoCode,
    );
  });

  it("rejects an incorrect code even in demo verification mode", async () => {
    const { service, prisma } = createService({
      NODE_ENV: "production",
      ALLOW_SMS_VERIFICATION_BYPASS: "true",
    });
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({
      email: "member@example.com",
      name: "Member",
      status: "pending",
    });
    prisma.phoneVerification.findFirst.mockResolvedValue({
      id: "verification-1",
      codeHash: createHash("sha256").update("123456").digest("hex"),
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.phoneVerification.update.mockResolvedValue({});

    await expect(
      service.confirmPhoneVerification("user-8", {
        phone: "+905551112233",
        code: "654321",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("checks email, phone and username availability", async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "phone-owner" });
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(
      service.availability({
        email: "new@example.com",
        phone: "+905551112233",
        username: "new.user",
      }),
    ).resolves.toEqual({
      emailAvailable: true,
      phoneAvailable: false,
      usernameAvailable: true,
    });
  });

  it("requires at least one availability field", async () => {
    const { service } = createService();
    await expect(service.availability({})).rejects.toBeInstanceOf(BadRequestException);
  });
});
