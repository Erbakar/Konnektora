import {
  adminDashboardSchema,
  adminManagedUserDetailSchema,
  adminManagedUserListSchema,
  adminManagedUserSchema,
  adminTagDetailSchema,
  adminRoleGroupSchema,
  announcementListSchema,
  announcementSchema,
  contentReportSchema,
  cmsCategorySchema,
  cmsPolicySchema,
  eventListSchema,
  eventSchema,
  eventParticipantSchema,
  faqSchema,
  loginResponseSchema,
  moderationDecisionSchema,
  reportGroupDetailSchema,
  reportGroupNoteSchema,
  reportGroupSchema,
  reportRuleSchema,
  tagSchema,
  type AdminDashboard,
  type AdminManagedUser,
  type AdminManagedUserDetail,
  type AdminManagedUserList,
  type AdminPermission,
  type AdminRoleGroup,
  type AdminTagDetail,
  type Announcement,
  type CmsPolicy,
  type CmsCategory,
  type ContentReport,
  type Event,
  type EventList,
  type EventParticipant,
  type Faq,
  type LoginResponse,
  type ModerationDecision,
  type PolicyType,
  type ReportRule,
  type ReportGroup,
  type ReportGroupDetail,
  type ReportGroupNote,
  type ReportTargetType,
  type Tag
} from "@konnektora/shared";
import { z } from "zod";
import { mockEvents, mockTags } from "./mockData";

const CONFIGURED_API_URL = import.meta.env.VITE_API_URL;
const DEFAULT_API_URL = import.meta.env.PROD ? "/api" : "http://localhost:3000";
const API_URL = CONFIGURED_API_URL ?? DEFAULT_API_URL;
const MOCK_API_SETTING = import.meta.env.VITE_MOCK_API;
const isBrowser = typeof window !== "undefined";
const isLocalApiUrl = API_URL.includes("localhost") || API_URL.includes("127.0.0.1");
const isNetlifyPreview = isBrowser && window.location.hostname.endsWith("netlify.app");
const USE_MOCK_FALLBACK =
  MOCK_API_SETTING === "true" ||
  (MOCK_API_SETTING !== "false" && import.meta.env.PROD && (!CONFIGURED_API_URL || isLocalApiUrl || isNetlifyPreview));
const TOKEN_KEY = "konnektora_admin_token";
const USER_TOKEN_KEY = "konnektora_user_token";
const USER_KEY = "konnektora_user";
const USER_INTEREST_TAGS_KEY = "konnektora_user_interest_tags";
const MOCK_EVENTS_KEY = "konnektora_mock_events";
const MOCK_TAGS_KEY = "konnektora_mock_tags";
const MOCK_USERS_KEY = "konnektora_mock_users";
const MOCK_PARTICIPANTS_KEY = "konnektora_mock_participants";
const MOCK_REPORTS_KEY = "konnektora_mock_reports";
const MOCK_REPORT_RULES_KEY = "konnektora_mock_report_rules";
const MOCK_REPORT_GROUP_NOTES_KEY = "konnektora_mock_report_group_notes";
const MOCK_MODERATION_DECISIONS_KEY = "konnektora_mock_moderation_decisions";
const MOCK_EMAIL_TOKENS_KEY = "konnektora_mock_email_tokens";
const MOCK_USER_EVENT_IDS_KEY = "konnektora_mock_user_event_ids";
const MOCK_ROLE_GROUPS_KEY = "konnektora_mock_role_groups";
const MOCK_CMS_CATEGORIES_KEY = "konnektora_mock_cms_categories";
const MOCK_FAQS_KEY = "konnektora_mock_faqs";
const MOCK_ANNOUNCEMENTS_KEY = "konnektora_mock_announcements";
const MOCK_POLICIES_KEY = "konnektora_mock_policies";
const MOCK_ADMIN_TOKEN = "mock-admin-token";

export const isMockApiMode = USE_MOCK_FALLBACK;

type AuthMode = boolean | "admin" | "user";
type MockUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  status?: "active" | "invited" | "pending" | "disabled";
  role?: "user" | "admin" | "super_admin";
  adminRoleGroupId?: string | null;
};

export const adminPermissionOptions: Array<{ value: AdminPermission; label: string }> = [
  { value: "cms.manage", label: "CMS" },
  { value: "reports.manage", label: "Şikayetler" },
  { value: "users.manage", label: "Üyeler" },
  { value: "roles.manage", label: "Rol/Yetki" },
  { value: "tags.manage", label: "İlgi alanları" },
  { value: "events.manage", label: "Etkinlikler" },
  { value: "places.manage", label: "Mekanlar" },
  { value: "comments.manage", label: "Yorumlar" },
  { value: "media.manage", label: "Medya" }
];

type RequestOptions = RequestInit & {
  auth?: AuthMode;
};

class ApiHttpError extends Error {
  constructor(readonly status: number) {
    super(`API request failed: ${status}`);
  }
}

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getUserToken() {
  return localStorage.getItem(USER_TOKEN_KEY);
}

export function setUserSession(response: LoginResponse) {
  localStorage.setItem(USER_TOKEN_KEY, response.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(response.user));
}

export function getUserSession() {
  return readStorage<LoginResponse["user"] | null>(USER_KEY, null);
}

