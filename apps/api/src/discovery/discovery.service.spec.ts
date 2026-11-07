import { DiscoveryService } from "./discovery.service";

describe("DiscoveryService", () => {
  const user = { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() };
  const userBlock = { findMany: jest.fn() };
  const event = { findMany: jest.fn() };
  const tag = { findMany: jest.fn() };
  const place = { findMany: jest.fn() };
  const eventParticipant = { findMany: jest.fn() };
  const placeMember = { findMany: jest.fn() };
  const contentComment = { findMany: jest.fn().mockResolvedValue([]) };
  const mediaFile = { findMany: jest.fn().mockResolvedValue([]) };
  const userInterestTag = { findMany: jest.fn().mockResolvedValue([]) };
  const service = new DiscoveryService({ eventRevision: { findMany: jest.fn().mockResolvedValue([]) }, contentComment, mediaFile, userInterestTag, user, userBlock, event, tag, place, eventParticipant, placeMember } as never);
  const member = { id: "11111111-1111-4111-8111-111111111111", name: "Ada", username: "ada", city: "Istanbul", country: "Türkiye", followerCount: 5, createdAt: new Date() };

  beforeEach(() => {
    jest.clearAllMocks();
    user.findUnique.mockResolvedValue({ city: "Istanbul", country: "Türkiye" });
    user.findMany.mockResolvedValue([member]);
    user.count.mockResolvedValue(3);
    userBlock.findMany.mockResolvedValue([]);
    event.findMany.mockResolvedValue([]);
    tag.findMany.mockResolvedValue([]);
    place.findMany.mockResolvedValue([]);
    eventParticipant.findMany.mockResolvedValue([]);
    placeMember.findMany.mockResolvedValue([]);
  });

  it("builds a personalized feed from the viewer location", async () => {
    const result = await service.feed("viewer-id");
    expect(result.popularMembers[0]).toMatchObject({ kind: "user", title: "@ada", subtitle: "Ada" });
    expect(event.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ city: { equals: "Istanbul", mode: "insensitive" } }) }));
    expect(result.activeUserCount).toBe(3);
  });

  it("removes location constraints for the global trend scope", async () => {
    await service.feed("viewer-id", { scope: "global" });
    expect(tag.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: "active" } }));
    expect(event.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.not.objectContaining({ city: expect.anything() }) }));
  });

  it("excludes users blocked in either direction", async () => {
    userBlock.findMany.mockResolvedValue([{ userId: "viewer-id", targetId: member.id }]);
    await service.feed("viewer-id");
    expect(user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: { notIn: [member.id] } }) }));
  });

  it("returns unified search results", async () => {
    const result = await service.search("ada");
    expect(result).toMatchObject({ query: "ada", total: 1, items: [{ kind: "user", title: "@ada", subtitle: "Ada" }] });
    expect(tag.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }));
  });

  it("groups unregistered participants without leaking their phone, email or identity", async () => {
    const joinedAt = new Date();
    eventParticipant.findMany.mockResolvedValue([{ userId: "invited-1", createdAt: joinedAt, user: { status: "invited", name: "+905551234567" }, event: { id: "event-1", title: "Konser", slug: "konser", startsAt: joinedAt } }]);
    const result = await service.feed("viewer-id");
    expect(result.hiddenParticipantCount).toBe(1);
    expect(JSON.stringify(result)).not.toContain("+905551234567");
    expect(JSON.stringify(result.activities)).not.toContain("invited-1");
  });

  it("includes event and place participation in the unified activity feed", async () => {
    const createdAt = new Date();
    eventParticipant.findMany.mockResolvedValue([{ userId: member.id, createdAt, user: { name: "Ada" }, event: { id: "event-1", title: "Demo Day", slug: "demo-day", summary: "Yeni ürünler", coverImageUrl: null, city: "Istanbul", startsAt: createdAt } }]);
    placeMember.findMany.mockResolvedValue([{ userId: member.id, createdAt, user: { name: "Ada" }, place: { id: "place-1", name: "Hub", slug: "hub", description: "Topluluk alanı", coverImageUrl: null, city: "Istanbul", followerCount: 3 } }]);
    const result = await service.feed("viewer-id");
    expect(result.activities).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "event", action: "Etkinliğe katıldı", ownerId: member.id }),
      expect.objectContaining({ kind: "place", action: "Mekâna katıldı", ownerId: member.id }),
    ]));
  });
});
