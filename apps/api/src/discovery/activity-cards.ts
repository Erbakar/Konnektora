import type { Prisma } from "@prisma/client";
import type { PrismaService } from "../prisma/prisma.service";
import { publicName } from "../common/public-name";
import type { DiscoveryFeed } from "@konnektora/shared";

type Activity = DiscoveryFeed["activities"][number];
export const activityRelations = {
  tags: { where: { tag: { status: "active" as const } }, orderBy: { sortOrder: "asc" as const }, include: { tag: true }, take: 5 },
};
export const eventActivityRelations = { ...activityRelations, place: { select: { name: true, slug: true } } };
const actorSelect = { id: true, name: true, username: true, accountType: true, companyName: true, privacySettings: { select: { profileNameAudience: true } }, uploadedMedia: { where: { contentType: "user" as const, status: "active", isProfilePicture: true }, select: { url: true }, take: 1 } };
export async function additionalActivities(db: PrismaService, viewerId: string | undefined, blockedIds: string[], dates: Prisma.DateTimeFilter): Promise<Activity[]> {
  const excluded = blockedIds.filter(id => id !== viewerId);
  const comments = await db.contentComment.findMany({
    where: { status: "active", parentId: null, targetType: { in: ["tag", "event", "place"] }, createdAt: dates, author: { status: "active", id: { notIn: excluded } } },
    include: { author: { select: actorSelect } }, orderBy: { createdAt: "desc" }, take: 60,
  });
  const [events, places, tags, media, interests] = await Promise.all([
    db.event.findMany({ where: { id: { in: comments.filter(c => c.targetType === "event").map(c => c.targetId) }, status: "published", OR: [{ visibility: "open" }, ...(viewerId ? [{ createdById: viewerId }, { participants: { some: { userId: viewerId, status: { in: ["accepted" as const, "attended" as const] } } } }] : [])] }, include: { ...eventActivityRelations, participants: { where: { status: { in: ["accepted", "attended"] } }, select: { userId: true, role: true } } } }),
    db.place.findMany({ where: { id: { in: comments.filter(c => c.targetType === "place").map(c => c.targetId) }, status: "active", OR: [{ visibility: "open" }, ...(viewerId ? [{ createdById: viewerId }, { members: { some: { userId: viewerId, status: "accepted" as const } } }] : [])] }, include: { ...activityRelations, members: { where: { status: "accepted" }, select: { userId: true, role: true } } } }),
    db.tag.findMany({ where: { id: { in: comments.filter(c => c.targetType === "tag").map(c => c.targetId) }, status: "active" } }),
    db.mediaFile.findMany({ where: { contentId: { in: comments.map(c => c.id) }, contentType: { in: ["tag_comment", "event_comment", "place_comment"] }, status: "active" }, orderBy: { sortOrder: "asc" }, select: { id: true, contentId: true, url: true, type: true } }),
    db.userInterestTag.findMany({ where: { createdAt: dates, user: { status: "active", id: { notIn: excluded } }, tag: { status: "active" } }, include: { user: { select: actorSelect }, tag: true }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  const identity = (user: NonNullable<typeof comments[number]["author"]>) => ({ id: user.id, name: publicName(user), username: user.username, avatarUrl: user.uploadedMedia[0]?.url ?? null });
  const result: Activity[] = [];
  for (const comment of comments) {
    if (!comment.author) continue;
    const event = events.find(e => e.id === comment.targetId && comment.targetType === "event");
    const place = places.find(p => p.id === comment.targetId && comment.targetType === "place");
    const tag = tags.find(t => t.id === comment.targetId && comment.targetType === "tag");
    if (!event && !place && !tag) continue;
    const manager = event ? event.createdById === comment.authorId || event.participants.some(p => p.userId === comment.authorId && ["organizer", "manager"].includes(p.role)) : place ? place.createdById === comment.authorId || place.members.some(p => p.userId === comment.authorId && ["organizer", "manager"].includes(p.role)) : false;
    const joined = event ? event.participants.some(p => p.userId === viewerId) : place?.members.some(p => p.userId === viewerId);
    const kind = event ? "event" : place ? "place" : "tag";
    result.push({ id: comment.targetId, activityId: `comment-${comment.id}`, kind, title: event?.title ?? place?.name ?? tag!.name, href: event ? `/events/${event.slug}` : place ? `/places/${place.slug}` : `/tags/${tag!.slug}`, subtitle: null, imageUrl: null, meta: place?.city ?? null, action: manager && joined ? event ? "Etkinlik yöneticisi ileti yazdı" : "Mekân yöneticisi ileti yazdı" : event ? "Etkinliğe ileti yazdı" : place ? "Mekâna ileti yazdı" : "Etikete ileti yazdı", body: comment.body, media: media.filter(m => m.contentId === comment.id), occurredAt: comment.createdAt, ownerId: comment.authorId, actor: identity(comment.author), place: event?.place, canManageContent: false });
  }
  const groups = new Map<string, typeof interests>();
  for (const item of interests) { const group = groups.get(item.userId) ?? []; group.push(item); groups.set(item.userId, group); }
  for (const [id, items] of groups) {
    const first = items[0]!;
    result.push({ id: first.tagId, activityId: `interests-${id}`, kind: "tag", title: "", subtitle: null, imageUrl: null, meta: null, href: `/users/id/${id}`, action: "Etiketleri profiline yapıştırdı", occurredAt: first.createdAt, ownerId: id, actor: identity(first.user), tags: items.map(i => ({ id: i.tag.id, name: i.tag.name, slug: i.tag.slug })), canManageContent: false });
  }
  // Profil albümüne yeni medya ekleyen kullanıcılar (07/11 #24): kullanıcı ve gün bazında tek kart; albüm avatar ile başlar.
  const profileUploads = await db.mediaFile.findMany({ where: { contentType: "user", status: "active", createdAt: dates, uploadedById: { not: null, notIn: excluded }, uploadedBy: { status: "active" } }, select: { contentId: true, uploadedById: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 300 });
  const uploadGroups = new Map<string, { userId: string; at: Date }>();
  for (const upload of profileUploads) {
    if (!upload.uploadedById || upload.contentId !== upload.uploadedById) continue;
    const key = `${upload.uploadedById}:${upload.createdAt.toISOString().slice(0, 10)}`;
    if (!uploadGroups.has(key)) uploadGroups.set(key, { userId: upload.uploadedById, at: upload.createdAt });
  }
  const uploaderIds = [...new Set([...uploadGroups.values()].map(group => group.userId))];
  if (uploaderIds.length) {
    const [uploaders, albums] = await Promise.all([
      db.user.findMany({ where: { id: { in: uploaderIds }, status: "active" }, select: actorSelect }),
      db.mediaFile.findMany({ where: { contentType: "user", contentId: { in: uploaderIds }, status: "active" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, contentId: true, url: true, type: true, isProfilePicture: true } }),
    ]);
    for (const [key, group] of uploadGroups) {
      const uploader = uploaders.find(user => user.id === group.userId);
      if (!uploader) continue;
      const album = albums.filter(item => item.contentId === group.userId).sort((a, b) => Number(b.isProfilePicture) - Number(a.isProfilePicture));
      if (!album.length) continue;
      result.push({ id: group.userId, activityId: `profile-media-${key}`, kind: "user", title: "", subtitle: null, imageUrl: null, meta: null, href: `/users/id/${group.userId}`, action: "Profiline yeni medya ekledi", media: album.map(item => ({ id: item.id, url: item.url, type: item.type })), occurredAt: group.at, ownerId: group.userId, actor: identity(uploader), canManageContent: false });
    }
  }
  if (viewerId) {
    const followedEvents = await db.event.findMany({ where: { status: "published", visibility: "open", createdAt: dates, OR: [
      { createdBy: { followers: { some: { followerId: viewerId } } } },
      { place: { followers: { some: { userId: viewerId } } } },
      { tags: { some: { tag: { interestedUsers: { some: { userId: viewerId } } } } } },
    ] }, include: { ...eventActivityRelations, createdBy: { select: actorSelect } }, orderBy: { createdAt: "desc" }, take: 30 });
    for (const event of followedEvents) {
      if (event.createdById && excluded.includes(event.createdById)) continue;
      result.push({ id: event.id, activityId: `Etkinlik oluşturuldu-${event.id}-${event.createdById}`, kind: "event", title: event.title, href: `/events/${event.slug}`, subtitle: event.summary, imageUrl: event.coverImageUrl, meta: event.startsAt.toISOString(), startsAt: event.startsAt, endsAt: event.endsAt, city: event.city, locationName: event.locationName, action: "Etkinlik oluşturuldu", occurredAt: event.createdAt, ownerId: event.createdById, actor: event.createdBy ? identity(event.createdBy) : null, place: event.place, tags: event.tags.map(t => t.tag), canManageContent: true });
    }
    const revisions = await db.eventRevision.findMany({ where: { createdAt: dates, event: { status: "published", visibility: "open", tags: { some: { tag: { interestedUsers: { some: { userId: viewerId } } } } } } }, include: { event: { include: { ...eventActivityRelations, tags: { where: { tag: { status: "active", interestedUsers: { some: { userId: viewerId } } } }, include: { tag: true } } } } }, orderBy: { createdAt: "desc" }, take: 30 });
    for (const revision of revisions) {
      const before = revision.before as { tagIds?: string[] }; const after = revision.after as { tagIds?: string[] };
      if (!Array.isArray(before.tagIds) || !Array.isArray(after.tagIds)) continue;
      const added = revision.event.tags.filter(t => after.tagIds!.includes(t.tagId) && !before.tagIds!.includes(t.tagId));
      if (!added.length || revision.actorId && excluded.includes(revision.actorId)) continue;
      const event = revision.event;
      result.push({ id: event.id, activityId: `event-tags-${revision.id}`, kind: "event", title: event.title, href: `/events/${event.slug}`, subtitle: null, imageUrl: event.coverImageUrl, meta: event.startsAt.toISOString(), startsAt: event.startsAt, action: "Takip ettiğiniz etiket etkinliğe eklendi", occurredAt: revision.createdAt, ownerId: null, actor: null, place: event.place, tags: added.map(t => t.tag), canManageContent: false });
    }
    const joinedEvents = await db.event.findMany({ where: { status: "published", participants: { some: { userId: viewerId, status: { in: ["accepted", "attended"] } } } }, include: { ...eventActivityRelations, ticketTypeRecords: { where: { status: "active" } } }, orderBy: { updatedAt: "desc" }, take: 60 });
    const inRange = (date: Date) => date.getTime() <= Date.now() && (!dates.gte || date >= new Date(String(dates.gte))) && (!dates.lte || date <= new Date(String(dates.lte)));
    for (const event of joinedEvents) {
      const base = { id: event.id, kind: "event" as const, title: event.title, href: `/events/${event.slug}`, subtitle: null, imageUrl: event.coverImageUrl, meta: event.startsAt.toISOString(), startsAt: event.startsAt, ownerId: null, actor: null, place: event.place, tags: event.tags.map(t => t.tag), canManageContent: false };
      for (const ticket of event.ticketTypeRecords) {
        const changedAt = ticket.availabilityChangedAt ?? ticket.createdAt;
        if (ticket.capacity > ticket.soldCount && inRange(changedAt)) result.push({ ...base, activityId: `ticket-${ticket.id}-${changedAt.toISOString()}`, action: ticket.availabilityChangedAt ? "Katıldığınız etkinlikte yeni bilet kontenjanı açıldı" : "Katıldığınız etkinliğe yeni bilet tanımlandı", occurredAt: changedAt });
      }
      const firstSale = event.ticketTypeRecords.map(t => t.saleStartsAt ?? t.createdAt).sort((a, b) => a.getTime() - b.getTime())[0];
      if (firstSale && inRange(firstSale)) result.push({ ...base, activityId: `first-sale-${event.id}`, action: "Katıldığınız etkinlik bilet satışına başladı", occurredAt: firstSale });
    }
  }
  return result;
}
