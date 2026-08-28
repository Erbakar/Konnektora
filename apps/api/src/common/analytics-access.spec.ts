import { canUseAdvancedAnalytics, canUseGuestListPlan } from "./analytics-access";

describe("canUseAdvancedAnalytics", () => {
  it.each(["admin", "super_admin", "curator"])("allows the %s role", (role) => {
    expect(canUseAdvancedAnalytics({ role, accountType: "individual", memberPlan: "free", businessPlan: "starter" })).toBe(true);
  });

  it("allows paid individual and corporate plans", () => {
    expect(canUseAdvancedAnalytics({ role: "user", accountType: "individual", memberPlan: "plus", businessPlan: "starter" })).toBe(true);
    expect(canUseAdvancedAnalytics({ role: "user", accountType: "corporate", memberPlan: "free", businessPlan: "growth" })).toBe(true);
  });

  it("keeps free and starter plans outside advanced analytics", () => {
    expect(canUseAdvancedAnalytics({ role: "user", accountType: "individual", memberPlan: "free", businessPlan: "starter" })).toBe(false);
    expect(canUseAdvancedAnalytics({ role: "user", accountType: "corporate", memberPlan: "premium", businessPlan: "starter" })).toBe(false);
  });

  it("reserves custom Guest Lists for privileged roles and paid business plans", () => {
    expect(canUseGuestListPlan({ role: "curator", accountType: "individual", businessPlan: "starter" })).toBe(true);
    expect(canUseGuestListPlan({ role: "user", accountType: "corporate", businessPlan: "growth" })).toBe(true);
    expect(canUseGuestListPlan({ role: "user", accountType: "corporate", businessPlan: "starter" })).toBe(false);
    expect(canUseGuestListPlan({ role: "user", accountType: "individual", businessPlan: "scale" })).toBe(false);
  });
});
