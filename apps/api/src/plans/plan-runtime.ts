import { AsyncLocalStorage } from "node:async_hooks";
import { defaultPlanCatalog, PlanCatalog } from "./plan-catalog";
export const planContext = new AsyncLocalStorage<PlanCatalog>();
export const catalog = () => planContext.getStore() ?? defaultPlanCatalog;
export type PlanUser = { role: string; accountType: string; memberPlan?: string; businessPlan: string; planGifts?: unknown };
export function activeGift(user: PlanUser, audience: string, now = Date.now()) {
 const gift = (user.planGifts as Record<string, { plan: string; expiresAt: string }> | null)?.[audience];
 return gift && new Date(gift.expiresAt).getTime() > now && catalog()[audience]?.[gift.plan] ? gift : null;
}
export function effectivePlan(user: PlanUser) {
 const audience = user.accountType === "corporate" ? "corporate" : "individual";
 const key = activeGift(user, audience)?.plan ?? (audience === "corporate" ? user.businessPlan : user.memberPlan ?? "free");
 return { audience, key, definition: catalog()[audience]![key] ?? catalog()[audience]!.free! };
}
