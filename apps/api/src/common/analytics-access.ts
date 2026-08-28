export function canUseAdvancedAnalytics(user: { role: string; accountType: string; businessPlan: string; memberPlan: string }) {
  if (["admin", "super_admin", "curator"].includes(user.role)) return true;
  if (user.accountType === "corporate") return ["growth", "scale"].includes(user.businessPlan);
  return ["plus", "premium"].includes(user.memberPlan);
}

export function canUseGuestListPlan(user: { role: string; accountType: string; businessPlan: string }) {
  if (["admin", "super_admin", "curator"].includes(user.role)) return true;
  return user.accountType === "corporate" && ["growth", "scale"].includes(user.businessPlan);
}
