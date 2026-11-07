import { BadRequestException, ConflictException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ProfileVerificationService } from "./profile-verification.service";

describe("ProfileVerificationService", () => {
  const user = { findUnique: jest.fn(), update: jest.fn() };
  const mediaFile = { findFirst: jest.fn() };
  const profileVerification = {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const prisma = {
    user,
    mediaFile,
    profileVerification,
    $transaction: jest.fn(async (callback: any) =>
      callback({ user, profileVerification }),
    ),
  };
  const config = {
    get: jest.fn((key: string) =>
      key === "NODE_ENV" ? "development" : undefined,
    ),
  } as unknown as ConfigService;
  const service = new ProfileVerificationService(prisma as never, config);

  beforeEach(() => jest.clearAllMocks());

  it("automatically approves an eligible individual in development", async () => {
    user.findUnique.mockResolvedValue({
      accountType: "individual",
      profileVerifiedAt: null,
    });
    profileVerification.findFirst.mockResolvedValue(null);
    mediaFile.findFirst.mockResolvedValue({
      id: "media-1",
      url: "/uploads/profile.jpg",
    });
    profileVerification.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: "verification-1",
        ...data,
        reviewedAt: new Date(),
      }),
    );
    user.update.mockResolvedValue({});
    const result = await service.submit(
      "user-1",
      "private-selfie.jpg",
      "blink",
    );
    expect(result.verified).toBe(true);
    expect(profileVerification.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: "approved",
        faceMatchScore: 0.98,
        livenessScore: 0.97,
      }),
      omit: { selfieBytes: true },
    }));
    expect(user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { profileVerifiedAt: expect.any(Date) },
    });
  });

  it("rejects corporate accounts from the individual flow", async () => {
    user.findUnique.mockResolvedValue({
      accountType: "corporate",
      profileVerifiedAt: null,
    });
    await expect(
      service.submit("user-1", "selfie.jpg", "smile"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("prevents duplicate pending submissions", async () => {
    user.findUnique.mockResolvedValue({
      accountType: "individual",
      profileVerifiedAt: null,
    });
    profileVerification.findFirst.mockResolvedValue({ id: "pending-1" });
    await expect(
      service.submit("user-1", "selfie.jpg", "turn_left"),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("updates the public verification timestamp when an admin reviews", async () => {
    profileVerification.findUnique.mockResolvedValue({
      id: "request-1",
      userId: "user-1",
    });
    profileVerification.update.mockResolvedValue({
      id: "request-1",
      status: "approved",
    });
    user.update.mockResolvedValue({});
    await service.review("request-1", "admin-1", { status: "approved" });
    expect(user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { profileVerifiedAt: expect.any(Date) },
    });
  });
  it("reads stored private evidence without relying on the temporary upload directory", async () => {
    const bytes = new Uint8Array([255, 216, 255, 0, 255, 217]);
    profileVerification.findUnique.mockResolvedValue({ selfieUrl: "missing-from-disk.jpg", selfieBytes: bytes });
    expect(await service.evidence("request-1")).toEqual(Buffer.from(bytes));
  });
  it("omits evidence bytes from status and admin list responses", async () => {
    user.findUnique.mockResolvedValue({ accountType: "individual", profileVerifiedAt: null });
    profileVerification.findFirst.mockResolvedValue(null); profileVerification.findMany.mockResolvedValue([]);
    await service.status("user-1"); await service.listAdmin();
    expect(profileVerification.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({ omit: { selfieBytes: true } }));
    expect(profileVerification.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ omit: { selfieBytes: true } }));
  });
});
