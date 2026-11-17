import { checkinHeatmapMetrics, dailyCountMetrics, periodInterestMetrics, seriesBucketStarts, spendByPayerTry, timeSeriesMetrics } from "./analytics-extras";

describe("17/11 istatistik yardımcıları", () => {
  // 17 Kasım 2026 Salı 15:30 (Türkiye) = 12:30 UTC
  const now = new Date("2026-11-17T12:30:00.000Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);
  const HOUR = 3_600_000; const DAY = 24 * HOUR;

  it("dönem kovalarını seçili sekmeye göre üretir: 24 saat, 7 gün, 30 gün, 12 ay (#66, #80, #85, #114)", () => {
    const hours = seriesBucketStarts("24h", now);
    expect(hours).toHaveLength(24);
    expect(new Date(hours[23]!).toISOString()).toBe("2026-11-17T12:00:00.000Z");
    expect(new Date(hours[0]!).toISOString()).toBe("2026-11-16T13:00:00.000Z");
    const week = seriesBucketStarts("7d", now);
    expect(week).toHaveLength(7);
    // Günler Türkiye saatine göre başlar (00:00 TSİ = önceki gün 21:00 UTC).
    expect(new Date(week[6]!).toISOString()).toBe("2026-11-16T21:00:00.000Z");
    expect(new Date(week[0]!).toISOString()).toBe("2026-11-10T21:00:00.000Z");
    expect(seriesBucketStarts("30d", now)).toHaveLength(30);
    const months = seriesBucketStarts("12m", now);
    expect(months).toHaveLength(12);
    expect(new Date(months[11]!).toISOString()).toBe("2026-10-31T21:00:00.000Z");
    expect(new Date(months[0]!).toISOString()).toBe("2025-11-30T21:00:00.000Z");
  });

  it("zaman serisinde her ölçümü doğru kovaya yazar ve yalnız dolu kovaları döndürür", () => {
    const result = timeSeriesMetrics({ views: [ago(10 * 60_000), ago(2 * HOUR), ago(2 * DAY), ago(40 * DAY), ago(500 * DAY), null], likes: [] }, now);
    expect(result.tsNow).toBe(Math.floor(now.getTime() / 1000));
    expect(result.ts_views_24h_23).toBe(1);
    expect(result.ts_views_24h_21).toBe(1);
    expect(result.ts_views_7d_6).toBe(2);
    expect(result.ts_views_7d_4).toBe(1);
    expect(result.ts_views_30d_29).toBe(2);
    expect(result.ts_views_30d_27).toBe(1);
    expect(result.ts_views_12m_11).toBe(3);
    expect(result.ts_views_12m_10).toBe(1);
    expect(Object.keys(result).filter((key) => key.startsWith("ts_views_12m_"))).toHaveLength(2);
    expect(Object.keys(result).some((key) => key.startsWith("ts_likes_"))).toBe(false);
    expect(Object.values(result).every((value) => value >= 0)).toBe(true);
  });

  it("günlük görüntülenmeleri UTC gününe göre sayar (#103, #104, #107)", () => {
    expect(dailyCountMetrics("viewsDay", [ago(HOUR), ago(2 * HOUR), ago(3 * DAY), ago(45 * DAY)], now)).toEqual({ viewsDay_2026_11_17: 2, viewsDay_2026_11_14: 1 });
  });

  it("check-in anlarını etkinliğin saat dilimine göre gün × 2 saatlik dilime yazar (#105, #109, #117)", () => {
    const result = checkinHeatmapMetrics([
      { at: new Date("2026-11-13T18:30:00.000Z"), timezone: "Europe/Istanbul" }, // Cuma 21:30 TSİ
      { at: new Date("2026-11-13T18:10:00.000Z"), timezone: "Europe/Istanbul" },
      { at: new Date("2026-11-13T22:30:00.000Z"), timezone: "Europe/Istanbul" }, // Cumartesi 01:30 TSİ
      { at: null },
    ]);
    expect(result).toEqual({ checkinHeat_cum_20: 2, checkinHeat_cmt_0: 1 });
  });

  it("ödemeleri kullanıcı başına TL olarak toplar, iadeleri düşer", async () => {
    const spend = await spendByPayerTry([{ payerId: "u1", grossAmount: "200.00", refundedAmount: "50", currency: "TRY" }, { payerId: "u1", grossAmount: 100, currency: "TRY" }, { payerId: "u2", grossAmount: 80, refundedAmount: 80, currency: "TRY" }]);
    expect([...spend.entries()]).toEqual([["u1", 250]]);
  });

  it("ilgi alanı satırlarında beğenen/kararsız/beğenmeyen sayıları, önceki dönem ve kazandırılan TL'yi üretir (#111–#113)", async () => {
    const findMany = jest.fn()
      .mockResolvedValueOnce([
        { createdAt: ago(2 * DAY), sentiment: "like", tag: { name: "Caz" } },
        { createdAt: ago(3 * DAY), sentiment: "like", tag: { name: "Caz" } },
        { createdAt: ago(4 * DAY), sentiment: "dislike", tag: { name: "Caz" } },
        { createdAt: ago(9 * DAY), sentiment: "like", tag: { name: "Caz" } },
        { createdAt: ago(10 * DAY), sentiment: "ok", tag: { name: "Caz" } },
        { createdAt: ago(20 * DAY), sentiment: "ok", tag: { name: "Sinema" } },
      ])
      .mockResolvedValueOnce([{ userId: "u1", tag: { name: "Caz" } }, { userId: "u2", tag: { name: "Caz" } }, { userId: "u2", tag: { name: "Sinema" } }]);
    const result = await periodInterestMetrics({ userInterestTag: { findMany } } as never, "attendeeInterest", ["u1", "u2", null], { now, spendByUser: new Map([["u1", 300], ["u2", 120.5]]) });
    expect(result).toMatchObject({
      attendeeInterest7d_caz: 3, attendeeInterestLike7d_caz: 2, attendeeInterestDislike7d_caz: 1,
      attendeeInterestLikePrev7d_caz: 1, attendeeInterestOkPrev7d_caz: 1,
      attendeeInterest30d_caz: 5, attendeeInterest30d_sinema: 1, attendeeInterestOk30d_sinema: 1,
      attendeeInterestRevenue_caz: 420.5, attendeeInterestRevenue_sinema: 120.5,
    });
    expect(result.attendeeInterestOk7d_caz).toBeUndefined();
    expect(result.attendeeInterest7d_sinema).toBeUndefined();
  });

  it("sabit etiket listesinde (programı/etiketleri değerlendir) verisi olmayan etiketleri de sıfırla listeler", async () => {
    const findMany = jest.fn().mockResolvedValueOnce([{ createdAt: ago(DAY), sentiment: "like", tag: { name: "Daft Punk" } }, { createdAt: ago(DAY), sentiment: "like", tag: { name: "Başka" } }]);
    const result = await periodInterestMetrics({ userInterestTag: { findMany } } as never, "programInterest", ["u1"], { now, fixedTags: ["Daft Punk", "Tiësto", ""] });
    expect(result).toMatchObject({ programInterest7d_daft_punk: 1, programInterestLike7d_daft_punk: 1, programInterest7d_tiesto: 0, programInterest180d_tiesto: 0 });
    expect(Object.keys(result).some((key) => key.endsWith("_baska"))).toBe(false);
    await expect(periodInterestMetrics({ userInterestTag: { findMany } } as never, "programInterest", ["u1"], { now, fixedTags: [] })).resolves.toEqual({});
  });
});
