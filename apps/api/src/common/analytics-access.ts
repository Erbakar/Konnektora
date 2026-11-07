import { effectivePlan, PlanUser } from "../plans/plan-runtime";
export function canUseAdvancedAnalytics(user: PlanUser) {
 return ["admin", "super_admin", "curator"].includes(user.role) || effectivePlan(user).definition.advanced;
}
export function canUseGuestListPlan(user: PlanUser) {
 return ["admin", "super_admin", "curator"].includes(user.role) || effectivePlan(user).definition.guest;
}