export function clearUserSession() {
  localStorage.removeItem(USER_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getUserInterestTagIds() {
  const user = getUserSession();
  const allInterests = readStorage<Record<string, string[]>>(USER_INTEREST_TAGS_KEY, {});

  return user ? allInterests[user.id] ?? [] : [];
}

export function setUserInterestTagIds(tagIds: string[]) {
  const user = getUserSession();

  if (!user) {
    return;
  }

  const allInterests = readStorage<Record<string, string[]>>(USER_INTEREST_TAGS_KEY, {});
  writeStorage(USER_INTEREST_TAGS_KEY, {
    ...allInterests,
    [user.id]: [...new Set(tagIds)]
  });
}

async function requestJson<T>(path: string, schema: z.ZodType<T>, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (options.auth) {
    const token = options.auth === "user" ? getUserToken() : getAdminToken();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  try {
    const response = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (!response.ok) {
      throw new ApiHttpError(response.status);
    }

    if (response.status === 204) {
      return schema.parse(null);
    }

    return schema.parse(await response.json());
  } catch (error) {
    const fallback = getMockResponse(path, schema, options);

    if (shouldUseMockFallback(error) && fallback !== undefined) {
      return fallback;
    }

    throw error;
  }
}

function shouldUseMockFallback(error: unknown) {
  if (!USE_MOCK_FALLBACK) {
    return false;
  }

  if (error instanceof ApiHttpError && [401, 403].includes(error.status)) {
    return false;
  }

  return true;
}

function getMockResponse<T>(path: string, schema: z.ZodType<T>, options: RequestOptions): T | undefined {
  if (!USE_MOCK_FALLBACK) {
    return undefined;
  }

  const method = options.method?.toUpperCase() ?? "GET";
  const [rawPathname, queryString = ""] = path.split("?");
  const pathname = rawPathname ?? "";

  if (pathname === "/admin/auth/login" && method === "POST") {
    return schema.parse({
      accessToken: MOCK_ADMIN_TOKEN,
      user: {
        id: "99999999-9999-4999-8999-999999999999",
        email: "admin@konnektora.local",
        name: "Konnektora Admin",
        role: "super_admin",
        status: "active"
      }
    });
  }

  if (pathname === "/auth/register" && method === "POST") {
    return schema.parse(registerMockUser(parseBody<{ name: string; email: string; password: string }>(options)));
  }

  if (pathname === "/auth/login" && method === "POST") {
    return schema.parse(loginMockUser(parseBody<{ email: string; password: string }>(options)));
  }

  if (pathname === "/auth/email/verify/request" && method === "POST") {
    return schema.parse(createMockEmailToken(parseBody<{ email: string }>(options).email, "verify_email"));
  }

  if (pathname === "/auth/email/verify" && method === "POST") {
    return schema.parse(consumeMockEmailToken(parseBody<{ token: string }>(options).token, "verify_email"));
  }

  if (pathname === "/auth/password/forgot" && method === "POST") {
    return schema.parse(createMockEmailToken(parseBody<{ email: string }>(options).email, "password_reset"));
  }

  if (pathname === "/auth/password/reset" && method === "POST") {
    const input = parseBody<{ token: string; password: string }>(options);
    return schema.parse(resetMockPassword(input.token, input.password));
  }

  if (pathname === "/auth/invite/accept" && method === "POST") {
    const input = parseBody<{ token: string; name?: string; password: string }>(options);
    return schema.parse(acceptMockInvite(input.token, input.password, input.name));
  }

  if (pathname === "/profile/interests" && method === "GET") {
    return schema.parse(getTagsByIds(getUserInterestTagIds()));
  }

  if (pathname === "/profile/interests" && method === "PUT") {
    const input = parseBody<{ tagIds: string[] }>(options);
    setUserInterestTagIds(input.tagIds);
    return schema.parse(getTagsByIds(input.tagIds));
  }

  if (pathname === "/tags" && method === "POST" && options.auth === "user") {
    return schema.parse(createMockTag(parseBody<{ name: string; description?: string }>(options)));
  }

  if (pathname === "/reports" && method === "POST" && options.auth === "user") {
    return schema.parse(createMockReport(parseBody<CreateReportInput>(options)));
  }

  if (pathname === "/admin/report-rules" && method === "GET") {
    return schema.parse(listMockReportRules());
  }

  if (pathname === "/admin/report-rules" && method === "POST") {
    return schema.parse(createMockReportRule(parseBody<ReportRuleInput>(options)));
  }

  if (pathname.startsWith("/admin/report-rules/") && method === "PATCH") {
    return schema.parse(
      updateMockReportRule(pathname.slice("/admin/report-rules/".length), parseBody<Partial<ReportRuleInput> & { status?: string }>(options))
    );
  }

  if (pathname === "/admin/dashboard" && method === "GET") {
    return schema.parse(getMockDashboard());
  }

  if (pathname === "/admin/users" && method === "GET") {
    return schema.parse(listMockAdminUsers(new URLSearchParams(queryString)));
  }

  if (pathname.startsWith("/admin/users/") && method === "GET") {
    return schema.parse(getMockAdminUser(pathname.slice("/admin/users/".length)));
  }

  if (pathname.startsWith("/admin/users/") && method === "PATCH") {
    return schema.parse(updateMockAdminUser(pathname.slice("/admin/users/".length), parseBody<Partial<AdminManagedUser>>(options)));
  }

  if (pathname === "/admin/role-groups" && method === "GET") {
    return schema.parse(listMockRoleGroups());
  }

  if (pathname === "/admin/role-groups" && method === "POST") {
    return schema.parse(createMockRoleGroup(parseBody<RoleGroupInput>(options)));
  }

  if (pathname.startsWith("/admin/role-groups/") && method === "PATCH") {
    return schema.parse(
      updateMockRoleGroup(
        pathname.slice("/admin/role-groups/".length),
        parseBody<Partial<RoleGroupInput> & { status?: string }>(options)
      )
    );
  }

  if (pathname === "/admin/cms/categories" && method === "GET") {
    return schema.parse(listMockCmsCategories());
  }

  if (pathname === "/admin/cms/categories" && method === "POST") {
    return schema.parse(createMockCmsCategory(parseBody<{ name: string; description?: string }>(options)));
  }

  if (pathname.startsWith("/admin/cms/categories/") && method === "PATCH") {
    return schema.parse(
      updateMockCmsCategory(pathname.slice("/admin/cms/categories/".length), parseBody<Partial<CmsCategory>>(options))
    );
  }

  if (pathname === "/admin/cms/faqs" && method === "GET") {
    return schema.parse(listMockFaqs());
  }

  if (pathname === "/admin/cms/faqs" && method === "POST") {
    return schema.parse(createMockFaq(parseBody<FaqInput>(options)));
  }

  if (pathname.startsWith("/admin/cms/faqs/") && method === "PATCH") {
    return schema.parse(updateMockFaq(pathname.slice("/admin/cms/faqs/".length), parseBody<Partial<FaqInput> & { status?: string }>(options)));
  }

  if (pathname === "/admin/cms/announcements" && method === "GET") {
    return schema.parse(listMockAnnouncements());
  }

  if (pathname === "/admin/cms/announcements" && method === "POST") {
    return schema.parse(createMockAnnouncement(parseBody<AnnouncementInput>(options)));
  }

  if (pathname.startsWith("/admin/cms/announcements/") && method === "PATCH") {
    return schema.parse(
      updateMockAnnouncement(
        pathname.slice("/admin/cms/announcements/".length),
        parseBody<Partial<AnnouncementInput> & { status?: string }>(options)
      )
    );
  }

  if (pathname === "/admin/cms/policies" && method === "GET") {
    return schema.parse(listMockPolicies());
  }

  if (pathname === "/admin/cms/policies" && method === "POST") {
    return schema.parse(upsertMockPolicy(parseBody<PolicyInput>(options)));
  }

  if (pathname === "/admin/reports" && method === "GET") {
    return schema.parse(listMockReports());
  }

  if (pathname === "/admin/report-groups" && method === "GET") {
    const params = new URLSearchParams(queryString);
    return schema.parse(listMockReportGroups(params.get("scope") === "old" ? "old" : "active"));
  }

  if (pathname.startsWith("/admin/report-groups/") && pathname.endsWith("/note") && method === "PATCH") {
    const { targetType, targetId } = parseReportGroupPath(pathname.slice(0, -"/note".length));
    return schema.parse(updateMockReportGroupNote(targetType, targetId, parseBody<{ note: string }>(options).note));
  }

  if (pathname.startsWith("/admin/report-groups/") && pathname.endsWith("/decisions") && method === "POST") {
    const { targetType, targetId } = parseReportGroupPath(pathname.slice(0, -"/decisions".length));
    return schema.parse(createMockModerationDecision(targetType, targetId, parseBody<ModerationDecisionInput>(options)));
  }

  if (pathname.startsWith("/admin/report-groups/") && method === "GET") {
    const { targetType, targetId } = parseReportGroupPath(pathname);
    return schema.parse(getMockReportGroupDetail(targetType, targetId));
  }

  if (pathname.startsWith("/admin/reports/") && method === "PATCH") {
    return schema.parse(updateMockReport(pathname.slice("/admin/reports/".length), parseBody<UpdateReportInput>(options)));
  }

  if (pathname.startsWith("/admin/reports/") && pathname.endsWith("/actions") && method === "POST") {
    const reportId = pathname.slice("/admin/reports/".length, -"/actions".length);
    return schema.parse(resolveMockReportAction(reportId, parseBody<ResolveReportActionInput>(options)));
  }

  if (pathname === "/admin/tags" && method === "GET") {
    return schema.parse(getStoredTags());
  }

  if (pathname === "/admin/tags" && method === "POST") {
    return schema.parse(createMockTag(parseBody<{ name: string; description?: string }>(options)));
  }

  if (pathname.startsWith("/admin/tags/") && pathname.endsWith("/ban") && method === "POST") {
    return schema.parse(updateMockTag(pathname.slice("/admin/tags/".length, -"/ban".length), { status: "hidden" }));
  }

  if (pathname.startsWith("/admin/tags/") && pathname.endsWith("/merge") && method === "POST") {
    return schema.parse(mergeMockTag(pathname.slice("/admin/tags/".length, -"/merge".length), parseBody<{ targetTagId: string }>(options).targetTagId));
  }

  if (pathname.startsWith("/admin/tags/") && method === "GET") {
    return schema.parse(getMockAdminTag(pathname.slice("/admin/tags/".length)));
  }

  if (pathname.startsWith("/admin/tags/") && method === "PATCH") {
    return schema.parse(updateMockTag(pathname.slice("/admin/tags/".length), parseBody(options)));
  }

  if (pathname.startsWith("/admin/tags/") && method === "DELETE") {
    return schema.parse(updateMockTag(pathname.slice("/admin/tags/".length), { status: "archived" }));
  }

  if (pathname === "/admin/events" && method === "GET") {
    return schema.parse(getStoredEvents());
  }

  if (pathname === "/admin/events" && method === "POST") {
    return schema.parse(createMockEvent(parseBody<AdminEventInput>(options)));
  }

  if (pathname === "/events" && method === "POST" && options.auth === "user") {
    const user = getUserSession();
    return schema.parse(createMockEvent(parseBody<AdminEventInput>(options), user?.name ?? "Konnektora User", user?.id));
  }

  if (pathname === "/me/events" && method === "GET" && options.auth === "user") {
    return schema.parse(listMockUserEvents());
  }

  if (pathname.startsWith("/me/events/") && method === "PATCH" && options.auth === "user") {
    return schema.parse(updateMockEvent(pathname.slice("/me/events/".length), parseBody(options)));
  }

  if (pathname.startsWith("/me/events/") && method === "DELETE" && options.auth === "user") {
    return schema.parse(updateMockEvent(pathname.slice("/me/events/".length), { status: "archived" }));
  }

  if (pathname.startsWith("/events/") && pathname.endsWith("/attend") && method === "POST") {
    return schema.parse(requestMockAttendance(pathname.slice("/events/".length, -"/attend".length)));
  }

  if (pathname.startsWith("/events/") && pathname.endsWith("/invite") && method === "POST") {
    return schema.parse(inviteMockParticipant(pathname.slice("/events/".length, -"/invite".length), parseBody(options)));
  }

  if (pathname.startsWith("/events/") && pathname.endsWith("/participants") && method === "GET") {
    return schema.parse(listMockParticipants(pathname.slice("/events/".length, -"/participants".length)));
  }

  if (pathname.startsWith("/events/") && pathname.includes("/participants/") && method === "PATCH") {
    const { eventId, userId } = parseParticipantPath(pathname, "/participants/");
    return schema.parse(updateMockParticipantStatus(eventId, userId, parseBody<{ status: string }>(options).status));
  }

  if (pathname.startsWith("/events/") && pathname.endsWith("/check-in") && method === "POST") {
    const { eventId, userId } = parseParticipantPath(pathname.slice(0, -"/check-in".length), "/participants/");
    return schema.parse(updateMockParticipantStatus(eventId, userId, "attended", new Date().toISOString()));
  }

  if (pathname.startsWith("/admin/events/") && method === "PATCH") {
    return schema.parse(updateMockEvent(pathname.slice("/admin/events/".length), parseBody(options)));
  }

  if (pathname.startsWith("/admin/events/") && method === "DELETE") {
    return schema.parse(updateMockEvent(pathname.slice("/admin/events/".length), { status: "archived" }));
  }

  if (method !== "GET" || options.auth) {
    return undefined;
  }

  if (pathname === "/faqs") {
    return schema.parse(listMockFaqs().filter((faq) => faq.status === "active" && faq.category?.status === "active"));
  }

  if (pathname === "/announcements") {
    return schema.parse(listMockPublicAnnouncements());
  }

  if (pathname === "/report-rules") {
    const params = new URLSearchParams(queryString);
    const targetType = params.get("targetType");
    return schema.parse(listMockReportRules().filter((rule) => rule.status === "active" && (!targetType || rule.targetType === targetType)));
  }

  if (pathname.startsWith("/policies/")) {
    const type = pathname.slice("/policies/".length);
    const policy = getMockPublicPolicy(type);
    return policy ? schema.parse(policy) : undefined;
  }

  if (pathname === "/tags") {
    return schema.parse(getStoredTags().filter((tag) => tag.status === "active"));
  }

  if (pathname === "/events") {
    const params = new URLSearchParams(queryString);
    const selectedTag = params.get("tag");
    const selectedFormat = params.get("format");
    const search = params.get("q")?.toLowerCase().trim();
    const dateFrom = params.get("dateFrom");
    const dateTo = params.get("dateTo");
    const city = params.get("city")?.toLowerCase().trim();
    const country = params.get("country")?.toLowerCase().trim();
    const page = Math.max(Number(params.get("page") || "1"), 1);
    const pageSize = Math.min(Math.max(Number(params.get("pageSize") || "24"), 1), 50);
    const events = getStoredEvents().filter(
      (eventItem) =>
        eventItem.status === "published" &&
        (!selectedTag || eventItem.tags.some((tagItem) => tagItem.slug === selectedTag)) &&
        (!selectedFormat || eventItem.format === selectedFormat) &&
        (!search ||
          [eventItem.title, eventItem.summary, eventItem.description, eventItem.organizerName ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(search)) &&
        (!dateFrom || new Date(eventItem.startsAt) >= new Date(dateFrom)) &&
        (!dateTo || new Date(eventItem.startsAt) <= new Date(dateTo)) &&
        (!city || eventItem.city?.toLowerCase() === city) &&
        (!country || eventItem.country?.toLowerCase() === country)
    );
    const start = (page - 1) * pageSize;

    return schema.parse({
      items: events.slice(start, start + pageSize),
      total: events.length,
      page,
      pageSize,
      hasNextPage: start + pageSize < events.length
    });
  }

  if (pathname.startsWith("/events/")) {
    const slug = decodeURIComponent(pathname.slice("/events/".length));
    const event = getStoredEvents().find((eventItem) => eventItem.status === "published" && eventItem.slug === slug);

    return event ? schema.parse(event) : undefined;
  }

  return undefined;
}

function parseBody<T>(options: RequestOptions): T {
  return options.body ? (JSON.parse(String(options.body)) as T) : ({} as T);
}

function getStoredEvents(): Event[] {
  const storedEvents = readStorage<Event[]>(MOCK_EVENTS_KEY, []);
  const storedIds = new Set(storedEvents.map((event) => event.id));
  return [...storedEvents, ...mockEvents.filter((event) => !storedIds.has(event.id))];
}

function getStoredTags(): Tag[] {
  const storedTags = readStorage<Tag[]>(MOCK_TAGS_KEY, []);
  const storedSlugs = new Set(storedTags.map((tag) => tag.slug));
  return [...storedTags, ...mockTags.filter((tag) => !storedSlugs.has(tag.slug))];
}

function setStoredEvents(events: Event[]) {
  writeStorage(MOCK_EVENTS_KEY, events);
}

function setStoredTags(tags: Tag[]) {
  writeStorage(MOCK_TAGS_KEY, tags);
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function requestMockAttendance(eventId: string): EventParticipant {
  const user = getUserSession();

  if (!user) {
    throw new Error("Mock user session not found");
  }

  const event = getStoredEvents().find((item) => item.id === eventId);

  if (!event) {
    throw new Error("Mock event not found");
  }

  const participants = readStorage<EventParticipant[]>(MOCK_PARTICIPANTS_KEY, []);
  const status = event.visibility === "open" ? "accepted" : "requested";
  const existing = participants.find((participant) => participant.eventId === eventId && participant.userId === user.id);
  const participant: EventParticipant = {
    id: existing?.id ?? createId(),
    eventId,
    userId: user.id,
    status,
    role: "attendee",
    checkedInAt: null,
    user
  };

  writeStorage(MOCK_PARTICIPANTS_KEY, [
    participant,
    ...participants.filter((item) => !(item.eventId === eventId && item.userId === user.id))
  ]);

  return participant;
}

function inviteMockParticipant(
  eventId: string,
  input: { userId?: string; email?: string; name?: string; role?: string }
): EventParticipant {
  const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  const email = input.email?.toLowerCase().trim();
  const existingUser = input.userId
    ? users.find((user) => user.id === input.userId)
    : users.find((user) => user.email === email);
  const user = existingUser ?? {
    id: createId(),
    name: input.name?.trim() || email?.split("@")[0] || "Invited user",
    email: email || `invited-${Date.now()}@konnektora.local`,
    password: "",
    status: "invited" as const
  };

  if (!existingUser) {
    writeStorage(MOCK_USERS_KEY, [user, ...users]);
  }

  const participants = readStorage<EventParticipant[]>(MOCK_PARTICIPANTS_KEY, []);
  const existing = participants.find((participant) => participant.eventId === eventId && participant.userId === user.id);
  const participant: EventParticipant = {
    id: existing?.id ?? createId(),
    eventId,
    userId: user.id,
    status: "invited",
    role: input.role === "organizer" || input.role === "manager" ? input.role : "attendee",
    checkedInAt: null,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: "user",
      status: "invited"
    }
  };

  writeStorage(MOCK_PARTICIPANTS_KEY, [
    participant,
    ...participants.filter((item) => !(item.eventId === eventId && item.userId === user.id))
  ]);

  return participant;
}

function listMockParticipants(eventId: string): EventParticipant[] {
  return readStorage<EventParticipant[]>(MOCK_PARTICIPANTS_KEY, []).filter((participant) => participant.eventId === eventId);
}

function updateMockParticipantStatus(
  eventId: string,
  userId: string,
  status: string,
  checkedInAt: string | null = null
): EventParticipant {
  const participants = readStorage<EventParticipant[]>(MOCK_PARTICIPANTS_KEY, []);
  const participant = participants.find((item) => item.eventId === eventId && item.userId === userId);

  if (!participant) {
    throw new Error("Mock participant not found");
  }

  const updatedParticipant: EventParticipant = {
    ...participant,
    status: parseParticipantStatus(status),
    checkedInAt
  };

  writeStorage(MOCK_PARTICIPANTS_KEY, [
    updatedParticipant,
    ...participants.filter((item) => !(item.eventId === eventId && item.userId === userId))
  ]);

  return updatedParticipant;
}

function createMockReport(input: CreateReportInput): ContentReport {
  const reports = readStorage<ContentReport[]>(MOCK_REPORTS_KEY, []);
  const reporter = getUserSession();
  const rule = input.ruleId ? listMockReportRules().find((item) => item.id === input.ruleId) ?? null : null;
  const report: ContentReport = {
    id: createId(),
    targetType: input.targetType,
    targetId: input.targetId,
    ruleId: rule?.id ?? null,
    reason: input.reason.trim(),
    details: input.details?.trim() || null,
    status: "open",
    resolutionNote: null,
    reporterId: reporter?.id ?? "88888888-8888-4888-8888-888888888888",
    resolvedById: null,
    resolvedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    rule,
    reporter: reporter ?? {
      id: "88888888-8888-4888-8888-888888888888",
      email: "user@konnektora.local",
      name: "Konnektora User",
      role: "user",
      status: "active"
    },
    resolvedBy: null
  };

  writeStorage(MOCK_REPORTS_KEY, [report, ...reports]);
  return report;
}

function listMockReports(): ContentReport[] {
  const rules = listMockReportRules();

  return readStorage<ContentReport[]>(MOCK_REPORTS_KEY, []).map((report) => ({
    ...report,
    rule: report.ruleId ? rules.find((rule) => rule.id === report.ruleId) ?? null : report.rule ?? null
  }));
}

function listMockReportGroups(scope: "active" | "old"): ReportGroup[] {
  const activeStatuses = new Set(["open", "reviewing"]);
  const reports = listMockReports().filter((report) =>
    scope === "active" ? activeStatuses.has(report.status) : !activeStatuses.has(report.status)
  );

  return buildMockReportGroups(reports);
}

function getMockReportGroupDetail(targetType: ReportTargetType, targetId: string): ReportGroupDetail {
  const reports = listMockReports().filter((report) => report.targetType === targetType && report.targetId === targetId);
  const group = buildMockReportGroups(reports)[0];

  if (!group) {
    throw new Error("Mock report group not found");
  }

  return { ...group, reports };
}

function buildMockReportGroups(reports: ContentReport[]): ReportGroup[] {
  const notes = readStorage<ReportGroupNote[]>(MOCK_REPORT_GROUP_NOTES_KEY, []);
  const decisions = readStorage<ModerationDecision[]>(MOCK_MODERATION_DECISIONS_KEY, []);
  const grouped = new Map<string, ContentReport[]>();

  reports.forEach((report) => {
    const key = `${report.targetType}:${report.targetId}`;
    grouped.set(key, [...(grouped.get(key) ?? []), report]);
  });

  return [...grouped.entries()]
    .map(([key, groupReports]) => {
      const [targetType, targetId] = key.split(":") as [ReportTargetType, string];
      const activeReports = groupReports.filter((report) => report.status === "open" || report.status === "reviewing").length;

      return {
        targetType,
        targetId,
        totalReports: groupReports.length,
        activeReports,
        oldReports: groupReports.length - activeReports,
        violationScore: groupReports.reduce((total, report) => total + (report.rule?.violationScore ?? 0), 0),
        latestReportAt: groupReports[0]?.createdAt ?? new Date().toISOString(),
        statuses: [...new Set(groupReports.map((report) => report.status))],
        reasons: [...new Set(groupReports.map((report) => report.reason))],
        note: notes.find((note) => note.targetType === targetType && note.targetId === targetId) ?? null,
        decisions: decisions.filter((decision) => decision.targetType === targetType && decision.targetId === targetId)
      };
    })
    .sort((first, second) => {
      if (second.activeReports !== first.activeReports) {
        return second.activeReports - first.activeReports;
      }

      return new Date(second.latestReportAt).getTime() - new Date(first.latestReportAt).getTime();
    });
}

function createMockModerationDecision(
  targetType: ReportTargetType,
  targetId: string,
  input: ModerationDecisionInput
): ModerationDecision {
  const decisions = readStorage<ModerationDecision[]>(MOCK_MODERATION_DECISIONS_KEY, []);
  const now = new Date().toISOString();
  const adminUser = {
    id: "99999999-9999-4999-8999-999999999999",
    email: "admin@konnektora.local",
    name: "Konnektora Admin",
    role: "super_admin" as const,
    status: "active" as const
  };
  const targetUserId = resolveMockDecisionUserId(targetType, targetId, input.action);
  const targetUser = targetUserId ? getAllMockUsers().find((user) => user.id === targetUserId) : null;
  const decision: ModerationDecision = {
    id: createId(),
    targetType,
    targetId,
    decision: input.decision,
    action: input.action,
    penaltyScore: Number(input.penaltyScore),
    note: input.note?.trim() || null,
    userId: targetUserId,
    issuedById: adminUser.id,
    suspensionEndsAt: input.suspensionEndsAt || null,
    createdAt: now,
    user: targetUser
      ? {
          id: targetUser.id,
          email: targetUser.email,
          name: targetUser.name,
          role: targetUser.role ?? "user",
          status: targetUser.status ?? "active"
        }
      : null,
    issuedBy: adminUser
  };

  applyMockModerationAction(targetType, targetId, input.action);
  closeMockReportsForDecision(targetType, targetId, input);
  writeStorage(MOCK_MODERATION_DECISIONS_KEY, [decision, ...decisions]);
  return decision;
}

function resolveMockDecisionUserId(targetType: ReportTargetType, targetId: string, action: ModerationDecisionInput["action"]) {
  if (targetType === "user") {
    return targetId;
  }

  if (targetType === "event") {
    const event = getStoredEvents().find((item) => item.id === targetId);
    const user = getAllMockUsers().find((item) => item.name === event?.organizerName);
    return user?.id ?? null;
  }

  if (action === "archive_tag") {
    return null;
  }

  return null;
}

function applyMockModerationAction(targetType: ReportTargetType, targetId: string, action: ModerationDecisionInput["action"]) {
  if (targetType === "event" && action === "archive_event") {
    updateMockEvent(targetId, { status: "archived" });
  }

  if (targetType === "tag" && action === "archive_tag") {
    updateMockTag(targetId, { status: "archived" });
  }

  if (targetType === "user" && (action === "suspend_user" || action === "ban_user")) {
    const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
    writeStorage(
      MOCK_USERS_KEY,
      users.map((user) => (user.id === targetId ? { ...user, status: "disabled" } : user))
    );
  }
}

function closeMockReportsForDecision(targetType: ReportTargetType, targetId: string, input: ModerationDecisionInput) {
  const reports = readStorage<ContentReport[]>(MOCK_REPORTS_KEY, []);
  const closedStatus = input.decision === "violation" ? "resolved" : "dismissed";
  const now = new Date().toISOString();

  writeStorage(
    MOCK_REPORTS_KEY,
    reports.map((report) =>
      report.targetType === targetType &&
      report.targetId === targetId &&
      (report.status === "open" || report.status === "reviewing")
        ? {
            ...report,
            status: closedStatus,
            resolutionNote: input.note?.trim() || (input.decision === "violation" ? `${input.action} aksiyonu uygulandı.` : "İhlal bulunmadı."),
            resolvedById: "99999999-9999-4999-8999-999999999999",
            resolvedAt: now,
            updatedAt: now
          }
        : report
    )
  );
}

function updateMockReportGroupNote(targetType: ReportTargetType, targetId: string, noteValue: string): ReportGroupNote {
  const notes = readStorage<ReportGroupNote[]>(MOCK_REPORT_GROUP_NOTES_KEY, []);
  const adminUser = {
    id: "99999999-9999-4999-8999-999999999999",
    email: "admin@konnektora.local",
    name: "Konnektora Admin",
    role: "super_admin" as const,
    status: "active" as const
  };
  const existing = notes.find((note) => note.targetType === targetType && note.targetId === targetId);
  const now = new Date().toISOString();
  const note: ReportGroupNote = {
    id: existing?.id ?? createId(),
    targetType,
    targetId,
    note: noteValue.trim(),
    updatedById: adminUser.id,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    updatedBy: adminUser
  };

  writeStorage(MOCK_REPORT_GROUP_NOTES_KEY, [
    note,
    ...notes.filter((item) => !(item.targetType === targetType && item.targetId === targetId))
  ]);
  return note;
}

function parseReportGroupPath(pathname: string) {
  const [targetType, targetId] = pathname.slice("/admin/report-groups/".length).split("/");

  if (!targetType || !targetId) {
    throw new Error("Invalid report group path");
  }

  return { targetType: parseReportTargetType(targetType), targetId };
}

function listMockReportRules(): ReportRule[] {
  return readStorage<ReportRule[]>(MOCK_REPORT_RULES_KEY, []);
}

function createMockReportRule(input: ReportRuleInput): ReportRule {
  const rules = listMockReportRules();
  const now = new Date().toISOString();
  const rule: ReportRule = {
    id: createId(),
    targetType: parseReportTargetType(input.targetType),
    title: input.title.trim(),
    description: input.description?.trim() || null,
    violationScore: Number(input.violationScore),
    status: "active",
    createdAt: now,
    updatedAt: now
  };

  writeStorage(MOCK_REPORT_RULES_KEY, [rule, ...rules]);
  return rule;
}

function updateMockReportRule(id: string, input: Partial<ReportRuleInput> & { status?: string }): ReportRule {
  const rules = listMockReportRules();
  const updatedRules = rules.map((rule) =>
    rule.id === id
      ? {
          ...rule,
          targetType: input.targetType ? parseReportTargetType(input.targetType) : rule.targetType,
          title: input.title?.trim() ?? rule.title,
          description: input.description === undefined ? rule.description : input.description?.trim() || null,
          violationScore: input.violationScore === undefined ? rule.violationScore : Number(input.violationScore),
          status: parseCmsStatus(input.status, rule.status),
          updatedAt: new Date().toISOString()
        }
      : rule
  );
  const updatedRule = updatedRules.find((rule) => rule.id === id);

  if (!updatedRule) {
    throw new Error("Mock report rule not found");
  }

  writeStorage(MOCK_REPORT_RULES_KEY, updatedRules);
  return updatedRule;
}

function getAllMockUsers(): MockUser[] {
  const storedUsers = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  const seededUsers: MockUser[] = [
    {
      id: "99999999-9999-4999-8999-999999999999",
      email: "admin@konnektora.local",
      name: "Konnektora Admin",
      password: "ChangeMe123!",
      role: "super_admin",
      status: "active"
    },
    {
      id: "88888888-8888-4888-8888-888888888888",
      email: "user@konnektora.local",
      name: "Konnektora User",
      password: "ChangeMe123!",
      role: "user",
      status: "active"
    }
  ];
  const storedIds = new Set(storedUsers.map((user) => user.id));

  return [...storedUsers, ...seededUsers.filter((user) => !storedIds.has(user.id))];
}

function listMockRoleGroups(): AdminRoleGroup[] {
  const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);

  return readStorage<AdminRoleGroup[]>(MOCK_ROLE_GROUPS_KEY, []).map((roleGroup) => ({
    ...roleGroup,
    _count: {
      users: users.filter((user) => user.adminRoleGroupId === roleGroup.id).length
    }
  }));
}

function createMockRoleGroup(input: RoleGroupInput): AdminRoleGroup {
  const roleGroups = listMockRoleGroups();
  const roleGroup: AdminRoleGroup = {
    id: createId(),
    name: input.name.trim(),
    description: input.description?.trim() || null,
    permissions: [...new Set(input.permissions)],
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { users: 0 }
  };

  writeStorage(MOCK_ROLE_GROUPS_KEY, [roleGroup, ...roleGroups]);
  return roleGroup;
}

function updateMockRoleGroup(id: string, input: Partial<RoleGroupInput> & { status?: string }): AdminRoleGroup {
  const roleGroups = listMockRoleGroups();
  const updatedRoleGroups = roleGroups.map((roleGroup) =>
    roleGroup.id === id
      ? {
          ...roleGroup,
          name: input.name?.trim() ?? roleGroup.name,
          description: input.description === undefined ? roleGroup.description : input.description?.trim() || null,
          permissions: input.permissions ? [...new Set(input.permissions)] : roleGroup.permissions,
          status: input.status ?? roleGroup.status,
          updatedAt: new Date().toISOString()
        }
      : roleGroup
  );
  const updatedRoleGroup = updatedRoleGroups.find((roleGroup) => roleGroup.id === id);

  if (!updatedRoleGroup) {
    throw new Error("Mock role group not found");
  }

  writeStorage(MOCK_ROLE_GROUPS_KEY, updatedRoleGroups);
  return updatedRoleGroup;
}

function listMockCmsCategories(): CmsCategory[] {
  const faqs = readStorage<Faq[]>(MOCK_FAQS_KEY, []);

  return readStorage<CmsCategory[]>(MOCK_CMS_CATEGORIES_KEY, []).map((category) => ({
    ...category,
    _count: { faqs: faqs.filter((faq) => faq.categoryId === category.id).length }
  }));
}

function createMockCmsCategory(input: { name: string; description?: string }): CmsCategory {
  const categories = listMockCmsCategories();
  const category: CmsCategory = {
    id: createId(),
    name: input.name.trim(),
    slug: uniqueSlug(input.name, categories.map((item) => item.slug)),
    description: input.description?.trim() || null,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { faqs: 0 }
  };

  writeStorage(MOCK_CMS_CATEGORIES_KEY, [category, ...categories]);
  return category;
}

function updateMockCmsCategory(id: string, input: Partial<CmsCategory>): CmsCategory {
  const categories = listMockCmsCategories();
  const updatedCategories = categories.map((category) =>
    category.id === id
      ? {
          ...category,
          name: input.name?.trim() ?? category.name,
          slug: input.name ? uniqueSlug(input.name, categories.filter((item) => item.id !== id).map((item) => item.slug)) : category.slug,
          description: input.description === undefined ? category.description : input.description?.trim() || null,
          status: parseCmsStatus(input.status, category.status),
          updatedAt: new Date().toISOString()
        }
      : category
  );
  const updatedCategory = updatedCategories.find((category) => category.id === id);

  if (!updatedCategory) {
    throw new Error("Mock CMS category not found");
  }

  writeStorage(MOCK_CMS_CATEGORIES_KEY, updatedCategories);
  return updatedCategory;
}

function listMockFaqs(): Faq[] {
  const categories = listMockCmsCategories();

  return readStorage<Faq[]>(MOCK_FAQS_KEY, []).map((faq) => ({
    ...faq,
    category: categories.find((category) => category.id === faq.categoryId)
  }));
}

function createMockFaq(input: FaqInput): Faq {
  const faqs = listMockFaqs();
  const category = listMockCmsCategories().find((item) => item.id === input.categoryId);

  if (!category) {
    throw new Error("Mock CMS category not found");
  }

  const faq: Faq = {
    id: createId(),
    categoryId: input.categoryId,
    title: input.title.trim(),
    body: input.body.trim(),
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category
  };

  writeStorage(MOCK_FAQS_KEY, [faq, ...faqs]);
  return faq;
}

function updateMockFaq(id: string, input: Partial<FaqInput> & { status?: string }): Faq {
  const faqs = listMockFaqs();
  const categories = listMockCmsCategories();
  const updatedFaqs = faqs.map((faq) => {
    if (faq.id !== id) {
      return faq;
    }

    const categoryId = input.categoryId ?? faq.categoryId;

    return {
      ...faq,
      categoryId,
      title: input.title?.trim() ?? faq.title,
      body: input.body?.trim() ?? faq.body,
      status: parseCmsStatus(input.status, faq.status),
      updatedAt: new Date().toISOString(),
      category: categories.find((category) => category.id === categoryId)
    };
  });
  const updatedFaq = updatedFaqs.find((faq) => faq.id === id);

  if (!updatedFaq) {
    throw new Error("Mock FAQ not found");
  }

  writeStorage(MOCK_FAQS_KEY, updatedFaqs);
  return updatedFaq;
}

function listMockAnnouncements(): Announcement[] {
  return readStorage<Announcement[]>(MOCK_ANNOUNCEMENTS_KEY, []);
}

function listMockPublicAnnouncements(): Announcement[] {
  const now = Date.now();

  return listMockAnnouncements().filter(
    (announcement) =>
      announcement.status === "active" &&
      new Date(announcement.publishAt).getTime() <= now &&
      (!announcement.expiresAt || new Date(announcement.expiresAt).getTime() > now)
  );
}

function createMockAnnouncement(input: AnnouncementInput): Announcement {
  const announcements = listMockAnnouncements();
  const now = new Date().toISOString();
  const announcement: Announcement = {
    id: createId(),
    title: input.title.trim(),
    body: input.body.trim(),
    target: parseAnnouncementTarget(input.target),
    status: "active",
    publishAt: input.publishAt || now,
    expiresAt: input.expiresAt || null,
    createdAt: now,
    updatedAt: now
  };

  writeStorage(MOCK_ANNOUNCEMENTS_KEY, [announcement, ...announcements]);
  return announcement;
}

function updateMockAnnouncement(id: string, input: Partial<AnnouncementInput> & { status?: string }): Announcement {
  const announcements = listMockAnnouncements();
  const updatedAnnouncements = announcements.map((announcement) =>
    announcement.id === id
      ? {
          ...announcement,
          title: input.title?.trim() ?? announcement.title,
          body: input.body?.trim() ?? announcement.body,
          target: input.target ? parseAnnouncementTarget(input.target) : announcement.target,
          status: parseCmsStatus(input.status, announcement.status),
          publishAt: input.publishAt ?? announcement.publishAt,
          expiresAt: input.expiresAt === undefined ? announcement.expiresAt : input.expiresAt || null,
          updatedAt: new Date().toISOString()
        }
      : announcement
  );
  const updatedAnnouncement = updatedAnnouncements.find((announcement) => announcement.id === id);

  if (!updatedAnnouncement) {
    throw new Error("Mock announcement not found");
  }

  writeStorage(MOCK_ANNOUNCEMENTS_KEY, updatedAnnouncements);
  return updatedAnnouncement;
}

function listMockPolicies(): CmsPolicy[] {
  const policies = readStorage<CmsPolicy[]>(MOCK_POLICIES_KEY, []);
  const existingTypes = new Set(policies.map((policy) => policy.type));

  return [
    ...policies,
    ...defaultPolicies().filter((policy) => !existingTypes.has(policy.type))
  ];
}

function getMockPublicPolicy(type: string): CmsPolicy | undefined {
  return listMockPolicies().find((policy) => policy.type === type && policy.status === "active");
}

function upsertMockPolicy(input: PolicyInput): CmsPolicy {
  const policies = listMockPolicies();
  const now = new Date().toISOString();
  const type = parsePolicyType(input.type);
  const nextPolicy: CmsPolicy = {
    id: policies.find((policy) => policy.type === type)?.id ?? createId(),
    type,
    title: input.title.trim(),
    body: input.body.trim(),
    status: parseCmsStatus(input.status),
    publishedAt: parseCmsStatus(input.status) === "active" ? now : null,
    createdAt: policies.find((policy) => policy.type === type)?.createdAt ?? now,
    updatedAt: now
  };

  writeStorage(MOCK_POLICIES_KEY, [nextPolicy, ...policies.filter((policy) => policy.type !== type)]);
  return nextPolicy;
}

function defaultPolicies(): CmsPolicy[] {
  const now = new Date().toISOString();

  return [
    {
      id: "10000000-1000-4000-8000-100000000101",
      type: "privacy",
      title: "Privacy Policy",
      body: "Konnektora privacy policy content will be managed from the admin panel.",
      status: "passive",
      publishedAt: null,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "10000000-1000-4000-8000-100000000102",
      type: "terms",
      title: "Terms of Use",
      body: "Konnektora terms of use content will be managed from the admin panel.",
      status: "passive",
      publishedAt: null,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "10000000-1000-4000-8000-100000000103",
      type: "cookies",
      title: "Cookie Policy",
      body: "Konnektora cookie policy content will be managed from the admin panel.",
      status: "passive",
      publishedAt: null,
      createdAt: now,
      updatedAt: now
    }
  ];
}

function toAdminManagedUser(user: MockUser): AdminManagedUser {
  const events = getStoredEvents().filter((event) => event.organizerName === user.name);
  const participants = readStorage<EventParticipant[]>(MOCK_PARTICIPANTS_KEY, []).filter(
    (participant) => participant.userId === user.id
  );
  const reports = readStorage<ContentReport[]>(MOCK_REPORTS_KEY, []).filter((report) => report.reporterId === user.id);
  const adminRoleGroup = listMockRoleGroups().find((roleGroup) => roleGroup.id === user.adminRoleGroupId) ?? null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role ?? "user",
    status: user.status ?? "active",
    adminRoleGroupId: user.adminRoleGroupId ?? null,
    adminRoleGroup,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: {
      createdEvents: events.length,
      eventParticipations: participants.length,
      submittedReports: reports.length
    }
  };
}

function listMockAdminUsers(params: URLSearchParams): AdminManagedUserList {
  const q = params.get("q")?.toLowerCase().trim();
  const status = params.get("status");
  const role = params.get("role");
  const page = Math.max(Number(params.get("page") || "1"), 1);
  const pageSize = Math.min(Math.max(Number(params.get("pageSize") || "25"), 1), 100);
  const users = getAllMockUsers()
    .map(toAdminManagedUser)
    .filter(
      (user) =>
        (!q || [user.name, user.email].join(" ").toLowerCase().includes(q)) &&
        (!status || user.status === status) &&
        (!role || user.role === role)
    );
  const start = (page - 1) * pageSize;

  return {
    items: users.slice(start, start + pageSize),
    total: users.length,
    page,
    pageSize,
    hasNextPage: page * pageSize < users.length
  };
}

function getMockAdminUser(id: string): AdminManagedUserDetail {
  const user = getAllMockUsers().find((item) => item.id === id);

  if (!user) {
    throw new Error("Mock user not found");
  }

  const managedUser = toAdminManagedUser(user);
  const allInterests = readStorage<Record<string, string[]>>(USER_INTEREST_TAGS_KEY, {});

  return {
    ...managedUser,
    stats: {
      createdEvents: managedUser._count?.createdEvents ?? 0,
      eventParticipations: managedUser._count?.eventParticipations ?? 0,
      submittedReports: managedUser._count?.submittedReports ?? 0,
      resolvedReports: readStorage<ContentReport[]>(MOCK_REPORTS_KEY, []).filter((report) => report.resolvedById === id).length
    },
    interestTags: getTagsByIds(allInterests[id] ?? [])
  };
}

function updateMockAdminUser(id: string, input: Partial<AdminManagedUser>): AdminManagedUser {
  const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  const existing = getAllMockUsers().find((user) => user.id === id);

  if (!existing) {
    throw new Error("Mock user not found");
  }

  const updatedUser: MockUser = {
    ...existing,
    status: input.status ?? existing.status,
    role: input.role ?? existing.role,
    adminRoleGroupId:
      input.adminRoleGroupId === undefined ? existing.adminRoleGroupId ?? null : input.adminRoleGroupId ?? null
  };
  const nextUsers = users.some((user) => user.id === id)
    ? users.map((user) => (user.id === id ? updatedUser : user))
    : [updatedUser, ...users];

  writeStorage(MOCK_USERS_KEY, nextUsers);
  return toAdminManagedUser(updatedUser);
}

function updateMockReport(id: string, input: UpdateReportInput): ContentReport {
  const reports = readStorage<ContentReport[]>(MOCK_REPORTS_KEY, []);
  const adminUser = {
    id: "99999999-9999-4999-8999-999999999999",
    email: "admin@konnektora.local",
    name: "Konnektora Admin",
    role: "super_admin" as const,
    status: "active" as const
  };
  const updatedReports = reports.map((report) => {
    if (report.id !== id) {
      return report;
    }

    const isClosed = input.status === "resolved" || input.status === "dismissed";

    return {
      ...report,
      status: input.status,
      resolutionNote: input.resolutionNote?.trim() || null,
      resolvedById: isClosed ? adminUser.id : null,
      resolvedAt: isClosed ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
      resolvedBy: isClosed ? adminUser : null
    };
  });
  const report = updatedReports.find((item) => item.id === id);

  if (!report) {
    throw new Error("Mock report not found");
  }

  writeStorage(MOCK_REPORTS_KEY, updatedReports);
  return report;
}

function resolveMockReportAction(id: string, input: ResolveReportActionInput): ContentReport {
  const reports = readStorage<ContentReport[]>(MOCK_REPORTS_KEY, []);
  const report = reports.find((item) => item.id === id);

  if (!report) {
    throw new Error("Mock report not found");
  }

  if (input.action === "archive_event") {
    updateMockEvent(report.targetId, { status: "archived" });
  }

  if (input.action === "archive_tag") {
    updateMockTag(report.targetId, { status: "archived" });
  }

  if (input.action === "disable_user") {
    const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
    writeStorage(
      MOCK_USERS_KEY,
      users.map((user) => (user.id === report.targetId ? { ...user, status: "disabled" } : user))
    );
  }

  return updateMockReport(id, {
    status: "resolved",
    resolutionNote: input.resolutionNote || defaultMockResolutionNote(input.action)
  });
}

function defaultMockResolutionNote(action: ResolveReportActionInput["action"]) {
  if (action === "archive_event") {
    return "Rapor sonucunda etkinlik arşivlendi.";
  }

  if (action === "archive_tag") {
    return "Rapor sonucunda tag arşivlendi.";
  }

  return "Rapor sonucunda kullanıcı disable edildi.";
}

function parseParticipantPath(pathname: string, marker: string) {
  const [eventId, userId] = pathname.slice("/events/".length).split(marker);

  if (!eventId || !userId) {
    throw new Error("Invalid participant path");
  }

  return { eventId, userId };
}

function registerMockUser(input: { name: string; email: string; password: string }): LoginResponse {
  const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  const email = input.email.toLowerCase().trim();
  const existing = users.find((user) => user.email === email);

  if (existing) {
    const activatedUser: MockUser = {
      ...existing,
      name: input.name.trim(),
      password: input.password,
      status: "active"
    };

    writeStorage(MOCK_USERS_KEY, [activatedUser, ...users.filter((user) => user.id !== existing.id)]);
    return createMockLoginResponse(activatedUser);
  }

  const user: MockUser = {
    id: createId(),
    name: input.name.trim(),
    email,
    password: input.password,
    status: "active"
  };

  writeStorage(MOCK_USERS_KEY, [user, ...users]);
  return createMockLoginResponse(user);
}

function createMockEmailToken(email: string, type: "verify_email" | "password_reset" | "invite_accept") {
  const users = getAllMockUsers();
  const user = users.find((item) => item.email === email.toLowerCase().trim());

  if (!user) {
    return { ok: true };
  }

  const tokens = readStorage<Array<{ token: string; userId: string; type: string }>>(MOCK_EMAIL_TOKENS_KEY, []);
  const token = `mock-${type}-${createId()}`;
  writeStorage(MOCK_EMAIL_TOKENS_KEY, [{ token, userId: user.id, type }, ...tokens]);
  return { ok: true, token };
}

function consumeMockEmailToken(token: string, type: "verify_email" | "password_reset" | "invite_accept"): LoginResponse {
  const tokens = readStorage<Array<{ token: string; userId: string; type: string }>>(MOCK_EMAIL_TOKENS_KEY, []);
  const match = tokens.find((item) => item.token === token && item.type === type);

  if (!match) {
    throw new Error("Mock token not found");
  }

  const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  const existing = getAllMockUsers().find((user) => user.id === match.userId);

  if (!existing) {
    throw new Error("Mock user not found");
  }

  const user: MockUser = { ...existing, status: "active" };
  writeStorage(MOCK_USERS_KEY, [user, ...users.filter((item) => item.id !== user.id)]);
  writeStorage(MOCK_EMAIL_TOKENS_KEY, tokens.filter((item) => item.token !== token));
  return createMockLoginResponse(user);
}

function resetMockPassword(token: string, password: string): LoginResponse {
  const response = consumeMockEmailToken(token, "password_reset");
  const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  const user = users.find((item) => item.id === response.user.id);

  if (user) {
    writeStorage(MOCK_USERS_KEY, [{ ...user, password }, ...users.filter((item) => item.id !== user.id)]);
  }

  return response;
}

function acceptMockInvite(token: string, password: string, name?: string): LoginResponse {
  const response = consumeMockEmailToken(token, "invite_accept");
  const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  const user = users.find((item) => item.id === response.user.id);

  if (user) {
    writeStorage(MOCK_USERS_KEY, [{ ...user, name: name?.trim() || user.name, password }, ...users.filter((item) => item.id !== user.id)]);
  }

  return response;
}

function loginMockUser(input: { email: string; password: string }): LoginResponse {
  const email = input.email.toLowerCase().trim();
  const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  const user = users.find((item) => item.email === email && item.password === input.password) ?? {
    id: "88888888-8888-4888-8888-888888888888",
    name: "Konnektora User",
    email,
    password: input.password,
    status: "active" as const
  };

  return createMockLoginResponse(user);
}

function createMockLoginResponse(user: { id: string; name: string; email: string }): LoginResponse {
  return {
    accessToken: `mock-user-token-${user.id}`,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: "user",
      status: "active"
    }
  };
}

function getMockDashboard(): AdminDashboard {
  const now = Date.now();
  const events = getStoredEvents();

  return {
    publishedEvents: events.filter((event) => event.status === "published").length,
    draftEvents: events.filter((event) => event.status === "draft").length,
    activeTags: getStoredTags().filter((tag) => tag.status === "active").length,
    upcomingEvents: events.filter((event) => event.status === "published" && new Date(event.startsAt).getTime() >= now)
      .length
  };
}

function createMockTag(input: { name: string; description?: string }): Tag {
  const tags = getStoredTags();
  const slug = uniqueSlug(input.name, []);
  const existing = tags.find((tag) => tag.slug === slug);

  if (existing) {
    return existing;
  }

  const tag: Tag = {
    id: createId(),
    name: input.name.trim(),
    slug,
    description: input.description || null,
    categoryId: null,
    status: "active",
    usageCount: 0
  };

  setStoredTags([tag, ...tags]);
  return tag;
}

function updateMockTag(id: string, input: Partial<Tag>): Tag {
  const tags = getStoredTags();
  const updatedTags = tags.map((tag) => (tag.id === id ? { ...tag, ...input } : tag));
  const updatedTag = updatedTags.find((tag) => tag.id === id);

  if (!updatedTag) {
    throw new Error("Mock tag not found");
  }

  setStoredTags(updatedTags);
  return updatedTag;
}

function getMockAdminTag(id: string): AdminTagDetail {
  const tag = getStoredTags().find((item) => item.id === id);

  if (!tag) {
    throw new Error("Mock tag not found");
  }

  const reports = listMockReports().filter((report) => report.targetType === "tag" && report.targetId === id);
  const interestedUsers = readStorage<Record<string, string[]>>(USER_INTEREST_TAGS_KEY, {});

  return {
    ...tag,
    category: null,
    createdBy: null,
    updatedBy: null,
    reportCount: reports.length,
    _count: {
      events: getStoredEvents().filter((event) => event.tags.some((item) => item.id === id)).length,
      interestedUsers: Object.values(interestedUsers).filter((tagIds) => tagIds.includes(id)).length
    }
  };
}

function mergeMockTag(sourceTagId: string, targetTagId: string): Tag {
  if (sourceTagId === targetTagId) {
    throw new Error("Mock tag cannot merge into itself");
  }

  const tags = getStoredTags();
  const sourceTag = tags.find((tag) => tag.id === sourceTagId);
  const targetTag = tags.find((tag) => tag.id === targetTagId);

  if (!sourceTag || !targetTag) {
    throw new Error("Mock tag not found");
  }

  setStoredEvents(
    getStoredEvents().map((event) => {
      if (!event.tags.some((tag) => tag.id === sourceTagId)) {
        return event;
      }

      const nextTags = event.tags.filter((tag) => tag.id !== sourceTagId);
      return {
        ...event,
        tags: nextTags.some((tag) => tag.id === targetTagId) ? nextTags : [...nextTags, targetTag]
      };
    })
  );

  const interests = readStorage<Record<string, string[]>>(USER_INTEREST_TAGS_KEY, {});
  writeStorage(
    USER_INTEREST_TAGS_KEY,
    Object.fromEntries(
      Object.entries(interests).map(([userId, tagIds]) => [
        userId,
        [...new Set(tagIds.map((tagId) => (tagId === sourceTagId ? targetTagId : tagId)))]
      ])
    )
  );

  writeStorage(
    MOCK_REPORTS_KEY,
    readStorage<ContentReport[]>(MOCK_REPORTS_KEY, []).map((report) =>
      report.targetType === "tag" && report.targetId === sourceTagId ? { ...report, targetId: targetTagId } : report
    )
  );

  const updatedSource = { ...sourceTag, status: "archived" as const, usageCount: 0 };
  setStoredTags(tags.map((tag) => (tag.id === sourceTagId ? updatedSource : tag)));
  return updatedSource;
}

function createMockEvent(input: AdminEventInput, fallbackOrganizerName = "Konnektora Admin", ownerId?: string): Event {
  const events = getStoredEvents();
  const event: Event = {
    id: createId(),
    title: input.title,
    slug: uniqueSlug(input.title, events.map((item) => item.slug)),
    summary: resolveEventSummary(input),
    description: input.description,
    status: parseEventStatus(input.status),
    startsAt: input.startsAt,
    endsAt: input.endsAt ?? new Date(new Date(input.startsAt).getTime() + 1000 * 60 * 60 * 2).toISOString(),
    timezone: input.timezone ?? resolveEventTimezone(input.city, input.country),
    format: parseEventFormat(input.format),
    visibility: parseEventVisibility(input.visibility),
    city: input.city || null,
    country: input.country || null,
    language: input.language ?? "en",
    organizerName: input.organizerName || fallbackOrganizerName,
    externalRegistrationUrl: input.externalRegistrationUrl || null,
    coverImageUrl: input.coverImageUrl || null,
    capacity: null,
    tags: getTagsByIds(input.tagIds ?? [])
  };

  setStoredEvents([event, ...events]);

  if (ownerId) {
    const userEventIds = readStorage<Record<string, string[]>>(MOCK_USER_EVENT_IDS_KEY, {});
    writeStorage(MOCK_USER_EVENT_IDS_KEY, {
      ...userEventIds,
      [ownerId]: [event.id, ...(userEventIds[ownerId] ?? [])]
    });
  }

  return event;
}

function listMockUserEvents(): Event[] {
  const user = getUserSession();

  if (!user) {
    return [];
  }

  const userEventIds = readStorage<Record<string, string[]>>(MOCK_USER_EVENT_IDS_KEY, {});
  const eventIds = new Set(userEventIds[user.id] ?? []);

  return getStoredEvents().filter((event) => eventIds.has(event.id) || event.organizerName === user.name);
}

function updateMockEvent(id: string, input: Partial<AdminEventInput>): Event {
  const events = getStoredEvents();
  const updatedEvents = events.map((event) => {
    if (event.id !== id) {
      return event;
    }

    return {
      ...event,
      title: input.title ?? event.title,
      summary: input.summary ? resolveEventSummary(input as AdminEventInput) : event.summary,
      description: input.description ?? event.description,
      status: input.status ? parseEventStatus(input.status) : event.status,
      startsAt: input.startsAt ?? event.startsAt,
      endsAt:
        input.endsAt ??
        (input.startsAt ? new Date(new Date(input.startsAt).getTime() + 1000 * 60 * 60 * 2).toISOString() : event.endsAt),
      timezone: input.timezone ?? (input.city !== undefined || input.country !== undefined ? resolveEventTimezone(input.city, input.country) : event.timezone),
      format: input.format ? parseEventFormat(input.format) : event.format,
      visibility: input.visibility ? parseEventVisibility(input.visibility) : event.visibility,
      city: input.city === undefined ? event.city : input.city || null,
      country: input.country === undefined ? event.country : input.country || null,
      language: input.language ?? event.language,
      organizerName: input.organizerName === undefined ? event.organizerName : input.organizerName || "Konnektora Admin",
      externalRegistrationUrl:
        input.externalRegistrationUrl === undefined ? event.externalRegistrationUrl : input.externalRegistrationUrl || null,
      coverImageUrl: input.coverImageUrl === undefined ? event.coverImageUrl : input.coverImageUrl || null,
      capacity: event.capacity,
      tags: input.tagIds ? getTagsByIds(input.tagIds) : event.tags
    };
  });
  const updatedEvent = updatedEvents.find((event) => event.id === id);

  if (!updatedEvent) {
    throw new Error("Mock event not found");
  }

  setStoredEvents(updatedEvents);
  return updatedEvent;
}

function getTagsByIds(tagIds: string[]): Tag[] {
  const ids = new Set(tagIds);
  return getStoredTags().filter((tag) => ids.has(tag.id));
}

function createId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (char) =>
    (Number(char) ^ ((crypto.getRandomValues(new Uint8Array(1))[0] ?? 0) & (15 >> (Number(char) / 4)))).toString(16)
  );
}

