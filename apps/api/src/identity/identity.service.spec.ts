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
  const notifications = { dispatch: jest.fn() };
  const service = new IdentityService(prisma as never, jwt as never, notifications as never);
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

  it.each(["qr", "nfc"] as const)("records a real %s device scan without silently following", async (method) => {
    jwt.verifyAsync.mockResolvedValue({ sub: peerId, purpose: "member-pass", version: 2 });
    user.findUnique.mockResolvedValue({ id: peerId, name: "Peer", username: "peer", city: "Berlin", country: "Germany", followerCount: 4, memberPassVersion: 2, status: UserStatus.active });
    memberScan.create.mockResolvedValue({ id: `scan-${method}`, method, createdAt: new Date() });
    user.update.mockResolvedValue({});
    userFollow.create.mockResolvedValue({});
    const result = await service.scan(id, { payload: "signed-device-token", method });
    expect(result).toMatchObject({ method, following: false, member: { id: peerId } });
    expect(userFollow.create).not.toHaveBeenCalled();
    expect(memberScan.create).toHaveBeenCalledWith({ data: { scannerId: id, memberId: peerId, method } });
    expect(notifications.dispatch).toHaveBeenCalledWith(expect.objectContaining({ userId: peerId, targetId: id, type: "member_scan" }));
  });

  it("rejects a rotated member pass captured by a QR screenshot", async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: peerId, purpose: "member-pass", version: 1 });
    user.findUnique.mockResolvedValue({ id: peerId, name: "Peer", username: "peer", city: null, country: null, followerCount: 0, memberPassVersion: 2, status: UserStatus.active });
    await expect(service.scan(id, { payload: "old-signed-token", method: "qr" })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns new incoming scans so the displayed-card device can open the scanner profile", async () => {
    memberScan.findMany.mockResolvedValue([{
      id: "scan-incoming",
      method: "qr",
      createdAt: new Date("2026-08-28T00:00:02.000Z"),
      scanner: { id: peerId, name: "Peer", username: "peer", city: null, country: null, followerCount: 1 },
    }]);

    await expect(service.incomingScans(id, "2026-08-28T00:00:00.000Z")).resolves.toEqual([
      expect.objectContaining({ id: "scan-incoming", member: expect.objectContaining({ id: peerId }) }),
    ]);
    expect(memberScan.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { memberId: id, createdAt: { gt: new Date("2026-08-28T00:00:00.000Z") } },
    }));
  });
});
