import { describe, expect, it } from "vitest";
import { analyticsSeries } from "../lib/analyticsSeries";

describe("analytics chart data", () => {
  it("keeps money, percentages and overlapping periods out of count and pie charts", () => {
    const result = analyticsSeries({ ticketRevenue: 25800, performanceScore: 84, views: 1200, viewsLast7d: 100, followers: 3, likes: 2, ok: 1, dislikes: 0 });
    expect(result.counts).toEqual([["views", 1200], ["followers", 3]]);
    expect(result.pie).toEqual([["likes", 2], ["ok", 1], ["dislikes", 0]]);
    expect(result.daily).toEqual([]);
  });
  it("orders actual dated samples chronologically and does not invent daily figures from cumulative totals", () => {
    const result = analyticsSeries({ ticketSaleDay_not_a_date: 99, "ticketSaleDay_2026_10_08": 4, "ticketSaleDay_2026-10-01": 9, viewsLast30d: 999 });
    expect(result.daily).toEqual([["2026-10-01", 9], ["2026-10-08", 4]]);
    expect(result.dailyKind).toBe("ticketOrders");
  });
});
