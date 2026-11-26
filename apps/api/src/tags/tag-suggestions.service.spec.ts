import { BadRequestException } from "@nestjs/common";
import { TagSuggestionsService } from "./tag-suggestions.service";

describe("TagSuggestionsService (26/11 #107, #108)", () => {
  const createService = () => {
    const prisma = {
      eventTag: { groupBy: jest.fn().mockResolvedValue([{ tagId: "t1", _count: { tagId: 5 } }, { tagId: "t2", _count: { tagId: 2 } }]) },
      placeTag: { groupBy: jest.fn().mockResolvedValue([{ tagId: "p1", _count: { tagId: 3 } }]) },
    };
    return { service: new TagSuggestionsService(prisma as never), prisma };
  };

  it("etkinlikte seçili formattaki ve başlangıcın 1 aylık dönemindeki en çok kullanılan 10 etiketi döner", async () => {
    const { service, prisma } = createService();
    await expect(service.trendingTagIds({ target: "event", format: "offline", startsAt: "2026-12-15T18:00:00.000Z" })).resolves.toEqual({ tagIds: ["t1", "t2"] });
    const args = prisma.eventTag.groupBy.mock.calls[0][0];
    expect(args.take).toBe(10);
    expect(args.where.event.format).toBe("offline");
    expect(args.where.event.status).toBe("published");
    expect(args.where.event.startsAt.gte.toISOString()).toBe("2026-11-30T18:00:00.000Z");
    expect(args.where.event.startsAt.lte.toISOString()).toBe("2026-12-30T18:00:00.000Z");
    expect(args.orderBy[0]).toEqual({ _count: { tagId: "desc" } });
  });

  it("geçersiz formatı filtreye eklemez", async () => {
    const { service, prisma } = createService();
    await service.trendingTagIds({ target: "event", format: "x" });
    expect(prisma.eventTag.groupBy.mock.calls[0][0].where.event.format).toBeUndefined();
  });

  it("mekânda seçili mekân türündeki aktif mekânların en çok kullanılan 10 etiketini döner", async () => {
    const { service, prisma } = createService();
    await expect(service.trendingTagIds({ target: "place", placeType: "cafes" })).resolves.toEqual({ tagIds: ["p1"] });
    const args = prisma.placeTag.groupBy.mock.calls[0][0];
    expect(args.where.place).toEqual({ status: "active", placeType: "cafes" });
    expect(args.take).toBe(10);
  });

  it("bilinmeyen hedefi reddeder", async () => {
    const { service } = createService();
    await expect(service.trendingTagIds({ target: "user" })).rejects.toBeInstanceOf(BadRequestException);
  });
});
