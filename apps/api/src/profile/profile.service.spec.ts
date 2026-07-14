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
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01")
  };

  const createService = () => {
    const prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn()
      },
      privacySettings: {
        findUnique: jest.fn(),
        upsert: jest.fn()
      }
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
      directoryDiscoverable: false,
      eventAudience: "everybody",
      eventInviteAudience: "everybody",
      placeAudience: "everybody",
      placeInviteAudience: "everybody"
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
});
