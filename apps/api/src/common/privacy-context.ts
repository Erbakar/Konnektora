import { AsyncLocalStorage } from "node:async_hooks";
import { PrismaService } from "../prisma/prisma.service";
export type PrivacyContext = { viewerId?: string; advancedFilters?: boolean; following: Set<string>; network: Set<string>; blocked: Set<string> };
export const privacyContext = new AsyncLocalStorage<PrivacyContext>();
// Inverse graph: whose selected audience includes this viewer?
export async function audienceForViewer(prisma: PrismaService, viewerId?: string): Promise<PrivacyContext> {
  if (!viewerId) return { following: new Set(), network: new Set(), blocked: new Set() };
  const [direct, blocks] = await Promise.all([
    prisma.userFollow.findMany({ where: { followingId: viewerId }, select: { followerId: true } }),
    prisma.userBlock.findMany({ where: { targetType: "user", OR: [{ userId: viewerId }, { targetId: viewerId }] }, select: { userId: true, targetId: true } }),
  ]);
  const second = direct.length ? await prisma.userFollow.findMany({ where: { followingId: { in: direct.map(row => row.followerId) } }, select: { followerId: true } }) : [];
  return { viewerId, following: new Set(direct.map(row => row.followerId)), network: new Set(second.map(row => row.followerId)), blocked: new Set(blocks.map(row => row.userId === viewerId ? row.targetId : row.userId)) };
}
export function audienceAllows(ownerId: string | undefined, audience: string, context = privacyContext.getStore()) {
  if (ownerId && context?.viewerId === ownerId) return true;
  if (ownerId && context?.blocked.has(ownerId)) return false;
  if (audience === "everybody") return true;
  if (!ownerId || !context?.viewerId) return false;
  return audience === "following" ? context.following.has(ownerId) : audience === "network" && context.network.has(ownerId);
}
