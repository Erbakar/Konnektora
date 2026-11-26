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
    expect(event.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ OR: expect.arrayContaining([{ city: { equals: "Istanbul", mode: "insensitive" } }, { region: { equals: "İstanbul", mode: "insensitive" } }]) }) }));
    expect(result.activeUserCount).toBe(3);
  });

  it("17/10 #14: keeps hidden events out of the feed and search unless the viewer may see them", async () => {
    const hiddenAccess = { OR: [{ visibility: { not: "hidden" } }, { createdById: "viewer-id" }, { participants: { some: { userId: "viewer-id", status: { not: "banned" } } } }, { invitations: { some: { inviteeId: "viewer-id" } } }, { ownedTickets: { some: { ownerId: "viewer-id" } } }] };
    await service.feed("viewer-id");
    expect(event.findMany.mock.calls.length).toBeGreaterThan(0);
    // Her etkinlik sorgusu ya gizli filtresini taşır ya da zaten yalnız "open" + izleyicinin kendi etkinlikleriyle sınırlıdır.
    for (const [args] of event.findMany.mock.calls) {
      if (JSON.stringify(args.where).includes('"visibility":"open"')) continue;
      expect(args.where.AND).toEqual([hiddenAccess]);
    }
    expect(eventParticipant.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ event: expect.objectContaining({ AND: [hiddenAccess] }) }) }));
    event.findMany.mockClear();
    await service.search("gizli");
    expect(event.findMany.mock.calls[0][0].where.AND).toEqual([{ OR: [{ visibility: { not: "hidden" } }] }]);
    event.findMany.mockClear();
    user.findUnique.mockResolvedValue({ city: "Istanbul", country: "Türkiye", role: "curator" });
    await service.search("gizli", "viewer-id");
    expect(event.findMany.mock.calls[0][0].where.AND).toEqual([{}]);
  });

  it("26/09 #2: nearby event cards show the venue name and fall back to the city", async () => {
    const base = { summary: "s", coverImageUrl: null, startsAt: new Date("2027-01-01T18:00:00Z"), tags: [] };
    event.findMany.mockResolvedValueOnce([
      { ...base, id: "1", title: "Venue", slug: "venue", city: "Kadıköy", place: { name: "Moda Sahnesi", slug: "moda" }, locationName: "Eski ad" },
      { ...base, id: "2", title: "Named", slug: "named", city: "Kadıköy", place: null, locationName: "Sahil" },
      { ...base, id: "3", title: "City", slug: "city", city: "Kadıköy", place: null, locationName: null },
      { ...base, id: "4", title: "Online", slug: "online", city: null, place: null, locationName: null },
    ]);
    const result = await service.feed("viewer-id");
    expect(result.localEvents.map((item) => item.meta?.split(" · ")[0])).toEqual(["Moda Sahnesi", "Sahil", "Kadıköy", "Online"]);
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

  it("26/11 #82: finds curator members and returns location fields for events and places", async () => {
    event.findMany.mockResolvedValue([{ id: "e1", title: "Caz", slug: "caz", summary: "", coverImageUrl: null, city: "Kadıköy", region: "İstanbul", country: "Türkiye", format: "hybrid", locationName: null, place: { name: "Moda Sahnesi", slug: "moda" }, startsAt: new Date(), tags: [] }]);
    place.findMany.mockResolvedValue([{ id: "p1", name: "Moda Sahnesi", slug: "moda", description: null, coverImageUrl: null, city: "Kadıköy", region: "İstanbul", country: "Türkiye", followerCount: 1, tags: [] }]);
    const result = await service.search("aylin");
    expect(user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ role: { in: ["user", "curator"] } }) }));
    expect(result.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "event", eventFormat: "hybrid", venueName: "Moda Sahnesi", city: "Kadıköy", region: "İstanbul", country: "Türkiye" }),
      expect.objectContaining({ kind: "place", city: "Kadıköy", region: "İstanbul", country: "Türkiye" }),
    ]));
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
