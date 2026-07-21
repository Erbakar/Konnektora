import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { UserStatus } from "@prisma/client";
import { IdentityService } from "./identity.service";

describe("IdentityService", () => {
  const user = { findUnique: jest.fn(), update: jest.fn() };
  const mediaFile = { count: jest.fn() };
  const userInterestTag = { count: jest.fn() };
  const userFollow = { count: jest.fn(), findUnique: jest.fn(), create: jest.fn() };
  const userBlock = { findFirst: jest.fn() };
  const memberScan = { create: jest.fn(), findMany: jest.fn() };
  const prisma = { user, mediaFile, userInterestTag, userFollow, userBlock, memberScan, $transaction: jest.fn(async (fn: any) => fn({ user, userFollow, memberScan })) };
  const jwt = { signAsync: jest.fn(), verifyAsync: jest.fn() };
  const service = new IdentityService(prisma as never, jwt as never);
  const id = "11111111-1111-4111-8111-111111111111";
  const peerId = "22222222-2222-4222-8222-222222222222";

  beforeEach(() => {
    jest.clearAllMocks();
    mediaFile.count.mockResolvedValue(1);
    userInterestTag.count.mockResolvedValue(1);
    userFollow.count.mockResolvedValue(0);
    userBlock.findFirst.mockResolvedValue(null);
    userFollow.findUnique.mockResolvedValue(null);
  });

  it("computes onboarding progress from existing profile domains", async () => {
    user.findUnique.mockResolvedValue({ phoneVerified: true, username: "ada", country: "Türkiye", birthDate: new Date(), onboardingCompletedAt: null });
    await expect(service.onboardingStatus(id)).resolves.toMatchObject({ progress: 80, completed: false, currentStep: { key: "people" } });
  });

  it("requires the mandatory onboarding steps before completion", async () => {
    user.findUnique.mockResolvedValue({ phoneVerified: false, username: null, country: null, birthDate: null, onboardingCompletedAt: null });
    mediaFile.count.mockResolvedValue(0);
    userInterestTag.count.mockResolvedValue(0);
    await expect(service.completeOnboarding(id)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("issues a signed, versioned member pass", async () => {
    user.findUnique.mockResolvedValue({ id, name: "Ada", username: "ada", city: "Istanbul", country: "Türkiye", followerCount: 2, memberPassVersion: 3, status: UserStatus.active });
    jwt.signAsync.mockResolvedValue("signed-token");
    await expect(service.memberPass(id)).resolves.toMatchObject({ version: 3, qrPayload: "konnektora://member?token=signed-token" });
  });

  it("rejects scans across a user block", async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: peerId, purpose: "member-pass", version: 1 });
    user.findUnique.mockResolvedValue({ id: peerId, name: "Peer", username: null, city: null, country: null, followerCount: 0, memberPassVersion: 1, status: UserStatus.active });
    userBlock.findFirst.mockResolvedValue({ userId: id });
    await expect(service.scan(id, { payload: "signed-token-value", method: "qr" })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
