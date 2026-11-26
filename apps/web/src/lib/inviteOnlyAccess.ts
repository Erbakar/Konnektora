/**
 * 26/11 #102–#103: "Sadece davetli" etkinlik ve mekânlarda birincil butonun durumu.
 * Davet edilmemiş kullanıcı içeriği görür; ama katılma/takip ve davet etme butonları
 * pasif görünür ve birincil butonun etiketi "Sadece davetliler" olur.
 */
export type InviteOnlyAccess = "not_invite_only" | "manager" | "member" | "invited" | "locked";

type EventLike = {
  visibility?: string | null;
  createdById?: string | null;
  viewerParticipation?: { status: string; role: string } | null;
};

type PlaceLike = {
  visibility?: string | null;
  createdById?: string | null;
  viewerMembership?: { status: string; role: string } | null;
};

const managerRoles = ["organizer", "manager"];

export function eventInviteOnlyAccess(event: EventLike, userId?: string | null): InviteOnlyAccess {
  if (event.visibility !== "invite_only" && event.visibility !== "hidden") return "not_invite_only";
  const participation = event.viewerParticipation;
  if (userId && event.createdById === userId) return "manager";
  if (participation && managerRoles.includes(participation.role) && ["accepted", "attended", "not_attending"].includes(participation.status)) return "manager";
  if (participation && ["accepted", "attended", "requested"].includes(participation.status)) return "member";
  if (participation?.status === "invited") return "invited";
  return "locked";
}

export function placeInviteOnlyAccess(place: PlaceLike, userId?: string | null): InviteOnlyAccess {
  if (place.visibility !== "invite_only") return "not_invite_only";
  const membership = place.viewerMembership;
  if (userId && place.createdById === userId) return "manager";
  if (membership?.status === "accepted") return managerRoles.includes(membership.role) ? "manager" : "member";
  if (membership?.status === "invited") return "invited";
  return "locked";
}
