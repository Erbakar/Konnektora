import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { SocialService } from "./social.service";

describe("SocialService", () => {
  const createService = () => {
    const prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 })
      },
      userFollow: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn()
      },
      userBlock: { findMany: jest.fn(), findFirst: jest.fn() },
      userInterestTag: { findMany: jest.fn() },
      $transaction: jest.fn().mockImplementation((operations: unknown[]) => Promise.all(operations))
    };
    return { service: new SocialService(prisma as never), prisma };
  };

  it("prevents self-following", async () => {
    const { service } = createService();
    await expect(service.follow("user-1", "user-1")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("creates a private follow and updates aggregate counts", async () => {
    const { service, prisma } = createService();
    prisma.user.findFirst.mockResolvedValue({ id: "user-2" });
    prisma.userFollow.findUnique.mockResolvedValue(null);
    prisma.userBlock.findFirst.mockResolvedValue(null);

    await expect(service.follow("user-1", "user-2")).resolves.toEqual({ ok: true, following: true });
    expect(prisma.userFollow.create).toHaveBeenCalledWith({ data: { followerId: "user-1", followingId: "user-2" } });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("does not allow following across a block", async () => {
    const { service, prisma } = createService();
    prisma.user.findFirst.mockResolvedValue({ id: "user-2" });
    prisma.userFollow.findUnique.mockResolvedValue(null);
    prisma.userBlock.findFirst.mockResolvedValue({ userId: "user-2" });

    await expect(service.follow("user-1", "user-2")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("ranks suggestions by common tags before follower count", async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({ interestTags: [{ tagId: "tag-a" }, { tagId: "tag-b" }] });
    prisma.userFollow.findMany.mockResolvedValue([]);
    prisma.userBlock.findMany.mockResolvedValue([]);
    prisma.user.findMany.mockResolvedValue([
      { id: "user-2", name: "Popular", username: null, accountType: "individual", city: null, country: null, followerCount: 100, interestTags: [] },
      { id: "user-3", name: "Similar", username: "similar", accountType: "individual", city: null, country: null, followerCount: 2, interestTags: [{ tagId: "tag-a" }] }
    ]);

    const suggestions = await service.suggestions("user-1");
    expect(suggestions.map((item) => item.id)).toEqual(["user-3", "user-2"]);
  });

  it("lists the latest 200 active members while excluding blocks and preserving relationship context", async () => {
    const { service, prisma } = createService();
    prisma.userInterestTag.findMany.mockResolvedValue([{ tagId: "tag-a" }]);
    prisma.userFollow.findMany.mockResolvedValue([{ followingId: "user-2" }]);
    prisma.userBlock.findMany
      .mockResolvedValueOnce([{ targetId: "blocked-user" }])
      .mockResolvedValueOnce([{ userId: "blocked-by-user" }]);
    prisma.user.findMany.mockResolvedValue([
      {
        id: "user-2",
        name: "Ada",
        username: "ada",
        accountType: "individual",
        city: "İstanbul",
        country: "Türkiye",
        followerCount: 88,
        gender: "female",
        birthDate: new Date("1992-03-14T00:00:00.000Z"),
        createdAt: new Date("2026-08-28T02:00:00.000Z"),
        privacySettings: { demographicsAudience: "everybody" },
        interestTags: [{ tagId: "tag-a" }],
      },
    ]);

    await expect(service.newMembers("viewer-1")).resolves.toEqual([
      expect.objectContaining({
        id: "user-2",
        username: "ada",
        following: true,
        commonTagCount: 1,
        gender: "female",
      }),
    ]);
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        status: "active",
        role: "user",
        id: { notIn: ["blocked-user", "blocked-by-user"] },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }));
  });
});
