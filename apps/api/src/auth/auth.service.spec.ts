jest.mock("../notifications/activity-events", () => ({ notifyEntityCreated: jest.fn().mockResolvedValue(undefined), notifyEntityChanges: jest.fn().mockResolvedValue(undefined), notifyUserActivity: jest.fn().mockResolvedValue(undefined), notifyEventAvailability: jest.fn().mockResolvedValue(undefined), isUndiscoverable: jest.fn().mockResolvedValue(false), notifyRegistration: jest.fn().mockResolvedValue(undefined), notifyMembershipInvite: jest.fn().mockResolvedValue(undefined), notifyComment: jest.fn().mockResolvedValue(undefined), recordActivity: jest.fn().mockResolvedValue(undefined) }));
import { OAuth2Client } from "google-auth-library";
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
      automatedMessageDelivery: {
        create: jest.fn().mockResolvedValue({ id: "delivery-1" }),
        update: jest.fn().mockResolvedValue({}),
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
      sendPhoneChangeCode: jest.fn().mockResolvedValue(undefined),
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

  it("allows a pending account to sign in and resume onboarding after resetting its password", async () => {
    const { service, prisma } = createService();
    const user = { id: "pending-user", email: "ada@example.com", name: "Ada", role: "user", status: "pending", passwordHash: await hash("new-password-123", 4), onboardingCompleted: false };
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.user.update.mockResolvedValue(user);
    const result = await service.login({ email: " Ada@Example.com ", password: "new-password-123" });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: "ada@example.com" } });
    expect(result.user.status).toBe("pending");
    expect(result.user.onboardingCompleted).toBe(false);
  });

  it.each(["frozen", "suspended", "invited"])("rejects login for %s accounts", async status => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({ status, passwordHash: await hash("password-123", 4) });
    await expect(service.login({ email: "ada@example.com", password: "password-123" })).rejects.toThrow();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("keeps a new social account pending until basic profile completion", async () => {
    const { service, prisma } = createService({ NODE_ENV: "test" });
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
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ socialAccounts: { create: expect.objectContaining({ provider: "google", providerUserId: "google-demo-user" }) } }),
    });
  });

  it("preserves the corporate choice for social signup", async () => {
    const { service, prisma } = createService({ NODE_ENV: "test" });
    prisma.user.create.mockImplementation(({ data }) => Promise.resolve({ id: "corporate", role: "user", ...data }));
    const result = await service.socialLogin({ provider: "google", credential: "demo-google", accountType: "corporate" });
    expect(result.user.accountType).toBe("corporate");
    expect(result.user.status).toBe("pending");
  });

  it("rejects demo credentials outside tests", async () => {
    const { service, prisma } = createService();
    await expect(service.socialLogin({ provider: "google", credential: "demo-google" })).rejects.toThrow();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("requires authenticated linking for an existing email", async () => {
    const { service, prisma } = createService({ NODE_ENV: "test" });
    prisma.user.findUnique.mockResolvedValue({ id: "existing", status: "active" });
    await expect(service.socialLogin({ provider: "google", credential: "demo-google" })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.socialAccount.create).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("verifies Google token with the configured audience before using a linked account", async () => {
    const verify = jest.spyOn(OAuth2Client.prototype, "verifyIdToken").mockResolvedValue({ getPayload: () => ({ sub: "google-id", email: "member@example.com", email_verified: true }) } as never);
    try {
      const { service, prisma } = createService({ GOOGLE_CLIENT_ID: "client-id" });
      prisma.socialAccount.findUnique.mockResolvedValue({ id: "link", user: { id: "member", status: "active" } });
      const result = await service.socialLogin({ provider: "google", credential: "signed-token" });
      expect(verify).toHaveBeenCalledWith({ idToken: "signed-token", audience: "client-id" });
      expect(result.user.id).toBe("member");
      expect(prisma.user.create).not.toHaveBeenCalled();
    } finally { verify.mockRestore(); }
  });

  it("rejects Facebook tokens issued for another app", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({ data: { is_valid: true, app_id: "other", user_id: "fb-user" } }) } as Response);
    try {
      const { service, prisma } = createService({ FACEBOOK_APP_ID: "our-app", FACEBOOK_APP_SECRET: "test-secret" });
      await expect(service.socialLogin({ provider: "facebook", credential: "access-token" })).rejects.toThrow("Facebook oturumu");
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally { fetchMock.mockRestore(); }
  });

  it.each(["fb-user", "different-user"])("checks Facebook profile identity %s against the verified token", async (profileId) => {
    const fetchMock = jest.spyOn(global, "fetch")
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { is_valid: true, app_id: "our-app", user_id: "fb-user", expires_at: Date.now() / 1000 + 3600 } }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: profileId, email: "member@example.com", name: "Member" }) } as Response);
    try {
      const { service, prisma } = createService({ FACEBOOK_APP_ID: "our-app", FACEBOOK_APP_SECRET: "test-secret" });
      prisma.socialAccount.findUnique.mockResolvedValue({ id: "link", user: { id: "member", status: "active" } });
      const result = service.socialLogin({ provider: "facebook", credential: "access-token" });
      if (profileId === "fb-user") expect((await result).user.id).toBe("member");
      else await expect(result).rejects.toThrow("Facebook hesabı doğrulanamadı");
      expect(prisma.user.create).not.toHaveBeenCalled();
    } finally { fetchMock.mockRestore(); }
  });

  it.each(["active", "pending", "invited", "frozen"])("does not claim an existing %s account through registration", async (status) => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({ id: "existing", email: "existing@example.com", status });
    await expect(service.register({ email: "existing@example.com", name: "Attacker", phone: "+905551112233", password: "StrongerPass123!" })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it.each(["active", "pending", "invited"])("does not claim a %s account by supplying its phone number", async (status) => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue({ id: "phone-owner", status });
    await expect(service.register({ email: "new@example.com", name: "Attacker", phone: "+905551112233", password: "StrongerPass123!" })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("rejects another account's phone before generating or sending verification", async () => {
    const { service, prisma, smsService } = createService();
    prisma.user.findFirst.mockResolvedValue({ id: "another-user" });
    await expect(service.requestPhoneVerification("current-user", { phone: "+905551112233" })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.phoneVerification.create).not.toHaveBeenCalled();
    expect(smsService.sendVerificationCode).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
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
    expect(prisma.automatedMessageDelivery.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: invitedUser.id, messageType: "account_activated", channel: "email" }),
    }));
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

  it("sends the welcome email only once for the same activated account", async () => {
    const { service, prisma, mailService } = createService();

    await expect(service.sendAccountActivatedEmailOnce({ userId: "user-1", to: "ada@example.com", name: "Ada" })).resolves.toBe(true);
    prisma.automatedMessageDelivery.create.mockRejectedValueOnce({ code: "P2002" });
    await expect(service.sendAccountActivatedEmailOnce({ userId: "user-1", to: "ada@example.com", name: "Ada" })).resolves.toBe(false);

    expect(mailService.sendAccountActivatedEmail).toHaveBeenCalledTimes(1);
    expect(prisma.automatedMessageDelivery.update).toHaveBeenCalledWith({
      where: { id: "delivery-1" },
      data: { status: "sent", providerId: undefined },
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
      data: { passwordHash: expect.any(String), sessionVersion: { increment: 1 } },
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
  it("23/10 #17 proves ownership of the current phone before verifying the replacement", async () => {
    const {service,prisma,smsService}=createService();
    const account={id:"user",phone:"+905551111111",phoneVerified:true,status:"active"};
    prisma.user.findUnique.mockResolvedValue(account); prisma.user.findFirst.mockResolvedValue(null); prisma.phoneVerification.findFirst.mockResolvedValue(null);
    const first=await service.requestPhoneVerification("user",{phone:"+905552222222"});
    expect(first.stage).toBe("current_phone");
    expect(smsService.sendPhoneChangeCode).toHaveBeenCalledWith(account.phone,first.developmentCode);
    expect(smsService.sendVerificationCode).not.toHaveBeenCalled();
    const record={id:"v",previousPhone:account.phone,purpose:"current_phone",codeHash:createHash("sha256").update(first.developmentCode!).digest("hex"),attempts:0,expiresAt:new Date(Date.now()+120000)};
    prisma.phoneVerification.findFirst.mockResolvedValue(record);
    const next=await service.confirmPhoneVerification("user",{phone:"+905552222222",code:first.developmentCode!});
    if (!("stage" in next)) throw new Error("New phone step required");
    expect(next.phoneVerified).toBe(false);expect(prisma.user.update).not.toHaveBeenCalled();
    expect(smsService.sendVerificationCode).toHaveBeenCalledWith("+905552222222",next.developmentCode);
    const update=prisma.phoneVerification.update.mock.calls.at(-1)![0].data;
    prisma.phoneVerification.findFirst.mockResolvedValue({...record,...update});
    await expect(service.confirmPhoneVerification("user",{phone:"+905552222222",code:first.developmentCode!})).rejects.toThrow("Kod hatalı");
    prisma.user.update.mockResolvedValue({phone:"+905552222222",phoneVerified:true});
    await expect(service.confirmPhoneVerification("user",{phone:"+905552222222",code:next.developmentCode!})).resolves.toMatchObject({phoneVerified:true});
  });
  it("23/10 #17 rejects a legacy code that has not approved the current phone",async()=>{
    const {service,prisma}=createService();const code="123456";
    prisma.user.findUnique.mockResolvedValue({phone:"+905551111111",phoneVerified:true});
    prisma.phoneVerification.findFirst.mockResolvedValue({id:"v",purpose:"new_phone",previousPhone:null,codeHash:createHash("sha256").update(code).digest("hex"),attempts:0,expiresAt:new Date(Date.now()+60000)});
    await expect(service.confirmPhoneVerification("user",{phone:"+905552222222",code})).rejects.toThrow("Mevcut telefon");
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

});
