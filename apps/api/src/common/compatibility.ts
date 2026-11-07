import { PrismaService } from "../prisma/prisma.service";
import { audienceAllows } from "./privacy-context";
export function compatibilityScores(input: { tags: number; events: number; places: number; reactions: number; comments: number; sameLocation: boolean; corporate: boolean }) {
  const score = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  const friendship = score(input.tags * 8 + input.reactions * 4 + input.comments * 5);
  const networking = score(input.events * 16 + input.tags * 5);
  const eventPartner = score(input.events * 28 + input.tags * 7 + input.places * 10);
  const travel = score(input.places * 24 + (input.sameLocation ? 12 : 0) + input.tags * 4);
  const business = score(input.events * 14 + input.tags * 6 + (input.corporate ? 10 : 0));
  return { overall: score((friendship + networking + eventPartner + travel + business) / 5), friendship, networking, eventPartner, travel, business };
}

export async function memberCompatibility(prisma: PrismaService, viewerId: string, ids: string[]) {
  const userIds = [...new Set([viewerId, ...ids])];
  const users = await prisma.user.findMany({ where: { id: { in: userIds }, status: "active" }, select: {
    id: true, accountType: true, city: true, country: true, followerCount: true, privacySettings: true,
    interestTags: { where: { tag: { status: "active" } }, select: { tagId: true, sentiment: true } },
    eventParticipations: { where: { status: { in: ["accepted", "attended"] }, event: { status: "published", OR: [{ visibility: "open" }, { createdById: viewerId }, { participants: { some: { userId: viewerId, status: { in: ["accepted", "attended"] } } } }] } }, select: { eventId: true } },
    createdEvents: { where: { status: "published", OR: [{ visibility: "open" }, { createdById: viewerId }, { participants: { some: { userId: viewerId, status: { in: ["accepted", "attended"] } } } }] }, select: { id: true } },
    placeMemberships: { where: { status: "accepted", place: { status: "active", OR: [{ visibility: "open" }, { createdById: viewerId }, { members: { some: { userId: viewerId, status: "accepted" } } }] } }, select: { placeId: true } },
    createdPlaces: { where: { status: "active", OR: [{ visibility: "open" }, { createdById: viewerId }, { members: { some: { userId: viewerId, status: "accepted" } } }] }, select: { id: true } },
  } });
  const viewer = users.find(user => user.id === viewerId);
  if (!viewer) return [];
  const events = new Set([...viewer.createdEvents.map(row => row.id), ...viewer.eventParticipations.map(row => row.eventId)]);
  const places = new Set([...viewer.createdPlaces.map(row => row.id), ...viewer.placeMemberships.map(row => row.placeId)]);
  const tags = new Map(viewer.interestTags.map(row => [row.tagId, row.sentiment]));
  return users.filter(user => user.id !== viewerId && ids.includes(user.id)).filter(user => audienceAllows(user.id, "everybody")).map(user => {
    const commonTags = user.interestTags.filter(row => tags.get(row.tagId) === row.sentiment).length;
    const commonEvents = audienceAllows(user.id, user.privacySettings?.eventAudience ?? "everybody") ? new Set([...user.createdEvents.map(row => row.id), ...user.eventParticipations.map(row => row.eventId)].filter(id => events.has(id))).size : 0;
    const commonPlaces = audienceAllows(user.id, user.privacySettings?.placeAudience ?? "everybody") ? new Set([...user.createdPlaces.map(row => row.id), ...user.placeMemberships.map(row => row.placeId)].filter(id => places.has(id))).size : 0;
    const locationVisible = audienceAllows(user.id, user.privacySettings?.locationAudience ?? "everybody");
    const same = (a: string | null, b: string | null) => Boolean(a && b && a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0);
    const scores = compatibilityScores({ tags: commonTags, events: commonEvents, places: commonPlaces, reactions: 0, comments: 0, sameLocation: locationVisible && (same(viewer.city, user.city) || same(viewer.country, user.country)), corporate: user.accountType === "corporate" });
    return { id: user.id, overall: scores.overall, eventPartner: scores.eventPartner, followerCount: user.followerCount, commonTagCount: commonTags };
  });
}
