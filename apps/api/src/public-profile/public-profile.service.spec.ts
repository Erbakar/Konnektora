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
  const contentShare = { groupBy: jest.fn(), count: jest.fn().mockResolvedValue(0) };
  const contentAction = { groupBy: jest.fn() };
  const privateMessage = { count: jest.fn() };
  const memberScan = { count: jest.fn() };
  const postComment = { findMany: jest.fn() };
  const postLike = { findMany: jest.fn() };
  const paymentTransaction = { findMany: jest.fn() };
  const contentNotificationSubscription = { count: jest.fn().mockResolvedValue(2) };
  const service = new PublicProfileService({ user, userBlock, userFollow, userInterestTag, mediaFile, event, place, contentComment, contentReaction, contentView, contentShare, contentAction, privateMessage, memberScan, postComment, postLike, paymentTransaction, contentNotificationSubscription } as never);
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
    postComment.findMany.mockResolvedValue([]);
    postLike.findMany.mockResolvedValue([]);
    paymentTransaction.findMany.mockResolvedValue([]);
  });

  it("profil istatistiklerinde zaman serisi, günlük görüntülenme, popüler etkinlikler ve check-in ısı haritası üretir (17/11 #85, #107, #108, #109, #113)", async () => {
    const recent = new Date(); // saat başından sonraki ilk dakikalarda da son saat kovasına düşsün
    const lastWeek = new Date(Date.now() - 6 * 86_400_000);
    const owned = (title: string, attendees: number, capacity: number) => ({ id: title, title, startsAt: lastWeek, timezone: "Europe/Istanbul", capacity: null, lineup: [{ title: "Daft Punk" }], tags: [{ tag: { name: "Elektronik", status: "active" } }], participants: Array.from({ length: attendees }, (_, index) => ({ status: "attended", userId: `${title}-${index}`, checkedInAt: new Date("2026-11-13T18:30:00.000Z") })), ticketTypeRecords: [{ soldCount: attendees, capacity }], payments: [], ticketRefunds: [] });
    event.findMany.mockImplementation(async (query: { where: { createdById?: string } }) => query.where.createdById ? [owned("Caz Gecesi", 3, 50), owned("Açılış", 5, 20)] : []);
    contentView.findMany.mockResolvedValue([{ createdAt: recent, userId: viewerId, user: null }]);
    userFollow.findMany.mockImplementation(async (query: { where: { followingId?: string }; select?: { createdAt?: boolean } }) => query.where.followingId === ownerId && query.select?.createdAt ? [{ createdAt: recent, followerId: viewerId, follower: { birthDate: null, gender: null, city: null, country: null, preferredLanguage: null, interestTags: [] } }] : []);
    postComment.findMany.mockResolvedValue([{ createdAt: recent }]);
    postLike.findMany.mockResolvedValue([{ createdAt: recent }, { createdAt: recent }]);
    contentComment.findMany.mockResolvedValue([{ id: "c1" }]);
    contentReaction.findMany.mockImplementation(async (query: { where: { reaction?: unknown } }) => query.where.reaction === "like" ? [{ createdAt: recent }] : []);
    contentShare.count.mockResolvedValue(0);
    userInterestTag.findMany.mockResolvedValue([]);
    const result = await service.getById(ownerId, viewerId, "admin");
    const stats = result.stats as Record<string, number>;
    expect(stats).toMatchObject({ ts_views_24h_23: 1, ts_followers_7d_6: 1, ts_postEngagement_30d_29: 3, ts_commentLikes_12m_11: 1 });
    expect(Object.keys(stats).filter((key) => key.startsWith("viewsDay_"))).toHaveLength(1);
    expect(stats).toMatchObject({ popularAttendees1m_acilis: 5, popularAttendees1m_caz_gecesi: 3, popularCapacity12m_caz_gecesi: 50, popularCapacity3m_acilis: 20 });
    expect(stats).toMatchObject({ checkinHeat_cum_20: 8, eventProgramInterest7d_daft_punk: 0, eventProgramInterest30d_elektronik: 0 });
    expect(stats.notificationSubscribers).toBe(2); // 26/11 #121
    expect(Object.keys(stats).some((key) => key.startsWith("density_"))).toBe(true);
    expect(Object.values(stats).every((value) => typeof value === "number" && value >= 0)).toBe(true);
    userFollow.findMany.mockResolvedValue([]);
    event.findMany.mockResolvedValue([]);
  });

  it("returns public identity and common interests", async () => {
    await expect(service.getByUsername("ada", viewerId)).resolves.toMatchObject({ username: "ada", commonInterestCount: 1, interests: [{ common: true }] });
  });

  it("never queries or exposes shared following in mutualism", async () => {
    const result = await service.getByUsername("ada", viewerId);
    expect(result.mutualism?.people).toEqual([]);
    expect(result.mutualism?.explanation).not.toMatch(/takip/);
    expect(result.mutualism?.actions.join(" ")).not.toMatch(/ortak bağlant/);
    for (const [query] of userFollow.findMany.mock.calls) {
      expect(query.where.followerId).not.toEqual({ in: [viewerId, ownerId] });
    }
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