function uniqueSlug(value: string, usedSlugs: string[]) {
  const baseSlug =
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ı/g, "i")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "event";
  const used = new Set(usedSlugs);
  let slug = baseSlug;
  let index = 2;

  while (used.has(slug)) {
    slug = `${baseSlug}-${index}`;
    index += 1;
  }

  return slug;
}

function parseEventStatus(value?: string): Event["status"] {
  return value === "draft" || value === "cancelled" || value === "archived" ? value : "published";
}

function parseCmsStatus(value?: string, fallback: "active" | "passive" = "active") {
  return value === "passive" ? "passive" : value === "active" ? "active" : fallback;
}

function parseAnnouncementTarget(value?: string): Announcement["target"] {
  return value === "members" || value === "admins" ? value : "all";
}

function parsePolicyType(value?: string): PolicyType {
  return value === "terms" || value === "cookies" ? value : "privacy";
}

function parseReportTargetType(value?: string): ReportTargetType {
  return value === "tag" || value === "user" ? value : "event";
}

function resolveEventSummary(input: Pick<AdminEventInput, "title" | "summary" | "description">) {
  const summary = input.summary?.trim();

  if (summary) {
    return summary;
  }

  const description = input.description.trim().replace(/\s+/g, " ");
  return description.length > 300 ? `${description.slice(0, 297)}...` : description || input.title;
}

