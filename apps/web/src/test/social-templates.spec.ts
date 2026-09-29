import { describe, expect, it } from "vitest";
import type { Event } from "@konnektora/shared";
import { formatWeeklyEventTime, getCurrentWeekWindow, groupWeeklyEvents } from "../lib/socialTemplates";

describe("Instagram etkinlik şablonları", () => {
  it("aynı gün süren etkinliği gün ve saat aralığıyla biçimler", () => {
    expect(formatWeeklyEventTime({
      startsAt: "2026-10-02T10:00:00.000Z",
      endsAt: "2026-10-02T12:00:00.000Z",
      timezone: "Europe/Istanbul",
    }, "tr")).toBe("Cuma, 13:00 - 15:00");
  });

  it("birden fazla güne yayılan etkinlikte iki günü de gösterir", () => {
    expect(formatWeeklyEventTime({
      startsAt: "2026-10-02T10:00:00.000Z",
      endsAt: "2026-10-04T12:00:00.000Z",
      timezone: "Europe/Istanbul",
    }, "tr")).toBe("Cuma 13:00 - Pazar 15:00");
  });

  it("haftalık aralığı pazartesiden pazara kurar", () => {
    const window = getCurrentWeekWindow(new Date("2026-09-29T12:00:00+03:00"));
    expect(new Date(window.dateFrom).getTime()).toBe(window.start.getTime());
    expect(new Date(window.dateTo).getTime()).toBe(window.endExclusive.getTime() - 1);
    expect(window.start.getDay()).toBe(1);
    expect(window.end.getDay()).toBe(0);
  });

  it("etkinlikleri mümkün olduğunda slayt başına dört veya beş kart olarak dengeler", () => {
    const events = Array.from({ length: 12 }, (_, index) => ({ id: String(index) })) as unknown as Event[];
    expect(groupWeeklyEvents(events.slice(0, 8)).map((group) => group.length)).toEqual([4, 4]);
    expect(groupWeeklyEvents(events.slice(0, 9)).map((group) => group.length)).toEqual([5, 4]);
    expect(groupWeeklyEvents(events).map((group) => group.length)).toEqual([4, 4, 4]);
  });
});
