import { canUseAdvancedAnalytics, canUseGuestListPlan } from "./analytics-access";

describe("canUseAdvancedAnalytics", () => {
  it.each(["admin", "super_admin", "curator"])("allows the %s role", (role) => {
    expect(canUseAdvancedAnalytics({ role, accountType: "individual", memberPlan: "free", businessPlan: "free" })).toBe(true);
  });

  it("allows paid individual and corporate plans", () => {
    expect(canUseAdvancedAnalytics({ role: "user", accountType: "individual", memberPlan: "premium", businessPlan: "free" })).toBe(true);
    expect(canUseAdvancedAnalytics({ role: "user", accountType: "corporate", memberPlan: "free", businessPlan: "pro" })).toBe(true);
  });

  it("grants Platinum guest lists without granting them to individual Premium", () => {
    expect(canUseGuestListPlan({ role: "user", accountType: "individual", businessPlan: "free", memberPlan: "platinum" })).toBe(true);
    expect(canUseGuestListPlan({ role: "user", accountType: "individual", businessPlan: "free", memberPlan: "premium" })).toBe(false);
    expect(canUseAdvancedAnalytics({ role: "user", accountType: "corporate", businessPlan: "festival", memberPlan: "free" })).toBe(true);
  });

  it("keeps free and starter plans outside advanced analytics", () => {
    expect(canUseAdvancedAnalytics({ role: "user", accountType: "individual", memberPlan: "free", businessPlan: "free" })).toBe(false);
    expect(canUseAdvancedAnalytics({ role: "user", accountType: "corporate", memberPlan: "premium", businessPlan: "free" })).toBe(false);
  });

  it("reserves custom Guest Lists for privileged roles and paid business plans", () => {
    expect(canUseGuestListPlan({ role: "curator", accountType: "individual", businessPlan: "free" })).toBe(true);
    expect(canUseGuestListPlan({ role: "user", accountType: "corporate", businessPlan: "pro" })).toBe(true);
    expect(canUseGuestListPlan({ role: "user", accountType: "corporate", businessPlan: "free" })).toBe(false);
    expect(canUseGuestListPlan({ role: "user", accountType: "individual", businessPlan: "venue" })).toBe(false);
  });
});
