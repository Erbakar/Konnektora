import {
  adminDashboardSchema,
  adminManagedUserDetailSchema,
  adminManagedUserListSchema,
  adminManagedUserSchema,
  adminCommentSchema,
  adminMediaSchema,
  adminPlaceSchema,
  adminPrivateMessageSchema,
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
  eventTicketSchema,
  faqSchema,
  loginResponseSchema,
  memberCardsSchema,
  moderationDecisionSchema,
  notificationSchema,
  notificationPreferencesSchema,
  phoneVerificationResponseSchema,
  phoneSchema,
  profileSchema,
  privacySettingsSchema,
  reportGroupCommentSchema,
  reportGroupDetailSchema,
  reportGroupNoteSchema,
  reportGroupSchema,
  reportRuleSchema,
  tagSchema,
  tagAffinitiesSchema,
  tagCommentSchema,
  tagCommentsSchema,
  userMessageListSchema,
  userMessageSchema,
  userBlocksSchema,
  type AdminDashboard,
  type AdminComment,
  type AdminManagedUser,
  type AdminManagedUserDetail,
  type AdminManagedUserList,
  type AdminMedia,
  type AdminPermission,
  type AdminPlace,
  type AdminPrivateMessage,
  type AdminRoleGroup,
  type AdminTagDetail,
  type Announcement,
  type BlockedTargetType,
  type CmsPolicy,
  type CmsCategory,
  type ContentReport,
  type Event,
  type EventList,
  type EventParticipant,
  type EventTicket,
  type Faq,
  type LoginResponse,
  type MemberCard,
  type ModerationDecision,
  type Notification,
  type NotificationPreference,
  type PolicyType,
  type Profile,
  type PrivacySettings,
  type ReportRule,
  type ReportGroup,
  type ReportGroupComment,
  type ReportGroupDetail,
  type ReportGroupNote,
  type ReportTargetType,
  type Tag,
  type TagAffinity,
  type TagComment,
  type TagSentiment,
  type UserMessage,
  type UserMessageList,
  type UserMessageStatus,
  type UserMessageType,
  type UserBlock
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
const USER_TAG_SENTIMENTS_KEY = "konnektora_user_tag_sentiments";
const MOCK_EVENTS_KEY = "konnektora_mock_events";
const MOCK_TAGS_KEY = "konnektora_mock_tags";
const MOCK_USERS_KEY = "konnektora_mock_users";
const MOCK_PARTICIPANTS_KEY = "konnektora_mock_participants";
const MOCK_EVENT_TICKETS_KEY = "konnektora_mock_event_tickets";
const MOCK_REPORTS_KEY = "konnektora_mock_reports";
const MOCK_REPORT_RULES_KEY = "konnektora_mock_report_rules";
const MOCK_REPORT_GROUP_NOTES_KEY = "konnektora_mock_report_group_notes";
const MOCK_REPORT_GROUP_COMMENTS_KEY = "konnektora_mock_report_group_comments";
const MOCK_MODERATION_DECISIONS_KEY = "konnektora_mock_moderation_decisions";
const MOCK_EMAIL_TOKENS_KEY = "konnektora_mock_email_tokens";
const MOCK_USER_EVENT_IDS_KEY = "konnektora_mock_user_event_ids";
const MOCK_ROLE_GROUPS_KEY = "konnektora_mock_role_groups";
const MOCK_CMS_CATEGORIES_KEY = "konnektora_mock_cms_categories";
const MOCK_FAQS_KEY = "konnektora_mock_faqs";
const MOCK_ANNOUNCEMENTS_KEY = "konnektora_mock_announcements";
const MOCK_POLICIES_KEY = "konnektora_mock_policies";
const MOCK_USER_MESSAGES_KEY = "konnektora_mock_user_messages";
const MOCK_PLACES_KEY = "konnektora_mock_places";
const MOCK_MEDIA_KEY = "konnektora_mock_media";
const MOCK_COMMENTS_KEY = "konnektora_mock_comments";
const MOCK_PRIVATE_MESSAGES_KEY = "konnektora_mock_private_messages";
const MOCK_NOTIFICATIONS_KEY = "konnektora_mock_notifications";
const MOCK_PHONE_VERIFICATIONS_KEY = "konnektora_mock_phone_verifications";
const MOCK_PRIVACY_SETTINGS_KEY = "konnektora_mock_privacy_settings";
const MOCK_NOTIFICATION_PREFERENCES_KEY = "konnektora_mock_notification_preferences";
const MOCK_USER_BLOCKS_KEY = "konnektora_mock_user_blocks";
const MOCK_USER_FOLLOWS_KEY = "konnektora_mock_user_follows";
const MOCK_TAG_COMMENTS_KEY = "konnektora_mock_tag_comments";
const MOCK_ADMIN_TOKEN = "mock-admin-token";

export const isMockApiMode = USE_MOCK_FALLBACK;

type AuthMode = boolean | "admin" | "user";
type MockUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  username?: string | null;
  status?: AdminManagedUser["status"];
  role?: "user" | "admin" | "super_admin";
  adminRoleGroupId?: string | null;
  accountType?: string;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  district?: string | null;
  address?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  website?: string | null;
  companyName?: string | null;
  tradeName?: string | null;
  companyType?: string | null;
  businessCategory?: string | null;
  followerCount?: number;
  followingCount?: number;
  lastOnlineAt?: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  invitedById?: string | null;
  penaltyScoreLastYear?: number;
  penaltyScoreAllTime?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ProfileUpdateInput = {
  name: string;
  username?: string;
  phone?: string;
  country?: string;
  city?: string;
  district?: string;
  address?: string;
  gender?: "male" | "female";
  birthDate?: string;
  website?: string;
  companyName?: string;
  tradeName?: string;
  companyType?: string;
  businessCategory?: string;
};

export type RegistrationInput = {
  name: string;
  email: string;
  password: string;
  accountType: "individual" | "corporate";
  companyName?: string;
  tradeName?: string;
  companyType?: string;
  businessCategory?: string;
};

export const adminPermissionOptions: Array<{ value: AdminPermission; label: string }> = [
  { value: "cms.categories.manage", label: "CMS Kategori Yönetimi" },
  { value: "cms.faq.manage", label: "CMS SSS Yönetimi" },
  { value: "cms.announcements.manage", label: "CMS Duyuru Yönetimi" },
  { value: "cms.policies.manage", label: "CMS Diğer İçeriklerin Yönetimi" },
  { value: "reports.manage", label: "Şikayetlerin Yönetimi" },
  { value: "users.manage", label: "Üyelerin Yönetimi" },
  { value: "roles.manage", label: "Üyelerin Rol Yönetimi" },
  { value: "tags.manage", label: "İlgi Alanı Yönetimi" },
  { value: "events.manage", label: "Etkinlik Yönetimi" },
  { value: "places.manage", label: "Mekan Yönetimi" },
  { value: "comments.manage", label: "Yorum Yönetimi" },
  { value: "media.manage", label: "Medya Yönetimi" },
  { value: "messages.faq.manage", label: "Kullanıcılardan Mesajlar - FAQ mesajları" },
  { value: "messages.account_freeze.manage", label: "Kullanıcılardan Mesajlar - Hesap dondurma mesajları" },
  { value: "messages.write_to_us.manage", label: "Kullanıcılardan Mesajlar - Write to us mesajları" }
];

type CmsCategoryInput = {
  name: string;
  description?: string;
  type?: CmsCategory["type"];
};

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

function getMockTagAffinities(): TagAffinity[] {
  const user = getUserSession();
  if (!user) return [];
  const sentiments = readStorage<Record<string, Record<string, TagSentiment>>>(USER_TAG_SENTIMENTS_KEY, {});
  return getTagsByIds(getUserInterestTagIds()).map((tag) => ({
    tag,
    sentiment: sentiments[user.id]?.[tag.id] ?? "like"
  }));
}

function updateMockTagAffinities(affinities: Array<{ tagId: string; sentiment: TagSentiment }>) {
  const user = getUserSession();
  if (!user) throw new Error("User session required");
  setUserInterestTagIds(affinities.map((affinity) => affinity.tagId));
  const sentiments = readStorage<Record<string, Record<string, TagSentiment>>>(USER_TAG_SENTIMENTS_KEY, {});
  writeStorage(USER_TAG_SENTIMENTS_KEY, {
    ...sentiments,
    [user.id]: Object.fromEntries(affinities.map((affinity) => [affinity.tagId, affinity.sentiment]))
  });
  return getMockTagAffinities();
}

export function listMyNotifications(): Promise<Notification[]> {
  return requestJson("/profile/notifications", z.array(notificationSchema), { auth: "user" });
}

export function markMyNotificationRead(id: string): Promise<Notification> {
  return requestJson(`/profile/notifications/${id}/read`, notificationSchema, { auth: "user", method: "PATCH" });
}

function listMockNotifications(): Notification[] {
  const user = getUserSession();
  const notifications = readStorage<Notification[]>(MOCK_NOTIFICATIONS_KEY, []);

  return notifications
    .filter((notification) => !user || notification.userId === user.id)
    .sort((first, second) => {
      if (Boolean(first.readAt) !== Boolean(second.readAt)) {
        return first.readAt ? 1 : -1;
      }

      return new Date(second.createdAt ?? 0).getTime() - new Date(first.createdAt ?? 0).getTime();
    });
}

function createMockNotification(input: Omit<Notification, "id" | "createdAt" | "readAt">) {
  const notifications = readStorage<Notification[]>(MOCK_NOTIFICATIONS_KEY, []);
  const notification: Notification = {
    ...input,
    id: createId(),
    readAt: null,
    createdAt: new Date().toISOString()
  };
  writeStorage(MOCK_NOTIFICATIONS_KEY, [notification, ...notifications]);
  return notification;
}

function markMockNotificationRead(id: string): Notification {
  const notifications = readStorage<Notification[]>(MOCK_NOTIFICATIONS_KEY, []);
  const updated = notifications.map((notification) =>
    notification.id === id ? { ...notification, readAt: new Date().toISOString() } : notification
  );
  const notification = updated.find((item) => item.id === id);
  if (!notification) {
    throw new Error("Mock notification not found");
  }
  writeStorage(MOCK_NOTIFICATIONS_KEY, updated);
  return notification;
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
    return schema.parse(registerMockUser(parseBody<RegistrationInput>(options)));
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

  if (pathname === "/auth/password/change" && method === "POST") {
    return schema.parse(changeMockPassword(parseBody<{ currentPassword: string; newPassword: string }>(options)));
  }

  if (pathname === "/auth/deactivate" && method === "POST") {
    return schema.parse(deactivateMockAccount(parseBody<{ currentPassword: string; reason: string }>(options)));
  }

  if (pathname === "/auth/reactivate" && method === "POST") {
    return schema.parse(reactivateMockAccount(parseBody<{ email: string; password: string }>(options)));
  }

  if (pathname === "/auth/phone/verification/request" && method === "POST") {
    return schema.parse(requestMockPhoneVerification(parseBody<{ phone: string }>(options).phone));
  }

  if (pathname === "/auth/phone/verification/confirm" && method === "POST") {
    return schema.parse(confirmMockPhoneVerification(parseBody<{ phone: string; code: string }>(options)));
  }

  if (pathname === "/auth/invite/accept" && method === "POST") {
    const input = parseBody<{ token: string; name?: string; password: string }>(options);
    return schema.parse(acceptMockInvite(input.token, input.password, input.name));
  }

  if (pathname === "/profile" && method === "GET") {
    return schema.parse(getMockProfile());
  }

  if (pathname === "/profile" && method === "PUT") {
    return schema.parse(updateMockProfile(parseBody<ProfileUpdateInput>(options)));
  }

  if (pathname === "/profile/privacy" && method === "GET") {
    return schema.parse(getMockPrivacySettings());
  }

  if (pathname === "/profile/privacy" && method === "PUT") {
    return schema.parse(updateMockPrivacySettings(parseBody<Omit<PrivacySettings, "userId" | "createdAt" | "updatedAt">>(options)));
  }

  if (pathname === "/profile/notification-preferences" && method === "GET") {
    return schema.parse(getMockNotificationPreferences());
  }

  if (pathname === "/profile/notification-preferences" && method === "PUT") {
    return schema.parse(updateMockNotificationPreferences(parseBody<{ preferences: NotificationPreference[] }>(options).preferences));
  }

  if (pathname === "/profile/blocks" && method === "GET") {
    return schema.parse(listMockBlocks());
  }

  if (pathname === "/profile/blocks" && method === "POST") {
    return schema.parse(createMockBlock(parseBody<{ targetType: BlockedTargetType; targetId: string }>(options)));
  }

  if (pathname.startsWith("/profile/blocks/") && method === "DELETE") {
    const [targetType, targetId] = pathname.slice("/profile/blocks/".length).split("/");
    return schema.parse(removeMockBlock(targetType as BlockedTargetType, targetId ?? ""));
  }

  if (pathname === "/social/suggestions" && method === "GET") {
    return schema.parse(listMockMemberSuggestions());
  }

  if (pathname === "/social/following" && method === "GET") {
    return schema.parse(listMockFollowing());
  }

  if (pathname.startsWith("/social/following/") && method === "POST") {
    return schema.parse(followMockUser(pathname.slice("/social/following/".length)));
  }

  if (pathname.startsWith("/social/following/") && method === "DELETE") {
    return schema.parse(unfollowMockUser(pathname.slice("/social/following/".length)));
  }

  if (pathname.startsWith("/tags/") && pathname.endsWith("/comments") && method === "GET") {
    return schema.parse(listMockTagComments(pathname.slice("/tags/".length, -"/comments".length)));
  }

  if (pathname.startsWith("/tags/") && pathname.endsWith("/comments") && method === "POST") {
    const tagId = pathname.slice("/tags/".length, -"/comments".length);
    return schema.parse(createMockTagComment(tagId, parseBody<{ body: string }>(options).body));
  }

  if (pathname.startsWith("/tags/") && pathname.includes("/comments/") && method === "DELETE") {
    const [tagId, commentId] = pathname.slice("/tags/".length).split("/comments/");
    return schema.parse(deleteMockTagComment(tagId ?? "", commentId ?? ""));
  }

  if (pathname === "/profile/interests" && method === "GET") {
    return schema.parse(getTagsByIds(getUserInterestTagIds()));
  }

  if (pathname === "/profile/interests" && method === "PUT") {
    const input = parseBody<{ tagIds: string[] }>(options);
    setUserInterestTagIds(input.tagIds);
    return schema.parse(getTagsByIds(input.tagIds));
  }

  if (pathname === "/profile/affinities" && method === "GET") {
    return schema.parse(getMockTagAffinities());
  }

  if (pathname === "/profile/affinities" && method === "PUT") {
    const input = parseBody<{ affinities: Array<{ tagId: string; sentiment: TagSentiment }> }>(options);
    return schema.parse(updateMockTagAffinities(input.affinities));
  }

  if (pathname === "/profile/notifications" && method === "GET") {
    return schema.parse(listMockNotifications());
  }

  if (pathname.startsWith("/profile/notifications/") && pathname.endsWith("/read") && method === "PATCH") {
    const id = pathname.slice("/profile/notifications/".length, -"/read".length);
    return schema.parse(markMockNotificationRead(id));
  }

  if ((pathname === "/messages" || pathname === "/me/messages") && method === "POST") {
    return schema.parse(createMockUserMessage(parseBody<UserMessageInput>(options), pathname === "/me/messages"));
  }

  if (pathname.startsWith("/admin/messages/") && method === "GET") {
    const messageType = userMessageTypeFromAdminPath(pathname);

    if (messageType) {
      return schema.parse(listMockUserMessages(messageType, new URLSearchParams(queryString)));
    }

    return schema.parse(getMockUserMessage(pathname.slice("/admin/messages/".length)));
  }

  if (pathname.startsWith("/admin/messages/") && method === "PATCH") {
    return schema.parse(updateMockUserMessage(pathname.slice("/admin/messages/".length), parseBody<{ status: UserMessageStatus }>(options)));
  }

  if (pathname === "/admin/content/places" && method === "GET") {
    return schema.parse(listMockPlaces(new URLSearchParams(queryString)));
  }

  if (pathname.startsWith("/admin/content/places/") && method === "GET") {
    return schema.parse(getMockPlace(pathname.slice("/admin/content/places/".length)));
  }

  if (pathname.startsWith("/admin/content/places/") && method === "PATCH") {
    return schema.parse(updateMockContentItem(MOCK_PLACES_KEY, pathname.slice("/admin/content/places/".length), parseBody<{ status: string }>(options)));
  }

  if (pathname === "/admin/content/media" && method === "GET") {
    return schema.parse(listMockMedia(new URLSearchParams(queryString)));
  }

  if (pathname.startsWith("/admin/content/media/") && method === "GET") {
    return schema.parse(getMockMedia(pathname.slice("/admin/content/media/".length)));
  }

  if (pathname.startsWith("/admin/content/media/") && method === "PATCH") {
    return schema.parse(updateMockContentItem(MOCK_MEDIA_KEY, pathname.slice("/admin/content/media/".length), parseBody<{ status: string }>(options)));
  }

  if (pathname === "/admin/content/comments" && method === "GET") {
    return schema.parse(listMockComments(new URLSearchParams(queryString)));
  }

  if (pathname.startsWith("/admin/content/comments/") && method === "GET") {
    return schema.parse(getMockComment(pathname.slice("/admin/content/comments/".length)));
  }

  if (pathname.startsWith("/admin/content/comments/") && method === "PATCH") {
    return schema.parse(updateMockContentItem(MOCK_COMMENTS_KEY, pathname.slice("/admin/content/comments/".length), parseBody<{ status: string }>(options)));
  }

  if (pathname === "/admin/content/private-messages" && method === "GET") {
    return schema.parse(listMockPrivateMessages(new URLSearchParams(queryString)));
  }

  if (pathname.startsWith("/admin/content/private-messages/") && method === "GET") {
    return schema.parse(getMockPrivateMessage(pathname.slice("/admin/content/private-messages/".length)));
  }

  if (pathname.startsWith("/admin/content/private-messages/") && method === "PATCH") {
    return schema.parse(updateMockContentItem(MOCK_PRIVATE_MESSAGES_KEY, pathname.slice("/admin/content/private-messages/".length), parseBody<{ status: string }>(options)));
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

  if (pathname.startsWith("/admin/users/") && pathname.endsWith("/actions") && method === "POST") {
    const userId = pathname.slice("/admin/users/".length, -"/actions".length);
    return schema.parse(runMockAdminUserAction(userId, parseBody<AdminUserActionInput>(options)));
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
    return schema.parse(createMockCmsCategory(parseBody<CmsCategoryInput>(options)));
  }

  if (pathname.startsWith("/admin/cms/categories/") && method === "PATCH") {
    return schema.parse(
      updateMockCmsCategory(pathname.slice("/admin/cms/categories/".length), parseBody<Partial<CmsCategory>>(options))
    );
  }

  if (pathname.startsWith("/admin/cms/categories/") && method === "DELETE") {
    deleteMockCmsCategory(pathname.slice("/admin/cms/categories/".length));
    return schema.parse({ ok: true });
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

  if (pathname.startsWith("/admin/cms/faqs/") && method === "DELETE") {
    deleteMockFaq(pathname.slice("/admin/cms/faqs/".length));
    return schema.parse({ ok: true });
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

  if (pathname.startsWith("/admin/report-groups/") && pathname.endsWith("/comments") && method === "POST") {
    const { targetType, targetId } = parseReportGroupPath(pathname.slice(0, -"/comments".length));
    return schema.parse(createMockReportGroupComment(targetType, targetId, parseBody<{ body: string }>(options).body));
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

  if (pathname.startsWith("/events/") && pathname.endsWith("/ticket") && method === "GET") {
    return schema.parse(issueMockEventTicket(pathname.slice("/events/".length, -"/ticket".length)));
  }

  if (pathname.startsWith("/events/") && pathname.endsWith("/check-in/scan") && method === "POST") {
    return schema.parse(
      scanMockEventTicket(
        pathname.slice("/events/".length, -"/check-in/scan".length),
        parseBody<{ token: string }>(options).token
      )
    );
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
    const blockedTagIds = new Set(listMockBlocks().filter((block) => block.targetType === "tag").map((block) => block.targetId));
    return schema.parse(getStoredTags().filter((tag) => tag.status === "active" && !blockedTagIds.has(tag.id)));
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
    const blocks = listMockBlocks();
    const blockedEventIds = new Set(blocks.filter((block) => block.targetType === "event").map((block) => block.targetId));
    const blockedTagIds = new Set(blocks.filter((block) => block.targetType === "tag").map((block) => block.targetId));
    const events = getStoredEvents().filter(
      (eventItem) =>
        eventItem.status === "published" &&
        !blockedEventIds.has(eventItem.id) &&
        !eventItem.tags.some((tag) => blockedTagIds.has(tag.id)) &&
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

    const blocks = listMockBlocks();
    const isBlocked = event && (blocks.some((block) => block.targetType === "event" && block.targetId === event.id) || event.tags.some((tag) => blocks.some((block) => block.targetType === "tag" && block.targetId === tag.id)));
    return event && !isBlocked ? schema.parse(event) : undefined;
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

function userMessageTypeFromAdminPath(pathname: string): UserMessageType | null {
  if (pathname === "/admin/messages/faq") {
    return "faq";
  }

  if (pathname === "/admin/messages/account-freeze") {
    return "account_freeze";
  }

  if (pathname === "/admin/messages/write-to-us") {
    return "write_to_us";
  }

  return null;
}

function getStoredUserMessages(): UserMessage[] {
  const now = new Date().toISOString();
  const seededMessages: UserMessage[] = [
    {
      id: "70000000-0000-4000-8000-000000000001",
      type: "faq",
      category: "Events",
      userId: null,
      name: "Deniz Yilmaz",
      email: "deniz@example.com",
      phone: "+90 555 000 0001",
      body: "Etkinlik davetleri icin SSS'de hangi adimlari takip etmeliyim?",
      status: "unread",
      appVersion: "web-demo",
      systemInfo: "Chrome / macOS",
      readAt: null,
      readById: null,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "70000000-0000-4000-8000-000000000002",
      type: "account_freeze",
      category: null,
      userId: null,
      name: "Ayse Kaya",
      email: "ayse@example.com",
      phone: null,
      body: "Hesabimi bir sure dondurmak istiyorum.",
      status: "read",
      appVersion: "ios-0.1",
      systemInfo: "iOS 18",
      readAt: now,
      readById: null,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "70000000-0000-4000-8000-000000000003",
      type: "write_to_us",
      category: "Oneriler",
      userId: null,
      name: "Mert Demir",
      email: "mert@example.com",
      phone: "+90 555 000 0003",
      body: "Etkinliklerde sektore gore filtreleme daha gorunur olabilir.",
      status: "unread",
      appVersion: "web-demo",
      systemInfo: "Safari / macOS",
      readAt: null,
      readById: null,
      createdAt: now,
      updatedAt: now
    }
  ];
  const storedMessages = readStorage<UserMessage[]>(MOCK_USER_MESSAGES_KEY, []);
  const storedIds = new Set(storedMessages.map((message) => message.id));

  return [...storedMessages, ...seededMessages.filter((message) => !storedIds.has(message.id))];
}

function setStoredUserMessages(messages: UserMessage[]) {
  writeStorage(MOCK_USER_MESSAGES_KEY, messages);
}

function createMockUserMessage(input: UserMessageInput, useCurrentUser: boolean): UserMessage {
  const user = useCurrentUser ? getUserSession() : null;
  const now = new Date().toISOString();
  const message: UserMessage = {
    id: createId(),
    type: input.type,
    category: input.category?.trim() || null,
    userId: user?.id ?? null,
    name: input.name.trim() || user?.name || "Konnektora User",
    email: input.email.trim().toLowerCase() || user?.email || "user@example.com",
    phone: input.phone?.trim() || null,
    body: input.body.trim(),
    status: "unread",
    appVersion: input.appVersion?.trim() || null,
    systemInfo: input.systemInfo?.trim() || null,
    readAt: null,
    readById: null,
    createdAt: now,
    updatedAt: now,
    user: user ? { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status } : null,
    readBy: null
  };

  setStoredUserMessages([message, ...getStoredUserMessages()]);
  return message;
}

function listMockUserMessages(type: UserMessageType, params: URLSearchParams): UserMessageList {
  const status = params.get("status");
  const category = params.get("category");
  const q = params.get("q")?.toLowerCase().trim();
  const page = Math.max(Number(params.get("page") || "1"), 1);
  const pageSize = Math.min(Math.max(Number(params.get("pageSize") || "25"), 1), 100);
  const messages = getStoredUserMessages()
    .filter(
      (message) =>
        message.type === type &&
        (!status || message.status === status) &&
        (!category || message.category === category) &&
        (!q || [message.name, message.email, message.phone ?? "", message.body].join(" ").toLowerCase().includes(q))
    )
    .sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "unread" ? -1 : 1;
      }

      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    });
  const start = (page - 1) * pageSize;

  return {
    items: messages.slice(start, start + pageSize),
    total: messages.length,
    page,
    pageSize,
    hasNextPage: start + pageSize < messages.length
  };
}

function getMockUserMessage(id: string): UserMessage {
  const message = getStoredUserMessages().find((item) => item.id === id);

  if (!message) {
    throw new Error("Mock user message not found");
  }

  return message;
}

function updateMockUserMessage(id: string, input: { status: UserMessageStatus }): UserMessage {
  const messages = getStoredUserMessages();
  const admin = getUserSession() ?? {
    id: "99999999-9999-4999-8999-999999999999",
    email: "admin@konnektora.local",
    name: "Konnektora Admin",
    role: "super_admin" as const,
    status: "active" as const
  };
  const updatedMessages = messages.map((message) =>
    message.id === id
      ? {
          ...message,
          status: input.status,
          readAt: input.status === "read" ? new Date().toISOString() : null,
          readById: input.status === "read" ? admin.id : null,
          readBy: input.status === "read" ? admin : null,
          updatedAt: new Date().toISOString()
        }
      : message
  );
  const updatedMessage = updatedMessages.find((message) => message.id === id);

  if (!updatedMessage) {
    throw new Error("Mock user message not found");
  }

  setStoredUserMessages(updatedMessages);
  return updatedMessage;
}

function basicMockUser(id?: string | null) {
  const user = id ? getAllMockUsers().find((item) => item.id === id) : null;
  return user ? { id: user.id, email: user.email, name: user.name, role: user.role ?? "user", status: user.status ?? "active" } : null;
}

function defaultMockPlaces(): AdminPlace[] {
  const now = new Date().toISOString();
  return [
    {
      id: "60000000-6000-4000-8000-000000000001",
      name: "Konnektora Hub Berlin",
      slug: "konnektora-hub-berlin",
      description: "Community meetup venue",
      status: "active",
      coverImageUrl: null,
      country: "Germany",
      city: "Berlin",
      address: "Mitte",
      followerCount: 42,
      inviteCount: 8,
      createdById: "88888888-8888-4888-8888-888888888888",
      updatedById: null,
      createdAt: now,
      updatedAt: now,
      createdBy: basicMockUser("88888888-8888-4888-8888-888888888888"),
      updatedBy: null,
      reportCount: 0
    }
  ];
}

function filterMockAdminContent<T extends { status: string }>(items: T[], params: URLSearchParams): T[] {
  const q = params.get("q")?.toLowerCase().trim();
  const status = params.get("status");
  return items.filter((item) => (!status || item.status === status) && (!q || JSON.stringify(item).toLowerCase().includes(q)));
}

function listMockPlaces(params: URLSearchParams): AdminPlace[] {
  const stored = readStorage<AdminPlace[]>(MOCK_PLACES_KEY, []);
  return filterMockAdminContent(stored.length ? stored : defaultMockPlaces(), params);
}

function getMockPlace(id: string): AdminPlace {
  const item = listMockPlaces(new URLSearchParams()).find((place) => place.id === id);
  if (!item) throw new Error("Mock place not found");
  return { ...item, reportCount: listMockReports().filter((report) => report.targetType === "place" && report.targetId === id).length };
}

function listMockMedia(params: URLSearchParams): AdminMedia[] {
  const now = new Date().toISOString();
  const items = readStorage<AdminMedia[]>(MOCK_MEDIA_KEY, [
    {
      id: "61000000-6000-4000-8000-000000000001",
      url: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622",
      type: "image",
      status: "active",
      contentType: "event",
      contentId: "mock-event",
      uploadedById: "88888888-8888-4888-8888-888888888888",
      createdAt: now,
      updatedAt: now,
      uploadedBy: basicMockUser("88888888-8888-4888-8888-888888888888"),
      reportCount: 0
    }
  ]);
  return filterMockAdminContent(items, params);
}

function getMockMedia(id: string): AdminMedia {
  const item = listMockMedia(new URLSearchParams()).find((media) => media.id === id);
  if (!item) throw new Error("Mock media not found");
  return { ...item, reportCount: listMockReports().filter((report) => report.targetType === "media" && report.targetId === id).length };
}

function listMockComments(params: URLSearchParams): AdminComment[] {
  const now = new Date().toISOString();
  const items = readStorage<AdminComment[]>(MOCK_COMMENTS_KEY, [
    {
      id: "62000000-6000-4000-8000-000000000001",
      targetType: "event",
      targetId: "mock-event",
      parentId: null,
      authorId: "88888888-8888-4888-8888-888888888888",
      body: "Harika bir etkinlik gibi görünüyor.",
      status: "active",
      likeCount: 3,
      createdAt: now,
      updatedAt: now,
      author: basicMockUser("88888888-8888-4888-8888-888888888888"),
      parent: null,
      _count: { replies: 0 },
      reportCount: 0
    }
  ]);
  return filterMockAdminContent(items, params);
}

function getMockComment(id: string): AdminComment {
  const item = listMockComments(new URLSearchParams()).find((comment) => comment.id === id);
  if (!item) throw new Error("Mock comment not found");
  return { ...item, reportCount: listMockReports().filter((report) => ["tag_comment", "event_comment", "place_comment", "comment_reply"].includes(report.targetType) && report.targetId === id).length };
}

function listMockPrivateMessages(params: URLSearchParams): AdminPrivateMessage[] {
  const now = new Date().toISOString();
  const items = readStorage<AdminPrivateMessage[]>(MOCK_PRIVATE_MESSAGES_KEY, [
    {
      id: "63000000-6000-4000-8000-000000000001",
      senderId: "88888888-8888-4888-8888-888888888888",
      recipientId: "99999999-9999-4999-8999-999999999999",
      body: "Merhaba, etkinlik hakkında konuşabilir miyiz?",
      status: "active",
      createdAt: now,
      updatedAt: now,
      sender: basicMockUser("88888888-8888-4888-8888-888888888888"),
      recipient: basicMockUser("99999999-9999-4999-8999-999999999999"),
      reportCount: 0
    }
  ]);
  return filterMockAdminContent(items, params);
}

function getMockPrivateMessage(id: string): AdminPrivateMessage {
  const item = listMockPrivateMessages(new URLSearchParams()).find((message) => message.id === id);
  if (!item) throw new Error("Mock private message not found");
  return { ...item, reportCount: listMockReports().filter((report) => report.targetType === "private_message" && report.targetId === id).length };
}

function updateMockContentItem<T extends { id: string; status: string; updatedAt?: string }>(key: string, id: string, input: { status: string }): T {
  const fallback = key === MOCK_PLACES_KEY ? defaultMockPlaces() : [];
  const items = readStorage<T[]>(key, fallback as unknown as T[]);
  const updated = items.map((item) => (item.id === id ? { ...item, status: input.status, updatedAt: new Date().toISOString() } : item));
  const item = updated.find((entry) => entry.id === id);
  if (!item) throw new Error("Mock content item not found");
  writeStorage(key, updated);
  return item;
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

type MockEventTicket = Pick<EventTicket, "eventId" | "token" | "issuedAt"> & { userId: string };

function issueMockEventTicket(eventId: string): EventTicket {
  const user = getUserSession();
  const event = getStoredEvents().find((item) => item.id === eventId);
  const participant = readStorage<EventParticipant[]>(MOCK_PARTICIPANTS_KEY, []).find(
    (item) => item.eventId === eventId && item.userId === user?.id
  );

  if (!user || !event || !participant || !["accepted", "invited"].includes(participant.status)) {
    throw new Error("Aktif etkinlik bileti bulunamadı.");
  }

  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const issuedAt = new Date().toISOString();
  const tickets = readStorage<MockEventTicket[]>(MOCK_EVENT_TICKETS_KEY, []);
  writeStorage(MOCK_EVENT_TICKETS_KEY, [
    { eventId, userId: user.id, token, issuedAt },
    ...tickets.filter((ticket) => !(ticket.eventId === eventId && ticket.userId === user.id))
  ]);

  return {
    eventId,
    eventTitle: event.title,
    token,
    qrPayload: `konnektora://check-in?event=${encodeURIComponent(eventId)}&token=${token}`,
    issuedAt
  };
}

function scanMockEventTicket(eventId: string, token: string): EventParticipant {
  const ticket = readStorage<MockEventTicket[]>(MOCK_EVENT_TICKETS_KEY, []).find(
    (item) => item.eventId === eventId && item.token === token
  );
  if (!ticket) throw new Error("QR bilet geçersiz.");

  const participant = readStorage<EventParticipant[]>(MOCK_PARTICIPANTS_KEY, []).find(
    (item) => item.eventId === eventId && item.userId === ticket.userId
  );
  if (participant?.status === "attended") throw new Error("Bu bilet daha önce kullanılmış.");
  if (!participant || !["accepted", "invited"].includes(participant.status)) {
    throw new Error("QR bilet check-in için uygun değil.");
  }
  return updateMockParticipantStatus(eventId, ticket.userId, "attended", new Date().toISOString());
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
  const comments = readStorage<ReportGroupComment[]>(MOCK_REPORT_GROUP_COMMENTS_KEY, []);
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
        comments: comments.filter((comment) => comment.targetType === targetType && comment.targetId === targetId),
        activityLogs: [],
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

function createMockReportGroupComment(targetType: ReportTargetType, targetId: string, body: string): ReportGroupComment {
  const comments = readStorage<ReportGroupComment[]>(MOCK_REPORT_GROUP_COMMENTS_KEY, []);
  const adminUser = {
    id: "11111111-1111-4111-8111-111111111111",
    email: "admin@konnektora.local",
    name: "Demo Admin",
    role: "admin" as const,
    status: "active" as const
  };
  const comment: ReportGroupComment = {
    id: createId(),
    targetType,
    targetId,
    body: body.trim(),
    createdById: adminUser.id,
    createdBy: adminUser,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  writeStorage(MOCK_REPORT_GROUP_COMMENTS_KEY, [comment, ...comments]);
  return comment;
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
  if (targetUserId) {
    createMockNotification({
      userId: targetUserId,
      type: "moderation_decision",
      title: "Moderasyon kararı",
      body: input.note?.trim() || `${input.action} aksiyonu uygulandı.`,
      targetType,
      targetId
    });
  }
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
      users.map((user) => (user.id === targetId ? { ...user, status: action === "ban_user" ? "banned" : "suspended" } : user))
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
      username: "konnektora_admin",
      password: "ChangeMe123!",
      role: "super_admin",
      status: "active",
      accountType: "individual",
      country: "Türkiye",
      city: "Istanbul",
      phone: "+90 555 000 0001",
      emailVerified: true,
      followerCount: 12,
      followingCount: 4,
      lastOnlineAt: new Date().toISOString()
    },
    {
      id: "88888888-8888-4888-8888-888888888888",
      email: "user@konnektora.local",
      name: "Konnektora User",
      username: "konnektora_user",
      password: "ChangeMe123!",
      role: "user",
      status: "active",
      accountType: "individual",
      country: "Germany",
      city: "Berlin",
      gender: "Belirtilmemis",
      phone: "+49 555 000 0002",
      emailVerified: true,
      followerCount: 8,
      followingCount: 21,
      lastOnlineAt: new Date().toISOString()
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
    type: category.type ?? "faq",
    _count: { faqs: faqs.filter((faq) => faq.categoryId === category.id).length }
  }));
}

function createMockCmsCategory(input: CmsCategoryInput): CmsCategory {
  const categories = listMockCmsCategories();
  const category: CmsCategory = {
    id: createId(),
    name: input.name.trim(),
    slug: uniqueSlug(input.name, categories.map((item) => item.slug)),
    description: input.description?.trim() || null,
    type: input.type ?? "faq",
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
          type: input.type ?? category.type,
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

function deleteMockCmsCategory(id: string) {
  const categories = listMockCmsCategories();
  writeStorage(MOCK_CMS_CATEGORIES_KEY, categories.filter((category) => category.id !== id));
  writeStorage(MOCK_FAQS_KEY, readStorage<Faq[]>(MOCK_FAQS_KEY, []).filter((faq) => faq.categoryId !== id));
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

function deleteMockFaq(id: string) {
  writeStorage(MOCK_FAQS_KEY, readStorage<Faq[]>(MOCK_FAQS_KEY, []).filter((faq) => faq.id !== id));
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
    targetLastLoginFrom: input.targetLastLoginFrom || null,
    targetLastLoginTo: input.targetLastLoginTo || null,
    targetJoinedFrom: input.targetJoinedFrom || null,
    targetJoinedTo: input.targetJoinedTo || null,
    targetAppVersion: input.targetAppVersion?.trim() || null,
    publishMode: (input.publishMode as Announcement["publishMode"]) || "scheduled",
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
          targetLastLoginFrom:
            input.targetLastLoginFrom === undefined ? announcement.targetLastLoginFrom ?? null : input.targetLastLoginFrom || null,
          targetLastLoginTo:
            input.targetLastLoginTo === undefined ? announcement.targetLastLoginTo ?? null : input.targetLastLoginTo || null,
          targetJoinedFrom:
            input.targetJoinedFrom === undefined ? announcement.targetJoinedFrom ?? null : input.targetJoinedFrom || null,
          targetJoinedTo: input.targetJoinedTo === undefined ? announcement.targetJoinedTo ?? null : input.targetJoinedTo || null,
          targetAppVersion:
            input.targetAppVersion === undefined ? announcement.targetAppVersion ?? null : input.targetAppVersion?.trim() || null,
          publishMode: (input.publishMode as Announcement["publishMode"]) ?? announcement.publishMode ?? "scheduled",
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
    username: user.username ?? user.name.toLowerCase().replaceAll(" ", "_"),
    role: user.role ?? "user",
    status: user.status ?? "active",
    accountType: user.accountType ?? "individual",
    phone: user.phone ?? null,
    country: user.country ?? null,
    city: user.city ?? null,
    district: user.district ?? null,
    address: user.address ?? null,
    gender: user.gender ?? null,
    birthDate: user.birthDate ?? null,
    website: user.website ?? null,
    companyName: user.companyName ?? null,
    tradeName: user.tradeName ?? null,
    companyType: user.companyType ?? null,
    businessCategory: user.businessCategory ?? null,
    followerCount: user.followerCount ?? 0,
    followingCount: user.followingCount ?? 0,
    lastOnlineAt: user.lastOnlineAt ?? null,
    emailVerified: user.emailVerified ?? false,
    invitedById: user.invitedById ?? null,
    penaltyScoreLastYear: user.penaltyScoreLastYear ?? 0,
    penaltyScoreAllTime: user.penaltyScoreAllTime ?? 0,
    adminRoleGroupId: user.adminRoleGroupId ?? null,
    adminRoleGroup,
    createdAt: user.createdAt ?? new Date().toISOString(),
    updatedAt: user.updatedAt ?? new Date().toISOString(),
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
  const accountType = params.get("accountType");
  const country = params.get("country")?.toLowerCase().trim();
  const city = params.get("city")?.toLowerCase().trim();
  const gender = params.get("gender");
  const email = params.get("email")?.toLowerCase().trim();
  const phone = params.get("phone")?.toLowerCase().trim();
  const ageFrom = params.get("ageFrom") ? Number(params.get("ageFrom")) : undefined;
  const ageTo = params.get("ageTo") ? Number(params.get("ageTo")) : undefined;
  const sortBy = params.get("sortBy") || "createdAt";
  const sortDir = params.get("sortDir") === "asc" ? "asc" : "desc";
  const page = Math.max(Number(params.get("page") || "1"), 1);
  const pageSize = Math.min(Math.max(Number(params.get("pageSize") || "25"), 1), 100);
  const users = getAllMockUsers()
    .map(toAdminManagedUser)
    .filter(
      (user) =>
        (!q || [user.username, user.name, user.email, user.phone, user.country, user.city, user.companyName, user.tradeName].join(" ").toLowerCase().includes(q)) &&
        (!status || user.status === status) &&
        (!role || user.role === role) &&
        (!accountType || user.accountType === accountType) &&
        (!country || (user.country ?? "").toLowerCase().includes(country)) &&
        (!city || (user.city ?? "").toLowerCase().includes(city)) &&
        (!gender || user.gender === gender) &&
        (!email || user.email.toLowerCase().includes(email)) &&
        (!phone || (user.phone ?? "").toLowerCase().includes(phone)) &&
        (ageFrom === undefined || getAge(user.birthDate) >= ageFrom) &&
        (ageTo === undefined || getAge(user.birthDate) <= ageTo)
    )
    .sort((first, second) => compareMockUsers(first, second, sortBy, sortDir));
  const start = (page - 1) * pageSize;

  return {
    items: users.slice(start, start + pageSize),
    total: users.length,
    page,
    pageSize,
    hasNextPage: page * pageSize < users.length
  };
}

function getAge(value?: string | Date | null) {
  if (!value) return 0;
  const birthDate = new Date(value);
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDelta = now.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return Math.max(age, 0);
}

function compareMockUsers(first: AdminManagedUser, second: AdminManagedUser, sortBy: string, sortDir: string) {
  const direction = sortDir === "asc" ? 1 : -1;
  const valueBySort = (user: AdminManagedUser) => {
    if (sortBy === "username") return user.username ?? "";
    if (sortBy === "followers") return user.followerCount ?? 0;
    if (sortBy === "following") return user.followingCount ?? 0;
    if (sortBy === "lastOnlineAt") return user.lastOnlineAt ? new Date(user.lastOnlineAt).getTime() : 0;
    return user.createdAt ? new Date(user.createdAt).getTime() : 0;
  };
  const firstValue = valueBySort(first);
  const secondValue = valueBySort(second);

  if (typeof firstValue === "string" && typeof secondValue === "string") {
    return firstValue.localeCompare(secondValue) * direction;
  }

  return (Number(firstValue) - Number(secondValue)) * direction;
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
    interestTags: getTagsByIds(allInterests[id] ?? []),
    invitedBy: (() => {
      const inviter = managedUser.invitedById ? getAllMockUsers().find((item) => item.id === managedUser.invitedById) : null;
      return inviter ? { id: inviter.id, email: inviter.email, name: inviter.name, role: inviter.role ?? "user", status: inviter.status ?? "active" } : null;
    })(),
    invitedUsers: getAllMockUsers()
      .filter((item) => item.invitedById === id)
      .slice(0, 20)
      .map((item) => ({ id: item.id, email: item.email, name: item.name, role: item.role ?? "user", status: item.status ?? "active" }))
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
    username: input.username === undefined ? existing.username : input.username ?? null,
    name: input.name ?? existing.name,
    email: input.email ?? existing.email,
    status: input.status ?? existing.status,
    role: input.role ?? existing.role,
    accountType: input.accountType ?? existing.accountType,
    phone: input.phone === undefined ? existing.phone : input.phone ?? null,
    country: input.country === undefined ? existing.country : input.country ?? null,
    city: input.city === undefined ? existing.city : input.city ?? null,
    district: input.district === undefined ? existing.district : input.district ?? null,
    address: input.address === undefined ? existing.address : input.address ?? null,
    gender: input.gender === undefined ? existing.gender : input.gender ?? null,
    birthDate: input.birthDate === undefined ? existing.birthDate : input.birthDate ? String(input.birthDate) : null,
    website: input.website === undefined ? existing.website : input.website ?? null,
    companyName: input.companyName === undefined ? existing.companyName : input.companyName ?? null,
    tradeName: input.tradeName === undefined ? existing.tradeName : input.tradeName ?? null,
    companyType: input.companyType === undefined ? existing.companyType : input.companyType ?? null,
    businessCategory: input.businessCategory === undefined ? existing.businessCategory : input.businessCategory ?? null,
    followerCount: input.followerCount ?? existing.followerCount,
    followingCount: input.followingCount ?? existing.followingCount,
    penaltyScoreLastYear: input.penaltyScoreLastYear ?? existing.penaltyScoreLastYear,
    penaltyScoreAllTime: input.penaltyScoreAllTime ?? existing.penaltyScoreAllTime,
    adminRoleGroupId:
      input.adminRoleGroupId === undefined ? existing.adminRoleGroupId ?? null : input.adminRoleGroupId ?? null,
    updatedAt: new Date().toISOString()
  };
  const nextUsers = users.some((user) => user.id === id)
    ? users.map((user) => (user.id === id ? updatedUser : user))
    : [updatedUser, ...users];

  writeStorage(MOCK_USERS_KEY, nextUsers);
  return toAdminManagedUser(updatedUser);
}

function runMockAdminUserAction(id: string, input: AdminUserActionInput): AdminManagedUserDetail {
  const notify = () =>
    createMockNotification({
      userId: id,
      type: "admin_user_action",
      title: "Hesap müdahalesi",
      body: input.note?.trim() || input.action,
      targetType: "user",
      targetId: id
    });

  if (input.action === "send_verification_email" || input.action === "send_password_reset") {
    notify();
    return getMockAdminUser(id);
  }

  if (input.action === "reset_username") {
    updateMockAdminUser(id, { username: `User${Date.now().toString().slice(-8)}` });
    notify();
    return getMockAdminUser(id);
  }

  if (input.action === "remove_website") {
    updateMockAdminUser(id, { website: null });
    notify();
    return getMockAdminUser(id);
  }

  if (input.action === "suspend_7_days" || input.action === "suspend_30_days") {
    updateMockAdminUser(id, { status: "suspended" });
    notify();
    return getMockAdminUser(id);
  }

  if (input.action === "ban_user") {
    updateMockAdminUser(id, { status: "banned" });
    notify();
    return getMockAdminUser(id);
  }

  if (input.action === "activate_user") {
    updateMockAdminUser(id, { status: "active" });
    notify();
    return getMockAdminUser(id);
  }

  return getMockAdminUser(id);
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

  if (action === "disable_user") {
    return "Rapor sonucunda kullanıcı disable edildi.";
  }

  return `${action} aksiyonu uygulandı.`;
}

function parseParticipantPath(pathname: string, marker: string) {
  const [eventId, userId] = pathname.slice("/events/".length).split(marker);

  if (!eventId || !userId) {
    throw new Error("Invalid participant path");
  }

  return { eventId, userId };
}

function registerMockUser(input: RegistrationInput): LoginResponse {
  const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  const email = input.email.toLowerCase().trim();
  const existing = users.find((user) => user.email === email);

  if (existing) {
    const activatedUser: MockUser = {
      ...existing,
      name: input.name.trim(),
      password: input.password,
      accountType: input.accountType ?? existing.accountType ?? "individual",
      companyName: input.accountType === "corporate" ? input.companyName : null,
      tradeName: input.accountType === "corporate" ? input.tradeName : null,
      companyType: input.accountType === "corporate" ? input.companyType : null,
      businessCategory: input.accountType === "corporate" ? input.businessCategory : null,
      emailVerified: false,
      status: "pending"
    };

    writeStorage(MOCK_USERS_KEY, [activatedUser, ...users.filter((user) => user.id !== existing.id)]);
    return createMockLoginResponse(activatedUser);
  }

  const user: MockUser = {
    id: createId(),
    name: input.name.trim(),
    email,
    password: input.password,
    accountType: input.accountType ?? "individual",
    companyName: input.accountType === "corporate" ? input.companyName : null,
    tradeName: input.accountType === "corporate" ? input.tradeName : null,
    companyType: input.accountType === "corporate" ? input.companyType : null,
    businessCategory: input.accountType === "corporate" ? input.businessCategory : null,
    emailVerified: false,
    status: "pending"
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

  const user: MockUser = {
    ...existing,
    status: type === "password_reset" ? existing.status : "active",
    emailVerified: type === "verify_email" ? true : existing.emailVerified
  };
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

function changeMockPassword(input: { currentPassword: string; newPassword: string }) {
  const session = getUserSession();
  const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  const user = users.find((item) => item.id === session?.id);
  if (!user || user.password !== input.currentPassword || user.password === input.newPassword) {
    throw new Error("Current password does not match");
  }
  writeStorage(MOCK_USERS_KEY, [{ ...user, password: input.newPassword }, ...users.filter((item) => item.id !== user.id)]);
  return { ok: true };
}

function deactivateMockAccount(input: { currentPassword: string; reason: string }) {
  const session = getUserSession();
  const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  const user = users.find((item) => item.id === session?.id);
  if (!user || user.password !== input.currentPassword || input.reason.trim().length < 3) {
    throw new Error("Account cannot be deactivated");
  }
  writeStorage(MOCK_USERS_KEY, [{ ...user, status: "frozen" }, ...users.filter((item) => item.id !== user.id)]);
  return { ok: true };
}

function reactivateMockAccount(input: { email: string; password: string }): LoginResponse {
  const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  const user = users.find((item) => item.email === input.email.toLowerCase().trim() && item.password === input.password && item.status === "frozen");
  if (!user) {
    throw new Error("Frozen account not found");
  }
  const activeUser: MockUser = { ...user, status: "active" };
  writeStorage(MOCK_USERS_KEY, [activeUser, ...users.filter((item) => item.id !== user.id)]);
  return createMockLoginResponse(activeUser);
}

function requestMockPhoneVerification(phone: string) {
  const session = getUserSession();
  if (!session) throw new Error("User session required");
  const code = Math.floor(Math.random() * 1_000_000).toString().padStart(6, "0");
  const verifications = readStorage<Record<string, { phone: string; code: string; expiresAt: number }>>(MOCK_PHONE_VERIFICATIONS_KEY, {});
  writeStorage(MOCK_PHONE_VERIFICATIONS_KEY, {
    ...verifications,
    [session.id]: { phone, code, expiresAt: Date.now() + 120_000 }
  });
  return { ok: true, expiresInSeconds: 120, developmentCode: code };
}

function confirmMockPhoneVerification(input: { phone: string; code: string }) {
  const session = getUserSession();
  const verifications = readStorage<Record<string, { phone: string; code: string; expiresAt: number }>>(MOCK_PHONE_VERIFICATIONS_KEY, {});
  const verification = session ? verifications[session.id] : undefined;
  if (!session || !verification || verification.phone !== input.phone || verification.code !== input.code || verification.expiresAt < Date.now()) {
    throw new Error("Invalid phone verification code");
  }
  const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  const user = users.find((item) => item.id === session.id);
  if (user) {
    writeStorage(MOCK_USERS_KEY, [{ ...user, phone: input.phone, phoneVerified: true }, ...users.filter((item) => item.id !== user.id)]);
  }
  return { ok: true, phone: input.phone, phoneVerified: true };
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

function createMockLoginResponse(user: { id: string; name: string; email: string; accountType?: string; emailVerified?: boolean; status?: AdminManagedUser["status"] }): LoginResponse {
  return {
    accessToken: `mock-user-token-${user.id}`,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: "user",
      accountType: user.accountType === "corporate" ? "corporate" : "individual",
      emailVerified: "emailVerified" in user ? Boolean(user.emailVerified) : false,
      status: user.status ?? "active"
    }
  };
}

function getMockProfile(): Profile {
  const session = getUserSession();
  if (!session) {
    throw new Error("Aktif kullanıcı oturumu bulunamadı.");
  }

  const stored = readStorage<MockUser[]>(MOCK_USERS_KEY, []).find((user) => user.id === session.id);
  const now = new Date().toISOString();
  return profileSchema.parse({
    id: session.id,
    accountType: stored?.accountType === "corporate" ? "corporate" : session.accountType ?? "individual",
    name: stored?.name ?? session.name,
    username: stored?.username ?? null,
    email: stored?.email ?? session.email,
    phone: stored?.phone ?? null,
    phoneVerified: stored?.phoneVerified ?? false,
    country: stored?.country ?? null,
    city: stored?.city ?? null,
    district: stored?.district ?? null,
    address: stored?.address ?? null,
    gender: stored?.gender === "male" || stored?.gender === "female" ? stored.gender : null,
    birthDate: stored?.birthDate ?? null,
    website: stored?.website ?? null,
    companyName: stored?.companyName ?? null,
    tradeName: stored?.tradeName ?? null,
    companyType: stored?.companyType ?? null,
    businessCategory: stored?.businessCategory ?? null,
    emailVerified: stored?.emailVerified ?? false,
    createdAt: stored?.createdAt ?? now,
    updatedAt: stored?.updatedAt ?? now
  });
}

function updateMockProfile(input: ProfileUpdateInput): Profile {
  const profile = getMockProfile();
  const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  const current = users.find((user) => user.id === profile.id);
  const updated: MockUser = {
    ...(current ?? { id: profile.id, email: profile.email, password: "", name: profile.name }),
    ...input,
    name: input.name.trim(),
    username: input.username?.trim() || null,
    updatedAt: new Date().toISOString()
  };
  writeStorage(MOCK_USERS_KEY, [updated, ...users.filter((user) => user.id !== profile.id)]);
  setUserSession({ accessToken: getUserToken() ?? `mock-user-token-${profile.id}`, user: { ...getUserSession()!, name: updated.name } });
  return getMockProfile();
}

function getMockPrivacySettings(): PrivacySettings {
  const session = getUserSession();
  if (!session) throw new Error("User session required");
  const settings = readStorage<Record<string, PrivacySettings>>(MOCK_PRIVACY_SETTINGS_KEY, {});
  return settings[session.id] ?? {
    userId: session.id,
    messageAudience: "everybody",
    directoryDiscoverable: false,
    eventAudience: "everybody",
    eventInviteAudience: "everybody",
    placeAudience: "everybody",
    placeInviteAudience: "everybody"
  };
}

function updateMockPrivacySettings(input: Omit<PrivacySettings, "userId" | "createdAt" | "updatedAt">): PrivacySettings {
  const current = getMockPrivacySettings();
  const updated = privacySettingsSchema.parse({ ...current, ...input, updatedAt: new Date().toISOString() });
  const settings = readStorage<Record<string, PrivacySettings>>(MOCK_PRIVACY_SETTINGS_KEY, {});
  writeStorage(MOCK_PRIVACY_SETTINGS_KEY, { ...settings, [current.userId]: updated });
  return updated;
}

const mockNotificationTopics: NotificationPreference["topic"][] = [
  "tag_request", "private_message", "mention", "comment", "password_changed", "email_changed", "phone_changed",
  "login", "admin_message", "event_invite", "event_manager", "place_invite", "place_manager"
];

function getMockNotificationPreferences(): NotificationPreference[] {
  const session = getUserSession();
  if (!session) throw new Error("User session required");
  const stored = readStorage<Record<string, NotificationPreference[]>>(MOCK_NOTIFICATION_PREFERENCES_KEY, {});
  const selected = new Map((stored[session.id] ?? []).map((item) => [item.topic, item.channel]));
  return mockNotificationTopics.map((topic) => ({
    topic,
    channel: selected.get(topic) ?? (["password_changed", "email_changed", "phone_changed", "login"].includes(topic) ? "email" : "both")
  }));
}

function updateMockNotificationPreferences(preferences: NotificationPreference[]) {
  const session = getUserSession();
  if (!session) throw new Error("User session required");
  const stored = readStorage<Record<string, NotificationPreference[]>>(MOCK_NOTIFICATION_PREFERENCES_KEY, {});
  writeStorage(MOCK_NOTIFICATION_PREFERENCES_KEY, { ...stored, [session.id]: preferences });
  return getMockNotificationPreferences();
}

function listMockBlocks(): UserBlock[] {
  const session = getUserSession();
  if (!session) return [];
  const stored = readStorage<Record<string, UserBlock[]>>(MOCK_USER_BLOCKS_KEY, {});
  return stored[session.id] ?? [];
}

function createMockBlock(input: { targetType: BlockedTargetType; targetId: string }) {
  const session = getUserSession();
  if (!session || (input.targetType === "user" && input.targetId === session.id)) throw new Error("Invalid block");
  const detail =
    input.targetType === "event"
      ? getStoredEvents().find((item) => item.id === input.targetId)
      : input.targetType === "tag"
        ? getStoredTags().find((item) => item.id === input.targetId)
        : input.targetType === "place"
          ? listMockPlaces(new URLSearchParams()).find((item) => item.id === input.targetId)
          : getAllMockUsers().find((item) => item.id === input.targetId);
  if (!detail) throw new Error("Block target not found");
  const label = "title" in detail ? String(detail.title) : "username" in detail && detail.username ? `@${detail.username}` : String(detail.name);
  const block: UserBlock = { targetType: input.targetType, targetId: input.targetId, label, createdAt: new Date().toISOString() };
  const stored = readStorage<Record<string, UserBlock[]>>(MOCK_USER_BLOCKS_KEY, {});
  const current = stored[session.id] ?? [];
  writeStorage(MOCK_USER_BLOCKS_KEY, {
    ...stored,
    [session.id]: [block, ...current.filter((item) => item.targetType !== input.targetType || item.targetId !== input.targetId)]
  });
  if (input.targetType === "user") {
    const follows = readStorage<Record<string, string[]>>(MOCK_USER_FOLLOWS_KEY, {});
    const next = Object.fromEntries(
      Object.entries(follows).map(([followerId, ids]) => [
        followerId,
        ids.filter((followingId) => !(followerId === session.id && followingId === input.targetId) && !(followerId === input.targetId && followingId === session.id))
      ])
    );
    writeStorage(MOCK_USER_FOLLOWS_KEY, next);
  }
  return { ok: true };
}

function removeMockBlock(targetType: BlockedTargetType, targetId: string) {
  const session = getUserSession();
  if (!session) throw new Error("User session required");
  const stored = readStorage<Record<string, UserBlock[]>>(MOCK_USER_BLOCKS_KEY, {});
  writeStorage(MOCK_USER_BLOCKS_KEY, {
    ...stored,
    [session.id]: (stored[session.id] ?? []).filter((item) => item.targetType !== targetType || item.targetId !== targetId)
  });
  return { ok: true };
}

function mockFollowIds() {
  const session = getUserSession();
  const follows = readStorage<Record<string, string[]>>(MOCK_USER_FOLLOWS_KEY, {});
  return session ? follows[session.id] ?? [] : [];
}

function toMockMemberCard(user: MockUser, following: boolean): MemberCard {
  const ownTags = new Set(getUserInterestTagIds());
  const interests = readStorage<Record<string, string[]>>(USER_INTEREST_TAGS_KEY, {});
  return {
    id: user.id,
    name: user.name,
    username: user.username ?? null,
    accountType: user.accountType === "corporate" ? "corporate" : "individual",
    city: user.city ?? null,
    country: user.country ?? null,
    followerCount: user.followerCount ?? 0,
    commonTagCount: (interests[user.id] ?? []).filter((tagId) => ownTags.has(tagId)).length,
    following
  };
}

function listMockMemberSuggestions() {
  const session = getUserSession();
  if (!session) return [];
  const followed = new Set(mockFollowIds());
  const blocked = new Set(listMockBlocks().filter((block) => block.targetType === "user").map((block) => block.targetId));
  return getAllMockUsers()
    .filter((user) => user.id !== session.id && user.status !== "banned" && !followed.has(user.id) && !blocked.has(user.id))
    .map((user) => toMockMemberCard(user, false))
    .sort((a, b) => b.commonTagCount - a.commonTagCount || b.followerCount - a.followerCount)
    .slice(0, 20);
}

function listMockFollowing() {
  const followed = new Set(mockFollowIds());
  return getAllMockUsers().filter((user) => followed.has(user.id)).map((user) => toMockMemberCard(user, true));
}

function followMockUser(targetUserId: string) {
  const session = getUserSession();
  if (!session || session.id === targetUserId || !getAllMockUsers().some((user) => user.id === targetUserId)) throw new Error("User cannot be followed");
  const follows = readStorage<Record<string, string[]>>(MOCK_USER_FOLLOWS_KEY, {});
  writeStorage(MOCK_USER_FOLLOWS_KEY, { ...follows, [session.id]: [...new Set([...(follows[session.id] ?? []), targetUserId])] });
  return { ok: true, following: true };
}

function unfollowMockUser(targetUserId: string) {
  const session = getUserSession();
  if (!session) throw new Error("User session required");
  const follows = readStorage<Record<string, string[]>>(MOCK_USER_FOLLOWS_KEY, {});
  writeStorage(MOCK_USER_FOLLOWS_KEY, { ...follows, [session.id]: (follows[session.id] ?? []).filter((id) => id !== targetUserId) });
  return { ok: true, following: false };
}

function listMockTagComments(tagId: string): TagComment[] {
  const session = getUserSession();
  const blockedUsers = new Set(listMockBlocks().filter((block) => block.targetType === "user").map((block) => block.targetId));
  return readStorage<TagComment[]>(MOCK_TAG_COMMENTS_KEY, [])
    .filter((comment) => comment.tagId === tagId && (!comment.author || !blockedUsers.has(comment.author.id)))
    .map((comment) => ({ ...comment, canDelete: comment.author?.id === session?.id }));
}

function createMockTagComment(tagId: string, body: string): TagComment {
  const session = getUserSession();
  if (!session || !getStoredTags().some((tag) => tag.id === tagId)) throw new Error("Tag comment cannot be created");
  const now = new Date().toISOString();
  const comment: TagComment = {
    id: createId(),
    tagId,
    body: body.trim(),
    likeCount: 0,
    createdAt: now,
    updatedAt: now,
    canDelete: true,
    author: { id: session.id, name: session.name, username: null }
  };
  const comments = readStorage<TagComment[]>(MOCK_TAG_COMMENTS_KEY, []);
  writeStorage(MOCK_TAG_COMMENTS_KEY, [comment, ...comments]);
  return comment;
}

function deleteMockTagComment(tagId: string, commentId: string) {
  const session = getUserSession();
  const comments = readStorage<TagComment[]>(MOCK_TAG_COMMENTS_KEY, []);
  const comment = comments.find((item) => item.id === commentId && item.tagId === tagId);
  if (!session || comment?.author?.id !== session.id) throw new Error("Tag comment cannot be deleted");
  writeStorage(MOCK_TAG_COMMENTS_KEY, comments.filter((item) => item.id !== commentId));
  return { ok: true };
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
  const interestedUserCount = Object.values(interestedUsers).filter((tagIds) => tagIds.includes(id)).length;

  return {
    ...tag,
    category: null,
    createdBy: null,
    updatedBy: null,
    reportCount: reports.length,
    likeCount: Math.max(Math.floor(interestedUserCount * 0.4), 0),
    okCount: interestedUserCount,
    dislikeCount: Math.max(Math.floor(reports.length * 0.5), 0),
    commentCount: reports.length,
    viewCount: interestedUserCount * 12,
    viewerCount: interestedUserCount * 4,
    firstCommenter: null,
    firstProfileUser: null,
    _count: {
      events: getStoredEvents().filter((event) => event.tags.some((item) => item.id === id)).length,
      interestedUsers: interestedUserCount
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
      Object.entries(interests).map(([userId, tagIds]) => {
        if (tagIds.includes(sourceTagId)) {
          createMockNotification({
            userId,
            type: "tag_merge",
            title: "İlgi alanı taşındı",
            body: `${sourceTag.name} ilgi alanı ${targetTag.name} altında birleştirildi.`,
            targetType: "tag",
            targetId: targetTagId
          });
        }

        return [userId, [...new Set(tagIds.map((tagId) => (tagId === sourceTagId ? targetTagId : tagId)))]];
      })
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
  const allowed: ReportTargetType[] = [
    "event",
    "tag",
    "user",
    "media",
    "place",
    "username",
    "website_url",
    "tag_comment",
    "event_comment",
    "place_comment",
    "comment_reply",
    "private_message"
  ];
  return allowed.includes(value as ReportTargetType) ? (value as ReportTargetType) : "event";
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
  return requestJson(`/events${query ? `?${query}` : ""}`, eventListSchema, { auth: "user" });
}

export function getEvent(slug: string): Promise<Event> {
  return requestJson(`/events/${slug}`, eventSchema, { auth: "user" });
}

export function listTags(): Promise<Tag[]> {
  return requestJson("/tags", z.array(tagSchema), { auth: "user" });
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

export function getProfileAffinities(): Promise<TagAffinity[]> {
  return requestJson("/profile/affinities", tagAffinitiesSchema, { auth: "user" });
}

export function getMyProfile(): Promise<Profile> {
  return requestJson("/profile", profileSchema, { auth: "user" });
}

export function updateMyProfile(input: ProfileUpdateInput): Promise<Profile> {
  return requestJson("/profile", profileSchema, { auth: "user", method: "PUT", body: JSON.stringify(input) });
}

export function getPrivacySettings(): Promise<PrivacySettings> {
  return requestJson("/profile/privacy", privacySettingsSchema, { auth: "user" });
}

export function updatePrivacySettings(input: Omit<PrivacySettings, "userId" | "createdAt" | "updatedAt">): Promise<PrivacySettings> {
  return requestJson("/profile/privacy", privacySettingsSchema, { auth: "user", method: "PUT", body: JSON.stringify(input) });
}

export function getNotificationPreferences(): Promise<NotificationPreference[]> {
  return requestJson("/profile/notification-preferences", notificationPreferencesSchema, { auth: "user" });
}

export function updateNotificationPreferences(preferences: NotificationPreference[]): Promise<NotificationPreference[]> {
  return requestJson("/profile/notification-preferences", notificationPreferencesSchema, {
    auth: "user",
    method: "PUT",
    body: JSON.stringify({ preferences })
  });
}

export function listBlocks(): Promise<UserBlock[]> {
  return requestJson("/profile/blocks", userBlocksSchema, { auth: "user" });
}

export function createBlock(targetType: BlockedTargetType, targetId: string): Promise<{ ok: boolean }> {
  return requestJson("/profile/blocks", z.object({ ok: z.boolean() }), {
    auth: "user",
    method: "POST",
    body: JSON.stringify({ targetType, targetId })
  });
}

export function removeBlock(targetType: BlockedTargetType, targetId: string): Promise<{ ok: boolean }> {
  return requestJson(`/profile/blocks/${targetType}/${targetId}`, z.object({ ok: z.boolean() }), {
    auth: "user",
    method: "DELETE"
  });
}

export function listMemberSuggestions(): Promise<MemberCard[]> {
  return requestJson("/social/suggestions", memberCardsSchema, { auth: "user" });
}

export function listFollowing(): Promise<MemberCard[]> {
  return requestJson("/social/following", memberCardsSchema, { auth: "user" });
}

export function followUser(targetUserId: string): Promise<{ ok: boolean; following: boolean }> {
  return requestJson(`/social/following/${targetUserId}`, z.object({ ok: z.boolean(), following: z.boolean() }), { auth: "user", method: "POST" });
}

export function unfollowUser(targetUserId: string): Promise<{ ok: boolean; following: boolean }> {
  return requestJson(`/social/following/${targetUserId}`, z.object({ ok: z.boolean(), following: z.boolean() }), { auth: "user", method: "DELETE" });
}

export function updateProfileInterests(tagIds: string[]): Promise<Tag[]> {
  return requestJson("/profile/interests", z.array(tagSchema), {
    auth: "user",
    method: "PUT",
    body: JSON.stringify({ tagIds })
  });
}

export function updateProfileAffinities(affinities: Array<{ tagId: string; sentiment: TagSentiment }>): Promise<TagAffinity[]> {
  return requestJson("/profile/affinities", tagAffinitiesSchema, {
    auth: "user",
    method: "PUT",
    body: JSON.stringify({ affinities })
  });
}

export function listTagComments(tagId: string): Promise<TagComment[]> {
  return requestJson(`/tags/${tagId}/comments`, tagCommentsSchema, { auth: "user" });
}

export function createTagComment(tagId: string, body: string): Promise<TagComment> {
  return requestJson(`/tags/${tagId}/comments`, tagCommentSchema, { auth: "user", method: "POST", body: JSON.stringify({ body }) });
}

export function deleteTagComment(tagId: string, commentId: string): Promise<{ ok: boolean }> {
  return requestJson(`/tags/${tagId}/comments/${commentId}`, z.object({ ok: z.boolean() }), { auth: "user", method: "DELETE" });
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

export function registerUser(input: RegistrationInput): Promise<LoginResponse> {
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

export function changePassword(input: { currentPassword: string; newPassword: string }): Promise<{ ok: boolean }> {
  return requestJson("/auth/password/change", z.object({ ok: z.boolean() }), {
    auth: "user",
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function deactivateAccount(input: { currentPassword: string; reason: string }): Promise<{ ok: boolean }> {
  return requestJson("/auth/deactivate", z.object({ ok: z.boolean() }), { auth: "user", method: "POST", body: JSON.stringify(input) });
}

export function reactivateAccount(email: string, password: string): Promise<LoginResponse> {
  return requestJson("/auth/reactivate", loginResponseSchema, { method: "POST", body: JSON.stringify({ email, password }) });
}

export function requestPhoneVerification(phone: string) {
  return requestJson("/auth/phone/verification/request", phoneVerificationResponseSchema, {
    auth: "user",
    method: "POST",
    body: JSON.stringify({ phone })
  });
}

export function confirmPhoneVerification(phone: string, code: string) {
  return requestJson(
    "/auth/phone/verification/confirm",
    z.object({ ok: z.literal(true), phone: phoneSchema, phoneVerified: z.literal(true) }),
    { auth: "user", method: "POST", body: JSON.stringify({ phone, code }) }
  );
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
  input: Partial<AdminManagedUser>
): Promise<AdminManagedUser> {
  return requestJson(`/admin/users/${id}`, adminManagedUserSchema, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export type AdminUserActionInput = {
  action:
    | "reset_username"
    | "remove_website"
    | "send_verification_email"
    | "send_password_reset"
    | "suspend_7_days"
    | "suspend_30_days"
    | "ban_user"
    | "activate_user";
  note?: string;
};

export function runAdminUserAction(id: string, input: AdminUserActionInput): Promise<AdminManagedUserDetail> {
  return requestJson(`/admin/users/${id}/actions`, adminManagedUserDetailSchema, {
    auth: true,
    method: "POST",
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

export function createUserMessage(input: UserMessageInput): Promise<UserMessage> {
  return requestJson("/messages", userMessageSchema, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function createMyMessage(input: UserMessageInput): Promise<UserMessage> {
  return requestJson("/me/messages", userMessageSchema, {
    auth: "user",
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function listAdminMessages(type: UserMessageType, params?: URLSearchParams): Promise<UserMessageList> {
  const pathByType: Record<UserMessageType, string> = {
    faq: "/admin/messages/faq",
    account_freeze: "/admin/messages/account-freeze",
    write_to_us: "/admin/messages/write-to-us"
  };
  const query = params?.toString();

  return requestJson(`${pathByType[type]}${query ? `?${query}` : ""}`, userMessageListSchema, { auth: true });
}

export function getAdminMessage(id: string): Promise<UserMessage> {
  return requestJson(`/admin/messages/${id}`, userMessageSchema, { auth: true });
}

export function updateAdminMessage(id: string, status: UserMessageStatus): Promise<UserMessage> {
  return requestJson(`/admin/messages/${id}`, userMessageSchema, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

export function listAdminPlaces(params?: URLSearchParams): Promise<AdminPlace[]> {
  const query = params?.toString();
  return requestJson(`/admin/content/places${query ? `?${query}` : ""}`, z.array(adminPlaceSchema), { auth: true });
}

export function getAdminPlace(id: string): Promise<AdminPlace> {
  return requestJson(`/admin/content/places/${id}`, adminPlaceSchema, { auth: true });
}

export function updateAdminPlace(id: string, status: string): Promise<AdminPlace> {
  return requestJson(`/admin/content/places/${id}`, adminPlaceSchema, { auth: true, method: "PATCH", body: JSON.stringify({ status }) });
}

export function listAdminMedia(params?: URLSearchParams): Promise<AdminMedia[]> {
  const query = params?.toString();
  return requestJson(`/admin/content/media${query ? `?${query}` : ""}`, z.array(adminMediaSchema), { auth: true });
}

export function getAdminMedia(id: string): Promise<AdminMedia> {
  return requestJson(`/admin/content/media/${id}`, adminMediaSchema, { auth: true });
}

export function updateAdminMedia(id: string, status: string): Promise<AdminMedia> {
  return requestJson(`/admin/content/media/${id}`, adminMediaSchema, { auth: true, method: "PATCH", body: JSON.stringify({ status }) });
}

export function listAdminComments(params?: URLSearchParams): Promise<AdminComment[]> {
  const query = params?.toString();
  return requestJson(`/admin/content/comments${query ? `?${query}` : ""}`, z.array(adminCommentSchema), { auth: true });
}

export function getAdminComment(id: string): Promise<AdminComment> {
  return requestJson(`/admin/content/comments/${id}`, adminCommentSchema, { auth: true });
}

export function updateAdminComment(id: string, status: string): Promise<AdminComment> {
  return requestJson(`/admin/content/comments/${id}`, adminCommentSchema, { auth: true, method: "PATCH", body: JSON.stringify({ status }) });
}

export function listAdminPrivateMessages(params?: URLSearchParams): Promise<AdminPrivateMessage[]> {
  const query = params?.toString();
  return requestJson(`/admin/content/private-messages${query ? `?${query}` : ""}`, z.array(adminPrivateMessageSchema), { auth: true });
}

export function getAdminPrivateMessage(id: string): Promise<AdminPrivateMessage> {
  return requestJson(`/admin/content/private-messages/${id}`, adminPrivateMessageSchema, { auth: true });
}

export function updateAdminPrivateMessage(id: string, status: string): Promise<AdminPrivateMessage> {
  return requestJson(`/admin/content/private-messages/${id}`, adminPrivateMessageSchema, { auth: true, method: "PATCH", body: JSON.stringify({ status }) });
}

export function listAdminCmsCategories(): Promise<CmsCategory[]> {
  return requestJson("/admin/cms/categories", z.array(cmsCategorySchema), { auth: true });
}

export function createAdminCmsCategory(input: CmsCategoryInput): Promise<CmsCategory> {
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

export function deleteAdminCmsCategory(id: string): Promise<{ ok: true }> {
  return requestJson(`/admin/cms/categories/${id}`, z.object({ ok: z.literal(true) }), {
    auth: true,
    method: "DELETE"
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

export function deleteAdminFaq(id: string): Promise<{ ok: true }> {
  return requestJson(`/admin/cms/faqs/${id}`, z.object({ ok: z.literal(true) }), {
    auth: true,
    method: "DELETE"
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
  targetType: ReportTargetType;
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
  action:
    | "archive_event"
    | "archive_tag"
    | "remove_media"
    | "archive_place"
    | "remove_comment"
    | "reset_username"
    | "remove_website"
    | "remove_private_messages"
    | "disable_user";
  resolutionNote?: string;
};

export type RoleGroupInput = {
  name: string;
  description?: string;
  permissions: AdminPermission[];
};

export type UserMessageInput = {
  type: UserMessageType;
  category?: string;
  name: string;
  email: string;
  phone?: string;
  body: string;
  appVersion?: string;
  systemInfo?: string;
};

export type ReportRuleInput = {
  targetType: ReportTargetType;
  title: string;
  description?: string;
  violationScore: number;
};

export type ModerationDecisionInput = {
  decision: "violation" | "no_violation";
  action:
    | "none"
    | "warn_user"
    | "suspend_user"
    | "ban_user"
    | "archive_event"
    | "archive_tag"
    | "remove_media"
    | "archive_place"
    | "remove_comment"
    | "reset_username"
    | "remove_website"
    | "remove_private_messages";
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
  targetLastLoginFrom?: string;
  targetLastLoginTo?: string;
  targetJoinedFrom?: string;
  targetJoinedTo?: string;
  targetAppVersion?: string;
  publishMode?: string;
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

export function createAdminReportGroupComment(
  targetType: ReportTargetType,
  targetId: string,
  body: string
): Promise<ReportGroupComment> {
  return requestJson(`/admin/report-groups/${targetType}/${targetId}/comments`, reportGroupCommentSchema, {
    auth: true,
    method: "POST",
    body: JSON.stringify({ body })
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

export function getMyEventTicket(eventId: string): Promise<EventTicket> {
  return requestJson(`/events/${eventId}/ticket`, eventTicketSchema, { auth: "user" });
}

export function scanEventTicket(eventId: string, token: string): Promise<EventParticipant> {
  return requestJson(`/events/${eventId}/check-in/scan`, eventParticipantSchema, {
    auth: "user",
    method: "POST",
    body: JSON.stringify({ token })
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
