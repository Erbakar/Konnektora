import { comparableValue, formatChangeMessage, formatNotificationAddress, notifyEntityChanges } from "./activity-events";

function fakeDb({ participants = [] as string[], subscribers = [] as string[], tickets = [] as string[] } = {}) {
  const created: any[] = [];
  const db: any = {
    eventParticipant: { findMany: jest.fn().mockResolvedValue(participants.map((userId) => ({ userId }))) },
    placeMember: { findMany: jest.fn().mockResolvedValue(participants.map((userId) => ({ userId }))) },
    contentNotificationSubscription: { findMany: jest.fn().mockResolvedValue(subscribers.map((userId) => ({ userId }))) },
    ownedEventTicket: { findMany: jest.fn().mockResolvedValue(tickets.map((ownerId) => ({ ownerId }))) },
    userBlock: { findFirst: jest.fn().mockResolvedValue(null) },
    event: { findFirst: jest.fn().mockResolvedValue({ id: "e1" }) },
    place: { findFirst: jest.fn().mockResolvedValue({ id: "p1" }), findUnique: jest.fn().mockResolvedValue(null) },
    notification: { createMany: jest.fn(async ({ data }) => { created.push(...data); }) },
  };
  return { db, created };
}

const baseEvent = { id: "e1", slug: "konser", title: "Konser", format: "offline", locationName: "Salon", locationAddress: "İstiklal Cd. 1", city: "Beyoğlu", region: "Istanbul", postalCode: null, country: "Türkiye", startsAt: new Date("2026-12-01T17:00:00Z"), endsAt: null, timezone: "Europe/Istanbul", liveUrl: "https://live.example.com/x", updatedAt: new Date("2026-11-26T10:00:00Z") };

describe("notifyEntityChanges", () => {
  it("treats Istanbul/İstanbul and 'X Province' as the same value (26/11 #96)", async () => {
    expect(comparableValue("Istanbul")).toBe(comparableValue("İstanbul"));
    expect(comparableValue("Adıyaman Province")).toBe(comparableValue("Adiyaman"));
    const { db, created } = fakeDb({ participants: ["u1"] });
    await notifyEntityChanges(db, "event", baseEvent, { ...baseEvent, region: "İstanbul", updatedAt: new Date() });
    expect(created).toHaveLength(0);
  });

  it("ignores a province moved from city to region on legacy records", async () => {
    const { db, created } = fakeDb({ participants: ["u1"] });
    await notifyEntityChanges(db, "event", { ...baseEvent, city: "Istanbul", region: null }, { ...baseEvent, city: null, region: "İstanbul" });
    expect(created).toHaveLength(0);
  });

  it("sends a single combined address notification for events (26/11 #97)", async () => {
    const { db, created } = fakeDb({ participants: ["u1"] });
    await notifyEntityChanges(db, "event", baseEvent, { ...baseEvent, locationName: "Yeni Salon", city: "Kadıköy", postalCode: "34710" });
    expect(created).toHaveLength(1);
    expect(created[0].title).toBe("Etkinlik adresi değiştirildi");
    expect(created[0].body).toBe("Eski adresi “Salon, İstiklal Cd. 1, Beyoğlu, Istanbul ve Türkiye” olan etkinliğin yeni adresi “Yeni Salon, İstiklal Cd. 1, Kadıköy, Istanbul, 34710 ve Türkiye” olarak değiştirildi. Biletiniz var ve iade etmek isterseniz Biletlerim sayfasını ziyaret ediniz.");
  });

  it("sends a single combined address notification for places (26/11 #112)", async () => {
    const { db, created } = fakeDb({ participants: ["u1"] });
    const place = { id: "p1", name: "Mekân", address: "Cadde 1", city: "Mitte", region: "Berlin", postalCode: "10115", country: "Germany", updatedAt: new Date() };
    await notifyEntityChanges(db, "place", place, { ...place, address: "Cadde 2", region: "Brandenburg" });
    expect(created).toHaveLength(1);
    expect(created[0].title).toBe("Mekân adresi değiştirildi");
    expect(created[0].body).toBe("Eski adresi “Cadde 1, Mitte, 10115, Berlin ve Germany” olan mekânın yeni adresi “Cadde 2, Mitte, 10115, Brandenburg ve Germany” olarak değiştirildi.");
  });

  it("notifies only subscribers when an in-person event becomes hybrid (26/11 #98)", async () => {
    const { db, created } = fakeDb({ participants: ["p"], subscribers: ["s"] });
    await notifyEntityChanges(db, "event", baseEvent, { ...baseEvent, format: "hybrid" });
    expect(created.map((row) => row.userId)).toEqual(["s"]);
    expect(created[0].body).toContain("canlı yayın da eklendi");
    expect(created[0].context).toMatchObject({ targetLabel: "Canlı yayın URL'si", targetUrl: "https://live.example.com/x" });
  });

  it.each([["offline", "online", "çevrim içine dönüştürüldü"], ["online", "offline", "artık sadece yüz yüze"], ["online", "hybrid", "yüz yüze de katılabilirsiniz"]])("notifies subscribers and participants for %s → %s (26/11 #99-#101)", async (from, to, text) => {
    const { db, created } = fakeDb({ participants: ["p"], subscribers: ["s"], tickets: ["t"] });
    await notifyEntityChanges(db, "event", { ...baseEvent, format: from }, { ...baseEvent, format: to });
    expect(created.map((row) => row.userId).sort()).toEqual(["p", "s", "t"]);
    expect(created[0].title).toBe("Etkinlik formatı değiştirildi");
    expect(created[0].body).toContain(text);
  });

  it("formats addresses and format messages", () => {
    expect(formatNotificationAddress({})).toBe("Belirtilmemiş");
    expect(formatChangeMessage("hybrid", "offline")).toBeNull();
  });
});
