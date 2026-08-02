import { DiscoveryService } from "./discovery.service";

describe("DiscoveryService", () => {
  const user = { findUnique: jest.fn(), findMany: jest.fn() };
  const userBlock = { findMany: jest.fn() };
  const event = { findMany: jest.fn() };
  const tag = { findMany: jest.fn() };
  const place = { findMany: jest.fn() };
  const eventParticipant = { findMany: jest.fn() };
  const placeMember = { findMany: jest.fn() };
  const service = new DiscoveryService({ user, userBlock, event, tag, place, eventParticipant, placeMember } as never);
  const member = { id: "11111111-1111-4111-8111-111111111111", name: "Ada", username: "ada", city: "Istanbul", country: "Türkiye", followerCount: 5, createdAt: new Date() };

  beforeEach(() => {
    jest.clearAllMocks();
    user.findUnique.mockResolvedValue({ city: "Istanbul", country: "Türkiye" });
    user.findMany.mockResolvedValue([member]);
    userBlock.findMany.mockResolvedValue([]);
    event.findMany.mockResolvedValue([]);
    tag.findMany.mockResolvedValue([]);
    place.findMany.mockResolvedValue([]);
    eventParticipant.findMany.mockResolvedValue([]);
    placeMember.findMany.mockResolvedValue([]);
  });

  it("builds a personalized feed from the viewer location", async () => {
    const result = await service.feed("viewer-id");
    expect(result.popularMembers[0]).toMatchObject({ kind: "user", title: "Ada" });
    expect(event.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ city: { equals: "Istanbul", mode: "insensitive" } }) }));
  });

  it("excludes users blocked in either direction", async () => {
    userBlock.findMany.mockResolvedValue([{ userId: "viewer-id", targetId: member.id }]);
    await service.feed("viewer-id");
    expect(user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: { notIn: ["viewer-id", member.id] } }) }));
  });

  it("returns unified search results", async () => {
    const result = await service.search("ada");
    expect(result).toMatchObject({ query: "ada", total: 1, items: [{ kind: "user", title: "Ada" }] });
    expect(tag.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }));
  });

  it("includes event and place participation in the unified activity feed", async () => {
    const createdAt = new Date();
    eventParticipant.findMany.mockResolvedValue([{ userId: member.id, createdAt, user: { name: "Ada" }, event: { id: "event-1", title: "Demo Day", slug: "demo-day", summary: "Yeni ürünler", coverImageUrl: null, city: "Istanbul", startsAt: createdAt } }]);
    placeMember.findMany.mockResolvedValue([{ userId: member.id, createdAt, user: { name: "Ada" }, place: { id: "place-1", name: "Hub", slug: "hub", description: "Topluluk alanı", coverImageUrl: null, city: "Istanbul", followerCount: 3 } }]);
    const result = await service.feed("viewer-id");
    expect(result.activities).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "event", action: "Ada etkinliğe katıldı", ownerId: member.id }),
      expect.objectContaining({ kind: "place", action: "Ada mekâna katıldı", ownerId: member.id }),
    ]));
  });
});
