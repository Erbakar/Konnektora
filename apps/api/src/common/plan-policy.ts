import { activeGift, catalog, effectivePlan, PlanUser } from "../plans/plan-runtime";
export const PLAN_PERIOD_MS = 31 * 24 * 60 * 60 * 1000;
export function limitsFor(user: PlanUser) {
  if (["admin", "super_admin", "curator"].includes(user.role)) return { events: null, tags: null, invites: null, messages: null, sixHours: null };
  const { events, tags, invites, messages, sixHours } = effectivePlan(user).definition;
  const researcher = activeGift(user, "researcher");
  const researchTags = researcher ? catalog().researcher![researcher.plan]!.tags : 0;
  return { events, tags: tags === null || researchTags === null ? null : Math.max(tags, researchTags), invites, messages, sixHours };
}

export function planPeriod(anchor: Date, now = new Date()) {
  const start = anchor.getTime() > now.getTime() ? now.getTime() : anchor.getTime() + Math.floor((now.getTime() - anchor.getTime()) / PLAN_PERIOD_MS) * PLAN_PERIOD_MS;
  return { start: new Date(start), end: new Date(start + PLAN_PERIOD_MS) };
}
