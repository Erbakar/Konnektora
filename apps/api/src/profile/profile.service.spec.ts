import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { ProfileService } from "./profile.service";

describe("ProfileService", () => {
  const currentProfile = {
    id: "user-1",
    accountType: "individual",
    name: "Ada Lovelace",
    username: "ada",
    email: "ada@example.com",
    phone: null,
    phoneVerified: false,
    country: "Türkiye",
    city: "İstanbul",
    district: null,
    address: null,
    gender: "female",
    birthDate: null,
    website: null,
    companyName: null,
    tradeName: null,
    companyType: null,
    businessCategory: null,
    emailVerified: true,
    status: "active",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01")
  };

  const createService = () => {
    const prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 })
      },
      tag: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 })
      },
      event: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      place: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      userBlock: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 })
      },
      userFollow: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 })
      },
      privacySettings: {
        findUnique: jest.fn(),
        upsert: jest.fn()
      },
      notificationPreference: {
        findMany: jest.fn(),
        upsert: jest.fn().mockResolvedValue({})
      },
      userInterestTag: {
        findMany: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        upsert: jest.fn().mockResolvedValue({})
      },
      $transaction: jest.fn().mockImplementation((operations: unknown[]) => Promise.all(operations))
    };

    return { service: new ProfileService(prisma as never), prisma };
  };

  it("returns the authenticated user's profile", async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue(currentProfile);

    await expect(service.getProfile("user-1")).resolves.toEqual(currentProfile);
  });

  it("rejects a username owned by another user", async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue(currentProfile);
    prisma.user.findFirst.mockResolvedValue({ id: "user-2" });

    await expect(service.updateProfile("user-1", { name: "Ada Lovelace", username: "taken" })).rejects.toBeInstanceOf(
      ConflictException
    );
  });

  it("requires company and trade names for corporate profiles", async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({ ...currentProfile, accountType: "corporate" });
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(service.updateProfile("user-1", { name: "Konnektora", companyName: "", tradeName: "" })).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it("rejects phone changes outside the verification flow", async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue(currentProfile);

    await expect(
      service.updateProfile("user-1", { name: "Ada Lovelace", phone: "+905551112233" })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("normalizes optional profile fields before updating", async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue(currentProfile);
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.update.mockResolvedValue({ ...currentProfile, name: "Ada Byron", city: null });

    await service.updateProfile("user-1", { name: "  Ada Byron  ", username: "ada-byron", city: "" });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Ada Byron", username: "ada-byron", city: null })
      })
    );
  });

  it("activates a pending individual account only after verified phone and basic profile", async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({ ...currentProfile, status: "pending", phoneVerified: true });
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.update.mockResolvedValue({ ...currentProfile, status: "active" });

    await service.updateProfile("user-1", { name: "Ada Lovelace", username: "ada", country: "Türkiye", birthDate: "1990-01-01T00:00:00.000Z" });

    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "active" }) }));
  });

  it("fails when the profile no longer exists", async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.getProfile("missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("returns privacy-safe defaults before settings are created", async () => {
    const { service, prisma } = createService();
    prisma.privacySettings.findUnique.mockResolvedValue(null);

    await expect(service.getPrivacySettings("user-1")).resolves.toEqual({
      userId: "user-1",
      messageAudience: "everybody",
      directoryDiscoverable: true,
      eventAudience: "everybody",
      eventInviteAudience: "everybody",
      placeAudience: "everybody",
      placeInviteAudience: "everybody",
      profileNameAudience: "everybody",
      demographicsAudience: "everybody",
      locationAudience: "everybody",
      websiteAudience: "everybody",
      businessAudience: "everybody",
      addressAudience: "everybody",
      tradeNameAudience: "everybody"
    });
  });

  it("upserts all privacy settings atomically", async () => {
    const { service, prisma } = createService();
    const input = {
      messageAudience: "following" as const,
      directoryDiscoverable: true,
      eventAudience: "network" as const,
      eventInviteAudience: "following" as const,
      placeAudience: "everybody" as const,
      placeInviteAudience: "network" as const
    };
    prisma.privacySettings.upsert.mockResolvedValue({ userId: "user-1", ...input });

    await service.updatePrivacySettings("user-1", input);
    expect(prisma.privacySettings.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: { userId: "user-1", ...input },
      update: input
    });
  });

  it("returns notification defaults merged with stored choices", async () => {
    const { service, prisma } = createService();
    prisma.notificationPreference.findMany.mockResolvedValue([{ topic: "private_message", channel: "none" }]);

    const preferences = await service.getNotificationPreferences("user-1");
    expect(preferences).toContainEqual({ topic: "private_message", channel: "none" });
    expect(preferences).toContainEqual({ topic: "password_changed", channel: "email" });
    expect(preferences).toContainEqual({ topic: "event_invite", channel: "both" });
    expect(preferences).toHaveLength(13);
  });

  it("rejects duplicate notification topics", async () => {
    const { service } = createService();
    await expect(
      service.updateNotificationPreferences("user-1", {
        preferences: [
          { topic: "mention", channel: "push" },
          { topic: "mention", channel: "email" }
        ]
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("prevents users from blocking themselves", async () => {
    const { service, prisma } = createService();
    await expect(service.createBlock("user-1", { targetType: "user", targetId: "user-1" })).rejects.toBeInstanceOf(
      BadRequestException
    );
    expect(prisma.userBlock.upsert).not.toHaveBeenCalled();
  });

  it("creates an idempotent event block after validating the target", async () => {
    const { service, prisma } = createService();
    prisma.event.findUnique.mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111" });

    await expect(
      service.createBlock("user-1", { targetType: "event", targetId: "11111111-1111-4111-8111-111111111111" })
    ).resolves.toEqual({ ok: true });
    expect(prisma.userBlock.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_targetType_targetId: {
            userId: "user-1",
            targetType: "event",
            targetId: "11111111-1111-4111-8111-111111111111"
          }
        }
      })
    );
  });

  it("updates tag sentiments and usage counts atomically", async () => {
    const { service, prisma } = createService();
    prisma.tag.count.mockResolvedValue(2);
    prisma.userInterestTag.findMany
      .mockResolvedValueOnce([{ tagId: "tag-old" }])
      .mockResolvedValueOnce([
        { tag: { id: "tag-like" }, sentiment: "like", createdAt: new Date(), updatedAt: new Date() },
        { tag: { id: "tag-ok" }, sentiment: "ok", createdAt: new Date(), updatedAt: new Date() }
      ]);

    const result = await service.updateAffinities("user-1", [
      { tagId: "tag-like", sentiment: "like" },
      { tagId: "tag-ok", sentiment: "ok" }
    ]);

    expect(result.map((item) => item.sentiment)).toEqual(["like", "ok"]);
    expect(prisma.userInterestTag.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1", tagId: { in: ["tag-old"] } }
    });
    expect(prisma.tag.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["tag-like", "tag-ok"] } },
      data: { usageCount: { increment: 1 } }
    });
    expect(prisma.tag.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["tag-old"] }, usageCount: { gt: 0 } },
      data: { usageCount: { decrement: 1 } }
    });
  });
});
