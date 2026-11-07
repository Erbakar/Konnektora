import { effectivePlan } from "../plans/plan-runtime";
import { ForbiddenException } from "@nestjs/common";
import { Prisma, User } from "@prisma/client";
import { limitsFor, planPeriod } from "./plan-policy";

export async function quotaLock(tx: Prisma.TransactionClient, key: string) {
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
}
// Account creation is a stable anchor: changing or downgrading a plan cannot reset usage.
export async function consumeQuota(tx: Prisma.TransactionClient, user: Pick<User, "id" | "role" | "accountType" | "memberPlan" | "businessPlan" | "createdAt" | "planGifts">, kind: "event" | "tag" | "invite" | "profile", targetId: string, scope = "") {
  const limit = kind === "profile" ? (["admin", "super_admin", "curator"].includes(user.role) ? null : effectivePlan(user).definition.profileViews) : kind === "event" ? limitsFor(user).events : kind === "tag" ? limitsFor(user).tags : limitsFor(user).invites;
  await quotaLock(tx, `quota:${kind}:${user.id}:${scope}`);
  const period = planPeriod(user.createdAt);
  const uniqueScope = (kind === "tag" || kind === "profile") ? period.start.toISOString() : scope;
  const existing = await tx.planUsage.findUnique({ where: { userId_kind_scope_targetId: { userId: user.id, kind, scope: uniqueScope, targetId } } });
  if (existing) {
    if (kind === "profile" && existing.createdAt.getTime() < Date.now() - 5 * 60 * 1000) throw new ForbiddenException("İstatistik oturumu sona erdi. Sayfayı yeniden açın.");
    return;
  }
  const used = await tx.planUsage.count({ where: { userId: user.id, kind, ...(kind === "invite" ? { scope } : { createdAt: { gte: period.start, lt: period.end } }) } });
  if (limit !== null && used >= limit) throw new ForbiddenException(kind === "invite" ? `Bu etkinliğin ${limit} kişilik yönetici davet kotası doldu.` : `${kind === "event" ? "Etkinlik oluşturma" : kind === "profile" ? "Profil istatistiği" : "Farklı etiket analizi"} kotanız (${limit}) doldu. Yeni dönem: ${period.end.toLocaleDateString("tr-TR")}.`);
  await tx.planUsage.create({ data: { userId: user.id, kind, scope: uniqueScope, targetId } });
}
export function paidCorporateEvent(user: Pick<User, "accountType">, event: { price: unknown; ticketTypes?: unknown }) {
  if (user.accountType !== "corporate") return false;
  const tickets = Array.isArray(event.ticketTypes) ? event.ticketTypes as Array<{ price?: number; status?: string }> : [];
  const active = tickets.filter(t => t.status !== "inactive");
  return active.length ? active.every(t => Number(t.price) > 0) : Number(event.price) > 0;
}