function resolveEventTimezone(city?: string, country?: string) {
  const location = `${city ?? ""} ${country ?? ""}`.toLowerCase();

  if (location.includes("istanbul") || location.includes("turkey") || location.includes("türkiye")) {
    return "Europe/Istanbul";
  }

  return "UTC";
}

function parseEventFormat(value?: string): Event["format"] {
  return value === "offline" || value === "hybrid" ? value : "online";
}

function parseEventVisibility(value?: string): Event["visibility"] {
  return value === "approval_required" || value === "invite_only" ? value : "open";
}

function parseParticipantStatus(value?: string): EventParticipant["status"] {
  return value === "invited" ||
    value === "requested" ||
    value === "accepted" ||
    value === "declined" ||
    value === "banned" ||
    value === "attended"
    ? value
    : "requested";
}

export function listEvents(params?: URLSearchParams): Promise<EventList> {
  const query = params?.toString();
  return requestJson(`/events${query ? `?${query}` : ""}`, eventListSchema);
}

export function getEvent(slug: string): Promise<Event> {
  return requestJson(`/events/${slug}`, eventSchema);
}

export function listTags(): Promise<Tag[]> {
  return requestJson("/tags", z.array(tagSchema));
}

export function createUserTag(input: { name: string; description?: string }): Promise<Tag> {
  return requestJson("/tags", tagSchema, {
    auth: "user",
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function getProfileInterests(): Promise<Tag[]> {
  return requestJson("/profile/interests", z.array(tagSchema), { auth: "user" });
}

export function updateProfileInterests(tagIds: string[]): Promise<Tag[]> {
  return requestJson("/profile/interests", z.array(tagSchema), {
    auth: "user",
    method: "PUT",
    body: JSON.stringify({ tagIds })
  });
}

export function adminLogin(email: string, password: string): Promise<LoginResponse> {
  return requestJson("/admin/auth/login", loginResponseSchema, {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function userLogin(email: string, password: string): Promise<LoginResponse> {
  return requestJson("/auth/login", loginResponseSchema, {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function registerUser(input: { name: string; email: string; password: string }): Promise<LoginResponse> {
  return requestJson("/auth/register", loginResponseSchema, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function requestEmailVerification(email: string): Promise<{ ok: boolean; token?: string }> {
  return requestJson("/auth/email/verify/request", z.object({ ok: z.boolean(), token: z.string().optional() }), {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export function confirmEmail(token: string): Promise<LoginResponse> {
  return requestJson("/auth/email/verify", loginResponseSchema, {
    method: "POST",
    body: JSON.stringify({ token })
  });
}

export function requestPasswordReset(email: string): Promise<{ ok: boolean; token?: string }> {
  return requestJson("/auth/password/forgot", z.object({ ok: z.boolean(), token: z.string().optional() }), {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export function resetPassword(token: string, password: string): Promise<LoginResponse> {
  return requestJson("/auth/password/reset", loginResponseSchema, {
    method: "POST",
    body: JSON.stringify({ token, password })
  });
}

export function acceptInvite(input: { token: string; name?: string; password: string }): Promise<LoginResponse> {
  return requestJson("/auth/invite/accept", loginResponseSchema, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function getAdminDashboard(): Promise<AdminDashboard> {
  return requestJson("/admin/dashboard", adminDashboardSchema, { auth: true });
}

export function listAdminUsers(params?: URLSearchParams): Promise<AdminManagedUserList> {
  const query = params?.toString();
  return requestJson(`/admin/users${query ? `?${query}` : ""}`, adminManagedUserListSchema, { auth: true });
}

export function getAdminUser(id: string): Promise<AdminManagedUserDetail> {
  return requestJson(`/admin/users/${id}`, adminManagedUserDetailSchema, { auth: true });
}

export function updateAdminUser(
  id: string,
  input: {
    status?: "active" | "invited" | "pending" | "disabled";
    role?: "user" | "admin" | "super_admin";
    adminRoleGroupId?: string | null;
  }
): Promise<AdminManagedUser> {
  return requestJson(`/admin/users/${id}`, adminManagedUserSchema, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function listAdminRoleGroups(): Promise<AdminRoleGroup[]> {
  return requestJson("/admin/role-groups", z.array(adminRoleGroupSchema), { auth: true });
}

export function createAdminRoleGroup(input: RoleGroupInput): Promise<AdminRoleGroup> {
  return requestJson("/admin/role-groups", adminRoleGroupSchema, {
    auth: true,
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateAdminRoleGroup(
  id: string,
  input: Partial<RoleGroupInput> & { status?: string }
): Promise<AdminRoleGroup> {
  return requestJson(`/admin/role-groups/${id}`, adminRoleGroupSchema, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function listAdminCmsCategories(): Promise<CmsCategory[]> {
  return requestJson("/admin/cms/categories", z.array(cmsCategorySchema), { auth: true });
}

export function createAdminCmsCategory(input: { name: string; description?: string }): Promise<CmsCategory> {
  return requestJson("/admin/cms/categories", cmsCategorySchema, {
    auth: true,
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateAdminCmsCategory(id: string, input: Partial<CmsCategory>): Promise<CmsCategory> {
  return requestJson(`/admin/cms/categories/${id}`, cmsCategorySchema, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function listAdminFaqs(): Promise<Faq[]> {
  return requestJson("/admin/cms/faqs", z.array(faqSchema), { auth: true });
}

export function createAdminFaq(input: FaqInput): Promise<Faq> {
  return requestJson("/admin/cms/faqs", faqSchema, {
    auth: true,
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateAdminFaq(id: string, input: Partial<FaqInput> & { status?: string }): Promise<Faq> {
  return requestJson(`/admin/cms/faqs/${id}`, faqSchema, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function listAnnouncements(): Promise<Announcement[]> {
  return requestJson("/announcements", announcementListSchema);
}

export function listAdminAnnouncements(): Promise<Announcement[]> {
  return requestJson("/admin/cms/announcements", z.array(announcementSchema), { auth: true });
}

export function createAdminAnnouncement(input: AnnouncementInput): Promise<Announcement> {
  return requestJson("/admin/cms/announcements", announcementSchema, {
    auth: true,
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateAdminAnnouncement(
  id: string,
  input: Partial<AnnouncementInput> & { status?: string }
): Promise<Announcement> {
  return requestJson(`/admin/cms/announcements/${id}`, announcementSchema, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function getPolicy(type: PolicyType): Promise<CmsPolicy> {
  return requestJson(`/policies/${type}`, cmsPolicySchema);
}

export function listAdminPolicies(): Promise<CmsPolicy[]> {
  return requestJson("/admin/cms/policies", z.array(cmsPolicySchema), { auth: true });
}

export function upsertAdminPolicy(input: PolicyInput): Promise<CmsPolicy> {
  return requestJson("/admin/cms/policies", cmsPolicySchema, {
    auth: true,
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function listAdminEvents(): Promise<Event[]> {
  return requestJson("/admin/events", z.array(eventSchema), { auth: true });
}

export function listAdminTags(): Promise<Tag[]> {
  return requestJson("/admin/tags", z.array(tagSchema), { auth: true });
}

export function getAdminTag(id: string): Promise<AdminTagDetail> {
  return requestJson(`/admin/tags/${id}`, adminTagDetailSchema, { auth: true });
}

export function createAdminTag(input: { name: string; description?: string }): Promise<Tag> {
  return requestJson("/admin/tags", tagSchema, {
    auth: true,
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateAdminTag(id: string, input: { name?: string; description?: string }): Promise<Tag> {
  return requestJson(`/admin/tags/${id}`, tagSchema, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function archiveAdminTag(id: string): Promise<Tag> {
  return requestJson(`/admin/tags/${id}`, tagSchema, {
    auth: true,
    method: "DELETE"
  });
}

export function banAdminTag(id: string): Promise<Tag> {
  return requestJson(`/admin/tags/${id}/ban`, tagSchema, {
    auth: true,
    method: "POST"
  });
}

export function mergeAdminTag(id: string, targetTagId: string): Promise<Tag> {
  return requestJson(`/admin/tags/${id}/merge`, tagSchema, {
    auth: true,
    method: "POST",
    body: JSON.stringify({ targetTagId })
  });
}

export function archiveAdminEvent(id: string): Promise<Event> {
  return requestJson(`/admin/events/${id}`, eventSchema, {
    auth: true,
    method: "DELETE"
  });
}

export type AdminEventInput = {
  title: string;
  summary?: string;
  description: string;
  startsAt: string;
  endsAt?: string;
  timezone?: string;
  format: string;
  visibility?: string;
  city?: string;
  country?: string;
  language?: string;
  organizerName?: string;
  externalRegistrationUrl?: string;
  coverImageUrl?: string;
  status?: string;
  tagIds?: string[];
};

export type CreateReportInput = {
  targetType: "event" | "tag" | "user";
  targetId: string;
  ruleId?: string;
  reason: string;
  details?: string;
};

export type UpdateReportInput = {
  status: "open" | "reviewing" | "resolved" | "dismissed";
  resolutionNote?: string;
};

export type ResolveReportActionInput = {
  action: "archive_event" | "archive_tag" | "disable_user";
  resolutionNote?: string;
};

export type RoleGroupInput = {
  name: string;
  description?: string;
  permissions: AdminPermission[];
};

export type ReportRuleInput = {
  targetType: ReportTargetType;
  title: string;
  description?: string;
  violationScore: number;
};

export type ModerationDecisionInput = {
  decision: "violation" | "no_violation";
  action: "none" | "warn_user" | "suspend_user" | "ban_user" | "archive_event" | "archive_tag";
  penaltyScore: number;
  note?: string;
  suspensionEndsAt?: string;
};

export type FaqInput = {
  categoryId: string;
  title: string;
  body: string;
};

export type AnnouncementInput = {
  title: string;
  body: string;
  target?: string;
  publishAt?: string;
  expiresAt?: string;
};

export type PolicyInput = {
  type: PolicyType;
  title: string;
  body: string;
  status?: string;
};

export function updateAdminEvent(id: string, input: Partial<AdminEventInput>): Promise<Event> {
  return requestJson(`/admin/events/${id}`, eventSchema, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function createAdminEvent(input: AdminEventInput): Promise<Event> {
  return requestJson("/admin/events", eventSchema, {
    auth: true,
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function createUserEvent(input: AdminEventInput): Promise<Event> {
  return requestJson("/events", eventSchema, {
    auth: "user",
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function listMyEvents(): Promise<Event[]> {
  return requestJson("/me/events", z.array(eventSchema), { auth: "user" });
}

export function updateMyEvent(id: string, input: Partial<AdminEventInput>): Promise<Event> {
  return requestJson(`/me/events/${id}`, eventSchema, {
    auth: "user",
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function archiveMyEvent(id: string): Promise<Event> {
  return requestJson(`/me/events/${id}`, eventSchema, {
    auth: "user",
    method: "DELETE"
  });
}

export function createContentReport(input: CreateReportInput): Promise<ContentReport> {
  return requestJson("/reports", contentReportSchema, {
    auth: "user",
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function listReportRules(targetType?: ReportTargetType): Promise<ReportRule[]> {
  const params = new URLSearchParams();

  if (targetType) {
    params.set("targetType", targetType);
  }

  const query = params.toString();
  return requestJson(`/report-rules${query ? `?${query}` : ""}`, z.array(reportRuleSchema));
}

export function listAdminReports(): Promise<ContentReport[]> {
  return requestJson("/admin/reports", z.array(contentReportSchema), { auth: true });
}

export function listAdminReportGroups(scope: "active" | "old" = "active"): Promise<ReportGroup[]> {
  return requestJson(`/admin/report-groups?scope=${scope}`, z.array(reportGroupSchema), { auth: true });
}

export function getAdminReportGroup(targetType: ReportTargetType, targetId: string): Promise<ReportGroupDetail> {
  return requestJson(`/admin/report-groups/${targetType}/${targetId}`, reportGroupDetailSchema, { auth: true });
}

export function updateAdminReportGroupNote(
  targetType: ReportTargetType,
  targetId: string,
  note: string
): Promise<ReportGroupNote> {
  return requestJson(`/admin/report-groups/${targetType}/${targetId}/note`, reportGroupNoteSchema, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify({ note })
  });
}

export function createAdminModerationDecision(
  targetType: ReportTargetType,
  targetId: string,
  input: ModerationDecisionInput
): Promise<ModerationDecision> {
  return requestJson(`/admin/report-groups/${targetType}/${targetId}/decisions`, moderationDecisionSchema, {
    auth: true,
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function listAdminReportRules(): Promise<ReportRule[]> {
  return requestJson("/admin/report-rules", z.array(reportRuleSchema), { auth: true });
}

export function createAdminReportRule(input: ReportRuleInput): Promise<ReportRule> {
  return requestJson("/admin/report-rules", reportRuleSchema, {
    auth: true,
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateAdminReportRule(
  id: string,
  input: Partial<ReportRuleInput> & { status?: string }
): Promise<ReportRule> {
  return requestJson(`/admin/report-rules/${id}`, reportRuleSchema, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function updateAdminReport(id: string, input: UpdateReportInput): Promise<ContentReport> {
  return requestJson(`/admin/reports/${id}`, contentReportSchema, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function resolveAdminReportAction(id: string, input: ResolveReportActionInput): Promise<ContentReport> {
  return requestJson(`/admin/reports/${id}/actions`, contentReportSchema, {
    auth: true,
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function listEventParticipants(eventId: string, auth: AuthMode = true): Promise<EventParticipant[]> {
  return requestJson(`/events/${eventId}/participants`, z.array(eventParticipantSchema), { auth });
}

export function requestEventAttendance(eventId: string): Promise<EventParticipant> {
  return requestJson(`/events/${eventId}/attend`, eventParticipantSchema, {
    auth: "user",
    method: "POST"
  });
}

export function inviteEventParticipant(
  eventId: string,
  input: { userId?: string; email?: string; name?: string; role?: string },
  auth: AuthMode = true
): Promise<EventParticipant> {
  return requestJson(`/events/${eventId}/invite`, eventParticipantSchema, {
    auth,
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateEventParticipantStatus(
  eventId: string,
  userId: string,
  status: string,
  auth: AuthMode = true
): Promise<EventParticipant> {
  return requestJson(`/events/${eventId}/participants/${userId}`, eventParticipantSchema, {
    auth,
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

export function checkInEventParticipant(eventId: string, userId: string, auth: AuthMode = true): Promise<EventParticipant> {
  return requestJson(`/events/${eventId}/participants/${userId}/check-in`, eventParticipantSchema, {
    auth,
    method: "POST"
  });
}
