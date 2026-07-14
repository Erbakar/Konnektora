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
});
