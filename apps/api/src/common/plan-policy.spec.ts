import { limitsFor, planPeriod } from "./plan-policy";

describe("31 day plan policy", () => {
  it("uses elapsed 31-day periods rather than calendar months", () => {
    const anchor = new Date("2026-01-31T10:00:00Z");
    expect(planPeriod(anchor, new Date("2026-03-03T09:59:59Z")).start).toEqual(anchor);
    expect(planPeriod(anchor, new Date("2026-03-03T10:00:00Z")).start).toEqual(new Date("2026-03-03T10:00:00Z"));
  });
  it("grants new plans their documented limits and keeps unknown plans free", () => {
    const user = { role: "user", accountType: "individual", memberPlan: "platinum", businessPlan: "free" };
    expect(limitsFor(user)).toEqual({ events: null, tags: 10, invites: 1000, messages: 100, sixHours: null });
    expect(limitsFor({ ...user, accountType: "corporate", businessPlan: "festival" }).messages).toBe(1000);
    expect(limitsFor({ ...user, memberPlan: "invalid" }).sixHours).toBe(15);
    expect(limitsFor({ ...user, role: "curator" }).messages).toBeNull();
  });
});
