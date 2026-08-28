import { createHmac } from "node:crypto";

const baseUrl = (process.env.SMOKE_BASE_URL ?? "").replace(/\/$/, "");
const jwtSecret = process.env.JWT_SECRET ?? "";
if (!baseUrl) throw new Error("SMOKE_BASE_URL zorunludur.");
if (!jwtSecret) throw new Error("JWT_SECRET zorunludur.");

function sign(userId) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: userId, role: "user", iat: now, exp: now + 15 * 60 })).toString("base64url");
  const signature = createHmac("sha256", jwtSecret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

async function request(path, token, allowedStatuses = [200]) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      authorization: `Bearer ${token}`,
      "user-agent": "konnektora-authenticated-smoke/1.0",
    },
  });
  const raw = await response.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }
  if (!allowedStatuses.includes(response.status)) {
    throw new Error(`${path}: HTTP ${response.status}`);
  }
  process.stdout.write(`OK ${path} (${response.status})\n`);
  return { status: response.status, data };
}

const publicEvents = await fetch(`${baseUrl}/events?page=1&pageSize=15`).then((response) => response.json());
const managedEvent = publicEvents.items?.find((event) => event.createdById) ?? publicEvents.items?.[0];
if (!managedEvent?.createdById) throw new Error("Smoke testi için yönetici etkinliği bulunamadı.");

const adminToken = sign(process.env.SMOKE_ADMIN_USER_ID || managedEvent.createdById);
const adminUsers = await request("/admin/users?page=1&pageSize=100", adminToken);
const users = adminUsers.data?.items ?? adminUsers.data ?? [];
const regularUser = process.env.SMOKE_USER_ID
  ? { id: process.env.SMOKE_USER_ID }
  : users.find((user) => user.role === "user" && user.status === "active");
if (!regularUser?.id) throw new Error("Smoke testi için aktif kullanıcı bulunamadı.");
const userToken = sign(regularUser.id);

for (const path of [
  "/admin/dashboard",
  "/admin/cms/categories",
  "/admin/cms/faqs",
  "/admin/cms/announcements",
  "/admin/report-rules",
  "/admin/content/posts",
  "/admin/content/comments",
  "/admin/content/private-messages",
  "/admin/activity-logs?page=1&pageSize=1",
]) {
  await request(path, adminToken);
}

const participants = await request(`/events/${managedEvent.id}/participants`, adminToken);
await request(`/events/${managedEvent.id}/invitations/sent`, adminToken);
const inviteRecommendations = await request(`/events/${managedEvent.id}/invite-recommendations`, adminToken);
if (!Array.isArray(inviteRecommendations.data) || inviteRecommendations.data.length > 25) {
  throw new Error("Etkinlik davet önerileri en fazla 25 kayıtlık bir liste döndürmelidir.");
}
for (const recommendation of inviteRecommendations.data) {
  if (!recommendation.id || !recommendation.username || !Array.isArray(recommendation.reasons) || typeof recommendation.score !== "number") {
    throw new Error("Etkinlik davet önerisi kullanıcı, puan veya gerekçe bilgisini içermiyor.");
  }
}
await request(`/events/${managedEvent.id}/ticket-types`, adminToken);
await request(`/events/${managedEvent.id}/related-users`, adminToken);
await request(`/event-stats/${managedEvent.id}`, adminToken);

const passportUser = participants.data?.find(
  (participant) => participant.userId !== managedEvent.createdById && ["accepted", "attended"].includes(participant.status),
)?.userId;
if (passportUser) {
  const passport = await request(`/events/${managedEvent.id}/check-in/passport/${passportUser}`, adminToken);
  if (!passport.data?.user?.id) throw new Error("Etkinlik pasaportu kullanıcı verisi içermiyor.");
  if (passport.data.targetType !== "event") throw new Error("Etkinlik pasaportu hedef türü hatalı.");
  for (const key of ["invitedBy", "guestLists", "tickets"]) {
    if (!Array.isArray(passport.data[key])) throw new Error(`Etkinlik pasaportu ${key} listesini içermiyor.`);
  }
  if (!Array.isArray(passport.data.user.media)) throw new Error("Etkinlik pasaportu kullanıcı medya listesini içermiyor.");
  if (typeof passport.data.alreadyInside !== "boolean") throw new Error("Etkinlik pasaportu içeride durumunu içermiyor.");
}

const places = await fetch(`${baseUrl}/places?page=1&pageSize=12`).then((response) => response.json());
const place = places.items?.find((item) => item.inviteCount > 0) ?? places.items?.[0];
if (!place?.id) throw new Error("Smoke testi için mekân bulunamadı.");
const placeMembers = await request(`/places/${place.id}/members`, adminToken);
const activePlaceInviteCount = placeMembers.data?.filter((member) => member.status === "invited").length ?? 0;
if (place.inviteCount !== activePlaceInviteCount) {
  throw new Error(
    `Mekân davet sayacı tutarsız: kart=${place.inviteCount}, aktif davet=${activePlaceInviteCount}.`,
  );
}
process.stdout.write(`OK place invite counter (${activePlaceInviteCount})\n`);
if (!Number.isInteger(place.followingMemberCount) || place.followingMemberCount < 0) {
  throw new Error("Mekân kartındaki takip edilen üye sayısı geçerli değil.");
}
for (const path of [
  `/places/${place.id}/invitations/sent`,
  `/places/${place.id}/related-users`,
  `/place-stats/${place.id}`,
]) {
  await request(path, adminToken);
}
const passportMember = placeMembers.data?.find((member) => member.userId !== place.createdById && member.status === "accepted")?.userId;
if (passportMember) {
  const passport = await request(`/places/${place.id}/check-in/passport/${passportMember}`, adminToken);
  if (!passport.data?.user?.id) throw new Error("Mekân pasaportu kullanıcı verisi içermiyor.");
  if (passport.data.targetType !== "place") throw new Error("Mekân pasaportu hedef türü hatalı.");
  for (const key of ["invitedBy", "guestLists", "tickets"]) {
    if (!Array.isArray(passport.data[key])) throw new Error(`Mekân pasaportu ${key} listesini içermiyor.`);
  }
  if (!Array.isArray(passport.data.user.media)) throw new Error("Mekân pasaportu kullanıcı medya listesini içermiyor.");
  if (typeof passport.data.alreadyInside !== "boolean") throw new Error("Mekân pasaportu içeride durumunu içermiyor.");
}

for (const path of [
  "/profile",
  "/me/events",
  "/events?scope=mine&pageSize=15",
  "/events?scope=invited&pageSize=15",
  "/social/new-members",
  "/me/places",
  "/me/tickets",
  "/me/owned-tickets",
  "/me/member-pass",
  "/profile/tag-suggestions",
  "/me/finance",
  "/announcements",
]) {
  await request(path, userToken);
}

const finance = await request("/me/finance", userToken);
const guestListExpected = ["growth", "scale"].includes(finance.data?.business?.plan) ? [200] : [403];
await request("/guest-lists", userToken, guestListExpected);
