import type { Prisma } from "@prisma/client";

/**
 * 17/10 #14 — "Gizli - sadece davetliler görebilir" etkinlik tipi.
 * Gizli etkinliği yalnız katılımcıları, yöneticileri/organizatörleri (kurucu dahil),
 * davetlileri, bilet sahipleri ile admin ve küratörler görebilir. Tüm listeleme,
 * arama, akış ve detay sorguları bu yardımcıdan geçer; kontrol yalnız arayüzde değildir.
 */
export const HIDDEN_EVENT_VISIBILITY = "hidden" as const;
export const EVENT_OVERSIGHT_ROLES = ["admin", "super_admin", "curator"];

/** Katılım açısından "gizli", "sadece davetli" ile aynı kuralları izler. */
export function isInvitationOnlyVisibility(visibility?: string | null) {
  return visibility === "invite_only" || visibility === HIDDEN_EVENT_VISIBILITY;
}

/** Yetkili (admin/küratör) olmayan bir izleyicinin görebileceği etkinlikler. */
export function hiddenEventAccessWhere(viewerId?: string | null): Prisma.EventWhereInput {
  return {
    OR: [
      { visibility: { not: HIDDEN_EVENT_VISIBILITY } },
      ...(viewerId
        ? [
            { createdById: viewerId },
            { participants: { some: { userId: viewerId, status: { not: "banned" as const } } } },
            { invitations: { some: { inviteeId: viewerId } } },
            { ownedTickets: { some: { ownerId: viewerId } } },
          ]
        : []),
    ],
  };
}

/** Gizli etkinlikleri kimseye göstermeyen (sayaçlar, önizlemeler) filtre. */
export const notHiddenEventWhere: Prisma.EventWhereInput = { visibility: { not: HIDDEN_EVENT_VISIBILITY } };

type RoleLookup = { user: { findUnique: (args: any) => any } };
type Viewer = string | { id: string; role?: string | null } | null | undefined;

/**
 * İzleyiciye göre gizli etkinlik filtresi. Admin ve küratörler için boş filtre döner.
 * Yalnız kullanıcı kimliği verilirse rol veritabanından okunur.
 */
export async function visibleEventWhere(db: RoleLookup, viewer: Viewer): Promise<Prisma.EventWhereInput> {
  if (!viewer) return hiddenEventAccessWhere();
  const viewerId = typeof viewer === "string" ? viewer : viewer.id;
  let role = typeof viewer === "string" ? undefined : viewer.role;
  if (role == null) {
    try {
      role = (await db.user?.findUnique?.({ where: { id: viewerId }, select: { role: true } }))?.role;
    } catch {
      role = undefined;
    }
  }
  return role && EVENT_OVERSIGHT_ROLES.includes(role) ? {} : hiddenEventAccessWhere(viewerId);
}
