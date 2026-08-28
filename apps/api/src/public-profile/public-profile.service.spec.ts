import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { PublicProfileService } from "./public-profile.service";

describe("PublicProfileService", () => {
  const user = { findFirst: jest.fn(), findUnique: jest.fn() };
  const userBlock = { findFirst: jest.fn() };
  const userFollow = { findMany: jest.fn(), findFirst: jest.fn() };
  const userInterestTag = { findMany: jest.fn() };
  const mediaFile = { findMany: jest.fn() };
  const event = { findMany: jest.fn() };
  const place = { findMany: jest.fn() };
  const contentComment = { groupBy: jest.fn(), findMany: jest.fn(), count: jest.fn() };
  const contentReaction = { findMany: jest.fn() };
  const contentView = { count: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() };
  const contentShare = { groupBy: jest.fn() };
  const contentAction = { groupBy: jest.fn() };
  const privateMessage = { count: jest.fn() };
  const memberScan = { count: jest.fn() };
  const service = new PublicProfileService({ user, userBlock, userFollow, userInterestTag, mediaFile, event, place, contentComment, contentReaction, contentView, contentShare, contentAction, privateMessage, memberScan } as never);
  const ownerId = "11111111-1111-4111-8111-111111111111";
  const viewerId = "22222222-2222-4222-8222-222222222222";
  const tag = { id: "33333333-3333-4333-8333-333333333333", name: "AI", slug: "ai", description: null, categoryId: null, status: "active", usageCount: 2 };
  const profile = { id: ownerId, name: "Ada", username: "ada", accountType: "individual", website: null, city: "Istanbul", country: "Türkiye", followerCount: 4, followingCount: 2, createdAt: new Date(), privacySettings: { messageAudience: "everybody", eventAudience: "everybody", placeAudience: "everybody" }, interestTags: [{ tagId: tag.id, tag, sentiment: "like", createdAt: new Date() }] };

  beforeEach(() => {
    jest.clearAllMocks();
    user.findFirst.mockResolvedValue(profile);
    user.findUnique.mockResolvedValue({ city: "Istanbul", country: "Türkiye" });
    userBlock.findFirst.mockResolvedValue(null);
    userFollow.findMany.mockResolvedValue([]);
    userFollow.findFirst.mockResolvedValue(null);
    userInterestTag.findMany.mockResolvedValue([{ tagId: tag.id, sentiment: "like" }]);
    mediaFile.findMany.mockResolvedValue([]);
    event.findMany.mockResolvedValue([]);
    place.findMany.mockResolvedValue([]);
    contentComment.groupBy.mockResolvedValue([]);
    contentComment.findMany.mockResolvedValue([]);
    contentReaction.findMany.mockResolvedValue([]);
    contentView.count.mockResolvedValue(0);
    contentView.findMany.mockResolvedValue([]);
    contentView.groupBy.mockResolvedValue([]);
    contentShare.groupBy.mockResolvedValue([]);
    contentAction.groupBy.mockResolvedValue([]);
    contentComment.count.mockResolvedValue(0);
    privateMessage.count.mockResolvedValue(0);
    memberScan.count.mockResolvedValue(0);
  });

  it("returns public identity and common interests", async () => {
    await expect(service.getByUsername("ada", viewerId)).resolves.toMatchObject({ username: "ada", commonInterestCount: 1, interests: [{ common: true }] });
  });

  it("opens a profile by user id when no username is available", async () => {
    user.findFirst.mockResolvedValue({ ...profile, username: null });
    await expect(service.getById(ownerId, viewerId)).resolves.toMatchObject({ id: ownerId, username: ownerId });
    expect(user.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: ownerId }) }));
  });

  it("rejects a profile when its owner blocked the viewer", async () => {
    userBlock.findFirst.mockResolvedValue({ userId: ownerId });
    await expect(service.getByUsername("ada", viewerId)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("keeps the profile reachable so the viewer can remove their own block", async () => {
    userBlock.findFirst.mockResolvedValue({ userId: viewerId });
    await expect(service.getByUsername("ada", viewerId)).resolves.toMatchObject({
      relationship: { blockedByViewer: true, canMessage: false },
    });
  });

  it("hides owner content when the audience is following-only", async () => {
    user.findFirst.mockResolvedValue({ ...profile, privacySettings: { messageAudience: "following", eventAudience: "following", placeAudience: "following" } });
    const result = await service.getByUsername("ada", viewerId);
    expect(result.relationship.canMessage).toBe(false);
    expect(event.findMany).not.toHaveBeenCalled();
    expect(place.findMany).not.toHaveBeenCalled();
  });

  it("returns not found for inactive or missing usernames", async () => {
    user.findFirst.mockResolvedValue(null);
    await expect(service.getByUsername("missing")).rejects.toBeInstanceOf(NotFoundException);
  });
});
