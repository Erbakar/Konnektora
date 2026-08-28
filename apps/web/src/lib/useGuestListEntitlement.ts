import { useQuery } from "@tanstack/react-query";
import { getFinanceDashboard, getUserSession, listMyEvents, listMyPlaces } from "./api";

export function useGuestListEntitlement(canManageCurrent = false) {
  const user = getUserSession();
  const managedEvents = useQuery({ queryKey: ["my-events", user?.id, "guest-list-entitlement"], queryFn: listMyEvents, enabled: Boolean(user) });
  const managedPlaces = useQuery({ queryKey: ["my-places", user?.id, "guest-list-entitlement"], queryFn: listMyPlaces, enabled: Boolean(user) });
  const finance = useQuery({ queryKey: ["finance", user?.id, "guest-list-entitlement"], queryFn: getFinanceDashboard, enabled: Boolean(user) });
  const privileged = Boolean(user && ["admin", "super_admin", "curator"].includes(user.role));
  const managesAny = canManageCurrent || (managedEvents.data ?? []).some((event) => event.createdById === user?.id || ["manager", "organizer"].includes(event.viewerParticipation?.role ?? "")) || (managedPlaces.data ?? []).some((place) => place.createdById === user?.id || ["manager", "organizer"].includes(place.viewerMembership?.role ?? ""));
  const paidBusinessPlan = user?.accountType === "corporate" && finance.data?.business.plan !== undefined && finance.data.business.plan !== "starter";
  const hasPaidManagedEvent = (managedEvents.data ?? []).some((event) => {
    const stillActive = new Date(event.endsAt ?? event.startsAt).getTime() >= Date.now();
    return stillActive && (event.price > 0 || (event.ticketTypes ?? []).some((ticket) => ticket.price > 0 && ticket.status !== "inactive"));
  });
  return { canUseGuestLists: Boolean(user && (privileged || managesAny && (paidBusinessPlan || hasPaidManagedEvent))), finance, managedEvents, managedPlaces };
}
