import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { PublicProfileService } from "./public-profile.service";

describe("PublicProfileService", () => {
  const user = { findFirst: jest.fn() };
  const userBlock = { findFirst: jest.fn() };
  const userFollow = { findMany: jest.fn(), findFirst: jest.fn() };
  const userInterestTag = { findMany: jest.fn() };
  const mediaFile = { findMany: jest.fn() };
  const event = { findMany: jest.fn() };
  const place = { findMany: jest.fn() };
  const service = new PublicProfileService({ user, userBlock, userFollow, userInterestTag, mediaFile, event, place } as never);
  const ownerId = "11111111-1111-4111-8111-111111111111";
  const viewerId = "22222222-2222-4222-8222-222222222222";
  const tag = { id: "33333333-3333-4333-8333-333333333333", name: "AI", slug: "ai", description: null, categoryId: null, status: "active", usageCount: 2 };
  const profile = { id: ownerId, name: "Ada", username: "ada", accountType: "individual", website: null, city: "Istanbul", country: "Türkiye", followerCount: 4, followingCount: 2, createdAt: new Date(), privacySettings: { messageAudience: "everybody", eventAudience: "everybody", placeAudience: "everybody" }, interestTags: [{ tagId: tag.id, tag, sentiment: "like", createdAt: new Date() }] };

  beforeEach(() => {
    jest.clearAllMocks();
    user.findFirst.mockResolvedValue(profile);
    userBlock.findFirst.mockResolvedValue(null);
    userFollow.findMany.mockResolvedValue([]);
    userFollow.findFirst.mockResolvedValue(null);
    userInterestTag.findMany.mockResolvedValue([{ tagId: tag.id }]);
    mediaFile.findMany.mockResolvedValue([]);
    event.findMany.mockResolvedValue([]);
    place.findMany.mockResolvedValue([]);
  });

  it("returns public identity and common interests", async () => {
    await expect(service.getByUsername("ada", viewerId)).resolves.toMatchObject({ username: "ada", commonInterestCount: 1, interests: [{ common: true }] });
  });

  it("opens a profile by user id when no username is available", async () => {
    user.findFirst.mockResolvedValue({ ...profile, username: null });
    await expect(service.getById(ownerId, viewerId)).resolves.toMatchObject({ id: ownerId, username: ownerId });
    expect(user.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: ownerId }) }));
  });

  it("rejects profiles blocked in either direction", async () => {
    userBlock.findFirst.mockResolvedValue({ userId: ownerId });
    await expect(service.getByUsername("ada", viewerId)).rejects.toBeInstanceOf(ForbiddenException);
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
