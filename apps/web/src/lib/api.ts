import {
  adminDashboardSchema,
  adminActivityLogListSchema,
  adminManagedUserDetailSchema,
  adminManagedUserListSchema,
  adminManagedUserSchema,
  adminCommentSchema,
  adminPostSchema,
  adminMediaSchema,
  adminPlaceSchema,
  adminPrivateMessageSchema,
  adminTagDetailSchema,
  adminRoleGroupSchema,
  announcementListSchema,
  announcementSchema,
  availabilitySchema,
  contentReportSchema,
  corporateKycApplicationSchema,
  corporateKycDocumentSchema,
  conversationListSchema,
  conversationMessagesSchema,
  discoveryFeedSchema,
  discoverySearchSchema,
  cmsCategorySchema,
  cmsPolicySchema,
  checkInPassportSchema,
  eventListSchema,
  eventSchema,
  financeDashboardSchema,
  paymentTransactionSchema,
  eventParticipantSchema,
  eventTicketSchema,
  faqSchema,
  loginResponseSchema,
  memberCardsSchema,
  socialAccountsSchema,
  contactImportResultSchema,
  memberPassSchema,
  memberScanSchema,
  messageSearchResultSchema,
  memberScansSchema,
  moderationDecisionSchema,
  notificationSchema,
  onboardingStatusSchema,
  notificationPreferencesSchema,
  phoneVerificationResponseSchema,
  phoneSchema,
  placeListSchema,
  placeMemberSchema,
  placeSchema,
  profileSchema,
  profileMediaListSchema,
  profileMediaSchema,
  profileVerificationStatusSchema,
  profileVerificationRequestsSchema,
  profileVerificationRequestSchema,
  profileTagSuggestionSchema,
  profileTagSuggestionsSchema,
  socialPostFeedSchema,
  socialPostSchema,
  socialPostCommentSchema,
  publicProfileSchema,
  privacySettingsSchema,
  privateChatMessageSchema,
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
  type AdminActivityLog,
  type AdminComment,
  type AdminPost,
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
  type Availability,
  type BlockedTargetType,
  type CmsPolicy,
  type CheckInPassport,
  type CmsCategory,
  type ContentReport,
  type CorporateKycApplication,
  type CorporateKycDocument,
  type ConversationList,
  type ConversationMessages,
  type DiscoveryFeed,
  type DiscoveryItem,
  type DiscoverySearch,
  type Event,
  type FinanceDashboard,
  type PaymentTransaction,
  type EventList,
  type EventParticipant,
  type EventTicket,
  type Faq,
  type LoginResponse,
  type MemberCard,
  type SocialAccount,
  type SocialProvider,
  type Contact,
  type ContactImportResult,
  type MemberPass,
  type MemberScan,
  type MessageSearchResult,
  type ModerationDecision,
  type Notification,
  type OnboardingStatus,
  type NotificationPreference,
  type PolicyType,
  type Place,
  type PlaceList,
  type PlaceMember,
  type Profile,
  type ProfileTagSuggestion,
  type ProfileMedia,
  type ProfileVerificationStatus,
  type ProfileVerificationRequest,
  type PublicProfile,
  type PostVisibility,
  type SocialPost,
  type SocialPostFeed,
  type SocialPostComment,
  type PrivateChatMessage,
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
  type UserBlock,
} from "@konnektora/shared";
import { z } from "zod";
import { mockEvents, mockTags } from "./mockData";

const CONFIGURED_API_URL = import.meta.env.VITE_API_URL;
const DEFAULT_API_URL = import.meta.env.PROD ? "/api" : "http://localhost:3000";
const API_URL = CONFIGURED_API_URL ?? DEFAULT_API_URL;
const MOCK_API_SETTING = import.meta.env.VITE_MOCK_API;
const isBrowser = typeof window !== "undefined";
const isLocalApiUrl =
  API_URL.includes("localhost") || API_URL.includes("127.0.0.1");
const isNetlifyPreview =
  isBrowser && window.location.hostname.endsWith("netlify.app");
const USE_MOCK_FALLBACK =
  MOCK_API_SETTING === "true" ||
  (MOCK_API_SETTING !== "false" &&
    import.meta.env.PROD &&
    (isLocalApiUrl || isNetlifyPreview));
// Demo fallback belongs to explicitly mocked/preview environments only.
// Production demo records are seeded into the API so every visible entity has
// a real database id and all follow/attendance/payment actions stay valid.
const USE_DEMO_CONTENT = USE_MOCK_FALLBACK;
const TOKEN_KEY = "konnektora_admin_token";
const USER_TOKEN_KEY = "konnektora_user_token";
const USER_KEY = "konnektora_user";
export const USER_SESSION_CHANGED_EVENT = "konnektora:user-session-changed";
const USER_INTEREST_TAGS_KEY = "konnektora_user_interest_tags";
const USER_TAG_SENTIMENTS_KEY = "konnektora_user_tag_sentiments";
const MOCK_EVENTS_KEY = "konnektora_mock_events";
const MOCK_TAGS_KEY = "konnektora_mock_tags";
const MOCK_USERS_KEY = "konnektora_mock_users";
const MOCK_PARTICIPANTS_KEY = "konnektora_mock_participants";
const MOCK_EVENT_TICKETS_KEY = "konnektora_mock_event_tickets";
const MOCK_OWNED_TICKET_ORDERS_KEY = "konnektora_mock_owned_ticket_orders";
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
const MOCK_PLACE_MEMBERS_KEY = "konnektora_mock_place_members";
const MOCK_PLACE_FOLLOWS_KEY = "konnektora_mock_place_follows";
const MOCK_MEDIA_KEY = "konnektora_mock_media";
const MOCK_COMMENTS_KEY = "konnektora_mock_comments";
const MOCK_PRIVATE_MESSAGES_KEY = "konnektora_mock_private_messages";
const MOCK_CHAT_MESSAGES_KEY = "konnektora_mock_chat_messages";
const MOCK_HIDDEN_CONVERSATIONS_KEY = "konnektora_mock_hidden_conversations";
const MOCK_BUSINESS_PLANS_KEY = "konnektora_mock_business_plans";
const MOCK_MEMBER_PLANS_KEY = "konnektora_mock_member_plans";
const MOCK_CONTENT_NOTIFICATIONS_KEY = "konnektora_mock_content_notifications";
const MOCK_NOTIFICATIONS_KEY = "konnektora_mock_notifications";
const MOCK_PHONE_VERIFICATIONS_KEY = "konnektora_mock_phone_verifications";
const MOCK_PRIVACY_SETTINGS_KEY = "konnektora_mock_privacy_settings";
const MOCK_NOTIFICATION_PREFERENCES_KEY =
  "konnektora_mock_notification_preferences";
const MOCK_USER_BLOCKS_KEY = "konnektora_mock_user_blocks";
const MOCK_USER_FOLLOWS_KEY = "konnektora_mock_user_follows";
const MOCK_TAG_COMMENTS_KEY = "konnektora_mock_tag_comments";
const MOCK_PROFILE_MEDIA_KEY = "konnektora_mock_profile_media";
const MOCK_SOCIAL_POSTS_KEY = "konnektora_mock_social_posts";
const MOCK_PROFILE_TAG_SUGGESTIONS_KEY = "konnektora_mock_profile_tag_suggestions";
const MOCK_SOCIAL_COMMENTS_KEY = "konnektora_mock_social_comments";
const MOCK_CONTENT_THREAD_COMMENTS_KEY =
  "konnektora_mock_content_thread_comments";
const MOCK_CONTENT_RATINGS_KEY = "konnektora_mock_content_ratings";
const MOCK_MEMBER_SCANS_KEY = "konnektora_mock_member_scans";
const MOCK_SOCIAL_ACCOUNTS_KEY = "konnektora_mock_social_accounts";
const MOCK_PROFILE_VERIFICATIONS_KEY = "konnektora_mock_profile_verifications";
const MOCK_ADMIN_TOKEN = "mock-admin-token";

export const isMockApiMode = USE_MOCK_FALLBACK;

type AuthMode = boolean | "admin" | "user";
type MockUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  username?: string | null;
  avatarUrl?: string | null;
  status?: AdminManagedUser["status"];
  role?: "user" | "curator" | "admin" | "super_admin";
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
  onboardingCompletedAt?: string | null;
  profileVerifiedAt?: string | null;
  memberPassVersion?: number;
};

export type ProfileUpdateInput = {
  name: string;
  email?: string;
  username?: string;
  phone?: string;
  country?: string;
  city?: string;
  district?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
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
  phone: string;
  password: string;
  accountType: "individual" | "corporate";
  companyName?: string;
  tradeName?: string;
  companyType?: string;
  businessCategory?: string;
};

export const adminPermissionOptions: Array<{
  value: AdminPermission;
  label: string;
}> = [
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
  { value: "posts.manage", label: "Post Yönetimi" },
  { value: "comments.manage", label: "Yorum Yönetimi" },
  { value: "media.manage", label: "Medya Yönetimi" },
  { value: "private_messages.manage", label: "Özel Mesaj Yönetimi" },
  { value: "user_activity.manage", label: "User activity log" },
  { value: "finance.manage", label: "Muhasebe & Finans" },
  {
    value: "messages.faq.manage",
    label: "Kullanıcılardan Mesajlar - SSS mesajları",
  },
  {
    value: "messages.account_freeze.manage",
    label: "Kullanıcılardan Mesajlar - Hesap dondurma mesajları",
  },
  {
    value: "messages.write_to_us.manage",
    label: "Kullanıcılardan Mesajlar - Write to us mesajları",
  },
];

type CmsCategoryInput = {
  name: string;
  description?: string;
  type?: CmsCategory["type"];
};

type RequestOptions = RequestInit & {
  auth?: AuthMode;
};

export class ApiHttpError extends Error {
  readonly name = "ApiHttpError";

  constructor(
    readonly status: number,
    message?: string,
  ) {
    super(message || `API request failed: ${status}`);
  }
}

async function readApiErrorMessage(response: Response) {
  const body = await response.text();
  if (!body) return undefined;

  try {
    const payload = JSON.parse(body) as {
      message?: string | string[];
      error?: string;
    };
    const message = payload.message;

    if (Array.isArray(message)) return message.filter(Boolean).join(" ");
    if (typeof message === "string" && message.trim()) return message.trim();
    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error.trim();
    }
  } catch {
    // Non-JSON service responses are intentionally hidden from the UI.
  }

  return undefined;
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
  window.dispatchEvent(new Event(USER_SESSION_CHANGED_EVENT));
}

export function getUserSession() {
  return readStorage<LoginResponse["user"] | null>(USER_KEY, null);
}

export function geocodeAddress(query: string, language: "tr" | "en") {
  return requestJson(
    `/locations/geocode?q=${encodeURIComponent(query)}`,
    z.object({
      found: z.boolean(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      displayName: z.string().optional(),
    }),
    { headers: { "Accept-Language": language } },
  );
}

export function updateUserSession(user: LoginResponse["user"]) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(USER_SESSION_CHANGED_EVENT));
}

export function clearUserSession() {
  const hadSession = Boolean(
    localStorage.getItem(USER_TOKEN_KEY) || localStorage.getItem(USER_KEY),
  );
  localStorage.removeItem(USER_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  if (hadSession) {
    window.dispatchEvent(new Event(USER_SESSION_CHANGED_EVENT));
  }
}

export async function listSocialPosts(
  scope: "popular" | "all" | "following" | "for_you" = "all",
  page = 1,
  range?: { from?: string; to?: string },
): Promise<SocialPostFeed> {
  const query = new URLSearchParams({
    scope,
    page: String(page),
    pageSize: "20",
  });
  if (range?.from) query.set("from", range.from);
  if (range?.to) query.set("to", range.to);
  const result = await requestJson(
    `/feed/posts?${query}`,
    socialPostFeedSchema,
    { auth: "user" },
  );
  return USE_DEMO_CONTENT && result.items.length === 0
    ? listMockSocialPosts(query)
    : result;
}

export function updateSocialPost(
  id: string,
  body: string,
): Promise<SocialPost> {
  return requestJson(`/posts/${id}`, socialPostSchema, {
    method: "PATCH",
    body: JSON.stringify({ body }),
    auth: "user",
  });
}

export function createSocialPost(
  body: string,
  visibility: PostVisibility,
  media: File[],
): Promise<SocialPost> {
  const form = new FormData();
  form.set("body", body);
  form.set("visibility", visibility);
  media.forEach((file) => form.append("media", file));
  return requestJson("/posts", socialPostSchema, {
    method: "POST",
    body: form,
    auth: "user",
  });
}

export function toggleSocialPostLike(
  id: string,
): Promise<{ liked: boolean; likeCount: number }> {
  return requestJson(
    `/posts/${id}/like`,
    z.object({ liked: z.boolean(), likeCount: z.number().int().nonnegative() }),
    { method: "POST", auth: "user" },
  );
}

export function deleteSocialPost(id: string): Promise<{ success: boolean }> {
  return requestJson(`/posts/${id}`, z.object({ success: z.boolean() }), {
    method: "DELETE",
    auth: "user",
  });
}

export function listSocialPostComments(
  id: string,
): Promise<SocialPostComment[]> {
  return requestJson(
    `/posts/${id}/comments`,
    z.array(socialPostCommentSchema),
    { auth: "user" },
  );
}

export function createSocialPostComment(
  id: string,
  body: string,
  parentId?: string,
): Promise<SocialPostComment> {
  return requestJson(`/posts/${id}/comments`, socialPostCommentSchema, {
    method: "POST",
    body: JSON.stringify({ body, parentId }),
    auth: "user",
  });
}

export function deleteSocialPostComment(
  postId: string,
  commentId: string,
): Promise<{ success: boolean }> {
  return requestJson(
    `/posts/${postId}/comments/${commentId}`,
    z.object({ success: z.boolean() }),
    { method: "DELETE", auth: "user" },
  );
}

export function getUserInterestTagIds() {
  const user = getUserSession();
  const allInterests = readStorage<Record<string, string[]>>(
    USER_INTEREST_TAGS_KEY,
    {},
  );

  return user ? (allInterests[user.id] ?? []) : [];
}

export function setUserInterestTagIds(tagIds: string[]) {
  const user = getUserSession();

  if (!user) {
    return;
  }

  const allInterests = readStorage<Record<string, string[]>>(
    USER_INTEREST_TAGS_KEY,
    {},
  );
  writeStorage(USER_INTEREST_TAGS_KEY, {
    ...allInterests,
    [user.id]: [...new Set(tagIds)],
  });
}

function getMockTagAffinities(): TagAffinity[] {
  const user = getUserSession();
  if (!user) return [];
  const sentiments = readStorage<Record<string, Record<string, TagSentiment>>>(
    USER_TAG_SENTIMENTS_KEY,
    {},
  );
  return getTagsByIds(getUserInterestTagIds()).map((tag) => ({
    tag,
    sentiment: sentiments[user.id]?.[tag.id] ?? "like",
  }));
}

function updateMockTagAffinities(
  affinities: Array<{ tagId: string; sentiment: TagSentiment }>,
) {
  const user = getUserSession();
  if (!user) throw new Error("User session required");
  setUserInterestTagIds(affinities.map((affinity) => affinity.tagId));
  const sentiments = readStorage<Record<string, Record<string, TagSentiment>>>(
    USER_TAG_SENTIMENTS_KEY,
    {},
  );
  writeStorage(USER_TAG_SENTIMENTS_KEY, {
    ...sentiments,
    [user.id]: Object.fromEntries(
      affinities.map((affinity) => [affinity.tagId, affinity.sentiment]),
    ),
  });
  return getMockTagAffinities();
}

export function listMyNotifications(): Promise<Notification[]> {
  return requestJson("/profile/notifications", z.array(notificationSchema), {
    auth: "user",
  });
}

export function markMyNotificationRead(id: string): Promise<Notification> {
  return requestJson(`/profile/notifications/${id}/read`, notificationSchema, {
    auth: "user",
    method: "PATCH",
  });
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

      return (
        new Date(second.createdAt ?? 0).getTime() -
        new Date(first.createdAt ?? 0).getTime()
      );
    });
}

function createMockNotification(
  input: Omit<Notification, "id" | "createdAt" | "readAt">,
) {
  const notifications = readStorage<Notification[]>(MOCK_NOTIFICATIONS_KEY, []);
  const notification: Notification = {
    ...input,
    id: createId(),
    readAt: null,
    createdAt: new Date().toISOString(),
  };
  writeStorage(MOCK_NOTIFICATIONS_KEY, [notification, ...notifications]);
  return notification;
}

function markMockNotificationRead(id: string): Notification {
  const notifications = readStorage<Notification[]>(MOCK_NOTIFICATIONS_KEY, []);
  const updated = notifications.map((notification) =>
    notification.id === id
      ? { ...notification, readAt: new Date().toISOString() }
      : notification,
  );
  const notification = updated.find((item) => item.id === id);
  if (!notification) {
    throw new Error("Mock notification not found");
  }
  writeStorage(MOCK_NOTIFICATIONS_KEY, updated);
  return notification;
}

function mockSocialSeed(): SocialPost[] {
  const now = Date.now();
  return [
    {
      id: "71000000-0000-4000-8000-000000000001",
      authorId: "72000000-0000-4000-8000-000000000001",
      body: "Konnektora topluluğuna merhaba! Yeni bağlantılar, gerçek sohbetler ve birlikte üretmek için buradayız. 🌱",
      visibility: "everybody",
      status: "active",
      likeCount: 18,
      commentCount: 1,
      liked: false,
      createdAt: new Date(now - 32 * 60_000).toISOString(),
      updatedAt: new Date(now - 32 * 60_000).toISOString(),
      author: {
        id: "72000000-0000-4000-8000-000000000001",
        name: "Derya Akın",
        username: "derya",
        profileVerifiedAt: new Date(now - 86_400_000).toISOString(),
        avatarUrl: null,
      },
      media: [],
    },
    {
      id: "71000000-0000-4000-8000-000000000002",
      authorId: "72000000-0000-4000-8000-000000000002",
      body: "Bu hafta İstanbul'da ürün geliştirme ve yapay zekâ üzerine küçük bir buluşma organize ediyoruz. Katılmak isteyenler yorum bırakabilir.",
      visibility: "everybody",
      status: "active",
      likeCount: 9,
      commentCount: 0,
      liked: false,
      createdAt: new Date(now - 3 * 3_600_000).toISOString(),
      updatedAt: new Date(now - 3 * 3_600_000).toISOString(),
      author: {
        id: "72000000-0000-4000-8000-000000000002",
        name: "Mert Yalın",
        username: "mertyalin",
        profileVerifiedAt: null,
        avatarUrl: null,
      },
      media: [],
    },
    {
      id: "71000000-0000-4000-8000-000000000003",
      authorId: "72000000-0000-4000-8000-000000000003",
      body: "Berlin Climate Tech buluşmasından üç önemli not: erken müşteri doğrulaması, regülasyon takibi ve doğru pilot ortağı. Detayları etkinlikte konuşalım.",
      visibility: "everybody",
      status: "active",
      likeCount: 14,
      commentCount: 2,
      liked: false,
      createdAt: new Date(now - 7 * 3_600_000).toISOString(),
      updatedAt: new Date(now - 7 * 3_600_000).toISOString(),
      author: {
        id: "72000000-0000-4000-8000-000000000003",
        name: "Selin Özer",
        username: "selinozer",
        profileVerifiedAt: null,
        avatarUrl: null,
      },
      media: [],
    },
    {
      id: "71000000-0000-4000-8000-000000000004",
      authorId: "72000000-0000-4000-8000-000000000004",
      body: "Yeni yatırım dönemine hazırlanan ekipler için pitch deck kliniği açtık. Dört ekip, iki mentor ve tamamen uygulanabilir geri bildirimler.",
      visibility: "everybody",
      status: "active",
      likeCount: 21,
      commentCount: 3,
      liked: false,
      createdAt: new Date(now - 12 * 3_600_000).toISOString(),
      updatedAt: new Date(now - 12 * 3_600_000).toISOString(),
      author: {
        id: "72000000-0000-4000-8000-000000000004",
        name: "Emre Kaya",
        username: "emrekaya",
        profileVerifiedAt: new Date(now - 172_800_000).toISOString(),
        avatarUrl: null,
      },
      media: [],
    },
  ];
}

function getMockSocialPosts() {
  return readStorage<SocialPost[]>(MOCK_SOCIAL_POSTS_KEY, mockSocialSeed());
}
function listMockSocialPosts(params: URLSearchParams): SocialPostFeed {
  const scope = params.get("scope");
  const user = getUserSession();
  const all = getMockSocialPosts();
  const items =
    scope === "following" && user
      ? all.filter(
          (post) =>
            post.authorId === user.id || post.author.username === "derya",
        )
      : all;
  return { items, page: 1, pageSize: 20, total: items.length, hasMore: false };
}
function createMockSocialPost(form: FormData): SocialPost {
  const user = getUserSession();
  if (!user) throw new Error("Gönderi için giriş gerekli.");
  const now = new Date().toISOString();
  const post: SocialPost = {
    id: crypto.randomUUID(),
    authorId: user.id,
    body: String(form.get("body") ?? "").trim(),
    visibility: (form.get("visibility") as PostVisibility) ?? "everybody",
    status: "active",
    likeCount: 0,
    commentCount: 0,
    liked: false,
    createdAt: now,
    updatedAt: now,
    author: { id: user.id, name: user.name, username: null, avatarUrl: null },
    media: [],
  };
  writeStorage(MOCK_SOCIAL_POSTS_KEY, [post, ...getMockSocialPosts()]);
  return post;
}
function toggleMockSocialPostLike(id: string) {
  let result = { liked: false, likeCount: 0 };
  const posts = getMockSocialPosts().map((post) => {
    if (post.id !== id) return post;
    result = {
      liked: !post.liked,
      likeCount: Math.max(0, post.likeCount + (post.liked ? -1 : 1)),
    };
    return { ...post, ...result };
  });
  writeStorage(MOCK_SOCIAL_POSTS_KEY, posts);
  return result;
}
function listMockSocialComments(postId: string): SocialPostComment[] {
  const stored = readStorage<SocialPostComment[]>(MOCK_SOCIAL_COMMENTS_KEY, []);
  if (stored.some((item) => item.postId === postId))
    return stored.filter((item) => item.postId === postId);
  if (postId !== "71000000-0000-4000-8000-000000000001") return [];
  const time = new Date(Date.now() - 15 * 60_000).toISOString();
  return [
    {
      id: "73000000-0000-4000-8000-000000000001",
      postId,
      authorId: "72000000-0000-4000-8000-000000000003",
      parentId: null,
      body: "Harika bir başlangıç, aramıza hoş geldiniz!",
      status: "active",
      createdAt: time,
      updatedAt: time,
      author: {
        id: "72000000-0000-4000-8000-000000000003",
        name: "Selin Özer",
        username: "selinozer",
        avatarUrl: null,
      },
    },
  ];
}
function createMockSocialComment(
  postId: string,
  input: { body: string; parentId?: string },
): SocialPostComment {
  const user = getUserSession();
  if (!user) throw new Error("Yorum için giriş gerekli.");
  const now = new Date().toISOString();
  const comment: SocialPostComment = {
    id: crypto.randomUUID(),
    postId,
    authorId: user.id,
    parentId: input.parentId ?? null,
    body: input.body.trim(),
    status: "active",
    createdAt: now,
    updatedAt: now,
    author: { id: user.id, name: user.name, username: null, avatarUrl: null },
  };
  const comments = readStorage<SocialPostComment[]>(
    MOCK_SOCIAL_COMMENTS_KEY,
    [],
  );
  writeStorage(MOCK_SOCIAL_COMMENTS_KEY, [...comments, comment]);
  const posts = getMockSocialPosts().map((post) =>
    post.id === postId
      ? { ...post, commentCount: post.commentCount + 1 }
      : post,
  );
  writeStorage(MOCK_SOCIAL_POSTS_KEY, posts);
  return comment;
}
function deleteMockSocialPost(id: string) {
  writeStorage(
    MOCK_SOCIAL_POSTS_KEY,
    getMockSocialPosts().filter((post) => post.id !== id),
  );
  return { success: true };
}

async function requestJson<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("X-App-Version", import.meta.env.VITE_APP_VERSION ?? "web");
  const timeoutController = options.signal ? null : new AbortController();
  const timeoutId = timeoutController
    ? window.setTimeout(() => timeoutController.abort(), 8_000)
    : null;

  if (
    !headers.has("Content-Type") &&
    options.body &&
    !(options.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (options.auth) {
    const token = options.auth === "user" ? getUserToken() : getAdminToken();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: options.signal ?? timeoutController?.signal,
    });

    if (!response.ok) {
      if (response.status === 401 && options.auth === "user") {
        clearUserSession();
      }
      throw new ApiHttpError(
        response.status,
        await readApiErrorMessage(response),
      );
    }

    if (response.status === 204) {
      return schema.parse(null);
    }

    return schema.parse(await response.json());
  } catch (error) {
    const fallback = getMockResponse(path, schema, options);
    const authorization = headers.get("Authorization") ?? "";
    const usesMockCredential =
      authorization.startsWith("Bearer mock-user-token-") ||
      authorization === `Bearer ${MOCK_ADMIN_TOKEN}`;

    if (
      fallback !== undefined &&
      (shouldUseMockFallback(error) ||
        (USE_MOCK_FALLBACK &&
          usesMockCredential &&
          error instanceof ApiHttpError &&
          [401, 403].includes(error.status)))
    ) {
      return fallback;
    }

    throw error;
  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
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

function getMockResponse<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions,
): T | undefined {
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
        status: "active",
      },
    });
  }

  if (pathname === "/me/finance" && method === "GET") {
    const session = getUserSession();
    if (!session) return undefined;
    const now = new Date().toISOString();
    const plan = readStorage<
      Record<
        string,
        { plan: "starter" | "growth" | "scale"; planStartedAt: string }
      >
    >(MOCK_BUSINESS_PLANS_KEY, {})[session.id];
    return schema.parse({
      account: {
        userId: session.id,
        preferredCurrency: "TRY",
        bankProvider: null,
        bankAccountLabel: null,
        bankAccountLast4: null,
        kycStatus: "not_started",
        kycProvider: null,
        availableBalance: 0,
        pendingBalance: 0,
        createdAt: now,
        updatedAt: now,
      },
      billing: null,
      transactions: [],
      payouts: [],
      member: readStorage<
        Record<
          string,
          { plan: "free" | "plus" | "premium"; planStartedAt: string }
        >
      >(MOCK_MEMBER_PLANS_KEY, {})[session.id] ?? {
        plan: "free",
        planStartedAt: null,
      },
      business: {
        plan: plan?.plan ?? "starter",
        planStartedAt: plan?.planStartedAt ?? null,
        companyName: session.name,
        category: null,
        managedEventCount: 0,
        managedPlaceCount: 0,
      },
      summary: {
        availableBalance: 0,
        pendingBalance: 0,
        lifetimeNetRevenue: 0,
        currency: "TRY",
      },
    });
  }

  if (pathname === "/me/finance/plan" && method === "POST") {
    const session = getUserSession();
    if (!session) return undefined;
    const input = parseBody<{ plan: "starter" | "growth" | "scale" }>(options);
    const planStartedAt = new Date().toISOString();
    const plans = readStorage<
      Record<
        string,
        { plan: "starter" | "growth" | "scale"; planStartedAt: string }
      >
    >(MOCK_BUSINESS_PLANS_KEY, {});
    writeStorage(MOCK_BUSINESS_PLANS_KEY, {
      ...plans,
      [session.id]: { plan: input.plan, planStartedAt },
    });
    return schema.parse({ plan: input.plan, planStartedAt });
  }
  if (pathname === "/me/finance/member-plan" && method === "POST") {
    const session = getUserSession();
    if (!session) throw new Error("User session required");
    const input = parseBody<{ plan: "free" | "plus" | "premium" }>(options);
    const planStartedAt = new Date().toISOString();
    const plans = readStorage<
      Record<
        string,
        { plan: "free" | "plus" | "premium"; planStartedAt: string }
      >
    >(MOCK_MEMBER_PLANS_KEY, {});
    writeStorage(MOCK_MEMBER_PLANS_KEY, {
      ...plans,
      [session.id]: { plan: input.plan, planStartedAt },
    });
    return schema.parse({ plan: input.plan, planStartedAt });
  }
  if (/^\/notifications\/content\/(tag|event|place)\/[^/]+$/.test(pathname)) {
    const session = getUserSession();
    if (!session) throw new Error("User session required");
    const key = `${session.id}:${pathname}`;
    const stored = readStorage<Record<string, boolean>>(
      MOCK_CONTENT_NOTIFICATIONS_KEY,
      {},
    );
    if (method === "GET")
      return schema.parse({ enabled: stored[key] ?? false });
    if (method === "POST") {
      const enabled = parseBody<{ enabled: boolean }>(options).enabled;
      writeStorage(MOCK_CONTENT_NOTIFICATIONS_KEY, {
        ...stored,
        [key]: enabled,
      });
      return schema.parse({ enabled });
    }
  }
  if (pathname === "/curators/applications" && method === "POST")
    return schema.parse({
      id: crypto.randomUUID(),
      ...parseBody<Record<string, unknown>>(options),
    });
  if (pathname === "/curators/dashboard" && method === "GET") {
    const session = getUserSession();
    if (!session || session.role !== "curator")
      throw new Error("Curator role required");
    return schema.parse({
      city: "İstanbul",
      events: [],
      places: [],
      organizers: [],
      revenue: { transactionCount: 0, platformRevenue: 0, organizerRevenue: 0 },
    });
  }

  if (pathname === "/me/finance/settings" && method === "PATCH") {
    return schema.parse({ success: true });
  }

  if (pathname === "/me/finance/payouts" && method === "POST") {
    return schema.parse({ success: true });
  }

  if (pathname === "/auth/register" && method === "POST") {
    return schema.parse(
      registerMockUser(parseBody<RegistrationInput>(options)),
    );
  }

  if (pathname === "/auth/login" && method === "POST") {
    return schema.parse(
      loginMockUser(parseBody<{ email: string; password: string }>(options)),
    );
  }

  if (pathname === "/auth/social" && method === "POST") {
    const input = parseBody<{ provider: SocialProvider }>(options);
    const email = `demo.${input.provider}@konnektora.local`;
    let response: LoginResponse;
    try {
      response = loginMockUser({ email, password: "DemoSocial!1" });
    } catch {
      response = registerMockUser({
        name: `${input.provider === "google" ? "Google" : "Facebook"} Demo`,
        email,
        phone: input.provider === "google" ? "+905550000001" : "+905550000002",
        password: "DemoSocial!1",
        accountType: "individual",
      });
    }
    const users = getAllMockUsers();
    writeStorage(
      MOCK_USERS_KEY,
      users.map((item) =>
        item.id === response.user.id
          ? { ...item, status: "active", emailVerified: true }
          : item,
      ),
    );
    return schema.parse({
      ...response,
      user: { ...response.user, status: "active", emailVerified: true },
    });
  }

  if (pathname === "/auth/social/accounts" && method === "GET")
    return schema.parse(
      readStorage<SocialAccount[]>(MOCK_SOCIAL_ACCOUNTS_KEY, []),
    );
  if (pathname === "/auth/social/accounts" && method === "POST") {
    const { provider } = parseBody<{ provider: SocialProvider }>(options);
    const accounts = readStorage<SocialAccount[]>(
      MOCK_SOCIAL_ACCOUNTS_KEY,
      [],
    ).filter((item) => item.provider !== provider);
    const now = new Date().toISOString();
    const updated = [
      ...accounts,
      {
        provider,
        email: `demo.${provider}@konnektora.local`,
        displayName: `${provider} hesabı`,
        avatarUrl: null,
        connectedAt: now,
        lastUsedAt: now,
      },
    ];
    writeStorage(MOCK_SOCIAL_ACCOUNTS_KEY, updated);
    return schema.parse(updated);
  }
  if (pathname === "/auth/social/accounts/remove" && method === "POST") {
    const { provider } = parseBody<{ provider: SocialProvider }>(options);
    const updated = readStorage<SocialAccount[]>(
      MOCK_SOCIAL_ACCOUNTS_KEY,
      [],
    ).filter((item) => item.provider !== provider);
    writeStorage(MOCK_SOCIAL_ACCOUNTS_KEY, updated);
    return schema.parse(updated);
  }

  if (pathname === "/contacts/import" && method === "POST") {
    const input = parseBody<{
      source: "phone" | "google";
      contacts: Contact[];
    }>(options);
    const users = getAllMockUsers();
    const matches = input.contacts.flatMap((contact) => {
      const member = users.find(
        (item) =>
          item.email.toLowerCase() === contact.email?.toLowerCase() ||
          item.phone === contact.phone,
      );
      return member
        ? [
            {
              contactName: contact.name,
              member: toMockMemberCard(member, false),
            },
          ]
        : [];
    });
    const matched = new Set(matches.map((item) => item.contactName));
    return schema.parse({
      source: input.source,
      importedCount: input.contacts.length,
      matches,
      invitees: input.contacts.filter((item) => !matched.has(item.name)),
    });
  }
  if (pathname === "/contacts/invite" && method === "POST")
    return schema.parse({
      ok: true,
      invitedCount: parseBody<{ contacts: Contact[] }>(options).contacts.length,
    });

  if (pathname === "/auth/email/verify/request" && method === "POST") {
    return schema.parse(
      createMockEmailToken(
        parseBody<{ email: string }>(options).email,
        "verify_email",
      ),
    );
  }

  if (pathname === "/auth/email/verify" && method === "POST") {
    return schema.parse(
      consumeMockEmailToken(
        parseBody<{ token: string }>(options).token,
        "verify_email",
      ),
    );
  }

  if (pathname === "/auth/password/forgot" && method === "POST") {
    const input = parseBody<{ channel?: "email" | "phone"; email?: string; phone?: string }>(options);
    const email = input.email ?? (input.phone ? getAllMockUsers().find((user) => user.phone === input.phone)?.email : undefined);
    return schema.parse(email ? createMockEmailToken(email, "password_reset") : { ok: true });
  }

  if (pathname === "/auth/password/reset" && method === "POST") {
    const input = parseBody<{ token: string; password: string }>(options);
    return schema.parse(resetMockPassword(input.token, input.password));
  }

  if (pathname === "/auth/password/change" && method === "POST") {
    return schema.parse(
      changeMockPassword(
        parseBody<{ currentPassword: string; newPassword: string }>(options),
      ),
    );
  }

  if (pathname === "/me/email" && method === "PATCH") {
    return schema.parse(
      changeMockEmail(
        parseBody<{ email: string; currentPassword: string }>(options),
      ),
    );
  }

  if (pathname === "/auth/deactivate" && method === "POST") {
    return schema.parse(
      deactivateMockAccount(
        parseBody<{ currentPassword: string; reason: string }>(options),
      ),
    );
  }

  if (pathname === "/auth/reactivate" && method === "POST") {
    return schema.parse(
      reactivateMockAccount(
        parseBody<{ email: string; password: string }>(options),
      ),
    );
  }

  if (pathname === "/auth/phone/verification/request" && method === "POST") {
    return schema.parse(
      requestMockPhoneVerification(parseBody<{ phone: string }>(options).phone),
    );
  }

  if (pathname === "/auth/availability" && method === "GET") {
    const query = new URLSearchParams(queryString);
    const users = getAllMockUsers();
    const email = query.get("email")?.toLowerCase();
    const phone = query.get("phone");
    const username = query.get("username")?.toLowerCase();
    return schema.parse({
      emailAvailable: email
        ? !users.some((user) => user.email.toLowerCase() === email)
        : null,
      phoneAvailable: phone
        ? !users.some((user) => user.phone === phone)
        : null,
      usernameAvailable: username
        ? !users.some((user) => user.username?.toLowerCase() === username)
        : null,
    });
  }

  if (pathname === "/auth/phone/verification/confirm" && method === "POST") {
    return schema.parse(
      confirmMockPhoneVerification(
        parseBody<{ phone: string; code: string }>(options),
      ),
    );
  }

  if (pathname === "/auth/invite/accept" && method === "POST") {
    const input = parseBody<{ token: string; name?: string; password: string }>(
      options,
    );
    return schema.parse(
      acceptMockInvite(input.token, input.password, input.name),
    );
  }

  if (pathname === "/profile" && method === "GET") {
    return schema.parse(getMockProfile());
  }

  if (pathname === "/profile" && method === "PUT") {
    return schema.parse(
      updateMockProfile(parseBody<ProfileUpdateInput>(options)),
    );
  }

  if (pathname === "/profile/upgrade-corporate" && method === "POST") {
    const session = getUserSession();
    if (!session) throw new Error("User session required");
    updateUserSession({ ...session, accountType: "corporate" });
    return schema.parse({ ok: true, accountType: "corporate" });
  }

  if (pathname === "/profile/media" && method === "GET") {
    return schema.parse(listMockProfileMedia());
  }

  if (pathname === "/profile/verification" && method === "GET")
    return schema.parse(getMockProfileVerificationStatus());
  if (pathname === "/profile/verification" && method === "POST")
    return schema.parse(createMockProfileVerification(options));

  if (pathname === "/profile/media/upload" && method === "POST") {
    const file =
      options.body instanceof FormData ? options.body.get("file") : null;
    if (!(file instanceof File)) throw new Error("Mock media file not found");
    return schema.parse(createMockProfileMedia(file));
  }

  if (pathname === "/media" && method === "GET") {
    const params = new URLSearchParams(queryString);
    return schema.parse(
      readStorage<ProfileMedia[]>(MOCK_MEDIA_KEY, []).filter(
        (item) =>
          item.status === "active" &&
          item.contentType === params.get("targetType") &&
          item.contentId === params.get("targetId"),
      ),
    );
  }

  if (
    pathname.startsWith("/media/") &&
    pathname.endsWith("/upload") &&
    method === "POST"
  ) {
    if (!(options.body instanceof FormData))
      throw new Error("Medya formu gerekli.");
    const [, targetType, targetId] = pathname
      .slice(1, -"/upload".length)
      .split("/");
    const file = options.body.get("file");
    if (!(file instanceof File)) throw new Error("Dosya gerekli.");
    const session = getUserSession();
    const now = new Date().toISOString();
    const current = readStorage<ProfileMedia[]>(MOCK_MEDIA_KEY, []);
    const media: ProfileMedia = {
      id: createId(),
      url: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "video" : "image",
      status: "active",
      contentType: targetType as ProfileMedia["contentType"],
      contentId: targetId ?? "",
      uploadedById: session?.id ?? null,
      sortOrder: current.filter(
        (item) =>
          item.contentType === targetType && item.contentId === targetId,
      ).length,
      isProfilePicture: false,
      createdAt: now,
      updatedAt: now,
    };
    writeStorage(MOCK_MEDIA_KEY, [media, ...current]);
    return schema.parse(media);
  }

  if (
    pathname.startsWith("/media/") &&
    pathname.endsWith("/order") &&
    method === "PUT"
  ) {
    const [, targetType, targetId] = pathname.slice(1, -"/order".length).split("/");
    const { mediaIds } = parseBody<{ mediaIds: string[] }>(options);
    const current = readStorage<ProfileMedia[]>(MOCK_MEDIA_KEY, []);
    const album = current.filter((item) => item.status === "active" && item.contentType === targetType && item.contentId === targetId);
    if (album.length !== mediaIds.length || album.some((item) => !mediaIds.includes(item.id))) throw new Error("Geçersiz medya sıralaması.");
    const ordered = current.map((item) => item.contentType === targetType && item.contentId === targetId ? { ...item, sortOrder: mediaIds.indexOf(item.id) } : item);
    writeStorage(MOCK_MEDIA_KEY, ordered);
    return schema.parse(ordered.filter((item) => item.status === "active" && item.contentType === targetType && item.contentId === targetId).sort((a, b) => a.sortOrder - b.sortOrder));
  }

  if (pathname.startsWith("/media/") && method === "DELETE") {
    const [, targetType, targetId, mediaId] = pathname.slice(1).split("/");
    const current = readStorage<ProfileMedia[]>(MOCK_MEDIA_KEY, []);
    const next = current.map((item) => item.id === mediaId && item.contentType === targetType && item.contentId === targetId ? { ...item, status: "deleted" } : item);
    writeStorage(MOCK_MEDIA_KEY, next);
    return schema.parse(next.filter((item) => item.status === "active" && item.contentType === targetType && item.contentId === targetId).sort((a, b) => a.sortOrder - b.sortOrder).map((item, sortOrder) => ({ ...item, sortOrder })));
  }

  if (
    pathname.startsWith("/profile/media/") &&
    pathname.endsWith("/profile-picture") &&
    method === "PATCH"
  ) {
    return schema.parse(
      makeMockProfilePicture(
        pathname.slice("/profile/media/".length, -"/profile-picture".length),
      ),
    );
  }

  if (pathname === "/profile/media/order" && method === "PUT") {
    return schema.parse(
      reorderMockProfileMedia(
        parseBody<{ mediaIds: string[] }>(options).mediaIds,
      ),
    );
  }

  if (pathname.startsWith("/profile/media/") && method === "DELETE") {
    return schema.parse(
      deleteMockProfileMedia(pathname.slice("/profile/media/".length)),
    );
  }

  if (pathname === "/profile/privacy" && method === "GET") {
    return schema.parse(getMockPrivacySettings());
  }

  if (pathname === "/profile/privacy" && method === "PUT") {
    return schema.parse(
      updateMockPrivacySettings(
        parseBody<Omit<PrivacySettings, "userId" | "createdAt" | "updatedAt">>(
          options,
        ),
      ),
    );
  }

  if (pathname === "/profile/notification-preferences" && method === "GET") {
    return schema.parse(getMockNotificationPreferences());
  }

  if (pathname === "/profile/notification-preferences" && method === "PUT") {
    return schema.parse(
      updateMockNotificationPreferences(
        parseBody<{ preferences: NotificationPreference[] }>(options)
          .preferences,
      ),
    );
  }

  if (pathname === "/notifications/push/public-key" && method === "GET") {
    return schema.parse({ publicKey: null });
  }

  if (pathname === "/notifications/push/subscriptions" && method === "POST") {
    return schema.parse({ id: createId() });
  }

  if (pathname === "/notifications/push/subscriptions" && method === "DELETE") {
    return schema.parse({ ok: true });
  }

  if (pathname === "/profile/blocks" && method === "GET") {
    return schema.parse(listMockBlocks());
  }

  if (pathname === "/profile/blocks" && method === "POST") {
    return schema.parse(
      createMockBlock(
        parseBody<{ targetType: BlockedTargetType; targetId: string }>(options),
      ),
    );
  }

  if (pathname.startsWith("/profile/blocks/") && method === "DELETE") {
    const [targetType, targetId] = pathname
      .slice("/profile/blocks/".length)
      .split("/");
    return schema.parse(
      removeMockBlock(targetType as BlockedTargetType, targetId ?? ""),
    );
  }

  if (pathname === "/social/suggestions" && method === "GET") {
    return schema.parse(listMockMemberSuggestions());
  }

  if (pathname === "/social/new-members" && method === "GET") {
    return schema.parse(listMockNewMembers());
  }

  if (pathname === "/social/following" && method === "GET") {
    return schema.parse(listMockFollowing());
  }

  if (pathname.startsWith("/social/following/") && method === "POST") {
    return schema.parse(
      followMockUser(pathname.slice("/social/following/".length)),
    );
  }

  if (pathname.startsWith("/social/following/") && method === "DELETE") {
    return schema.parse(
      unfollowMockUser(pathname.slice("/social/following/".length)),
    );
  }

  if (pathname === "/me/conversations" && method === "GET") {
    return schema.parse(listMockConversations());
  }

  if (
    pathname.startsWith("/me/conversations/") &&
    pathname.endsWith("/messages") &&
    method === "GET"
  ) {
    const peerId = pathname.slice(
      "/me/conversations/".length,
      -"/messages".length,
    );
    return schema.parse(
      listMockConversationMessages(peerId, new URLSearchParams(queryString)),
    );
  }

  if (pathname === "/me/private-messages" && method === "POST") {
    if (options.body instanceof FormData)
      return schema.parse(
        sendMockPrivateMessage({
          recipientId: String(options.body.get("recipientId")),
          body: String(options.body.get("body")),
          replyToId: String(options.body.get("replyToId") || "") || undefined,
        }),
      );
    return schema.parse(
      sendMockPrivateMessage(
        parseBody<{ recipientId: string; body: string; replyToId?: string }>(
          options,
        ),
      ),
    );
  }

  if (pathname === "/me/messages/search" && method === "GET")
    return schema.parse(
      searchMockMessages(new URLSearchParams(queryString).get("q") ?? ""),
    );
  if (
    pathname.startsWith("/me/private-messages/") &&
    pathname.endsWith("/reactions") &&
    method === "POST"
  )
    return schema.parse(
      toggleMockMessageReaction(
        pathname.slice("/me/private-messages/".length, -"/reactions".length),
        parseBody<{ emoji: string }>(options).emoji,
      ),
    );
  if (pathname.startsWith("/me/private-messages/") && method === "PATCH")
    return schema.parse(
      editMockPrivateMessage(
        pathname.slice("/me/private-messages/".length),
        parseBody<{ body: string }>(options).body,
      ),
    );
  if (pathname.startsWith("/me/private-messages/") && method === "DELETE")
    return schema.parse(
      deleteMockPrivateMessage(pathname.slice("/me/private-messages/".length)),
    );
  if (
    pathname.startsWith("/me/conversations/") &&
    pathname.endsWith("/typing") &&
    method === "GET"
  )
    return schema.parse({ typing: false });
  if (
    pathname.startsWith("/me/conversations/") &&
    pathname.endsWith("/typing") &&
    method === "POST"
  )
    return schema.parse({ ok: true });
  if (
    pathname.startsWith("/me/conversations/") &&
    pathname.endsWith("/preferences") &&
    method === "PATCH"
  )
    return schema.parse({
      userId: getUserSession()?.id,
      peerId: pathname.split("/")[3],
      ...parseBody<Record<string, boolean>>(options),
      updatedAt: new Date().toISOString(),
    });
  if (/^\/me\/conversations\/[^/]+$/.test(pathname) && method === "DELETE")
    return schema.parse(deleteMockConversation(pathname.split("/")[3] ?? ""));

  if (
    pathname.startsWith("/me/conversations/") &&
    pathname.endsWith("/read") &&
    method === "PATCH"
  ) {
    return schema.parse(
      markMockConversationRead(
        pathname.slice("/me/conversations/".length, -"/read".length),
      ),
    );
  }

  if (pathname.startsWith("/users/id/") && method === "GET")
    return schema.parse(
      getMockPublicProfile(
        decodeURIComponent(pathname.slice("/users/id/".length)),
        true,
      ),
    );
  if (pathname.startsWith("/users/") && method === "GET")
    return schema.parse(
      getMockPublicProfile(
        decodeURIComponent(pathname.slice("/users/".length)),
      ),
    );
  if (pathname === "/me/onboarding" && method === "GET")
    return schema.parse(getMockOnboardingStatus());
  if (pathname === "/me/onboarding/complete" && method === "POST")
    return schema.parse(completeMockOnboarding());
  if (pathname === "/me/member-pass" && method === "GET")
    return schema.parse(getMockMemberPass());
  if (pathname === "/me/member-pass/rotate" && method === "PATCH")
    return schema.parse(rotateMockMemberPass());
  if (pathname === "/me/member-scans/incoming" && method === "GET")
    return schema.parse([]);
  if (pathname === "/me/member-scans" && method === "GET")
    return schema.parse(listMockMemberScans());
  if (pathname === "/me/member-scans" && method === "POST")
    return schema.parse(
      scanMockMember(
        parseBody<{ payload: string; method: "qr" | "nfc" }>(options),
      ),
    );
  if (pathname === "/discover/feed" && method === "GET")
    return schema.parse(getMockDiscoveryFeed(new URLSearchParams(queryString)));
  if (pathname === "/discover/search" && method === "GET")
    return schema.parse(
      searchMockDiscovery(new URLSearchParams(queryString).get("q") ?? ""),
    );
  if (pathname === "/feed/posts" && method === "GET")
    return schema.parse(listMockSocialPosts(new URLSearchParams(queryString)));
  if (pathname === "/posts" && method === "POST")
    return schema.parse(createMockSocialPost(options.body as FormData));
  if (/^\/posts\/[^/]+\/like$/.test(pathname) && method === "POST")
    return schema.parse(toggleMockSocialPostLike(pathname.split("/")[2] ?? ""));
  if (/^\/posts\/[^/]+\/comments$/.test(pathname) && method === "GET")
    return schema.parse(listMockSocialComments(pathname.split("/")[2] ?? ""));
  if (/^\/posts\/[^/]+\/comments$/.test(pathname) && method === "POST")
    return schema.parse(
      createMockSocialComment(
        pathname.split("/")[2] ?? "",
        parseBody<{ body: string; parentId?: string }>(options),
      ),
    );
  if (/^\/posts\/[^/]+$/.test(pathname) && method === "DELETE")
    return schema.parse(deleteMockSocialPost(pathname.split("/")[2] ?? ""));

  if (
    pathname.startsWith("/tags/") &&
    pathname.endsWith("/related-users") &&
    method === "GET"
  ) {
    const tagId = pathname.slice("/tags/".length, -"/related-users".length);
    const users = new Map<string, RelatedUser>();
    for (const comment of listMockTagComments(tagId)) {
      if (comment.author)
        users.set(comment.author.id, {
          id: comment.author.id,
          name: comment.author.name,
          username: comment.author.username,
          city: null,
          country: null,
          profileVerifiedAt: null,
          relation: "paylaşım yaptı",
          checkedIn: false,
        });
    }
    return schema.parse([...users.values()]);
  }

  if (
    pathname.startsWith("/tags/") &&
    pathname.endsWith("/comments") &&
    method === "GET"
  ) {
    return schema.parse(
      listMockTagComments(pathname.slice("/tags/".length, -"/comments".length)),
    );
  }

  if (
    pathname.startsWith("/tags/") &&
    pathname.endsWith("/comments") &&
    method === "POST"
  ) {
    const tagId = pathname.slice("/tags/".length, -"/comments".length);
    return schema.parse(
      createMockTagComment(tagId, parseBody<{ body: string }>(options).body),
    );
  }
  if (
    pathname.startsWith("/tags/") &&
    pathname.endsWith("/stats") &&
    method === "GET"
  ) {
    const tagId = pathname.slice("/tags/".length, -"/stats".length);
    const tag = getStoredTags().find((item) => item.id === tagId);
    return schema.parse({
      events: getStoredEvents().filter((event) =>
        event.tags.some((item) => item.id === tagId),
      ).length,
      places: 0,
      followers: 0,
      posts: listMockTagComments(tagId).length,
      views: tag?.usageCount ?? 0,
    });
  }
  if (/^\/tags\/comments\/[^/]+\/like$/.test(pathname) && method === "POST")
    return schema.parse(toggleMockTagCommentLike(pathname.split("/")[3] ?? ""));
  if (/^\/tags\/comments\/[^/]+$/.test(pathname) && method === "PATCH")
    return schema.parse(
      updateMockTagComment(
        pathname.split("/")[3] ?? "",
        parseBody<{ body: string }>(options).body,
      ),
    );
  if (/^\/tags\/comments\/[^/]+\/media$/.test(pathname) && method === "POST")
    return schema.parse(
      addMockTagCommentMedia(
        pathname.split("/")[3] ?? "",
        options.body as FormData,
      ),
    );
  if (pathname === "/views" && method === "POST")
    return schema.parse({ ok: true });
  if (pathname === "/shares" && method === "POST")
    return schema.parse({ ok: true });
  if (pathname === "/actions" && method === "POST")
    return schema.parse({ ok: true });

  if (
    pathname.startsWith("/tags/") &&
    pathname.includes("/comments/") &&
    method === "DELETE"
  ) {
    const [tagId, commentId] = pathname
      .slice("/tags/".length)
      .split("/comments/");
    return schema.parse(deleteMockTagComment(tagId ?? "", commentId ?? ""));
  }

  if (pathname === "/comments" && method === "GET") {
    const params = new URLSearchParams(queryString);
    const targetType = params.get("targetType");
    const targetId = params.get("targetId");
    return schema.parse(
      readStorage<ContentThreadComment[]>(
        MOCK_CONTENT_THREAD_COMMENTS_KEY,
        [],
      ).filter(
        (item) =>
          item.targetType === targetType &&
          item.targetId === targetId &&
          !item.parentId,
      ),
    );
  }

  if (pathname === "/comments" && method === "POST") {
    const input = parseBody<{
      targetType: string;
      targetId: string;
      body: string;
      parentId?: string;
    }>(options);
    const session = getUserSession();
    if (!session) throw new Error("Yorum için giriş gerekli.");
    const now = new Date().toISOString();
    const comment: ContentThreadComment = {
      id: createId(),
      targetType: input.targetType,
      targetId: input.targetId,
      parentId: input.parentId ?? null,
      authorId: session.id,
      body: input.body.trim(),
      likeCount: 0,
      createdAt: now,
      updatedAt: now,
      author: { id: session.id, name: session.name, username: null },
      replies: [],
    };
    writeStorage(MOCK_CONTENT_THREAD_COMMENTS_KEY, [
      comment,
      ...readStorage<ContentThreadComment[]>(
        MOCK_CONTENT_THREAD_COMMENTS_KEY,
        [],
      ),
    ]);
    return schema.parse(comment);
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
    const input = parseBody<{
      affinities: Array<{ tagId: string; sentiment: TagSentiment }>;
    }>(options);
    return schema.parse(updateMockTagAffinities(input.affinities));
  }

  if (pathname === "/profile/tag-suggestions" && method === "GET") {
    const session = getUserSession();
    if (!session) throw new Error("Etiket önerilerini görmek için giriş yapın.");
    return schema.parse(readStorage<ProfileTagSuggestion[]>(MOCK_PROFILE_TAG_SUGGESTIONS_KEY, []).filter((item) => item.status === "pending" && (item.targetUserId === session.id || item.suggestedById === session.id)));
  }

  if (pathname.startsWith("/profile/tag-suggestions/") && method === "POST") {
    const session = getUserSession();
    if (!session) throw new Error("Etiket önermek için giriş yapın.");
    const targetUserId = pathname.slice("/profile/tag-suggestions/".length);
    const input = parseBody<{ tagId: string; sentiment: TagSentiment }>(options);
    const target = getAllMockUsers().find((item) => item.id === targetUserId);
    const tag = getStoredTags().find((item) => item.id === input.tagId);
    if (!target || !tag) throw new Error("Kullanıcı veya etiket bulunamadı.");
    const items = readStorage<ProfileTagSuggestion[]>(MOCK_PROFILE_TAG_SUGGESTIONS_KEY, []);
    if (items.some((item) => item.targetUserId === targetUserId && item.suggestedById === session.id && item.tagId === input.tagId && item.status === "pending")) throw new Error("Bu etiket daha önce onaya gönderildi.");
    const now = new Date().toISOString();
    const suggestion: ProfileTagSuggestion = { id: createId(), targetUserId, suggestedById: session.id, tagId: tag.id, sentiment: input.sentiment, status: "pending", createdAt: now, updatedAt: now, tag, targetUser: { id: target.id, name: target.name, username: target.username ?? null, role: target.role ?? "user", status: target.status ?? "active" }, suggestedBy: { id: session.id, name: session.name, username: session.username ?? null, role: session.role, status: session.status ?? "active" } };
    writeStorage(MOCK_PROFILE_TAG_SUGGESTIONS_KEY, [suggestion, ...items]);
    return schema.parse(suggestion);
  }

  if (pathname.startsWith("/profile/tag-suggestions/") && method === "PATCH") {
    const session = getUserSession();
    if (!session) throw new Error("İşlem için giriş yapın.");
    const id = pathname.slice("/profile/tag-suggestions/".length);
    const input = parseBody<{ action: "accept" | "decline" | "cancel" }>(options);
    const items = readStorage<ProfileTagSuggestion[]>(MOCK_PROFILE_TAG_SUGGESTIONS_KEY, []);
    const current = items.find((item) => item.id === id && item.status === "pending");
    if (!current) throw new Error("Bekleyen etiket önerisi bulunamadı.");
    if (input.action === "accept" && current.targetUserId === session.id) updateMockTagAffinities([...getMockTagAffinities().filter((item) => item.tag.id !== current.tagId).map((item) => ({ tagId: item.tag.id, sentiment: item.sentiment })), { tagId: current.tagId, sentiment: current.sentiment }]);
    const status = input.action === "accept" ? "accepted" : input.action === "cancel" ? "cancelled" : "declined";
    writeStorage(MOCK_PROFILE_TAG_SUGGESTIONS_KEY, items.map((item) => item.id === id ? { ...item, status, updatedAt: new Date().toISOString() } : item));
    return schema.parse({ ok: true, status });
  }

  if (pathname === "/profile/notifications" && method === "GET") {
    return schema.parse(listMockNotifications());
  }

  if (
    pathname.startsWith("/profile/notifications/") &&
    pathname.endsWith("/read") &&
    method === "PATCH"
  ) {
    const id = pathname.slice(
      "/profile/notifications/".length,
      -"/read".length,
    );
    return schema.parse(markMockNotificationRead(id));
  }

  if (
    (pathname === "/messages" || pathname === "/me/messages") &&
    method === "POST"
  ) {
    return schema.parse(
      createMockUserMessage(
        parseBody<UserMessageInput>(options),
        pathname === "/me/messages",
      ),
    );
  }

  if (pathname.startsWith("/admin/messages/") && method === "GET") {
    const messageType = userMessageTypeFromAdminPath(pathname);

    if (messageType) {
      return schema.parse(
        listMockUserMessages(messageType, new URLSearchParams(queryString)),
      );
    }

    return schema.parse(
      getMockUserMessage(pathname.slice("/admin/messages/".length)),
    );
  }

  if (pathname.startsWith("/admin/messages/") && method === "PATCH") {
    return schema.parse(
      updateMockUserMessage(
        pathname.slice("/admin/messages/".length),
        parseBody<{ status: UserMessageStatus }>(options),
      ),
    );
  }

  if (pathname === "/admin/content/places" && method === "GET") {
    return schema.parse(listMockPlaces(new URLSearchParams(queryString)));
  }

  if (pathname.startsWith("/admin/content/places/") && method === "GET") {
    return schema.parse(
      getMockPlace(pathname.slice("/admin/content/places/".length)),
    );
  }

  if (pathname.startsWith("/admin/content/places/") && method === "PATCH") {
    return schema.parse(
      updateMockContentItem(
        MOCK_PLACES_KEY,
        pathname.slice("/admin/content/places/".length),
        parseBody<{ status: string }>(options),
      ),
    );
  }

  if (pathname === "/admin/content/media" && method === "GET") {
    return schema.parse(listMockMedia(new URLSearchParams(queryString)));
  }

  if (pathname === "/admin/profile-verifications" && method === "GET")
    return schema.parse(
      readStorage<ProfileVerificationRequest[]>(
        MOCK_PROFILE_VERIFICATIONS_KEY,
        [],
      ),
    );
  if (
    pathname.startsWith("/admin/profile-verifications/") &&
    method === "PATCH"
  ) {
    const id = pathname.slice("/admin/profile-verifications/".length);
    const input = parseBody<{
      status: "approved" | "rejected";
      reason?: string;
    }>(options);
    const requests = readStorage<ProfileVerificationRequest[]>(
      MOCK_PROFILE_VERIFICATIONS_KEY,
      [],
    );
    const updated = requests.map((item) =>
      item.id === id
        ? {
            ...item,
            status: input.status,
            decisionReason: input.reason ?? null,
            reviewedAt: new Date().toISOString(),
          }
        : item,
    );
    writeStorage(MOCK_PROFILE_VERIFICATIONS_KEY, updated);
    return schema.parse(updated.find((item) => item.id === id));
  }

  if (pathname.startsWith("/admin/content/media/") && method === "GET") {
    return schema.parse(
      getMockMedia(pathname.slice("/admin/content/media/".length)),
    );
  }

  if (pathname.startsWith("/admin/content/media/") && method === "PATCH") {
    return schema.parse(
      updateMockContentItem(
        MOCK_MEDIA_KEY,
        pathname.slice("/admin/content/media/".length),
        parseBody<{ status: string }>(options),
      ),
    );
  }

  if (pathname === "/admin/content/comments" && method === "GET") {
    return schema.parse(listMockComments(new URLSearchParams(queryString)));
  }

  if (pathname === "/admin/content/posts" && method === "GET") {
    const params = new URLSearchParams(queryString);
    const q = params.get("q")?.toLocaleLowerCase("tr-TR");
    const status = params.get("status");
    return schema.parse(getMockSocialPosts().filter((post) => (!q || post.body.toLocaleLowerCase("tr-TR").includes(q)) && (!status || post.status === status)).map((post) => ({ ...post, reportCount: listMockReports().filter((report) => report.targetType === "post" && report.targetId === post.id).length })));
  }

  if (pathname.startsWith("/admin/content/posts/") && method === "GET") {
    const id = pathname.slice("/admin/content/posts/".length);
    const post = getMockSocialPosts().find((item) => item.id === id);
    return post ? schema.parse({ ...post, reportCount: listMockReports().filter((report) => report.targetType === "post" && report.targetId === id).length }) : undefined;
  }

  if (pathname.startsWith("/admin/content/posts/") && method === "PATCH") {
    return schema.parse(updateMockContentItem(MOCK_SOCIAL_POSTS_KEY, pathname.slice("/admin/content/posts/".length), parseBody<{ status: string }>(options)));
  }

  if (pathname.startsWith("/admin/content/comments/") && method === "GET") {
    return schema.parse(
      getMockComment(pathname.slice("/admin/content/comments/".length)),
    );
  }

  if (pathname.startsWith("/admin/content/comments/") && method === "PATCH") {
    return schema.parse(
      updateMockContentItem(
        MOCK_COMMENTS_KEY,
        pathname.slice("/admin/content/comments/".length),
        parseBody<{ status: string }>(options),
      ),
    );
  }

  if (pathname === "/admin/content/private-messages" && method === "GET") {
    return schema.parse(
      listMockPrivateMessages(new URLSearchParams(queryString)),
    );
  }

  if (
    pathname.startsWith("/admin/content/private-messages/") &&
    method === "GET"
  ) {
    return schema.parse(
      getMockPrivateMessage(
        pathname.slice("/admin/content/private-messages/".length),
      ),
    );
  }

  if (
    pathname.startsWith("/admin/content/private-messages/") &&
    method === "PATCH"
  ) {
    return schema.parse(
      updateMockContentItem(
        MOCK_PRIVATE_MESSAGES_KEY,
        pathname.slice("/admin/content/private-messages/".length),
        parseBody<{ status: string }>(options),
      ),
    );
  }

  if (pathname === "/tags" && method === "POST" && options.auth === "user") {
    return schema.parse(
      createMockTag(parseBody<{ name: string; description?: string }>(options)),
    );
  }

  if (pathname === "/reports" && method === "POST" && options.auth === "user") {
    return schema.parse(
      createMockReport(parseBody<CreateReportInput>(options)),
    );
  }

  if (pathname === "/admin/report-rules" && method === "GET") {
    return schema.parse(listMockReportRules());
  }

  if (pathname === "/admin/report-rules" && method === "POST") {
    return schema.parse(
      createMockReportRule(parseBody<ReportRuleInput>(options)),
    );
  }

  if (pathname.startsWith("/admin/report-rules/") && method === "PATCH") {
    return schema.parse(
      updateMockReportRule(
        pathname.slice("/admin/report-rules/".length),
        parseBody<Partial<ReportRuleInput> & { status?: string }>(options),
      ),
    );
  }

  if (pathname === "/admin/dashboard" && method === "GET") {
    return schema.parse(getMockDashboard());
  }

  if (pathname === "/admin/activity-logs" && method === "GET") {
    const now = new Date();
    const actor = basicMockUser("88888888-8888-4888-8888-888888888888")!;
    const items: AdminActivityLog[] = [
      { id: "67000000-0000-4000-8000-000000000001", actorId: actor.id, actor, action: "view:/events/global-startup-demo-night", targetType: "events", targetId: "550e8400-e29b-41d4-a716-446655440001", metadata: { method: "GET", statusCode: 200, ip: "127.0.0.1", userAgent: "Demo browser", durationMs: 18 }, createdAt: now.toISOString() },
      { id: "67000000-0000-4000-8000-000000000002", actorId: actor.id, actor, action: "update:/settings/privacy", targetType: "settings", targetId: actor.id, metadata: { method: "PATCH", statusCode: 200, ip: "127.0.0.1", userAgent: "Demo browser", durationMs: 34 }, createdAt: new Date(now.getTime() - 60_000).toISOString() },
    ];
    const params = new URLSearchParams(queryString);
    const q = (params.get("q") ?? "").toLocaleLowerCase("tr-TR");
    const category = params.get("category") ?? "";
    const filtered = items.filter((item) => (!q || `${item.action} ${item.actor?.name ?? ""} ${item.actor?.email ?? ""}`.toLocaleLowerCase("tr-TR").includes(q)) && (!category || item.targetType === category));
    return schema.parse({ items: filtered, total: filtered.length, page: 1, pageSize: 50, hasNextPage: false });
  }

  if (pathname === "/admin/users" && method === "GET") {
    return schema.parse(listMockAdminUsers(new URLSearchParams(queryString)));
  }

  if (pathname.startsWith("/admin/users/") && method === "GET") {
    return schema.parse(
      getMockAdminUser(pathname.slice("/admin/users/".length)),
    );
  }

  if (
    pathname.startsWith("/admin/users/") &&
    pathname.endsWith("/actions") &&
    method === "POST"
  ) {
    const userId = pathname.slice("/admin/users/".length, -"/actions".length);
    return schema.parse(
      runMockAdminUserAction(userId, parseBody<AdminUserActionInput>(options)),
    );
  }

  if (pathname.startsWith("/admin/users/") && method === "PATCH") {
    return schema.parse(
      updateMockAdminUser(
        pathname.slice("/admin/users/".length),
        parseBody<Partial<AdminManagedUser>>(options),
      ),
    );
  }

  if (pathname === "/admin/role-groups" && method === "GET") {
    return schema.parse(listMockRoleGroups());
  }

  if (pathname === "/admin/role-groups" && method === "POST") {
    return schema.parse(
      createMockRoleGroup(parseBody<RoleGroupInput>(options)),
    );
  }

  if (pathname.startsWith("/admin/role-groups/") && method === "PATCH") {
    return schema.parse(
      updateMockRoleGroup(
        pathname.slice("/admin/role-groups/".length),
        parseBody<Partial<RoleGroupInput> & { status?: string }>(options),
      ),
    );
  }

  if (pathname === "/support/categories" && method === "GET") {
    const type = new URLSearchParams(queryString).get("type");
    return schema.parse(
      listMockCmsCategories()
        .filter(
          (category) =>
            category.status === "active" && (!type || category.type === type),
        )
        .sort((a, b) => a.name.localeCompare(b.name, "tr")),
    );
  }

  if (pathname === "/admin/cms/categories" && method === "GET") {
    return schema.parse(listMockCmsCategories());
  }

  if (pathname === "/admin/cms/categories" && method === "POST") {
    return schema.parse(
      createMockCmsCategory(parseBody<CmsCategoryInput>(options)),
    );
  }

  if (pathname.startsWith("/admin/cms/categories/") && method === "PATCH") {
    return schema.parse(
      updateMockCmsCategory(
        pathname.slice("/admin/cms/categories/".length),
        parseBody<Partial<CmsCategory>>(options),
      ),
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
    return schema.parse(
      updateMockFaq(
        pathname.slice("/admin/cms/faqs/".length),
        parseBody<Partial<FaqInput> & { status?: string }>(options),
      ),
    );
  }

  if (pathname.startsWith("/admin/cms/faqs/") && method === "DELETE") {
    deleteMockFaq(pathname.slice("/admin/cms/faqs/".length));
    return schema.parse({ ok: true });
  }

  if (pathname === "/admin/cms/announcements" && method === "GET") {
    return schema.parse(listMockAnnouncements());
  }

  if (pathname === "/admin/announcements/active" && method === "GET") {
    const now = Date.now();
    return schema.parse(
      listMockAnnouncements().filter(
        (announcement) =>
          announcement.target === "admins" &&
          announcement.status === "active" &&
          new Date(announcement.publishAt).getTime() <= now &&
          (!announcement.expiresAt ||
            new Date(announcement.expiresAt).getTime() > now),
      ),
    );
  }

  if (pathname === "/admin/cms/announcements" && method === "POST") {
    return schema.parse(
      createMockAnnouncement(parseBody<AnnouncementInput>(options)),
    );
  }

  if (pathname.startsWith("/admin/cms/announcements/") && method === "PATCH") {
    return schema.parse(
      updateMockAnnouncement(
        pathname.slice("/admin/cms/announcements/".length),
        parseBody<Partial<AnnouncementInput> & { status?: string }>(options),
      ),
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
    return schema.parse(
      listMockReportGroups(params.get("scope") === "old" ? "old" : "active"),
    );
  }

  if (
    pathname.startsWith("/admin/report-groups/") &&
    pathname.endsWith("/note") &&
    method === "PATCH"
  ) {
    const { targetType, targetId } = parseReportGroupPath(
      pathname.slice(0, -"/note".length),
    );
    return schema.parse(
      updateMockReportGroupNote(
        targetType,
        targetId,
        parseBody<{ note: string }>(options).note,
      ),
    );
  }

  if (
    pathname.startsWith("/admin/report-groups/") &&
    pathname.endsWith("/comments") &&
    method === "POST"
  ) {
    const { targetType, targetId } = parseReportGroupPath(
      pathname.slice(0, -"/comments".length),
    );
    return schema.parse(
      createMockReportGroupComment(
        targetType,
        targetId,
        parseBody<{ body: string }>(options).body,
      ),
    );
  }

  if (
    pathname.startsWith("/admin/report-groups/") &&
    pathname.endsWith("/decisions") &&
    method === "POST"
  ) {
    const { targetType, targetId } = parseReportGroupPath(
      pathname.slice(0, -"/decisions".length),
    );
    return schema.parse(
      createMockModerationDecision(
        targetType,
        targetId,
        parseBody<ModerationDecisionInput>(options),
      ),
    );
  }

  if (pathname.startsWith("/admin/report-groups/") && method === "GET") {
    const { targetType, targetId } = parseReportGroupPath(pathname);
    return schema.parse(getMockReportGroupDetail(targetType, targetId));
  }

  if (pathname.startsWith("/admin/reports/") && method === "PATCH") {
    return schema.parse(
      updateMockReport(
        pathname.slice("/admin/reports/".length),
        parseBody<UpdateReportInput>(options),
      ),
    );
  }

  if (
    pathname.startsWith("/admin/reports/") &&
    pathname.endsWith("/actions") &&
    method === "POST"
  ) {
    const reportId = pathname.slice(
      "/admin/reports/".length,
      -"/actions".length,
    );
    return schema.parse(
      resolveMockReportAction(
        reportId,
        parseBody<ResolveReportActionInput>(options),
      ),
    );
  }

  if (pathname === "/admin/tags" && method === "GET") {
    return schema.parse(getStoredTags());
  }

  if (pathname === "/admin/tags" && method === "POST") {
    return schema.parse(
      createMockTag(parseBody<{ name: string; description?: string }>(options)),
    );
  }

  if (
    pathname.startsWith("/admin/tags/") &&
    pathname.endsWith("/ban") &&
    method === "POST"
  ) {
    return schema.parse(
      updateMockTag(pathname.slice("/admin/tags/".length, -"/ban".length), {
        status: "hidden",
      }),
    );
  }

  if (
    pathname.startsWith("/admin/tags/") &&
    pathname.endsWith("/merge") &&
    method === "POST"
  ) {
    return schema.parse(
      mergeMockTag(
        pathname.slice("/admin/tags/".length, -"/merge".length),
        parseBody<{ targetTagId: string }>(options).targetTagId,
      ),
    );
  }

  if (pathname.startsWith("/admin/tags/") && method === "GET") {
    return schema.parse(getMockAdminTag(pathname.slice("/admin/tags/".length)));
  }

  if (pathname.startsWith("/admin/tags/") && method === "PATCH") {
    return schema.parse(
      updateMockTag(pathname.slice("/admin/tags/".length), parseBody(options)),
    );
  }

  if (pathname.startsWith("/admin/tags/") && method === "DELETE") {
    return schema.parse(
      updateMockTag(pathname.slice("/admin/tags/".length), {
        status: "archived",
      }),
    );
  }

  if (pathname === "/admin/events" && method === "GET") {
    return schema.parse(getStoredEvents());
  }

  if (pathname === "/admin/events" && method === "POST") {
    return schema.parse(createMockEvent(parseBody<AdminEventInput>(options)));
  }

  if (pathname === "/events" && method === "POST" && options.auth === "user") {
    const user = getUserSession();
    return schema.parse(
      createMockEvent(
        parseBody<AdminEventInput>(options),
        user?.name ?? "Konnektora User",
        user?.id,
      ),
    );
  }

  if (
    pathname === "/me/events" &&
    method === "GET" &&
    options.auth === "user"
  ) {
    return schema.parse(listMockUserEvents());
  }
  if (pathname === "/me/tickets" && method === "GET" && options.auth === "user")
    return schema.parse(listMockUserEvents());
  if (/^\/events\/[^/]+\/ticket-types$/.test(pathname) && method === "GET")
    return schema.parse([]);
  if (pathname === "/me/owned-tickets" && method === "GET")
    return schema.parse(listMockOwnedTicketOrders());
  if (/^\/ticket-types\/[^/]+\/purchase$/.test(pathname) && method === "POST")
    return schema.parse({ success: true });
  if (pathname === "/me/tickets/transfer" && method === "POST")
    return schema.parse(transferMockOwnedTickets(parseBody<{ ticketIds: string[] }>(options)));
  if (
    /^\/me\/ticket-orders\/[^/]+\/refund$/.test(pathname) &&
    method === "POST"
  )
    return schema.parse(refundMockTicketOrder(pathname.split("/")[3]!));

  if (pathname === "/places" && method === "GET") {
    return schema.parse(listMockPublicPlaces(new URLSearchParams(queryString)));
  }

  if (pathname === "/places" && method === "POST") {
    return schema.parse(createMockPublicPlace(parseBody<PlaceInput>(options)));
  }

  if (pathname === "/me/places" && method === "GET") {
    return schema.parse(listMockManagedPlaces());
  }

  if (pathname.startsWith("/me/places/") && method === "PATCH") {
    return schema.parse(
      updateMockPublicPlace(
        pathname.slice("/me/places/".length),
        parseBody<Partial<PlaceInput>>(options),
      ),
    );
  }

  if (pathname.startsWith("/me/places/") && method === "DELETE") {
    return schema.parse(
      archiveMockPublicPlace(pathname.slice("/me/places/".length)),
    );
  }

  if (
    pathname.startsWith("/places/") &&
    pathname.endsWith("/follow") &&
    method === "POST"
  ) {
    return schema.parse(
      setMockPlaceFollow(
        pathname.slice("/places/".length, -"/follow".length),
        true,
      ),
    );
  }

  if (
    pathname.startsWith("/places/") &&
    pathname.endsWith("/follow") &&
    method === "DELETE"
  ) {
    return schema.parse(
      setMockPlaceFollow(
        pathname.slice("/places/".length, -"/follow".length),
        false,
      ),
    );
  }

  if (
    pathname.startsWith("/places/") &&
    pathname.endsWith("/check-in/preview") &&
    method === "POST"
  ) {
    const placeId = pathname.slice("/places/".length, -"/check-in/preview".length);
    const input = parseBody<{ payload: string; method: "qr" | "nfc" }>(options);
    return schema.parse(previewMockPlaceCheckIn(placeId, input.payload, input.method));
  }

  const placePassportDecisionMatch = pathname.match(/^\/places\/([^/]+)\/check-in\/passport\/([^/]+)\/decision$/);
  if (placePassportDecisionMatch && method === "POST") {
    const input = parseBody<{ decision: "admit" | "decline"; method: "manual" | "qr" | "nfc" }>(options);
    return schema.parse(decideMockPlaceCheckIn(placePassportDecisionMatch[1]!, placePassportDecisionMatch[2]!, input.decision, input.method));
  }

  const placePassportMatch = pathname.match(/^\/places\/([^/]+)\/check-in\/passport\/([^/]+)$/);
  if (placePassportMatch && method === "GET") {
    return schema.parse(getMockPlaceCheckInPassport(placePassportMatch[1]!, placePassportMatch[2]!));
  }

  if (
    pathname.startsWith("/places/") &&
    pathname.endsWith("/check-in/scan") &&
    method === "POST"
  ) {
    const placeId = pathname.slice("/places/".length, -"/check-in/scan".length);
    const payload = parseBody<{ payload: string }>(options).payload;
    const candidate =
      listMockPlaceMembers(placeId).find(
        (item) =>
          item.status === "accepted" &&
          !item.checkedInAt &&
          (payload.includes(item.userId) ||
            payload.startsWith("konnektora://member?")),
      ) ??
      listMockPlaceMembers(placeId).find(
        (item) => item.status === "accepted" && !item.checkedInAt,
      );
    if (!candidate) throw new Error("Check-in için uygun üye bulunamadı.");
    return schema.parse(checkInMockPlaceMember(placeId, candidate.userId));
  }

  if (
    pathname.startsWith("/places/") &&
    pathname.endsWith("/related-users") &&
    method === "GET"
  ) {
    return schema.parse(
      listMockPlaceMembers(
        pathname.slice("/places/".length, -"/related-users".length),
      )
        .filter((item) => item.status === "accepted" && item.user)
        .map((item) => ({
          id: item.user!.id,
          name: item.user!.name,
          username: item.user!.username ?? null,
          city: item.user!.city ?? null,
          country: item.user!.country ?? null,
          profileVerifiedAt: null,
          relation: item.role,
          status: item.status,
          checkedIn: Boolean(item.checkedInAt),
        })),
    );
  }

  if (
    pathname.startsWith("/places/") &&
    pathname.endsWith("/invitations/sent") &&
    method === "GET"
  ) {
    return schema.parse(
      listMockPlaceMembers(pathname.slice("/places/".length, -"/invitations/sent".length))
        .filter((item) => item.status === "invited" && item.user)
        .map((item) => ({
          id: item.user!.id,
          name: item.user!.name,
          username: item.user!.username ?? null,
          avatarUrl: item.user!.avatarUrl ?? null,
          invitedAt: item.createdAt ?? new Date().toISOString(),
        })),
    );
  }

  if (
    pathname.startsWith("/places/") &&
    pathname.endsWith("/members") &&
    method === "GET"
  ) {
    return schema.parse(
      listMockPlaceMembers(
        pathname.slice("/places/".length, -"/members".length),
      ),
    );
  }

  if (
    pathname.startsWith("/places/") &&
    pathname.endsWith("/invite") &&
    method === "POST"
  ) {
    return schema.parse(
      inviteMockPlaceMember(
        pathname.slice("/places/".length, -"/invite".length),
        parseBody(options),
      ),
    );
  }

  if (
    pathname.startsWith("/places/") &&
    pathname.includes("/members/") &&
    method === "PATCH"
  ) {
    const [placeId, userId] = pathname
      .slice("/places/".length)
      .split("/members/");
    return schema.parse(
      updateMockPlaceMember(placeId ?? "", userId ?? "", parseBody(options)),
    );
  }
  if (
    pathname.startsWith("/places/") &&
    pathname.includes("/members/") &&
    pathname.endsWith("/check-in") &&
    method === "POST"
  ) {
    const [placeId, userPart] = pathname
      .slice("/places/".length)
      .split("/members/");
    return schema.parse(
      checkInMockPlaceMember(
        placeId ?? "",
        (userPart ?? "").replace(/\/check-in$/, ""),
      ),
    );
  }

  if (
    pathname.startsWith("/places/") &&
    pathname.endsWith("/membership") &&
    method === "PUT"
  ) {
    return schema.parse(
      respondMockPlaceInvite(
        pathname.slice("/places/".length, -"/membership".length),
        parseBody<{ status: string }>(options).status,
      ),
    );
  }

  if (pathname.startsWith("/places/") && method === "GET") {
    return schema.parse(getMockPublicPlace(pathname.slice("/places/".length)));
  }

  if (
    pathname.startsWith("/me/events/") &&
    method === "PATCH" &&
    options.auth === "user"
  ) {
    return schema.parse(
      updateMockEvent(pathname.slice("/me/events/".length), parseBody(options)),
    );
  }

  if (
    pathname.startsWith("/me/events/") &&
    method === "DELETE" &&
    options.auth === "user"
  ) {
    return schema.parse(
      updateMockEvent(pathname.slice("/me/events/".length), {
        status: "archived",
      }),
    );
  }

  if (
    pathname.startsWith("/events/") &&
    pathname.endsWith("/attend") &&
    method === "POST"
  ) {
    return schema.parse(
      requestMockAttendance(
        pathname.slice("/events/".length, -"/attend".length),
      ),
    );
  }

  if (
    (pathname.startsWith("/event-stats/") ||
      pathname.startsWith("/place-stats/")) &&
    method === "GET"
  ) {
    const analyticsUser = getUserSession();
    const memberPlan = analyticsUser ? readStorage<Record<string, { plan: "free" | "plus" | "premium" }>>(MOCK_MEMBER_PLANS_KEY, {})[analyticsUser.id]?.plan ?? "free" : "free";
    const businessPlan = analyticsUser ? readStorage<Record<string, { plan: "starter" | "growth" | "scale" }>>(MOCK_BUSINESS_PLANS_KEY, {})[analyticsUser.id]?.plan ?? "starter" : "starter";
    const hasAnalyticsAccess = Boolean(analyticsUser && (["admin", "super_admin", "curator"].includes(analyticsUser.role) || (analyticsUser.accountType === "corporate" ? businessPlan !== "starter" : memberPlan !== "free")));
    if (!hasAnalyticsAccess) return undefined;
    const targetType = pathname.startsWith("/event-stats/") ? "event" : "place";
    const targetId = pathname.slice(
      targetType === "event" ? "/event-stats/".length : "/place-stats/".length,
    );
    const comments = readStorage<ContentThreadComment[]>(
      MOCK_CONTENT_THREAD_COMMENTS_KEY,
      [],
    ).filter(
      (item) => item.targetType === targetType && item.targetId === targetId,
    ).length;
    const ratings = Object.entries(readStorage<Record<string, number>>(MOCK_CONTENT_RATINGS_KEY, {})).filter(([key]) => key.includes(`:${targetType}:${targetId}`)).map(([, value]) => value);
    const averageRating = ratings.length ? Math.round(ratings.reduce((sum, value) => sum + value, 0) / ratings.length * 10) / 10 : 0;
    if (targetType === "event") {
      const participants = readStorage<EventParticipant[]>(
        MOCK_PARTICIPANTS_KEY,
        [],
      ).filter((item) => item.eventId === targetId);
      return schema.parse({
        accepted: participants.filter((item) => item.status === "accepted")
          .length,
        attended: participants.filter((item) => item.status === "attended")
          .length,
        requested: participants.filter((item) => item.status === "requested")
          .length,
        invited: participants.filter((item) => item.status === "invited")
          .length,
        comments,
        reactions: 0,
        views: 0,
        averageRating,
        ratingCount: ratings.length,
      });
    }
    const place = listMockPlaces(new URLSearchParams()).find(
      (item) => item.id === targetId,
    );
    return schema.parse({
      followers: place?.followerCount ?? 0,
      invites: 0,
      members: 0,
      comments,
      reactions: 0,
      views: 0,
      averageEventRating: averageRating,
      ratingCount: ratings.length,
    });
  }

  if (pathname === "/reactions" && method === "POST" && options.auth === "user") {
    const input = parseBody<{ targetType: "event" | "place"; targetId: string; reaction: string }>(options);
    const score = Number(input.reaction.replace("rating_", ""));
    if (!["event", "place"].includes(input.targetType) || !Number.isInteger(score) || score < 1 || score > 5) return undefined;
    const session = getUserSession();
    const ratings = readStorage<Record<string, number>>(MOCK_CONTENT_RATINGS_KEY, {});
    ratings[`${session?.id ?? "anonymous"}:${input.targetType}:${input.targetId}`] = score;
    writeStorage(MOCK_CONTENT_RATINGS_KEY, ratings);
    return schema.parse(input);
  }

  if (
    pathname.startsWith("/events/") &&
    pathname.endsWith("/ticket") &&
    method === "GET"
  ) {
    return schema.parse(
      issueMockEventTicket(
        pathname.slice("/events/".length, -"/ticket".length),
      ),
    );
  }

  if (
    pathname.startsWith("/events/") &&
    pathname.endsWith("/check-in/preview") &&
    method === "POST"
  ) {
    const input = parseBody<{ token: string; method: "qr" | "nfc" }>(options);
    return schema.parse(previewMockEventCheckIn(pathname.slice("/events/".length, -"/check-in/preview".length), input.token, input.method));
  }

  const passportDecisionMatch = pathname.match(/^\/events\/([^/]+)\/check-in\/passport\/([^/]+)\/decision$/);
  if (passportDecisionMatch && method === "POST") {
    const input = parseBody<{ decision: "admit" | "decline"; method: "manual" | "qr" | "nfc" }>(options);
    return schema.parse(decideMockEventCheckIn(passportDecisionMatch[1]!, passportDecisionMatch[2]!, input.decision, input.method));
  }

  const passportMatch = pathname.match(/^\/events\/([^/]+)\/check-in\/passport\/([^/]+)$/);
  if (passportMatch && method === "GET") {
    return schema.parse(getMockEventCheckInPassport(passportMatch[1]!, passportMatch[2]!));
  }

  if (
    pathname.startsWith("/events/") &&
    pathname.endsWith("/check-in/scan") &&
    method === "POST"
  ) {
    return schema.parse(
      scanMockEventTicket(
        pathname.slice("/events/".length, -"/check-in/scan".length),
        parseBody<{ token: string }>(options).token,
      ),
    );
  }

  if (
    pathname.startsWith("/events/") &&
    pathname.endsWith("/invite") &&
    method === "POST"
  ) {
    return schema.parse(
      inviteMockParticipant(
        pathname.slice("/events/".length, -"/invite".length),
        parseBody(options),
      ),
    );
  }

  if (
    pathname.startsWith("/events/") &&
    pathname.endsWith("/related-users") &&
    method === "GET"
  ) {
    return schema.parse(
      listMockParticipants(
        pathname.slice("/events/".length, -"/related-users".length),
      )
        .filter(
          (item) => ["accepted", "attended"].includes(item.status) && item.user,
        )
        .map((item) => ({
          id: item.user!.id,
          name: item.user!.name,
          username: item.user!.username ?? null,
          city: item.user!.city ?? null,
          country: item.user!.country ?? null,
          profileVerifiedAt: null,
          relation: item.role,
          status: item.status,
          checkedIn: Boolean(item.checkedInAt),
        })),
    );
  }

  if (
    pathname.startsWith("/events/") &&
    pathname.endsWith("/invitations/sent") &&
    method === "GET"
  ) {
    return schema.parse(
      listMockParticipants(pathname.slice("/events/".length, -"/invitations/sent".length))
        .filter((item) => item.status === "invited" && item.user)
        .map((item) => ({
          id: item.user!.id,
          name: item.user!.name,
          username: item.user!.username ?? null,
          avatarUrl: item.user!.avatarUrl ?? null,
          invitedAt: item.createdAt ?? new Date().toISOString(),
        })),
    );
  }

  if (
    pathname.startsWith("/events/") &&
    pathname.endsWith("/participants") &&
    method === "GET"
  ) {
    return schema.parse(
      listMockParticipants(
        pathname.slice("/events/".length, -"/participants".length),
      ),
    );
  }

  if (
    pathname.startsWith("/events/") &&
    pathname.includes("/participants/") &&
    method === "PATCH"
  ) {
    const { eventId, userId } = parseParticipantPath(
      pathname,
      "/participants/",
    );
    return schema.parse(updateMockParticipant(eventId, userId, parseBody<{ status?: string; role?: string }>(options)));
  }

  if (
    pathname.startsWith("/events/") &&
    pathname.endsWith("/check-in") &&
    method === "POST"
  ) {
    const { eventId, userId } = parseParticipantPath(
      pathname.slice(0, -"/check-in".length),
      "/participants/",
    );
    return schema.parse(
      updateMockParticipantStatus(
        eventId,
        userId,
        "attended",
        new Date().toISOString(),
      ),
    );
  }

  if (pathname.startsWith("/admin/events/") && method === "PATCH") {
    return schema.parse(
      updateMockEvent(
        pathname.slice("/admin/events/".length),
        parseBody(options),
      ),
    );
  }

  if (pathname.startsWith("/admin/events/") && method === "DELETE") {
    return schema.parse(
      updateMockEvent(pathname.slice("/admin/events/".length), {
        status: "archived",
      }),
    );
  }

  if (method !== "GET" || options.auth) {
    return undefined;
  }

  if (pathname === "/faqs") {
    return schema.parse(
      listMockFaqs().filter(
        (faq) => faq.status === "active" && faq.category?.status === "active",
      ),
    );
  }

  if (pathname === "/announcements") {
    return schema.parse(listMockPublicAnnouncements());
  }

  if (pathname === "/report-rules") {
    const params = new URLSearchParams(queryString);
    const targetType = params.get("targetType");
    return schema.parse(
      listMockReportRules().filter(
        (rule) =>
          rule.status === "active" &&
          (!targetType || rule.targetType === targetType),
      ),
    );
  }

  if (pathname.startsWith("/policies/")) {
    const type = pathname.slice("/policies/".length);
    const policy = getMockPublicPolicy(type);
    return policy ? schema.parse(policy) : undefined;
  }

  if (pathname === "/tags") {
    const blockedTagIds = new Set(
      listMockBlocks()
        .filter((block) => block.targetType === "tag")
        .map((block) => block.targetId),
    );
    return schema.parse(
      getStoredTags().filter(
        (tag) => tag.status === "active" && !blockedTagIds.has(tag.id),
      ),
    );
  }

  if (pathname === "/events") {
    return schema.parse(listMockEventFeed(new URLSearchParams(queryString)));
  }

  if (pathname.startsWith("/events/")) {
    const slug = decodeURIComponent(pathname.slice("/events/".length));
    const event = getStoredEvents().find(
      (eventItem) =>
        eventItem.status === "published" && eventItem.slug === slug,
    );

    const blocks = listMockBlocks();
    const isBlocked =
      event &&
      (blocks.some(
        (block) => block.targetType === "event" && block.targetId === event.id,
      ) ||
        event.tags.some((tag) =>
          blocks.some(
            (block) => block.targetType === "tag" && block.targetId === tag.id,
          ),
        ));
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
  const defaultsById = new Map(mockEvents.map((event) => [event.id, event]));
  return [
    ...storedEvents.map((event) => {
      const current = defaultsById.get(event.id);
      return {
        ...event,
        latitude: event.latitude ?? current?.latitude ?? null,
        longitude: event.longitude ?? current?.longitude ?? null,
      };
    }),
    ...mockEvents.filter((event) => !storedIds.has(event.id)),
  ];
}

function getStoredTags(): Tag[] {
  const storedTags = readStorage<Tag[]>(MOCK_TAGS_KEY, []);
  const storedSlugs = new Set(storedTags.map((tag) => tag.slug));
  return [
    ...storedTags,
    ...mockTags.filter((tag) => !storedSlugs.has(tag.slug)),
  ];
}

function listMockEventFeed(params: URLSearchParams): EventList {
  const scope = params.get("scope");
  const selectedTag = params.get("tag");
  const selectedFormat = params.get("format");
  const search = params.get("q")?.toLowerCase().trim();
  const dateFrom = params.get("dateFrom");
  const dateTo = params.get("dateTo");
  const city = params.get("city")?.toLowerCase().trim();
  const country = params.get("country")?.toLowerCase().trim();
  const page = Math.max(Number(params.get("page") || "1"), 1);
  const pageSize = Math.min(
    Math.max(Number(params.get("pageSize") || "24"), 1),
    50,
  );
  const blocks = listMockBlocks();
  const blockedEventIds = new Set(
    blocks
      .filter((block) => block.targetType === "event")
      .map((block) => block.targetId),
  );
  const blockedTagIds = new Set(
    blocks
      .filter((block) => block.targetType === "tag")
      .map((block) => block.targetId),
  );
  let events = getStoredEvents().filter(
    (eventItem) =>
      eventItem.status === "published" &&
      !blockedEventIds.has(eventItem.id) &&
      !eventItem.tags.some((tag) => blockedTagIds.has(tag.id)) &&
      (!selectedTag ||
        eventItem.tags.some((tagItem) => tagItem.slug === selectedTag)) &&
      (!selectedFormat || eventItem.format === selectedFormat) &&
      (!search ||
        [
          eventItem.title,
          eventItem.summary,
          eventItem.description,
          eventItem.organizerName ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(search)) &&
      (!dateFrom || new Date(eventItem.startsAt) >= new Date(dateFrom)) &&
      (!dateTo || new Date(eventItem.startsAt) <= new Date(dateTo)) &&
      (!city || eventItem.city?.toLowerCase() === city) &&
      (!country || eventItem.country?.toLowerCase() === country),
  );
  const user = getUserSession();
  if (scope && user) {
    const participations = readStorage<EventParticipant[]>(MOCK_PARTICIPANTS_KEY, []).filter((item) => item.userId === user.id);
    const participationByEvent = new Map(participations.map((item) => [item.eventId, item.status]));
    if (scope === "mine") {
      const userEventIds = new Set(readStorage<Record<string, string[]>>(MOCK_USER_EVENT_IDS_KEY, {})[user.id] ?? []);
      events = events.filter((item) => item.createdById === user.id || userEventIds.has(item.id) || ["accepted", "attended"].includes(participationByEvent.get(item.id) ?? ""));
    } else if (scope === "invited") {
      events = events.filter((item) => participationByEvent.get(item.id) === "invited");
    } else if (scope === "following") {
      const followingIds = new Set(listMockFollowing().map((item) => item.id));
      events = events.filter((item) => item.createdById && followingIds.has(item.createdById));
    } else if (scope === "for_you") {
      const tagIds = new Set(getUserInterestTagIds());
      events = events.filter((item) => item.tags.some((tag) => tagIds.has(tag.id)));
    }
  }
  if (scope === "individual") {
    const accountTypes = new Map(getAllMockUsers().map((item) => [item.id, item.accountType ?? "individual"]));
    events = events.filter((item) => !item.createdById || accountTypes.get(item.createdById) !== "corporate");
  }
  const start = (page - 1) * pageSize;

  return {
    items: events.slice(start, start + pageSize),
    total: events.length,
    page,
    pageSize,
    hasNextPage: start + pageSize < events.length,
  };
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

function userMessageTypeFromAdminPath(
  pathname: string,
): UserMessageType | null {
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
      updatedAt: now,
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
      updatedAt: now,
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
      updatedAt: now,
    },
  ];
  const storedMessages = readStorage<UserMessage[]>(MOCK_USER_MESSAGES_KEY, []);
  const storedIds = new Set(storedMessages.map((message) => message.id));

  return [
    ...storedMessages,
    ...seededMessages.filter((message) => !storedIds.has(message.id)),
  ];
}

function setStoredUserMessages(messages: UserMessage[]) {
  writeStorage(MOCK_USER_MESSAGES_KEY, messages);
}

function createMockUserMessage(
  input: UserMessageInput,
  useCurrentUser: boolean,
): UserMessage {
  const user = useCurrentUser ? getUserSession() : null;
  const now = new Date().toISOString();
  const message: UserMessage = {
    id: createId(),
    type: input.type,
    category: input.category?.trim() || null,
    userId: user?.id ?? null,
    name: input.name.trim() || user?.name || "Konnektora User",
    email:
      input.email.trim().toLowerCase() || user?.email || "user@example.com",
    phone: input.phone?.trim() || null,
    body: input.body.trim(),
    status: "unread",
    appVersion: input.appVersion?.trim() || null,
    systemInfo: input.systemInfo?.trim() || null,
    readAt: null,
    readById: null,
    createdAt: now,
    updatedAt: now,
    user: user
      ? {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
        }
      : null,
    readBy: null,
  };

  setStoredUserMessages([message, ...getStoredUserMessages()]);
  return message;
}

function listMockUserMessages(
  type: UserMessageType,
  params: URLSearchParams,
): UserMessageList {
  const status = params.get("status");
  const category = params.get("category");
  const q = params.get("q")?.toLowerCase().trim();
  const page = Math.max(Number(params.get("page") || "1"), 1);
  const pageSize = Math.min(
    Math.max(Number(params.get("pageSize") || "25"), 1),
    100,
  );
  const messages = getStoredUserMessages()
    .filter(
      (message) =>
        message.type === type &&
        (!status || message.status === status) &&
        (!category || message.category === category) &&
        (!q ||
          [message.name, message.email, message.phone ?? "", message.body]
            .join(" ")
            .toLowerCase()
            .includes(q)),
    )
    .sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "unread" ? -1 : 1;
      }

      return (
        new Date(b.createdAt ?? 0).getTime() -
        new Date(a.createdAt ?? 0).getTime()
      );
    });
  const start = (page - 1) * pageSize;

  return {
    items: messages.slice(start, start + pageSize),
    total: messages.length,
    page,
    pageSize,
    hasNextPage: start + pageSize < messages.length,
  };
}

function getMockUserMessage(id: string): UserMessage {
  const message = getStoredUserMessages().find((item) => item.id === id);

  if (!message) {
    throw new Error("Mock user message not found");
  }

  return message;
}

function updateMockUserMessage(
  id: string,
  input: { status: UserMessageStatus },
): UserMessage {
  const messages = getStoredUserMessages();
  const admin = getUserSession() ?? {
    id: "99999999-9999-4999-8999-999999999999",
    email: "admin@konnektora.local",
    name: "Konnektora Admin",
    role: "super_admin" as const,
    status: "active" as const,
  };
  const updatedMessages = messages.map((message) =>
    message.id === id
      ? {
          ...message,
          status: input.status,
          readAt: input.status === "read" ? new Date().toISOString() : null,
          readById: input.status === "read" ? admin.id : null,
          readBy: input.status === "read" ? admin : null,
          updatedAt: new Date().toISOString(),
        }
      : message,
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
  return user
    ? {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role ?? "user",
        status: user.status ?? "active",
      }
    : null;
}

function defaultMockPlaces(): AdminPlace[] {
  const now = new Date().toISOString();
  return [
    {
      id: "60000000-6000-4000-8000-000000000001",
      name: "Konnektora Hub Berlin",
      slug: "konnektora-hub-berlin-310001",
      description: "Community meetup venue",
      status: "active",
      coverImageUrl:
        "https://images.unsplash.com/photo-1497366754035-f200968a6e72",
      country: "Germany",
      city: "Berlin",
      address: "Mitte",
      latitude: 52.5208,
      longitude: 13.4095,
      placeType: "community",
      visibility: "open",
      followerCount: 1,
      inviteCount: 0,
      createdById: "88888888-8888-4888-8888-888888888888",
      updatedById: null,
      createdAt: now,
      updatedAt: now,
      createdBy: basicMockUser("88888888-8888-4888-8888-888888888888"),
      updatedBy: null,
      reportCount: 0,
    },
    {
      id: "60000000-6000-4000-8000-000000000002",
      name: "Galata Product House",
      slug: "galata-product-house-310002",
      description:
        "Ürün ekipleri, bağımsız geliştiriciler ve kurucular için çalışma ve etkinlik alanı.",
      status: "active",
      coverImageUrl:
        "https://images.unsplash.com/photo-1497366754035-f200968a6e72",
      country: "Türkiye",
      city: "Istanbul",
      address: "Galata",
      latitude: 41.0256,
      longitude: 28.9744,
      placeType: "coworking",
      visibility: "open",
      followerCount: 1,
      inviteCount: 0,
      createdById: "72000000-0000-4000-8000-000000000003",
      updatedById: null,
      createdAt: now,
      updatedAt: now,
      createdBy: basicMockUser("72000000-0000-4000-8000-000000000003"),
      updatedBy: null,
      reportCount: 0,
    },
    {
      id: "60000000-6000-4000-8000-000000000003",
      name: "Amsterdam Founder Loft",
      slug: "amsterdam-founder-loft-310003",
      description:
        "Founder breakfast, yatırımcı görüşmeleri ve küçük topluluk buluşmaları için sakin bir merkez.",
      status: "active",
      coverImageUrl:
        "https://images.unsplash.com/photo-1497366811353-6870744d04b2",
      country: "Netherlands",
      city: "Amsterdam",
      address: "De Pijp",
      latitude: 52.3547,
      longitude: 4.8936,
      placeType: "venue",
      visibility: "approval_required",
      followerCount: 1,
      inviteCount: 0,
      createdById: "72000000-0000-4000-8000-000000000004",
      updatedById: null,
      createdAt: now,
      updatedAt: now,
      createdBy: basicMockUser("72000000-0000-4000-8000-000000000004"),
      updatedBy: null,
      reportCount: 0,
    },
    {
      id: "60000000-6000-4000-8000-000000000004",
      name: "London Community Studio",
      slug: "london-community-studio-310004",
      description:
        "Demo geceleri, yaratıcı atölyeler ve küratörlü networking oturumları için esnek stüdyo.",
      status: "active",
      coverImageUrl:
        "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4",
      country: "United Kingdom",
      city: "London",
      address: "Shoreditch",
      latitude: 51.5255,
      longitude: -0.0786,
      placeType: "gallery",
      visibility: "invite_only",
      followerCount: 1,
      inviteCount: 0,
      createdById: "99999999-9999-4999-8999-999999999999",
      updatedById: null,
      createdAt: now,
      updatedAt: now,
      createdBy: basicMockUser("99999999-9999-4999-8999-999999999999"),
      updatedBy: null,
      reportCount: 0,
    },
  ];
}

function defaultMockPlaceMembers(): PlaceMember[] {
  const now = new Date().toISOString();
  const memberships = [
    { placeId: "60000000-6000-4000-8000-000000000001", userId: "88888888-8888-4888-8888-888888888888", role: "organizer" as const },
    { placeId: "60000000-6000-4000-8000-000000000001", userId: "99999999-9999-4999-8999-999999999999", role: "member" as const },
    { placeId: "60000000-6000-4000-8000-000000000002", userId: "72000000-0000-4000-8000-000000000003", role: "organizer" as const },
    { placeId: "60000000-6000-4000-8000-000000000002", userId: "88888888-8888-4888-8888-888888888888", role: "member" as const },
    { placeId: "60000000-6000-4000-8000-000000000003", userId: "72000000-0000-4000-8000-000000000004", role: "organizer" as const },
    { placeId: "60000000-6000-4000-8000-000000000003", userId: "88888888-8888-4888-8888-888888888888", role: "member" as const },
    { placeId: "60000000-6000-4000-8000-000000000004", userId: "99999999-9999-4999-8999-999999999999", role: "organizer" as const },
    { placeId: "60000000-6000-4000-8000-000000000004", userId: "88888888-8888-4888-8888-888888888888", role: "member" as const },
  ];

  return memberships.map((membership) => {
    const source = getAllMockUsers().find((user) => user.id === membership.userId)!;
    return {
      ...membership,
      status: "accepted" as const,
      createdAt: now,
      updatedAt: now,
      user: {
        id: source.id,
        email: source.email,
        name: source.name,
        username: source.username ?? null,
        city: source.city ?? null,
        country: source.country ?? null,
        role: source.role ?? "user",
        accountType: source.accountType === "corporate" ? "corporate" as const : "individual" as const,
        status: source.status ?? "active",
        avatarUrl: source.avatarUrl ?? null,
        followerCount: source.followerCount ?? 0,
      },
    };
  });
}

function getAllMockPlaceMembers(): PlaceMember[] {
  const stored = readStorage<PlaceMember[]>(MOCK_PLACE_MEMBERS_KEY, []);
  const defaults = defaultMockPlaceMembers();
  const storedKeys = new Set(stored.map((member) => `${member.placeId}:${member.userId}`));
  return [
    ...stored,
    ...defaults.filter((member) => !storedKeys.has(`${member.placeId}:${member.userId}`)),
  ];
}

function filterMockAdminContent<T extends { status: string }>(
  items: T[],
  params: URLSearchParams,
): T[] {
  const q = params.get("q")?.toLowerCase().trim();
  const status = params.get("status");
  return items.filter(
    (item) =>
      (!status || item.status === status) &&
      (!q || JSON.stringify(item).toLowerCase().includes(q)),
  );
}

function listMockPlaces(params: URLSearchParams): AdminPlace[] {
  const stored = readStorage<AdminPlace[]>(MOCK_PLACES_KEY, []);
  const defaults = defaultMockPlaces();
  const defaultsById = new Map(defaults.map((place) => [place.id, place]));
  const merged = stored.length
    ? [
        ...stored.map((place) => ({ ...defaultsById.get(place.id), ...place } as AdminPlace)),
        ...defaults.filter((place) => !stored.some((storedPlace) => storedPlace.id === place.id)),
      ]
    : defaults;
  const cityCoordinates: Record<string, { latitude: number; longitude: number }> = {
    Amsterdam: { latitude: 52.3676, longitude: 4.9041 },
    Berlin: { latitude: 52.52, longitude: 13.405 },
    Copenhagen: { latitude: 55.6761, longitude: 12.5683 },
    Istanbul: { latitude: 41.0082, longitude: 28.9784 },
    "İstanbul": { latitude: 41.0082, longitude: 28.9784 },
    Lisbon: { latitude: 38.7223, longitude: -9.1393 },
    London: { latitude: 51.5074, longitude: -0.1278 },
    "New York": { latitude: 40.7128, longitude: -74.006 },
    Paris: { latitude: 48.8566, longitude: 2.3522 },
    "San Francisco": { latitude: 37.7749, longitude: -122.4194 },
    Toronto: { latitude: 43.6532, longitude: -79.3832 },
  };
  return filterMockAdminContent(
    merged.map((place) => {
      const coordinates = place.city ? cityCoordinates[place.city] : undefined;
      return place.latitude == null || place.longitude == null
        ? { ...place, latitude: place.latitude ?? coordinates?.latitude ?? null, longitude: place.longitude ?? coordinates?.longitude ?? null }
        : place;
    }),
    params,
  );
}

function getMockPlace(id: string): AdminPlace {
  const item = listMockPlaces(new URLSearchParams()).find(
    (place) => place.id === id,
  );
  if (!item) throw new Error("Mock place not found");
  return {
    ...item,
    reportCount: listMockReports().filter(
      (report) => report.targetType === "place" && report.targetId === id,
    ).length,
  };
}

function mockPlaceViewer(place: AdminPlace): Place {
  const user = getUserSession();
  const follows = readStorage<Array<{ placeId: string; userId: string }>>(
    MOCK_PLACE_FOLLOWS_KEY,
    [],
  );
  const members = listMockPlaceMembers(place.id);
  const membership = members.find((item) => item.userId === user?.id);
  return {
    id: place.id,
    name: place.name,
    slug: place.slug,
    description: place.description,
    status: place.status,
    coverImageUrl: place.coverImageUrl,
    country: place.country,
    city: place.city,
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    placeType: place.placeType,
    visibility: place.visibility,
    memberCount: members.filter((item) => item.status === "accepted").length,
    tags: place.tags,
    followerCount: place.followerCount,
    inviteCount: members.filter((item) => item.status === "invited").length,
    createdById: place.createdById,
    createdAt: place.createdAt,
    updatedAt: place.updatedAt,
    isFollowing: follows.some(
      (item) => item.placeId === place.id && item.userId === user?.id,
    ),
    viewerMembership: membership
      ? { status: membership.status, role: membership.role }
      : user && place.createdById === user.id
        ? { status: "accepted", role: "organizer" }
        : null,
  };
}

function listMockPublicPlaces(params: URLSearchParams): PlaceList {
  const q = params.get("q")?.trim().toLowerCase();
  const city = params.get("city")?.trim().toLowerCase();
  const country = params.get("country")?.trim().toLowerCase();
  const page = Math.max(1, Number(params.get("page") || 1));
  const pageSize = Math.min(
    50,
    Math.max(1, Number(params.get("pageSize") || 12)),
  );
  const items = listMockPlaces(new URLSearchParams())
    .filter((place) => place.status === "active")
    .filter(
      (place) =>
        !q ||
        JSON.stringify([place.name, place.description, place.address])
          .toLowerCase()
          .includes(q),
    )
    .filter((place) => !city || place.city?.toLowerCase() === city)
    .filter((place) => !country || place.country?.toLowerCase() === country)
    .map(mockPlaceViewer);
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
    hasNextPage: start + pageSize < items.length,
  };
}

function getMockPublicPlace(slug: string): Place {
  const place = listMockPlaces(new URLSearchParams()).find(
    (item) => item.slug === slug && item.status === "active",
  );
  if (!place) throw new Error("Mock place not found");
  return mockPlaceViewer(place);
}

function createMockPublicPlace(input: PlaceInput): Place {
  const user = getUserSession();
  if (!user) throw new Error("Mock user session not found");
  const places = listMockPlaces(new URLSearchParams());
  const now = new Date().toISOString();
  const place: AdminPlace = {
    id: createId(),
    name: input.name.trim(),
    slug: uniqueSlug(
      input.name,
      places.map((item) => item.slug),
    ),
    description: input.description?.trim() || null,
    status: "active",
    coverImageUrl: input.coverImageUrl || null,
    country: input.country?.trim() || null,
    city: input.city?.trim() || null,
    address: input.address?.trim() || null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    placeType: input.placeType ?? "community",
    visibility:
      input.visibility === "approval_required" || input.visibility === "invite_only"
        ? input.visibility
        : "open",
    followerCount: 0,
    inviteCount: 0,
    createdById: user.id,
    updatedById: user.id,
    createdAt: now,
    updatedAt: now,
    createdBy: user,
    updatedBy: user,
    reportCount: 0,
  };
  writeStorage(MOCK_PLACES_KEY, [place, ...places]);
  const member: PlaceMember = {
    placeId: place.id,
    userId: user.id,
    status: "accepted",
    role: "organizer",
    createdAt: now,
    updatedAt: now,
    user,
  };
  writeStorage(MOCK_PLACE_MEMBERS_KEY, [
    member,
    ...getAllMockPlaceMembers(),
  ]);
  return mockPlaceViewer(place);
}

function listMockManagedPlaces(): Place[] {
  const user = getUserSession();
  const managedIds = new Set(
    getAllMockPlaceMembers()
      .filter(
        (item) =>
          item.userId === user?.id &&
          item.status === "accepted" &&
          ["manager", "organizer"].includes(item.role),
      )
      .map((item) => item.placeId),
  );
  return listMockPlaces(new URLSearchParams())
    .filter((item) => item.createdById === user?.id || managedIds.has(item.id))
    .map(mockPlaceViewer);
}

function updateMockPublicPlace(id: string, input: Partial<PlaceInput>): Place {
  const places = listMockPlaces(new URLSearchParams());
  const current = places.find((item) => item.id === id);
  if (!current) throw new Error("Mock place not found");
  const updated: AdminPlace = {
    ...current,
    name: input.name?.trim() || current.name,
    description:
      input.description === undefined
        ? current.description
        : input.description.trim() || null,
    country:
      input.country === undefined
        ? current.country
        : input.country.trim() || null,
    city: input.city === undefined ? current.city : input.city.trim() || null,
    address:
      input.address === undefined
        ? current.address
        : input.address.trim() || null,
    coverImageUrl:
      input.coverImageUrl === undefined
        ? current.coverImageUrl
        : input.coverImageUrl || null,
    updatedAt: new Date().toISOString(),
  };
  writeStorage(MOCK_PLACES_KEY, [
    updated,
    ...places.filter((item) => item.id !== id),
  ]);
  return mockPlaceViewer(updated);
}

function archiveMockPublicPlace(id: string) {
  const places = listMockPlaces(new URLSearchParams());
  const current = places.find((item) => item.id === id);
  if (!current) throw new Error("Mock place not found");
  const updated = {
    ...current,
    status: "archived",
    updatedAt: new Date().toISOString(),
  };
  writeStorage(MOCK_PLACES_KEY, [
    updated,
    ...places.filter((item) => item.id !== id),
  ]);
  return { id, status: "archived" };
}

function setMockPlaceFollow(placeId: string, following: boolean) {
  const user = getUserSession();
  if (!user) throw new Error("Mock user session not found");
  const follows = readStorage<Array<{ placeId: string; userId: string }>>(
    MOCK_PLACE_FOLLOWS_KEY,
    [],
  );
  const filtered = follows.filter(
    (item) => !(item.placeId === placeId && item.userId === user.id),
  );
  writeStorage(
    MOCK_PLACE_FOLLOWS_KEY,
    following ? [{ placeId, userId: user.id }, ...filtered] : filtered,
  );
  const places = listMockPlaces(new URLSearchParams());
  const current = places.find((item) => item.id === placeId);
  if (current) {
    const wasFollowing = follows.some(
      (item) => item.placeId === placeId && item.userId === user.id,
    );
    const delta =
      Number(following && !wasFollowing) - Number(!following && wasFollowing);
    writeStorage(MOCK_PLACES_KEY, [
      { ...current, followerCount: Math.max(0, current.followerCount + delta) },
      ...places.filter((item) => item.id !== placeId),
    ]);
  }
  return { following };
}

function listMockPlaceMembers(placeId: string) {
  return getAllMockPlaceMembers().filter(
    (item) => item.placeId === placeId,
  );
}

function inviteMockPlaceMember(
  placeId: string,
  input: { userId?: string; username?: string; email?: string; phone?: string; name?: string; role?: string },
): PlaceMember {
  const storedUsers = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  let target = getAllMockUsers().find((item) =>
    input.userId
      ? item.id === input.userId
      : input.username
        ? item.username?.toLowerCase() === input.username.replace(/^@/, "").toLowerCase()
        : input.phone
          ? item.phone?.replace(/[\s()-]/g, "") === input.phone.replace(/[\s()-]/g, "")
          : item.email === input.email?.toLowerCase(),
  );
  if (!target && input.email) {
    target = { id: createId(), email: input.email.toLowerCase(), name: input.name?.trim() || input.email.split("@")[0] || input.email, password: "", status: "invited", role: "user", accountType: "individual" };
    writeStorage(MOCK_USERS_KEY, [target, ...storedUsers]);
  }
  if (!target) throw new Error("Mock user not found");
  const members = getAllMockPlaceMembers();
  const now = new Date().toISOString();
  const member: PlaceMember = {
    placeId,
    userId: target.id,
    status: "invited",
    role:
      input.role === "manager" || input.role === "organizer"
        ? input.role
        : "member",
    createdAt: now,
    updatedAt: now,
    user: {
      id: target.id,
      email: target.email,
      name: target.name,
      username: target.username ?? null,
      role: target.role ?? "user",
      accountType: target.accountType === "corporate" ? "corporate" : "individual",
      status: target.status ?? "active",
    },
  };
  writeStorage(MOCK_PLACE_MEMBERS_KEY, [
    member,
    ...members.filter(
      (item) => !(item.placeId === placeId && item.userId === target.id),
    ),
  ]);
  return member;
}

function updateMockPlaceMember(
  placeId: string,
  userId: string,
  input: { status?: string; role?: string },
): PlaceMember {
  const members = getAllMockPlaceMembers();
  const current = members.find(
    (item) => item.placeId === placeId && item.userId === userId,
  );
  if (!current) throw new Error("Mock place member not found");
  const updated: PlaceMember = {
    ...current,
    status:
      input.status === "accepted" ||
      input.status === "declined" ||
      input.status === "banned"
        ? input.status
        : current.status,
    role:
      input.role === "manager" ||
      input.role === "organizer" ||
      input.role === "member"
        ? input.role
        : current.role,
    updatedAt: new Date().toISOString(),
  };
  writeStorage(MOCK_PLACE_MEMBERS_KEY, [
    updated,
    ...members.filter(
      (item) => !(item.placeId === placeId && item.userId === userId),
    ),
  ]);
  return updated;
}

function respondMockPlaceInvite(placeId: string, status: string) {
  const user = getUserSession();
  if (!user) throw new Error("Mock user session not found");
  return updateMockPlaceMember(placeId, user.id, { status });
}
function checkInMockPlaceMember(placeId: string, userId: string) {
  return decideMockPlaceCheckIn(placeId, userId, "admit", "manual");
}

function getMockPlaceCheckInPassport(placeId: string, userId: string, method: "manual" | "qr" | "nfc" = "manual"): CheckInPassport {
  const place = listMockPlaces(new URLSearchParams()).find((item) => item.id === placeId);
  const membership = listMockPlaceMembers(placeId).find((item) => item.userId === userId);
  if (!place || !membership) throw new Error("Mekân üyesi bulunamadı.");
  const member = getAllMockUsers().find((item) => item.id === userId);
  const identity = membership.user ?? member;
  if (!identity) throw new Error("Kullanıcı bulunamadı.");
  return {
    targetType: "place",
    targetId: place.id,
    targetName: place.name,
    user: {
      id: identity.id,
      email: identity.email,
      name: identity.name,
      username: identity.username ?? null,
      role: identity.role ?? "user",
      accountType: identity.accountType === "corporate" ? "corporate" : "individual",
      status: identity.status ?? "active",
      avatarUrl: identity.avatarUrl ?? null,
      followerCount: member?.followerCount ?? 0,
      profileVerifiedAt: member?.profileVerifiedAt ?? null,
      media: [],
    },
    status: membership.status,
    role: membership.role,
    alreadyInside: Boolean(membership.checkedInAt),
    checkedInAt: membership.checkedInAt ?? null,
    checkInOrder: membership.checkInOrder ?? null,
    checkInMethod: membership.checkInMethod ?? method,
    invitedBy: [getUserSession()?.username ? `@${getUserSession()!.username}` : getUserSession()?.name ?? "Konnektora"],
    relatedFollowerCount: 0,
    guestLists: [],
    tickets: [],
  };
}

function previewMockPlaceCheckIn(placeId: string, payload: string, method: "qr" | "nfc") {
  const candidate = listMockPlaceMembers(placeId).find((item) => payload.includes(item.userId)) ?? listMockPlaceMembers(placeId).find((item) => ["accepted", "invited"].includes(item.status));
  if (!candidate) throw new Error("Check-in için uygun üye bulunamadı.");
  return getMockPlaceCheckInPassport(placeId, candidate.userId, method);
}

function decideMockPlaceCheckIn(placeId: string, userId: string, decision: "admit" | "decline", method: "manual" | "qr" | "nfc") {
  const members = getAllMockPlaceMembers();
  const current = members.find((item) => item.placeId === placeId && item.userId === userId);
  if (!current) throw new Error("Mekân üyesi bulunamadı.");
  if (decision === "admit" && current.checkedInAt) throw new Error("Kullanıcı zaten check-in içeride.");
  const now = new Date().toISOString();
  const updated: PlaceMember = {
    ...current,
    status: decision === "admit" ? "accepted" : "declined",
    checkedInAt: decision === "admit" ? now : null,
    checkInDecisionAt: now,
    checkInMethod: method,
    checkInOrder: decision === "admit" ? members.filter((item) => item.placeId === placeId && item.checkedInAt).length + 1 : null,
    updatedAt: now,
  };
  writeStorage(MOCK_PLACE_MEMBERS_KEY, [updated, ...members.filter((item) => !(item.placeId === placeId && item.userId === userId))]);
  return updated;
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
      sortOrder: 0,
      isProfilePicture: false,
      createdAt: now,
      updatedAt: now,
      uploadedBy: basicMockUser("88888888-8888-4888-8888-888888888888"),
      reportCount: 0,
    },
  ]);
  return filterMockAdminContent(
    items.map((item) => ({
      ...item,
      sortOrder: item.sortOrder ?? 0,
      isProfilePicture: item.isProfilePicture ?? false,
    })),
    params,
  );
}

function getMockMedia(id: string): AdminMedia {
  const item = listMockMedia(new URLSearchParams()).find(
    (media) => media.id === id,
  );
  if (!item) throw new Error("Mock media not found");
  return {
    ...item,
    reportCount: listMockReports().filter(
      (report) => report.targetType === "media" && report.targetId === id,
    ).length,
  };
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
      reportCount: 0,
    },
  ]);
  return filterMockAdminContent(items, params);
}

function getMockComment(id: string): AdminComment {
  const item = listMockComments(new URLSearchParams()).find(
    (comment) => comment.id === id,
  );
  if (!item) throw new Error("Mock comment not found");
  return {
    ...item,
    reportCount: listMockReports().filter(
      (report) =>
        [
          "tag_comment",
          "event_comment",
          "place_comment",
          "comment_reply",
        ].includes(report.targetType) && report.targetId === id,
    ).length,
  };
}

function listMockPrivateMessages(
  params: URLSearchParams,
): AdminPrivateMessage[] {
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
      reportCount: 0,
    },
  ]);
  return filterMockAdminContent(items, params);
}

function getMockPrivateMessage(id: string): AdminPrivateMessage {
  const item = listMockPrivateMessages(new URLSearchParams()).find(
    (message) => message.id === id,
  );
  if (!item) throw new Error("Mock private message not found");
  return {
    ...item,
    reportCount: listMockReports().filter(
      (report) =>
        report.targetType === "private_message" && report.targetId === id,
    ).length,
  };
}

function updateMockContentItem<
  T extends { id: string; status: string; updatedAt?: string },
>(key: string, id: string, input: { status: string }): T {
  const fallback = key === MOCK_PLACES_KEY ? defaultMockPlaces() : [];
  const items = readStorage<T[]>(key, fallback as unknown as T[]);
  const updated = items.map((item) =>
    item.id === id
      ? { ...item, status: input.status, updatedAt: new Date().toISOString() }
      : item,
  );
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

  const participants = readStorage<EventParticipant[]>(
    MOCK_PARTICIPANTS_KEY,
    [],
  );
  const status = event.visibility === "open" ? "accepted" : "requested";
  const existing = participants.find(
    (participant) =>
      participant.eventId === eventId && participant.userId === user.id,
  );
  const participant: EventParticipant = {
    id: existing?.id ?? createId(),
    eventId,
    userId: user.id,
    status,
    role: "attendee",
    checkedInAt: null,
    user,
  };

  writeStorage(MOCK_PARTICIPANTS_KEY, [
    participant,
    ...participants.filter(
      (item) => !(item.eventId === eventId && item.userId === user.id),
    ),
  ]);

  return participant;
}

function inviteMockParticipant(
  eventId: string,
  input: {
    userId?: string;
    username?: string;
    email?: string;
    phone?: string;
    name?: string;
    role?: string;
  },
): EventParticipant {
  const storedUsers = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  const users = getAllMockUsers();
  const email = input.email?.toLowerCase().trim();
  const existingUser = input.userId
    ? users.find((user) => user.id === input.userId)
    : input.username
      ? users.find(
          (user) =>
            user.username?.toLowerCase() ===
            input.username?.replace(/^@/, "").toLowerCase(),
        )
      : users.find((user) => user.email === email);
  if (input.username && !existingUser)
    throw new Error("Kullanıcı adı bulunamadı.");
  const user = existingUser ?? {
    id: createId(),
    name: input.name?.trim() || email?.split("@")[0] || "Invited user",
    email: email || `invited-${Date.now()}@konnektora.local`,
    password: "",
    status: "invited" as const,
  };

  if (!existingUser) {
    writeStorage(MOCK_USERS_KEY, [user, ...storedUsers]);
  }

  const participants = readStorage<EventParticipant[]>(
    MOCK_PARTICIPANTS_KEY,
    [],
  );
  const existing = participants.find(
    (participant) =>
      participant.eventId === eventId && participant.userId === user.id,
  );
  const participant: EventParticipant = {
    id: existing?.id ?? createId(),
    eventId,
    userId: user.id,
    status: "invited",
    role:
      input.role === "organizer" || input.role === "manager"
        ? input.role
        : "attendee",
    checkedInAt: null,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username ?? null,
      role: user.role ?? "user",
      accountType: user.accountType === "corporate" ? "corporate" : "individual",
      status: user.status ?? "invited",
    },
  };

  writeStorage(MOCK_PARTICIPANTS_KEY, [
    participant,
    ...participants.filter(
      (item) => !(item.eventId === eventId && item.userId === user.id),
    ),
  ]);

  return participant;
}

function listMockParticipants(eventId: string): EventParticipant[] {
  return readStorage<EventParticipant[]>(MOCK_PARTICIPANTS_KEY, []).filter(
    (participant) => participant.eventId === eventId,
  );
}

type MockEventTicket = Pick<EventTicket, "eventId" | "token" | "issuedAt"> & {
  userId: string;
};

function issueMockEventTicket(eventId: string): EventTicket {
  const user = getUserSession();
  const event = getStoredEvents().find((item) => item.id === eventId);
  const participant = readStorage<EventParticipant[]>(
    MOCK_PARTICIPANTS_KEY,
    [],
  ).find((item) => item.eventId === eventId && item.userId === user?.id);

  if (
    !user ||
    !event ||
    !participant ||
    !["accepted", "invited"].includes(participant.status)
  ) {
    throw new Error("Aktif etkinlik bileti bulunamadı.");
  }

  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const issuedAt = new Date().toISOString();
  const tickets = readStorage<MockEventTicket[]>(MOCK_EVENT_TICKETS_KEY, []);
  writeStorage(MOCK_EVENT_TICKETS_KEY, [
    { eventId, userId: user.id, token, issuedAt },
    ...tickets.filter(
      (ticket) => !(ticket.eventId === eventId && ticket.userId === user.id),
    ),
  ]);

  return {
    eventId,
    eventTitle: event.title,
    token,
    qrPayload: `konnektora://check-in?event=${encodeURIComponent(eventId)}&token=${token}`,
    issuedAt,
  };
}

function scanMockEventTicket(eventId: string, token: string): EventParticipant {
  const ticket = readStorage<MockEventTicket[]>(
    MOCK_EVENT_TICKETS_KEY,
    [],
  ).find((item) => item.eventId === eventId && item.token === token);
  if (!ticket) throw new Error("QR bilet geçersiz.");

  const participant = readStorage<EventParticipant[]>(
    MOCK_PARTICIPANTS_KEY,
    [],
  ).find((item) => item.eventId === eventId && item.userId === ticket.userId);
  if (participant?.status === "attended")
    throw new Error("Bu bilet daha önce kullanılmış.");
  if (!participant || !["accepted", "invited"].includes(participant.status)) {
    throw new Error("QR bilet check-in için uygun değil.");
  }
  return updateMockParticipantStatus(
    eventId,
    ticket.userId,
    "attended",
    new Date().toISOString(),
  );
}

function getMockEventCheckInPassport(eventId: string, userId: string, method: "manual" | "qr" | "nfc" = "manual"): CheckInPassport {
  const event = getStoredEvents().find((item) => item.id === eventId);
  const participant = listMockParticipants(eventId).find((item) => item.userId === userId);
  if (!event || !participant) throw new Error("Katılımcı bulunamadı.");
  const member = getAllMockUsers().find((item) => item.id === userId);
  const identity = participant.user ?? member;
  if (!identity) throw new Error("Kullanıcı bulunamadı.");
  const media = member?.id === getUserSession()?.id ? listMockProfileMedia().map((item) => ({ id: item.id, url: item.url, type: item.type })) : [];
  return {
    targetType: "event",
    targetId: event.id,
    targetName: event.title,
    user: {
      id: identity.id,
      email: identity.email,
      name: identity.name,
      username: identity.username ?? null,
      role: identity.role ?? "user",
      accountType: identity.accountType === "corporate" ? "corporate" : "individual",
      status: identity.status ?? "active",
      avatarUrl: identity.avatarUrl ?? null,
      followerCount: member?.followerCount ?? 0,
      profileVerifiedAt: member?.profileVerifiedAt ?? null,
      media,
    },
    status: participant.status,
    role: participant.role,
    alreadyInside: participant.status === "attended" || Boolean(participant.checkedInAt),
    checkedInAt: participant.checkedInAt,
    checkInOrder: participant.checkInOrder ?? null,
    checkInMethod: participant.checkInMethod ?? method,
    invitedBy: [getUserSession()?.username ? `@${getUserSession()!.username}` : getUserSession()?.name ?? "Konnektora"],
    relatedFollowerCount: 0,
    guestLists: [],
    tickets: [],
  };
}

function previewMockEventCheckIn(eventId: string, token: string, method: "qr" | "nfc") {
  const ticket = readStorage<MockEventTicket[]>(MOCK_EVENT_TICKETS_KEY, []).find((item) => item.eventId === eventId && item.token === token);
  if (!ticket) throw new Error("QR bilet geçersiz.");
  return getMockEventCheckInPassport(eventId, ticket.userId, method);
}

function decideMockEventCheckIn(eventId: string, userId: string, decision: "admit" | "decline", method: "manual" | "qr" | "nfc") {
  const participants = readStorage<EventParticipant[]>(MOCK_PARTICIPANTS_KEY, []);
  const participant = participants.find((item) => item.eventId === eventId && item.userId === userId);
  if (!participant) throw new Error("Katılımcı bulunamadı.");
  if (decision === "admit" && (participant.status === "attended" || participant.checkedInAt)) throw new Error("Kullanıcı zaten check-in içeride.");
  const now = new Date().toISOString();
  const updated: EventParticipant = {
    ...participant,
    status: decision === "admit" ? "attended" : "declined",
    checkedInAt: decision === "admit" ? now : null,
    checkInDecisionAt: now,
    checkInMethod: method,
    checkInOrder: decision === "admit" ? participants.filter((item) => item.eventId === eventId && item.checkedInAt).length + 1 : null,
  };
  writeStorage(MOCK_PARTICIPANTS_KEY, [updated, ...participants.filter((item) => !(item.eventId === eventId && item.userId === userId))]);
  return updated;
}

function updateMockParticipantStatus(
  eventId: string,
  userId: string,
  status: string,
  checkedInAt: string | null = null,
): EventParticipant {
  return updateMockParticipant(eventId, userId, { status, checkedInAt });
}

function updateMockParticipant(eventId: string, userId: string, changes: { status?: string; role?: string; checkedInAt?: string | null }): EventParticipant {
  const participants = readStorage<EventParticipant[]>(
    MOCK_PARTICIPANTS_KEY,
    [],
  );
  const participant = participants.find(
    (item) => item.eventId === eventId && item.userId === userId,
  );

  if (!participant) {
    throw new Error("Mock participant not found");
  }

  const updatedParticipant: EventParticipant = {
    ...participant,
    ...(changes.status ? { status: parseParticipantStatus(changes.status) } : {}),
    ...(changes.role ? { role: changes.role as EventParticipant["role"] } : {}),
    ...(changes.checkedInAt !== undefined ? { checkedInAt: changes.checkedInAt } : {}),
  };

  writeStorage(MOCK_PARTICIPANTS_KEY, [
    updatedParticipant,
    ...participants.filter(
      (item) => !(item.eventId === eventId && item.userId === userId),
    ),
  ]);

  return updatedParticipant;
}

function createMockReport(input: CreateReportInput): ContentReport {
  const reports = readStorage<ContentReport[]>(MOCK_REPORTS_KEY, []);
  const reporter = getUserSession();
  const rule = input.ruleId
    ? (listMockReportRules().find((item) => item.id === input.ruleId) ?? null)
    : null;
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
      status: "active",
    },
    resolvedBy: null,
  };

  writeStorage(MOCK_REPORTS_KEY, [report, ...reports]);
  return report;
}

function listMockReports(): ContentReport[] {
  const rules = listMockReportRules();

  return readStorage<ContentReport[]>(MOCK_REPORTS_KEY, []).map((report) => ({
    ...report,
    rule: report.ruleId
      ? (rules.find((rule) => rule.id === report.ruleId) ?? null)
      : (report.rule ?? null),
  }));
}

function listMockReportGroups(scope: "active" | "old"): ReportGroup[] {
  const groups = buildMockReportGroups(listMockReports());

  if (scope === "active") {
    return groups.filter((group) => group.activeReports > 0);
  }

  return groups.filter(
    (group) => group.activeReports === 0 && group.oldReports > 0,
  );
}

function getMockReportGroupDetail(
  targetType: ReportTargetType,
  targetId: string,
): ReportGroupDetail {
  const reports = listMockReports().filter(
    (report) =>
      report.targetType === targetType && report.targetId === targetId,
  );
  const group = buildMockReportGroups(reports)[0];

  if (!group) {
    throw new Error("Mock report group not found");
  }

  return { ...group, reports };
}

function buildMockReportGroups(reports: ContentReport[]): ReportGroup[] {
  const notes = readStorage<ReportGroupNote[]>(MOCK_REPORT_GROUP_NOTES_KEY, []);
  const comments = readStorage<ReportGroupComment[]>(
    MOCK_REPORT_GROUP_COMMENTS_KEY,
    [],
  );
  const decisions = readStorage<ModerationDecision[]>(
    MOCK_MODERATION_DECISIONS_KEY,
    [],
  );
  const grouped = new Map<string, ContentReport[]>();

  reports.forEach((report) => {
    const key = `${report.targetType}:${report.targetId}`;
    grouped.set(key, [...(grouped.get(key) ?? []), report]);
  });

  return [...grouped.entries()]
    .map(([key, groupReports]) => {
      const [targetType, targetId] = key.split(":") as [
        ReportTargetType,
        string,
      ];
      const activeReports = groupReports.filter(
        (report) => report.status === "open" || report.status === "reviewing",
      ).length;
      const targetSummary = resolveMockTargetSummary(targetType, targetId);

      return {
        targetType,
        targetId,
        targetSummary,
        totalReports: groupReports.length,
        activeReports,
        oldReports: groupReports.length - activeReports,
        violationScore: groupReports.reduce(
          (total, report) => total + (report.rule?.violationScore ?? 0),
          0,
        ),
        latestReportAt: groupReports[0]?.createdAt ?? new Date().toISOString(),
        statuses: [...new Set(groupReports.map((report) => report.status))],
        reasons: [...new Set(groupReports.map((report) => report.reason))],
        note:
          notes.find(
            (note) =>
              note.targetType === targetType && note.targetId === targetId,
          ) ?? null,
        comments: comments.filter(
          (comment) =>
            comment.targetType === targetType && comment.targetId === targetId,
        ),
        activityLogs: [],
        decisions: decisions.filter(
          (decision) =>
            decision.targetType === targetType &&
            decision.targetId === targetId,
        ),
      };
    })
    .sort((first, second) => {
      if (second.activeReports !== first.activeReports) {
        return second.activeReports - first.activeReports;
      }

      return (
        new Date(second.latestReportAt).getTime() -
        new Date(first.latestReportAt).getTime()
      );
    });
}

function resolveMockTargetSummary(
  targetType: ReportTargetType,
  targetId: string,
): ReportGroup["targetSummary"] {
  const users = getAllMockUsers();

  if (targetType === "event") {
    const event = getStoredEvents().find((item) => item.id === targetId);
    if (!event) {
      return null;
    }

    const owner =
      users.find((user) => user.name === event.organizerName) ??
      users.find(
        (user) => user.role === "super_admin" || user.role === "admin",
      ) ??
      null;

    return {
      title: event.title,
      subtitle:
        [event.city, event.country].filter(Boolean).join(" - ") || event.format,
      status: event.status,
      owner: owner
        ? {
            id: owner.id,
            email: owner.email,
            name: owner.name,
            role: owner.role ?? "user",
            status: owner.status ?? "active",
            accountType: "individual",
            followerCount: 0,
            followingCount: 0,
            emailVerified: true,
            penaltyScoreLastYear: 0,
            penaltyScoreAllTime: 0,
            username: owner.email.split("@")[0],
          }
        : null,
      metrics: {},
      payload: {
        startsAt: event.startsAt,
        coverImageUrl: event.coverImageUrl,
      },
    };
  }

  if (
    targetType === "user" ||
    targetType === "username" ||
    targetType === "website_url"
  ) {
    const user = users.find((item) => item.id === targetId);
    if (!user) {
      return null;
    }

    return {
      title: user.name,
      subtitle: user.email,
      status: user.status ?? "active",
      owner: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role ?? "user",
        status: user.status ?? "active",
        accountType: "individual",
        followerCount: 0,
        followingCount: 0,
        emailVerified: true,
        penaltyScoreLastYear: 0,
        penaltyScoreAllTime: 0,
      },
      metrics: {},
    };
  }

  return {
    title: `${targetType} · ${targetId.slice(0, 8)}`,
    subtitle: "Mock hedef özeti",
    status: "unknown",
    owner: users[0]
      ? {
          id: users[0].id,
          email: users[0].email,
          name: users[0].name,
          role: users[0].role ?? "user",
          status: users[0].status ?? "active",
          accountType: "individual",
          followerCount: 0,
          followingCount: 0,
          emailVerified: true,
          penaltyScoreLastYear: 0,
          penaltyScoreAllTime: 0,
        }
      : null,
    metrics: {},
  };
}

function createMockReportGroupComment(
  targetType: ReportTargetType,
  targetId: string,
  body: string,
): ReportGroupComment {
  const comments = readStorage<ReportGroupComment[]>(
    MOCK_REPORT_GROUP_COMMENTS_KEY,
    [],
  );
  const adminUser = {
    id: "11111111-1111-4111-8111-111111111111",
    email: "admin@konnektora.local",
    name: "Demo Admin",
    role: "admin" as const,
    status: "active" as const,
  };
  const comment: ReportGroupComment = {
    id: createId(),
    targetType,
    targetId,
    body: body.trim(),
    createdById: adminUser.id,
    createdBy: adminUser,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  writeStorage(MOCK_REPORT_GROUP_COMMENTS_KEY, [comment, ...comments]);
  return comment;
}

function createMockModerationDecision(
  targetType: ReportTargetType,
  targetId: string,
  input: ModerationDecisionInput,
): ModerationDecision {
  const decisions = readStorage<ModerationDecision[]>(
    MOCK_MODERATION_DECISIONS_KEY,
    [],
  );
  const now = new Date().toISOString();
  const adminUser = {
    id: "99999999-9999-4999-8999-999999999999",
    email: "admin@konnektora.local",
    name: "Konnektora Admin",
    role: "super_admin" as const,
    status: "active" as const,
  };
  const targetUserId = resolveMockDecisionUserId(
    targetType,
    targetId,
    input.action,
  );
  const targetUser = targetUserId
    ? getAllMockUsers().find((user) => user.id === targetUserId)
    : null;
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
          status: targetUser.status ?? "active",
        }
      : null,
    issuedBy: adminUser,
  };

  applyMockModerationAction(targetType, targetId, input.action);
  if (input.userAction && input.userAction !== "none") {
    const ownerId = resolveMockDecisionUserId(
      targetType,
      targetId,
      input.action,
    );
    if (
      ownerId &&
      (input.userAction === "suspend_user" || input.userAction === "ban_user")
    ) {
      applyMockModerationAction("user", ownerId, input.userAction);
    }
  }
  closeMockReportsForDecision(targetType, targetId, input);
  if (targetUserId) {
    createMockNotification({
      userId: targetUserId,
      type: "moderation_decision",
      title: "Moderasyon kararı",
      body: input.note?.trim() || `${input.action} aksiyonu uygulandı.`,
      targetType,
      targetId,
    });
  }
  writeStorage(MOCK_MODERATION_DECISIONS_KEY, [decision, ...decisions]);
  return decision;
}

function resolveMockDecisionUserId(
  targetType: ReportTargetType,
  targetId: string,
  action: ModerationDecisionInput["action"],
) {
  if (targetType === "user") {
    return targetId;
  }

  if (targetType === "event") {
    const event = getStoredEvents().find((item) => item.id === targetId);
    const user = getAllMockUsers().find(
      (item) => item.name === event?.organizerName,
    );
    return user?.id ?? null;
  }

  if (action === "archive_tag") {
    return null;
  }

  return null;
}

function applyMockModerationAction(
  targetType: ReportTargetType,
  targetId: string,
  action: ModerationDecisionInput["action"],
) {
  if (targetType === "event" && action === "archive_event") {
    updateMockEvent(targetId, { status: "archived" });
  }

  if (targetType === "tag" && action === "archive_tag") {
    updateMockTag(targetId, { status: "archived" });
  }

  if (
    targetType === "user" &&
    (action === "suspend_user" || action === "ban_user")
  ) {
    const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
    writeStorage(
      MOCK_USERS_KEY,
      users.map((user) =>
        user.id === targetId
          ? { ...user, status: action === "ban_user" ? "banned" : "suspended" }
          : user,
      ),
    );
  }
}

function closeMockReportsForDecision(
  targetType: ReportTargetType,
  targetId: string,
  input: ModerationDecisionInput,
) {
  const reports = readStorage<ContentReport[]>(MOCK_REPORTS_KEY, []);
  const closedStatus =
    input.decision === "violation" ? "resolved" : "dismissed";
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
            resolutionNote:
              input.note?.trim() ||
              (input.decision === "violation"
                ? `${input.action} aksiyonu uygulandı.`
                : "İhlal bulunmadı."),
            resolvedById: "99999999-9999-4999-8999-999999999999",
            resolvedAt: now,
            updatedAt: now,
          }
        : report,
    ),
  );
}

function updateMockReportGroupNote(
  targetType: ReportTargetType,
  targetId: string,
  noteValue: string,
): ReportGroupNote {
  const notes = readStorage<ReportGroupNote[]>(MOCK_REPORT_GROUP_NOTES_KEY, []);
  const adminUser = {
    id: "99999999-9999-4999-8999-999999999999",
    email: "admin@konnektora.local",
    name: "Konnektora Admin",
    role: "super_admin" as const,
    status: "active" as const,
  };
  const existing = notes.find(
    (note) => note.targetType === targetType && note.targetId === targetId,
  );
  const now = new Date().toISOString();
  const note: ReportGroupNote = {
    id: existing?.id ?? createId(),
    targetType,
    targetId,
    note: noteValue.trim(),
    updatedById: adminUser.id,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    updatedBy: adminUser,
  };

  writeStorage(MOCK_REPORT_GROUP_NOTES_KEY, [
    note,
    ...notes.filter(
      (item) => !(item.targetType === targetType && item.targetId === targetId),
    ),
  ]);
  return note;
}

function parseReportGroupPath(pathname: string) {
  const [targetType, targetId] = pathname
    .slice("/admin/report-groups/".length)
    .split("/");

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
    updatedAt: now,
  };

  writeStorage(MOCK_REPORT_RULES_KEY, [rule, ...rules]);
  return rule;
}

function updateMockReportRule(
  id: string,
  input: Partial<ReportRuleInput> & { status?: string },
): ReportRule {
  const rules = listMockReportRules();
  const updatedRules = rules.map((rule) =>
    rule.id === id
      ? {
          ...rule,
          targetType: input.targetType
            ? parseReportTargetType(input.targetType)
            : rule.targetType,
          title: input.title?.trim() ?? rule.title,
          description:
            input.description === undefined
              ? rule.description
              : input.description?.trim() || null,
          violationScore:
            input.violationScore === undefined
              ? rule.violationScore
              : Number(input.violationScore),
          status: parseCmsStatus(input.status, rule.status),
          updatedAt: new Date().toISOString(),
        }
      : rule,
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
      lastOnlineAt: new Date().toISOString(),
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
      lastOnlineAt: new Date().toISOString(),
    },
    {
      id: "72000000-0000-4000-8000-000000000003",
      email: "selin@konnektora.local",
      name: "Selin Özer",
      username: "selinozer",
      password: "ChangeMe123!",
      role: "user",
      status: "active",
      accountType: "individual",
      country: "Germany",
      city: "Berlin",
      emailVerified: true,
      followerCount: 64,
      followingCount: 38,
      lastOnlineAt: new Date(Date.now() - 18 * 60_000).toISOString(),
    },
    {
      id: "72000000-0000-4000-8000-000000000004",
      email: "emre@konnektora.local",
      name: "Emre Kaya",
      username: "emrekaya",
      password: "ChangeMe123!",
      role: "user",
      status: "active",
      accountType: "individual",
      country: "Türkiye",
      city: "Istanbul",
      emailVerified: true,
      profileVerifiedAt: new Date(Date.now() - 172_800_000).toISOString(),
      followerCount: 91,
      followingCount: 45,
      lastOnlineAt: new Date(Date.now() - 42 * 60_000).toISOString(),
    },
  ];
  const storedIds = new Set(storedUsers.map((user) => user.id));

  return [
    ...storedUsers,
    ...seededUsers.filter((user) => !storedIds.has(user.id)),
  ];
}

function listMockRoleGroups(): AdminRoleGroup[] {
  const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);

  return readStorage<AdminRoleGroup[]>(MOCK_ROLE_GROUPS_KEY, []).map(
    (roleGroup) => ({
      ...roleGroup,
      _count: {
        users: users.filter((user) => user.adminRoleGroupId === roleGroup.id)
          .length,
      },
    }),
  );
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
    _count: { users: 0 },
  };

  writeStorage(MOCK_ROLE_GROUPS_KEY, [roleGroup, ...roleGroups]);
  return roleGroup;
}

function updateMockRoleGroup(
  id: string,
  input: Partial<RoleGroupInput> & { status?: string },
): AdminRoleGroup {
  const roleGroups = listMockRoleGroups();
  const updatedRoleGroups = roleGroups.map((roleGroup) =>
    roleGroup.id === id
      ? {
          ...roleGroup,
          name: input.name?.trim() ?? roleGroup.name,
          description:
            input.description === undefined
              ? roleGroup.description
              : input.description?.trim() || null,
          permissions: input.permissions
            ? [...new Set(input.permissions)]
            : roleGroup.permissions,
          status: input.status ?? roleGroup.status,
          updatedAt: new Date().toISOString(),
        }
      : roleGroup,
  );
  const updatedRoleGroup = updatedRoleGroups.find(
    (roleGroup) => roleGroup.id === id,
  );

  if (!updatedRoleGroup) {
    throw new Error("Mock role group not found");
  }

  writeStorage(MOCK_ROLE_GROUPS_KEY, updatedRoleGroups);
  return updatedRoleGroup;
}

const DEFAULT_MOCK_FAQ_CATEGORIES: CmsCategory[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    name: "Hesap ve profil",
    slug: "hesap-ve-profil",
    description: "Hesap, profil ve gizlilik ayarları",
    type: "faq",
    status: "active",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    name: "Etkinlikler",
    slug: "etkinlikler",
    description: "Katılım, davet ve etkinlik yönetimi",
    type: "faq",
    status: "active",
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    name: "Ödemeler",
    slug: "odemeler",
    description: "Ödeme, iade ve faturalandırma",
    type: "faq",
    status: "active",
  },
  {
    id: "10000000-0000-4000-8000-000000000011",
    name: "Genel geri bildirim",
    slug: "genel-geri-bildirim",
    description: "Öneri, görüş ve genel mesajlar",
    type: "write_to_us",
    status: "active",
  },
  {
    id: "10000000-0000-4000-8000-000000000012",
    name: "İş birliği",
    slug: "is-birligi",
    description: "Marka, topluluk ve iş ortaklığı talepleri",
    type: "write_to_us",
    status: "active",
  },
  {
    id: "10000000-0000-4000-8000-000000000013",
    name: "Teknik sorun",
    slug: "teknik-sorun",
    description: "Ürün kullanımı sırasında karşılaşılan teknik sorunlar",
    type: "write_to_us",
    status: "active",
  },
];
const DEFAULT_MOCK_FAQS: Faq[] = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    categoryId: DEFAULT_MOCK_FAQ_CATEGORIES[0]!.id,
    title: "Profil bilgilerimi nasıl güncellerim?",
    body: "Hesap sayfasındaki Profil bölümünü açın. Bilgilerinizi düzenledikten sonra değişiklikleri kaydedin.",
    status: "active",
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    categoryId: DEFAULT_MOCK_FAQ_CATEGORIES[0]!.id,
    title: "Hesabımı nasıl güvende tutabilirim?",
    body: "Benzersiz bir parola kullanın, iletişim bilgilerinizi doğrulayın ve tanımadığınız cihazlardaki oturumları kapatın.",
    status: "active",
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    categoryId: DEFAULT_MOCK_FAQ_CATEGORIES[1]!.id,
    title: "Bir etkinliğe nasıl katılırım?",
    body: "Etkinlik detay sayfasında Katıl seçeneğini kullanın. Onay gerektiren etkinliklerde organizatörün yanıtı size bildirilir.",
    status: "active",
  },
  {
    id: "20000000-0000-4000-8000-000000000004",
    categoryId: DEFAULT_MOCK_FAQ_CATEGORIES[2]!.id,
    title: "İade süreci nasıl işler?",
    body: "Uygun işlemler için etkinlik ve ödeme detaylarından iade durumunu takip edebilirsiniz. Sonuç finans hareketlerinize yansıtılır.",
    status: "active",
  },
];

function listMockCmsCategories(): CmsCategory[] {
  const faqs = readStorage<Faq[]>(MOCK_FAQS_KEY, DEFAULT_MOCK_FAQS);

  return readStorage<CmsCategory[]>(
    MOCK_CMS_CATEGORIES_KEY,
    DEFAULT_MOCK_FAQ_CATEGORIES,
  ).map((category) => ({
    ...category,
    type: category.type ?? "faq",
    _count: {
      faqs: faqs.filter((faq) => faq.categoryId === category.id).length,
    },
  }));
}

function createMockCmsCategory(input: CmsCategoryInput): CmsCategory {
  const categories = listMockCmsCategories();
  const category: CmsCategory = {
    id: createId(),
    name: input.name.trim(),
    slug: uniqueSlug(
      input.name,
      categories.map((item) => item.slug),
    ),
    description: input.description?.trim() || null,
    type: input.type ?? "faq",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { faqs: 0 },
  };

  writeStorage(MOCK_CMS_CATEGORIES_KEY, [category, ...categories]);
  return category;
}

function updateMockCmsCategory(
  id: string,
  input: Partial<CmsCategory>,
): CmsCategory {
  const categories = listMockCmsCategories();
  const updatedCategories = categories.map((category) =>
    category.id === id
      ? {
          ...category,
          name: input.name?.trim() ?? category.name,
          slug: input.name
            ? uniqueSlug(
                input.name,
                categories
                  .filter((item) => item.id !== id)
                  .map((item) => item.slug),
              )
            : category.slug,
          description:
            input.description === undefined
              ? category.description
              : input.description?.trim() || null,
          type: input.type ?? category.type,
          status: parseCmsStatus(input.status, category.status),
          updatedAt: new Date().toISOString(),
        }
      : category,
  );
  const updatedCategory = updatedCategories.find(
    (category) => category.id === id,
  );

  if (!updatedCategory) {
    throw new Error("Mock CMS category not found");
  }

  writeStorage(MOCK_CMS_CATEGORIES_KEY, updatedCategories);
  return updatedCategory;
}

function deleteMockCmsCategory(id: string) {
  const categories = listMockCmsCategories();
  writeStorage(
    MOCK_CMS_CATEGORIES_KEY,
    categories.filter((category) => category.id !== id),
  );
  writeStorage(
    MOCK_FAQS_KEY,
    readStorage<Faq[]>(MOCK_FAQS_KEY, []).filter(
      (faq) => faq.categoryId !== id,
    ),
  );
}

function listMockFaqs(): Faq[] {
  const categories = listMockCmsCategories();

  return readStorage<Faq[]>(MOCK_FAQS_KEY, DEFAULT_MOCK_FAQS).map((faq) => ({
    ...faq,
    category: categories.find((category) => category.id === faq.categoryId),
  }));
}

function createMockFaq(input: FaqInput): Faq {
  const faqs = listMockFaqs();
  const category = listMockCmsCategories().find(
    (item) => item.id === input.categoryId,
  );

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
    category,
  };

  writeStorage(MOCK_FAQS_KEY, [faq, ...faqs]);
  return faq;
}

function updateMockFaq(
  id: string,
  input: Partial<FaqInput> & { status?: string },
): Faq {
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
      category: categories.find((category) => category.id === categoryId),
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
  writeStorage(
    MOCK_FAQS_KEY,
    readStorage<Faq[]>(MOCK_FAQS_KEY, []).filter((faq) => faq.id !== id),
  );
}

function listMockAnnouncements(): Announcement[] {
  const now = Date.now();
  const seeded: Announcement[] = [
    {
      id: "81000000-0000-4000-8000-000000000001",
      title: "Yeni dönem etkinlik takvimi açıldı",
      body: "Startup, networking, yatırım ve founder kategorilerindeki yeni buluşmaları keşfedin.",
      titleEn: "The new season event calendar is open",
      bodyEn: "Discover new gatherings across startup, networking, investment and founder communities.",
      target: "all",
      targetLastLoginFrom: null,
      targetLastLoginTo: null,
      targetJoinedFrom: null,
      targetJoinedTo: null,
      targetAppVersion: null,
      publishMode: "scheduled",
      status: "active",
      publishAt: new Date(now - 86_400_000).toISOString(),
      expiresAt: null,
      createdAt: new Date(now - 86_400_000).toISOString(),
      updatedAt: new Date(now - 86_400_000).toISOString(),
    },
    {
      id: "81000000-0000-4000-8000-000000000002",
      title: "Topluluk buluşmaları büyüyor",
      body: "Berlin, İstanbul, Amsterdam ve Londra'daki yeni Konnektora mekânları yayında.",
      titleEn: "Community gatherings are growing",
      bodyEn: "New Konnektora places in Berlin, Istanbul, Amsterdam and London are now live.",
      target: "all",
      targetLastLoginFrom: null,
      targetLastLoginTo: null,
      targetJoinedFrom: null,
      targetJoinedTo: null,
      targetAppVersion: null,
      publishMode: "scheduled",
      status: "active",
      publishAt: new Date(now - 43_200_000).toISOString(),
      expiresAt: null,
      createdAt: new Date(now - 43_200_000).toISOString(),
      updatedAt: new Date(now - 43_200_000).toISOString(),
    },
    {
      id: "81000000-0000-4000-8000-000000000003",
      title: "Profilini tamamla, doğru kişilerle eşleş",
      body: "İlgi alanlarını ve şehir bilgini ekleyerek daha ilgili öneriler alabilirsin.",
      titleEn: "Complete your profile and meet the right people",
      bodyEn: "Add your interests and city to receive more relevant recommendations.",
      target: "all",
      targetLastLoginFrom: null,
      targetLastLoginTo: null,
      targetJoinedFrom: null,
      targetJoinedTo: null,
      targetAppVersion: null,
      publishMode: "scheduled",
      status: "active",
      publishAt: new Date(now - 21_600_000).toISOString(),
      expiresAt: null,
      createdAt: new Date(now - 21_600_000).toISOString(),
      updatedAt: new Date(now - 21_600_000).toISOString(),
    },
  ];
  return readStorage<Announcement[]>(MOCK_ANNOUNCEMENTS_KEY, seeded);
}

function listMockPublicAnnouncements(): Announcement[] {
  const now = Date.now();
  const user = getUserSession();
  const targets: Announcement["target"][] = user
    ? [
        "all",
        "members",
        user.accountType === "corporate" ? "corporate_members" : "individual_members",
        ...(["admin", "super_admin"].includes(user.role) ? (["admins"] as const) : []),
      ]
    : ["all"];

  return listMockAnnouncements().filter(
    (announcement) =>
      targets.includes(announcement.target) &&
      announcement.status === "active" &&
      new Date(announcement.publishAt).getTime() <= now &&
      (!announcement.expiresAt ||
        new Date(announcement.expiresAt).getTime() > now),
  );
}

function createMockAnnouncement(input: AnnouncementInput): Announcement {
  const announcements = listMockAnnouncements();
  const now = new Date().toISOString();
  const announcement: Announcement = {
    id: createId(),
    title: input.title.trim(),
    body: input.body.trim(),
    titleEn: input.titleEn?.trim() || null,
    bodyEn: input.bodyEn?.trim() || null,
    target: parseAnnouncementTarget(input.target),
    targetLastLoginFrom: input.targetLastLoginFrom || null,
    targetLastLoginTo: input.targetLastLoginTo || null,
    targetJoinedFrom: input.targetJoinedFrom || null,
    targetJoinedTo: input.targetJoinedTo || null,
    targetAppVersion: input.targetAppVersion?.trim() || null,
    publishMode:
      (input.publishMode as Announcement["publishMode"]) || "scheduled",
    status: "active",
    publishAt: input.publishAt || now,
    expiresAt: input.expiresAt || null,
    createdAt: now,
    updatedAt: now,
  };

  writeStorage(MOCK_ANNOUNCEMENTS_KEY, [announcement, ...announcements]);
  return announcement;
}

function updateMockAnnouncement(
  id: string,
  input: Partial<AnnouncementInput> & { status?: string },
): Announcement {
  const announcements = listMockAnnouncements();
  const updatedAnnouncements = announcements.map((announcement) =>
    announcement.id === id
      ? {
          ...announcement,
          title: input.title?.trim() ?? announcement.title,
          body: input.body?.trim() ?? announcement.body,
          titleEn: input.titleEn === undefined ? announcement.titleEn : input.titleEn.trim() || null,
          bodyEn: input.bodyEn === undefined ? announcement.bodyEn : input.bodyEn.trim() || null,
          target: input.target
            ? parseAnnouncementTarget(input.target)
            : announcement.target,
          targetLastLoginFrom:
            input.targetLastLoginFrom === undefined
              ? (announcement.targetLastLoginFrom ?? null)
              : input.targetLastLoginFrom || null,
          targetLastLoginTo:
            input.targetLastLoginTo === undefined
              ? (announcement.targetLastLoginTo ?? null)
              : input.targetLastLoginTo || null,
          targetJoinedFrom:
            input.targetJoinedFrom === undefined
              ? (announcement.targetJoinedFrom ?? null)
              : input.targetJoinedFrom || null,
          targetJoinedTo:
            input.targetJoinedTo === undefined
              ? (announcement.targetJoinedTo ?? null)
              : input.targetJoinedTo || null,
          targetAppVersion:
            input.targetAppVersion === undefined
              ? (announcement.targetAppVersion ?? null)
              : input.targetAppVersion?.trim() || null,
          publishMode:
            (input.publishMode as Announcement["publishMode"]) ??
            announcement.publishMode ??
            "scheduled",
          status: parseCmsStatus(input.status, announcement.status),
          publishAt: input.publishAt ?? announcement.publishAt,
          expiresAt:
            input.expiresAt === undefined
              ? announcement.expiresAt
              : input.expiresAt || null,
          updatedAt: new Date().toISOString(),
        }
      : announcement,
  );
  const updatedAnnouncement = updatedAnnouncements.find(
    (announcement) => announcement.id === id,
  );

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
    ...defaultPolicies().filter((policy) => !existingTypes.has(policy.type)),
  ];
}

function getMockPublicPolicy(type: string): CmsPolicy | undefined {
  return listMockPolicies().find(
    (policy) => policy.type === type && policy.status === "active",
  );
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
    createdAt:
      policies.find((policy) => policy.type === type)?.createdAt ?? now,
    updatedAt: now,
  };

  writeStorage(MOCK_POLICIES_KEY, [
    nextPolicy,
    ...policies.filter((policy) => policy.type !== type),
  ]);
  return nextPolicy;
}

function defaultPolicies(): CmsPolicy[] {
  const now = new Date().toISOString();

  return [
    {
      id: "10000000-1000-4000-8000-100000000101",
      type: "privacy",
      title: "Gizlilik Politikası",
      body: "<p>Konnektora, hesap ve topluluk deneyimi için gerekli verileri güvenli biçimde işler. Ayrıntılı politika içeriği yönetim panelinden güncellenebilir.</p>",
      status: "active",
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "10000000-1000-4000-8000-100000000102",
      type: "terms",
      title: "Kullanım Koşulları",
      body: "<p>Konnektora'yı kullanırken topluluk kurallarına, güvenlik ilkelerine ve yürürlükteki kullanım koşullarına uymanız gerekir.</p>",
      status: "active",
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "10000000-1000-4000-8000-100000000103",
      type: "cookies",
      title: "Çerez Politikası",
      body: "<p>Konnektora; oturum, güvenlik ve tercihlerin hatırlanması için gerekli çerezleri kullanır.</p>",
      status: "active",
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "10000000-1000-4000-8000-100000000104",
      type: "about",
      title: "Hakkımızda",
      body: "<p>Konnektora, anlamlı profesyonel bağlantılar ve güvenilir topluluk etkinlikleri için geliştirilmiş seçkin bir platformdur.</p>",
      status: "active",
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function toAdminManagedUser(user: MockUser): AdminManagedUser {
  const events = getStoredEvents().filter(
    (event) => event.organizerName === user.name,
  );
  const participants = readStorage<EventParticipant[]>(
    MOCK_PARTICIPANTS_KEY,
    [],
  ).filter((participant) => participant.userId === user.id);
  const reports = readStorage<ContentReport[]>(MOCK_REPORTS_KEY, []).filter(
    (report) => report.reporterId === user.id,
  );
  const adminRoleGroup =
    listMockRoleGroups().find(
      (roleGroup) => roleGroup.id === user.adminRoleGroupId,
    ) ?? null;

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
      submittedReports: reports.length,
    },
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
  const ageFrom = params.get("ageFrom")
    ? Number(params.get("ageFrom"))
    : undefined;
  const ageTo = params.get("ageTo") ? Number(params.get("ageTo")) : undefined;
  const sortBy = params.get("sortBy") || "createdAt";
  const sortDir = params.get("sortDir") === "asc" ? "asc" : "desc";
  const page = Math.max(Number(params.get("page") || "1"), 1);
  const pageSize = Math.min(
    Math.max(Number(params.get("pageSize") || "25"), 1),
    100,
  );
  const users = getAllMockUsers()
    .map(toAdminManagedUser)
    .filter(
      (user) =>
        (!q ||
          [
            user.username,
            user.name,
            user.email,
            user.phone,
            user.country,
            user.city,
            user.companyName,
            user.tradeName,
          ]
            .join(" ")
            .toLowerCase()
            .includes(q)) &&
        (!status || user.status === status) &&
        (!role || user.role === role) &&
        (!accountType || user.accountType === accountType) &&
        (!country || (user.country ?? "").toLowerCase().includes(country)) &&
        (!city || (user.city ?? "").toLowerCase().includes(city)) &&
        (!gender || user.gender === gender) &&
        (!email || user.email.toLowerCase().includes(email)) &&
        (!phone || (user.phone ?? "").toLowerCase().includes(phone)) &&
        (ageFrom === undefined || getAge(user.birthDate) >= ageFrom) &&
        (ageTo === undefined || getAge(user.birthDate) <= ageTo),
    )
    .sort((first, second) => compareMockUsers(first, second, sortBy, sortDir));
  const start = (page - 1) * pageSize;

  return {
    items: users.slice(start, start + pageSize),
    total: users.length,
    page,
    pageSize,
    hasNextPage: page * pageSize < users.length,
  };
}

function getAge(value?: string | Date | null) {
  if (!value) return 0;
  const birthDate = new Date(value);
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDelta = now.getMonth() - birthDate.getMonth();
  if (
    monthDelta < 0 ||
    (monthDelta === 0 && now.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }
  return Math.max(age, 0);
}

function compareMockUsers(
  first: AdminManagedUser,
  second: AdminManagedUser,
  sortBy: string,
  sortDir: string,
) {
  const direction = sortDir === "asc" ? 1 : -1;
  const valueBySort = (user: AdminManagedUser) => {
    if (sortBy === "username") return user.username ?? "";
    if (sortBy === "followers") return user.followerCount ?? 0;
    if (sortBy === "following") return user.followingCount ?? 0;
    if (sortBy === "lastOnlineAt")
      return user.lastOnlineAt ? new Date(user.lastOnlineAt).getTime() : 0;
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
  const allInterests = readStorage<Record<string, string[]>>(
    USER_INTEREST_TAGS_KEY,
    {},
  );

  return {
    ...managedUser,
    stats: {
      createdEvents: managedUser._count?.createdEvents ?? 0,
      eventParticipations: managedUser._count?.eventParticipations ?? 0,
      submittedReports: managedUser._count?.submittedReports ?? 0,
      resolvedReports: readStorage<ContentReport[]>(
        MOCK_REPORTS_KEY,
        [],
      ).filter((report) => report.resolvedById === id).length,
    },
    interestTags: getTagsByIds(allInterests[id] ?? []),
    invitedBy: (() => {
      const inviter = managedUser.invitedById
        ? getAllMockUsers().find((item) => item.id === managedUser.invitedById)
        : null;
      return inviter
        ? {
            id: inviter.id,
            email: inviter.email,
            name: inviter.name,
            role: inviter.role ?? "user",
            status: inviter.status ?? "active",
          }
        : null;
    })(),
    invitedUsers: getAllMockUsers()
      .filter((item) => item.invitedById === id)
      .slice(0, 20)
      .map((item) => ({
        id: item.id,
        email: item.email,
        name: item.name,
        role: item.role ?? "user",
        status: item.status ?? "active",
      })),
  };
}

function updateMockAdminUser(
  id: string,
  input: Partial<AdminManagedUser>,
): AdminManagedUser {
  const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  const existing = getAllMockUsers().find((user) => user.id === id);

  if (!existing) {
    throw new Error("Mock user not found");
  }

  const updatedUser: MockUser = {
    ...existing,
    username:
      input.username === undefined
        ? existing.username
        : (input.username ?? null),
    name: input.name ?? existing.name,
    email: input.email ?? existing.email,
    status: input.status ?? existing.status,
    role: input.role ?? existing.role,
    accountType: input.accountType ?? existing.accountType,
    phone: input.phone === undefined ? existing.phone : (input.phone ?? null),
    country:
      input.country === undefined ? existing.country : (input.country ?? null),
    city: input.city === undefined ? existing.city : (input.city ?? null),
    district:
      input.district === undefined
        ? existing.district
        : (input.district ?? null),
    address:
      input.address === undefined ? existing.address : (input.address ?? null),
    gender:
      input.gender === undefined ? existing.gender : (input.gender ?? null),
    birthDate:
      input.birthDate === undefined
        ? existing.birthDate
        : input.birthDate
          ? String(input.birthDate)
          : null,
    website:
      input.website === undefined ? existing.website : (input.website ?? null),
    companyName:
      input.companyName === undefined
        ? existing.companyName
        : (input.companyName ?? null),
    tradeName:
      input.tradeName === undefined
        ? existing.tradeName
        : (input.tradeName ?? null),
    companyType:
      input.companyType === undefined
        ? existing.companyType
        : (input.companyType ?? null),
    businessCategory:
      input.businessCategory === undefined
        ? existing.businessCategory
        : (input.businessCategory ?? null),
    followerCount: input.followerCount ?? existing.followerCount,
    followingCount: input.followingCount ?? existing.followingCount,
    penaltyScoreLastYear:
      input.penaltyScoreLastYear ?? existing.penaltyScoreLastYear,
    penaltyScoreAllTime:
      input.penaltyScoreAllTime ?? existing.penaltyScoreAllTime,
    adminRoleGroupId:
      input.adminRoleGroupId === undefined
        ? (existing.adminRoleGroupId ?? null)
        : (input.adminRoleGroupId ?? null),
    updatedAt: new Date().toISOString(),
  };
  const nextUsers = users.some((user) => user.id === id)
    ? users.map((user) => (user.id === id ? updatedUser : user))
    : [updatedUser, ...users];

  writeStorage(MOCK_USERS_KEY, nextUsers);
  return toAdminManagedUser(updatedUser);
}

function runMockAdminUserAction(
  id: string,
  input: AdminUserActionInput,
): AdminManagedUserDetail {
  const notify = () =>
    createMockNotification({
      userId: id,
      type: "admin_user_action",
      title: "Hesap müdahalesi",
      body: input.note?.trim() || input.action,
      targetType: "user",
      targetId: id,
    });

  if (
    input.action === "send_verification_email" ||
    input.action === "send_password_reset"
  ) {
    notify();
    return getMockAdminUser(id);
  }

  if (input.action === "reset_username") {
    updateMockAdminUser(id, {
      username: `User${Date.now().toString().slice(-8)}`,
    });
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
    status: "active" as const,
  };
  const updatedReports = reports.map((report) => {
    if (report.id !== id) {
      return report;
    }

    const isClosed =
      input.status === "resolved" || input.status === "dismissed";

    return {
      ...report,
      status: input.status,
      resolutionNote: input.resolutionNote?.trim() || null,
      resolvedById: isClosed ? adminUser.id : null,
      resolvedAt: isClosed ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
      resolvedBy: isClosed ? adminUser : null,
    };
  });
  const report = updatedReports.find((item) => item.id === id);

  if (!report) {
    throw new Error("Mock report not found");
  }

  writeStorage(MOCK_REPORTS_KEY, updatedReports);
  return report;
}

function resolveMockReportAction(
  id: string,
  input: ResolveReportActionInput,
): ContentReport {
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
      users.map((user) =>
        user.id === report.targetId ? { ...user, status: "disabled" } : user,
      ),
    );
  }

  return updateMockReport(id, {
    status: "resolved",
    resolutionNote:
      input.resolutionNote || defaultMockResolutionNote(input.action),
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
      businessCategory:
        input.accountType === "corporate" ? input.businessCategory : null,
      emailVerified: false,
      status: "pending",
      onboardingCompletedAt: null,
    };

    writeStorage(MOCK_USERS_KEY, [
      activatedUser,
      ...users.filter((user) => user.id !== existing.id),
    ]);
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
    businessCategory:
      input.accountType === "corporate" ? input.businessCategory : null,
    emailVerified: false,
    status: "pending",
    onboardingCompletedAt: null,
  };

  writeStorage(MOCK_USERS_KEY, [user, ...users]);
  return createMockLoginResponse(user);
}

function createMockEmailToken(
  email: string,
  type: "verify_email" | "password_reset" | "invite_accept",
) {
  const users = getAllMockUsers();
  const user = users.find((item) => item.email === email.toLowerCase().trim());

  if (!user) {
    return { ok: true };
  }

  const tokens = readStorage<
    Array<{ token: string; userId: string; type: string }>
  >(MOCK_EMAIL_TOKENS_KEY, []);
  const token = `mock-${type}-${createId()}`;
  writeStorage(MOCK_EMAIL_TOKENS_KEY, [
    { token, userId: user.id, type },
    ...tokens,
  ]);
  return { ok: true, token };
}

function consumeMockEmailToken(
  token: string,
  type: "verify_email" | "password_reset" | "invite_accept",
): LoginResponse {
  const tokens = readStorage<
    Array<{ token: string; userId: string; type: string }>
  >(MOCK_EMAIL_TOKENS_KEY, []);
  const match = tokens.find(
    (item) => item.token === token && item.type === type,
  );

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
    emailVerified: type === "verify_email" ? true : existing.emailVerified,
  };
  writeStorage(MOCK_USERS_KEY, [
    user,
    ...users.filter((item) => item.id !== user.id),
  ]);
  writeStorage(
    MOCK_EMAIL_TOKENS_KEY,
    tokens.filter((item) => item.token !== token),
  );
  return createMockLoginResponse(user);
}

function resetMockPassword(token: string, password: string): LoginResponse {
  const response = consumeMockEmailToken(token, "password_reset");
  const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  const user = users.find((item) => item.id === response.user.id);

  if (user) {
    writeStorage(MOCK_USERS_KEY, [
      { ...user, password },
      ...users.filter((item) => item.id !== user.id),
    ]);
  }

  return response;
}

function changeMockPassword(input: {
  currentPassword: string;
  newPassword: string;
}) {
  const session = getUserSession();
  const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  const user = users.find((item) => item.id === session?.id);
  if (
    !user ||
    user.password !== input.currentPassword ||
    user.password === input.newPassword
  ) {
    throw new Error("Current password does not match");
  }
  writeStorage(MOCK_USERS_KEY, [
    { ...user, password: input.newPassword },
    ...users.filter((item) => item.id !== user.id),
  ]);
  return { ok: true };
}

function changeMockEmail(input: { email: string; currentPassword: string }) {
  const session = getUserSession();
  const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  const user = users.find((item) => item.id === session?.id);
  const email = input.email.toLowerCase().trim();
  if (!user || user.password !== input.currentPassword)
    throw new Error("Current password does not match");
  if (users.some((item) => item.id !== user.id && item.email.toLowerCase() === email))
    throw new Error("Email is already in use");
  writeStorage(MOCK_USERS_KEY, [{ ...user, email, emailVerified: false }, ...users.filter((item) => item.id !== user.id)]);
  return { ok: true, sent: true, email };
}

function deactivateMockAccount(input: {
  currentPassword: string;
  reason: string;
}) {
  const session = getUserSession();
  const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  const user = users.find((item) => item.id === session?.id);
  if (
    !user ||
    user.password !== input.currentPassword ||
    input.reason.trim().length < 3
  ) {
    throw new Error("Account cannot be deactivated");
  }
  writeStorage(MOCK_USERS_KEY, [
    { ...user, status: "frozen" },
    ...users.filter((item) => item.id !== user.id),
  ]);
  return { ok: true };
}

function reactivateMockAccount(input: {
  email: string;
  password: string;
}): LoginResponse {
  const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  const user = users.find(
    (item) =>
      item.email === input.email.toLowerCase().trim() &&
      item.password === input.password &&
      item.status === "frozen",
  );
  if (!user) {
    throw new Error("Frozen account not found");
  }
  const activeUser: MockUser = { ...user, status: "active" };
  writeStorage(MOCK_USERS_KEY, [
    activeUser,
    ...users.filter((item) => item.id !== user.id),
  ]);
  return createMockLoginResponse(activeUser);
}

function requestMockPhoneVerification(phone: string) {
  const session = getUserSession();
  if (!session) throw new Error("User session required");
  const code = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
  const verifications = readStorage<
    Record<string, { phone: string; code: string; expiresAt: number }>
  >(MOCK_PHONE_VERIFICATIONS_KEY, {});
  writeStorage(MOCK_PHONE_VERIFICATIONS_KEY, {
    ...verifications,
    [session.id]: { phone, code, expiresAt: Date.now() + 120_000 },
  });
  return {
    ok: true,
    expiresInSeconds: 120,
    demoCode: code,
    verificationMode: "demo" as const,
  };
}

function confirmMockPhoneVerification(input: { phone: string; code: string }) {
  const session = getUserSession();
  const verifications = readStorage<
    Record<string, { phone: string; code: string; expiresAt: number }>
  >(MOCK_PHONE_VERIFICATIONS_KEY, {});
  const verification = session ? verifications[session.id] : undefined;
  if (
    !session ||
    !verification ||
    verification.phone !== input.phone ||
    verification.code !== input.code ||
    verification.expiresAt < Date.now()
  ) {
    throw new Error("Invalid phone verification code");
  }
  const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  const user = getAllMockUsers().find((item) => item.id === session.id);
  if (user) {
    writeStorage(MOCK_USERS_KEY, [
      { ...user, phone: input.phone, phoneVerified: true },
      ...users.filter((item) => item.id !== user.id),
    ]);
  }
  return { ok: true, phone: input.phone, phoneVerified: true };
}

function acceptMockInvite(
  token: string,
  password: string,
  name?: string,
): LoginResponse {
  const response = consumeMockEmailToken(token, "invite_accept");
  const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  const user = users.find((item) => item.id === response.user.id);

  if (user) {
    writeStorage(MOCK_USERS_KEY, [
      { ...user, name: name?.trim() || user.name, password },
      ...users.filter((item) => item.id !== user.id),
    ]);
  }

  return response;
}

function loginMockUser(input: {
  email: string;
  password: string;
}): LoginResponse {
  const email = input.email.toLowerCase().trim();
  const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  const user = users.find(
    (item) => item.email === email && item.password === input.password,
  ) ?? {
    id: "88888888-8888-4888-8888-888888888888",
    name: "Konnektora User",
    email,
    password: input.password,
    status: "active" as const,
  };

  return createMockLoginResponse(user);
}

function createMockLoginResponse(user: {
  id: string;
  name: string;
  email: string;
  accountType?: string;
  emailVerified?: boolean;
  status?: AdminManagedUser["status"];
  onboardingCompletedAt?: string | null;
}): LoginResponse {
  return {
    accessToken: `mock-user-token-${user.id}`,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: "user",
      accountType:
        user.accountType === "corporate" ? "corporate" : "individual",
      emailVerified:
        "emailVerified" in user ? Boolean(user.emailVerified) : false,
      status: user.status ?? "active",
      onboardingCompleted: user.onboardingCompletedAt === undefined ? true : user.onboardingCompletedAt !== null,
    },
  };
}

function getMockProfile(): Profile {
  const session = getUserSession();
  if (!session) {
    throw new Error("Aktif kullanıcı oturumu bulunamadı.");
  }

  const stored = readStorage<MockUser[]>(MOCK_USERS_KEY, []).find(
    (user) => user.id === session.id,
  );
  const now = new Date().toISOString();
  return profileSchema.parse({
    id: session.id,
    accountType:
      stored?.accountType === "corporate"
        ? "corporate"
        : (session.accountType ?? "individual"),
    name: stored?.name ?? session.name,
    username: stored?.username ?? null,
    email: stored?.email ?? session.email,
    phone: stored?.phone ?? null,
    phoneVerified: stored?.phoneVerified ?? false,
    country: stored?.country ?? null,
    city: stored?.city ?? null,
    district: stored?.district ?? null,
    address: stored?.address ?? null,
    gender:
      stored?.gender === "male" || stored?.gender === "female"
        ? stored.gender
        : null,
    birthDate: stored?.birthDate ?? null,
    website: stored?.website ?? null,
    companyName: stored?.companyName ?? null,
    tradeName: stored?.tradeName ?? null,
    companyType: stored?.companyType ?? null,
    businessCategory: stored?.businessCategory ?? null,
    emailVerified: stored?.emailVerified ?? false,
    createdAt: stored?.createdAt ?? now,
    updatedAt: stored?.updatedAt ?? now,
  });
}

function getMockOnboardingStatus(): OnboardingStatus {
  const profile = getMockProfile();
  const following = listMockFollowing();
  const steps = [
    {
      key: "phone" as const,
      title: "Telefonunu doğrula",
      completed: profile.phoneVerified,
      path: "/onboarding",
    },
    {
      key: "personal_info" as const,
      title: "Temel bilgilerini tamamla",
      completed: Boolean(
        profile.username && profile.country && profile.birthDate,
      ),
      path: "/onboarding",
    },
    {
      key: "photo" as const,
      title: "Profil fotoğrafı ekle",
      completed: listMockProfileMedia().some((media) => media.type === "image"),
      path: "/onboarding",
    },
    {
      key: "interests" as const,
      title: "İlgi alanlarını seç",
      completed: getUserInterestTagIds().length > 0,
      path: "/onboarding",
    },
    {
      key: "people" as const,
      title: "Topluluğunu keşfet",
      completed: following.length > 0,
      path: "/onboarding",
    },
  ];
  const stored = readStorage<MockUser[]>(MOCK_USERS_KEY, []).find(
    (user) => user.id === profile.id,
  );
  return onboardingStatusSchema.parse({
    completed: Boolean(stored?.onboardingCompletedAt),
    completedAt: stored?.onboardingCompletedAt ?? null,
    progress: steps.filter((step) => step.completed).length * 20,
    currentStep: steps.find((step) => !step.completed) ?? null,
    steps,
  });
}

function mockUserDiscoveryItem(user: MockUser): DiscoveryItem {
  return {
    kind: "user",
    id: user.id,
    title: user.name,
    subtitle: user.username ? `@${user.username}` : null,
    href: user.username
      ? `/users/${user.username}`
      : `/messages?peer=${user.id}`,
    imageUrl: null,
    meta: `${user.followerCount ?? 0} takipçi${user.city || user.country ? ` · ${user.city ?? user.country}` : ""}`,
  };
}
function mockTagDiscoveryItem(tag: Tag): DiscoveryItem {
  return {
    kind: "tag",
    id: tag.id,
    title: `#${tag.name}`,
    subtitle: tag.description,
    href: `/events?tag=${tag.slug}`,
    imageUrl: null,
    meta: `${tag.usageCount} kullanım`,
  };
}
function mockEventDiscoveryItem(event: Event): DiscoveryItem {
  return {
    kind: "event",
    id: event.id,
    title: event.title,
    subtitle: event.summary,
    href: `/events/${event.slug}`,
    imageUrl: event.coverImageUrl,
    meta: `${event.city ?? "Online"} · ${event.startsAt}`,
  };
}
function mockPlaceDiscoveryItem(place: AdminPlace): DiscoveryItem {
  return {
    kind: "place",
    id: place.id,
    title: place.name,
    subtitle: place.description,
    href: `/places/${place.slug}`,
    imageUrl: place.coverImageUrl,
    meta: `${place.followerCount} takipçi${place.city ? ` · ${place.city}` : ""}`,
  };
}

function getMockDiscoveryFeed(params: URLSearchParams): DiscoveryFeed {
  const profile = getUserSession() ? getMockProfile() : null;
  const global = params.get("scope") === "global";
  const city = global
    ? ""
    : (params.get("city") || profile?.city || "").toLowerCase();
  const country = global
    ? ""
    : (params.get("country") || profile?.country || "").toLowerCase();
  const members = getAllMockUsers().filter((user) => user.status !== "banned");
  const events = getStoredEvents().filter(
    (event) =>
      event.status === "published" &&
      (!city || event.city?.toLowerCase() === city) &&
      (!country || (!city && event.country?.toLowerCase() === country)),
  );
  const places = listMockPlaces(new URLSearchParams()).filter(
    (place) =>
      place.status === "active" &&
      (!city || place.city?.toLowerCase() === city) &&
      (!country || (!city && place.country?.toLowerCase() === country)),
  );
  return discoveryFeedSchema.parse({
    popularMembers: [...members]
      .sort((a, b) => (b.followerCount ?? 0) - (a.followerCount ?? 0))
      .slice(0, 8)
      .map(mockUserDiscoveryItem),
    newMembers: [...members]
      .sort((a, b) =>
        String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
      )
      .slice(0, 8)
      .map(mockUserDiscoveryItem),
    localEvents: (events.length
      ? events
      : getStoredEvents().filter((event) => event.status === "published")
    )
      .slice(0, 8)
      .map(mockEventDiscoveryItem),
    trendingTags: [...getStoredTags()]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)
      .map(mockTagDiscoveryItem),
    popularPlaces: (places.length
      ? places
      : listMockPlaces(new URLSearchParams()).filter(
          (place) => place.status === "active",
        )
    )
      .slice(0, 8)
      .map(mockPlaceDiscoveryItem),
    activeUserCount: members.filter(
      (member) =>
        member.lastOnlineAt &&
        Date.now() - new Date(member.lastOnlineAt).getTime() <= 15 * 60_000,
    ).length,
    scope: global ? "global" : "local",
    location: global ? null : city || country || null,
    city: global ? null : city || null,
    country: global ? null : country || null,
    activities: [
      ...getStoredEvents()
        .filter((event) => event.status === "published")
        .slice(0, 8)
        .map((event) => ({
          ...mockEventDiscoveryItem(event),
          action: "Etkinlik oluşturuldu",
          occurredAt: event.startsAt,
          ownerId: null,
        })),
      ...listMockPlaces(new URLSearchParams())
        .filter((place) => place.status === "active")
        .slice(0, 8)
        .map((place) => ({
          ...mockPlaceDiscoveryItem(place),
          action: "Mekân oluşturuldu",
          occurredAt: place.createdAt ?? new Date().toISOString(),
          ownerId: place.createdById ?? null,
        })),
    ].sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    ),
  });
}

function searchMockDiscovery(query: string): DiscoverySearch {
  const needle = query.trim().replace(/^@/, "").toLowerCase();
  const matches = (value: unknown) =>
    JSON.stringify(value).toLowerCase().includes(needle);
  const items = [
    ...getAllMockUsers()
      .filter(matches)
      .slice(0, 10)
      .map(mockUserDiscoveryItem),
    ...getStoredTags().filter(matches).slice(0, 10).map(mockTagDiscoveryItem),
    ...getStoredEvents()
      .filter((event) => event.status === "published" && matches(event))
      .slice(0, 10)
      .map(mockEventDiscoveryItem),
    ...listMockPlaces(new URLSearchParams())
      .filter((place) => place.status === "active" && matches(place))
      .slice(0, 10)
      .map(mockPlaceDiscoveryItem),
  ];
  return discoverySearchSchema.parse({
    query: query.trim(),
    total: items.length,
    items,
  });
}

function getMockPublicProfile(identifier: string, byId = false): PublicProfile {
  const target = getAllMockUsers().find(
    (user) =>
      (byId
        ? user.id === identifier
        : user.username?.toLowerCase() === identifier.toLowerCase()) &&
      user.status !== "banned",
  );
  if (!target) throw new Error("Kullanıcı profili bulunamadı");
  const viewer = getUserSession();
  const blockedByViewer = Boolean(
    viewer && listMockBlocks().some((block) => block.targetType === "user" && block.targetId === target.id),
  );
  const follows = mockFollowIds();
  const interestMap = readStorage<Record<string, string[]>>(
    USER_INTEREST_TAGS_KEY,
    {},
  );
  const ownTags = new Set(viewer ? (interestMap[viewer.id] ?? []) : []);
  const sentiments = readStorage<Record<string, Record<string, TagSentiment>>>(
    USER_TAG_SENTIMENTS_KEY,
    {},
  );
  const interests = getTagsByIds(interestMap[target.id] ?? []).map((tag) => ({
    tag,
    sentiment: sentiments[target.id]?.[tag.id] ?? ("like" as const),
    common: ownTags.has(tag.id),
  }));
  const events = getStoredEvents()
    .filter(
      (event) =>
        event.status === "published" &&
        event.organizerName?.toLowerCase() === target.name.toLowerCase(),
    )
    .slice(0, 12)
    .map(mockEventDiscoveryItem);
  const places = listMockPlaces(new URLSearchParams())
    .filter(
      (place) => place.status === "active" && place.createdById === target.id,
    )
    .slice(0, 12)
    .map(mockPlaceDiscoveryItem);
  const commonInterests = interests.filter((item) => item.common);
  const mutualism = viewer && viewer.id !== target.id ? {
    total: commonInterests.length,
    hiddenCount: 0,
    sameSentimentTags: commonInterests,
    events: [],
    places: [],
    people: [],
    sharedReactionCount: 0,
    sharedCommentTargetCount: 0,
    scores: {
      overall: Math.min(100, commonInterests.length * 8),
      friendship: Math.min(100, commonInterests.length * 10),
      networking: Math.min(100, commonInterests.length * 7),
      eventPartner: Math.min(100, commonInterests.length * 8),
      travel: Math.min(100, commonInterests.length * 5),
      business: Math.min(100, commonInterests.length * 6),
    },
    explanation: commonInterests.length ? `${commonInterests.length} ortak ilgi sinyali bulundu.` : "Henüz doğrulanmış ortak bir sinyal bulunamadı.",
    actions: commonInterests[0] ? [`${commonInterests[0].tag.name} ortak ilgi alanından bir sohbet açın.`] : [],
  } : undefined;
  const media =
    target.id === viewer?.id
      ? listMockProfileMedia().map(
          ({ id, url, type, sortOrder, isProfilePicture }) => ({
            id,
            url,
            type,
            sortOrder,
            isProfilePicture,
          }),
        )
      : [];
  return publicProfileSchema.parse({
    id: target.id,
    name: target.name,
    username: target.username ?? target.id,
    accountType:
      target.accountType === "corporate" ? "corporate" : "individual",
    systemRole: target.role,
    plan: null,
    website: target.website ?? null,
    city: target.city ?? null,
    country: target.country ?? null,
    followerCount: target.followerCount ?? 0,
    followingCount: target.followingCount ?? 0,
    verified: Boolean(target.profileVerifiedAt),
    memberSince: target.createdAt ?? new Date().toISOString(),
    media,
    interests,
    commonInterestCount: interests.filter((item) => item.common).length,
    mutualism,
    relationship: {
      isSelf: viewer?.id === target.id,
      following: follows.includes(target.id),
      canMessage: Boolean(viewer && viewer.id !== target.id && !blockedByViewer),
      blockedByViewer,
    },
    events,
    places,
  });
}

function getMockProfileVerificationStatus(): ProfileVerificationStatus {
  const session = getUserSession();
  if (!session) throw new Error("User session required");
  const user = getAllMockUsers().find((item) => item.id === session.id);
  const request =
    readStorage<ProfileVerificationRequest[]>(
      MOCK_PROFILE_VERIFICATIONS_KEY,
      [],
    ).find((item) => item.userId === session.id) ?? null;
  return profileVerificationStatusSchema.parse({
    eligible: user?.accountType !== "corporate",
    verified: Boolean(user?.profileVerifiedAt),
    verifiedAt: user?.profileVerifiedAt ?? null,
    request,
  });
}

function createMockProfileVerification(
  options: RequestOptions,
): ProfileVerificationStatus {
  const session = getUserSession();
  if (!session || !(options.body instanceof FormData))
    throw new Error("Verification form required");
  const now = new Date().toISOString();
  const request = profileVerificationRequestSchema.parse({
    id: createId(),
    userId: session.id,
    referenceMediaId: listMockProfileMedia()[0]?.id ?? createId(),
    selfieUrl: "private-demo-selfie.jpg",
    challenge: String(options.body.get("challenge") || "blink"),
    status: "approved",
    provider: "development_simulator",
    faceMatchScore: 0.98,
    livenessScore: 0.97,
    decisionReason: "Geliştirme ortamı otomatik doğrulaması.",
    reviewedById: null,
    reviewedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  writeStorage(MOCK_PROFILE_VERIFICATIONS_KEY, [request]);
  const users = getAllMockUsers();
  writeStorage(
    MOCK_USERS_KEY,
    users.map((item) =>
      item.id === session.id ? { ...item, profileVerifiedAt: now } : item,
    ),
  );
  return profileVerificationStatusSchema.parse({
    eligible: true,
    verified: true,
    verifiedAt: now,
    request,
  });
}

function completeMockOnboarding() {
  const status = getMockOnboardingStatus();
  if (status.steps.slice(0, 4).some((step) => !step.completed))
    throw new Error("Zorunlu onboarding adımları eksik");
  const session = getUserSession();
  const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  writeStorage(
    MOCK_USERS_KEY,
    users.map((user) =>
      user.id === session?.id
        ? { ...user, onboardingCompletedAt: new Date().toISOString() }
        : user,
    ),
  );
  return getMockOnboardingStatus();
}

function getMockMemberPass(): MemberPass {
  const profile = getMockProfile();
  const user = readStorage<MockUser[]>(MOCK_USERS_KEY, []).find(
    (item) => item.id === profile.id,
  );
  const version = user?.memberPassVersion ?? 1;
  const payload = `konnektora://member?token=mock-${profile.id}-v${version}`;
  return memberPassSchema.parse({
    member: {
      id: profile.id,
      name: profile.name,
      username: profile.username,
      city: profile.city,
      country: profile.country,
      followerCount: user?.followerCount ?? 0,
    },
    qrPayload: payload,
    nfcPayload: payload,
    version,
  });
}

function rotateMockMemberPass() {
  const profile = getMockProfile();
  const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  writeStorage(
    MOCK_USERS_KEY,
    users.map((user) =>
      user.id === profile.id
        ? { ...user, memberPassVersion: (user.memberPassVersion ?? 1) + 1 }
        : user,
    ),
  );
  return getMockMemberPass();
}

function listMockMemberScans(): MemberScan[] {
  return readStorage<MemberScan[]>(MOCK_MEMBER_SCANS_KEY, []);
}

function scanMockMember(input: {
  payload: string;
  method: "qr" | "nfc";
}): MemberScan {
  const match = input.payload.match(/mock-([0-9a-f-]{36})-v\d+/i);
  const session = getUserSession();
  const target = match
    ? getAllMockUsers().find((user) => user.id === match[1])
    : undefined;
  if (!session || !target || target.id === session.id)
    throw new Error("Üye kartı geçersiz");
  const item = memberScanSchema.parse({
    id: createId(),
    method: input.method,
    createdAt: new Date().toISOString(),
    member: {
      id: target.id,
      name: target.name,
      username: target.username,
      city: target.city,
      country: target.country,
      followerCount: target.followerCount,
    },
    following: false,
  });
  writeStorage(MOCK_MEMBER_SCANS_KEY, [item, ...listMockMemberScans()]);
  return item;
}

function listMockProfileMedia(): ProfileMedia[] {
  return readStorage<ProfileMedia[]>(MOCK_PROFILE_MEDIA_KEY, []).sort(
    (left, right) => left.sortOrder - right.sortOrder,
  );
}

function createMockProfileMedia(file: File): ProfileMedia {
  const current = listMockProfileMedia();
  const type = file.type.startsWith("image/") ? "image" : "video";
  if (!current.some((item) => item.type === "image") && type !== "image") {
    throw new Error("Profil albümündeki ilk medya bir fotoğraf olmalıdır.");
  }
  const user = getUserSession();
  if (!user) throw new Error("Mock user session not found");
  const isFirst = current.length === 0;
  const shifted = current.map((item) =>
    item.sortOrder >= 1 ? { ...item, sortOrder: item.sortOrder + 1 } : item,
  );
  const now = new Date().toISOString();
  const media: ProfileMedia = {
    id: createId(),
    url: URL.createObjectURL(file),
    type,
    status: "active",
    contentType: "user",
    contentId: user.id,
    uploadedById: user.id,
    sortOrder: isFirst ? 0 : 1,
    isProfilePicture: isFirst,
    createdAt: now,
    updatedAt: now,
  };
  writeStorage(MOCK_PROFILE_MEDIA_KEY, [media, ...shifted]);
  return media;
}

function makeMockProfilePicture(mediaId: string): ProfileMedia[] {
  const current = listMockProfileMedia();
  const target = current.find((item) => item.id === mediaId);
  if (!target || target.type !== "image")
    throw new Error("Profile image not found");
  const updated = current
    .map((item) => ({
      ...item,
      isProfilePicture: item.id === mediaId,
      sortOrder: item.id === mediaId ? 0 : item.sortOrder + 1,
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder);
  writeStorage(MOCK_PROFILE_MEDIA_KEY, updated);
  return updated;
}

function reorderMockProfileMedia(mediaIds: string[]): ProfileMedia[] {
  const current = listMockProfileMedia();
  if (
    mediaIds.length !== current.length ||
    current.some((item) => !mediaIds.includes(item.id))
  )
    throw new Error("Invalid media order");
  const profilePicture = current.find((item) => item.isProfilePicture);
  if (profilePicture && mediaIds[0] !== profilePicture.id)
    throw new Error("Profile picture must remain first");
  const updated = mediaIds.map((id, sortOrder) => ({
    ...current.find((item) => item.id === id)!,
    sortOrder,
  }));
  writeStorage(MOCK_PROFILE_MEDIA_KEY, updated);
  return updated;
}

function deleteMockProfileMedia(mediaId: string): ProfileMedia[] {
  const current = listMockProfileMedia();
  const target = current.find((item) => item.id === mediaId);
  if (!target) throw new Error("Profile media not found");
  if (
    target.type === "image" &&
    current.filter((item) => item.type === "image").length === 1
  ) {
    throw new Error("Profilde en az bir fotoğraf bulunmalıdır.");
  }
  const remaining = current.filter((item) => item.id !== mediaId);
  if (target.isProfilePicture) {
    const next = remaining.find((item) => item.type === "image");
    if (next) next.isProfilePicture = true;
  }
  const updated = remaining
    .sort(
      (left, right) =>
        Number(right.isProfilePicture) - Number(left.isProfilePicture),
    )
    .map((item, sortOrder) => ({ ...item, sortOrder }));
  writeStorage(MOCK_PROFILE_MEDIA_KEY, updated);
  return updated;
}

function updateMockProfile(input: ProfileUpdateInput): Profile {
  const profile = getMockProfile();
  const users = readStorage<MockUser[]>(MOCK_USERS_KEY, []);
  const current = users.find((user) => user.id === profile.id);
  const updated: MockUser = {
    ...(current ?? {
      id: profile.id,
      email: profile.email,
      password: "",
      name: profile.name,
    }),
    ...input,
    name: input.name.trim(),
    username: input.username?.trim() || null,
    updatedAt: new Date().toISOString(),
  };
  writeStorage(MOCK_USERS_KEY, [
    updated,
    ...users.filter((user) => user.id !== profile.id),
  ]);
  setUserSession({
    accessToken: getUserToken() ?? `mock-user-token-${profile.id}`,
    user: { ...getUserSession()!, name: updated.name, username: updated.username ?? null, city: updated.city ?? null, country: updated.country ?? null },
  });
  return getMockProfile();
}

function getMockPrivacySettings(): PrivacySettings {
  const session = getUserSession();
  if (!session) throw new Error("User session required");
  const settings = readStorage<Record<string, PrivacySettings>>(
    MOCK_PRIVACY_SETTINGS_KEY,
    {},
  );
  return (
    settings[session.id] ?? {
      userId: session.id,
      messageAudience: "everybody",
      directoryDiscoverable: true,
      eventAudience: "everybody",
      eventInviteAudience: "everybody",
      placeAudience: "everybody",
      placeInviteAudience: "everybody",
      profileNameAudience: "everybody",
      demographicsAudience: "everybody",
      locationAudience: "everybody",
      websiteAudience: "everybody",
      businessAudience: "everybody",
      addressAudience: "everybody",
      tradeNameAudience: "everybody",
    }
  );
}

function updateMockPrivacySettings(
  input: Omit<PrivacySettings, "userId" | "createdAt" | "updatedAt">,
): PrivacySettings {
  const current = getMockPrivacySettings();
  const updated = privacySettingsSchema.parse({
    ...current,
    ...input,
    updatedAt: new Date().toISOString(),
  });
  const settings = readStorage<Record<string, PrivacySettings>>(
    MOCK_PRIVACY_SETTINGS_KEY,
    {},
  );
  writeStorage(MOCK_PRIVACY_SETTINGS_KEY, {
    ...settings,
    [current.userId]: updated,
  });
  return updated;
}

const mockNotificationTopics: NotificationPreference["topic"][] = [
  "tag_request",
  "private_message",
  "mention",
  "comment",
  "password_changed",
  "email_changed",
  "phone_changed",
  "login",
  "admin_message",
  "event_invite",
  "event_manager",
  "place_invite",
  "place_manager",
];

function getMockNotificationPreferences(): NotificationPreference[] {
  const session = getUserSession();
  if (!session) throw new Error("User session required");
  const stored = readStorage<Record<string, NotificationPreference[]>>(
    MOCK_NOTIFICATION_PREFERENCES_KEY,
    {},
  );
  const selected = new Map(
    (stored[session.id] ?? []).map((item) => [item.topic, item.channel]),
  );
  return mockNotificationTopics.map((topic) => ({
    topic,
    channel:
      selected.get(topic) ??
      (["password_changed", "email_changed", "phone_changed", "login"].includes(
        topic,
      )
        ? "email"
        : "both"),
  }));
}

function updateMockNotificationPreferences(
  preferences: NotificationPreference[],
) {
  const session = getUserSession();
  if (!session) throw new Error("User session required");
  const stored = readStorage<Record<string, NotificationPreference[]>>(
    MOCK_NOTIFICATION_PREFERENCES_KEY,
    {},
  );
  writeStorage(MOCK_NOTIFICATION_PREFERENCES_KEY, {
    ...stored,
    [session.id]: preferences,
  });
  return getMockNotificationPreferences();
}

function listMockBlocks(): UserBlock[] {
  const session = getUserSession();
  if (!session) return [];
  const stored = readStorage<Record<string, UserBlock[]>>(
    MOCK_USER_BLOCKS_KEY,
    {},
  );
  return stored[session.id] ?? [];
}

function createMockBlock(input: {
  targetType: BlockedTargetType;
  targetId: string;
}) {
  const session = getUserSession();
  if (
    !session ||
    (input.targetType === "user" && input.targetId === session.id)
  )
    throw new Error("Invalid block");
  const detail =
    input.targetType === "event"
      ? getStoredEvents().find((item) => item.id === input.targetId)
      : input.targetType === "tag"
        ? getStoredTags().find((item) => item.id === input.targetId)
        : input.targetType === "place"
          ? listMockPlaces(new URLSearchParams()).find(
              (item) => item.id === input.targetId,
            )
          : getAllMockUsers().find((item) => item.id === input.targetId);
  if (!detail) throw new Error("Block target not found");
  const label =
    "title" in detail
      ? String(detail.title)
      : "username" in detail && detail.username
        ? `@${detail.username}`
        : String(detail.name);
  const block: UserBlock = {
    targetType: input.targetType,
    targetId: input.targetId,
    label,
    createdAt: new Date().toISOString(),
  };
  const stored = readStorage<Record<string, UserBlock[]>>(
    MOCK_USER_BLOCKS_KEY,
    {},
  );
  const current = stored[session.id] ?? [];
  writeStorage(MOCK_USER_BLOCKS_KEY, {
    ...stored,
    [session.id]: [
      block,
      ...current.filter(
        (item) =>
          item.targetType !== input.targetType ||
          item.targetId !== input.targetId,
      ),
    ],
  });
  if (input.targetType === "user") {
    const follows = readStorage<Record<string, string[]>>(
      MOCK_USER_FOLLOWS_KEY,
      {},
    );
    const next = Object.fromEntries(
      Object.entries(follows).map(([followerId, ids]) => [
        followerId,
        ids.filter(
          (followingId) =>
            !(followerId === session.id && followingId === input.targetId) &&
            !(followerId === input.targetId && followingId === session.id),
        ),
      ]),
    );
    writeStorage(MOCK_USER_FOLLOWS_KEY, next);
  }
  return { ok: true };
}

function removeMockBlock(targetType: BlockedTargetType, targetId: string) {
  const session = getUserSession();
  if (!session) throw new Error("User session required");
  const stored = readStorage<Record<string, UserBlock[]>>(
    MOCK_USER_BLOCKS_KEY,
    {},
  );
  writeStorage(MOCK_USER_BLOCKS_KEY, {
    ...stored,
    [session.id]: (stored[session.id] ?? []).filter(
      (item) => item.targetType !== targetType || item.targetId !== targetId,
    ),
  });
  return { ok: true };
}

function mockFollowIds() {
  const session = getUserSession();
  const follows = readStorage<Record<string, string[]>>(
    MOCK_USER_FOLLOWS_KEY,
    {},
  );
  return session ? (follows[session.id] ?? []) : [];
}

function toMockMemberCard(user: MockUser, following: boolean): MemberCard {
  const ownTags = new Set(getUserInterestTagIds());
  const interests = readStorage<Record<string, string[]>>(
    USER_INTEREST_TAGS_KEY,
    {},
  );
  return {
    id: user.id,
    name: user.name,
    username: user.username ?? null,
    accountType: user.accountType === "corporate" ? "corporate" : "individual",
    city: user.city ?? null,
    country: user.country ?? null,
    followerCount: user.followerCount ?? 0,
    commonTagCount: (interests[user.id] ?? []).filter((tagId) =>
      ownTags.has(tagId),
    ).length,
    following,
    createdAt: user.createdAt,
  };
}

function listMockMemberSuggestions() {
  const session = getUserSession();
  if (!session) return [];
  const followed = new Set(mockFollowIds());
  const blocked = new Set(
    listMockBlocks()
      .filter((block) => block.targetType === "user")
      .map((block) => block.targetId),
  );
  return getAllMockUsers()
    .filter(
      (user) =>
        user.id !== session.id &&
        user.status !== "banned" &&
        !followed.has(user.id) &&
        !blocked.has(user.id),
    )
    .map((user) => toMockMemberCard(user, false))
    .sort(
      (a, b) =>
        b.commonTagCount - a.commonTagCount ||
        b.followerCount - a.followerCount,
    )
    .slice(0, 20);
}

function listMockFollowing() {
  const followed = new Set(mockFollowIds());
  return getAllMockUsers()
    .filter((user) => followed.has(user.id))
    .map((user) => toMockMemberCard(user, true));
}

function listMockNewMembers() {
  const followed = new Set(mockFollowIds());
  return getAllMockUsers()
    .filter((user) => user.status !== "banned")
    .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")))
    .slice(0, 200)
    .map((user) => toMockMemberCard(user, followed.has(user.id)));
}

function followMockUser(targetUserId: string) {
  const session = getUserSession();
  if (
    !session ||
    session.id === targetUserId ||
    !getAllMockUsers().some((user) => user.id === targetUserId)
  )
    throw new Error("User cannot be followed");
  const follows = readStorage<Record<string, string[]>>(
    MOCK_USER_FOLLOWS_KEY,
    {},
  );
  writeStorage(MOCK_USER_FOLLOWS_KEY, {
    ...follows,
    [session.id]: [...new Set([...(follows[session.id] ?? []), targetUserId])],
  });
  return { ok: true, following: true };
}

function unfollowMockUser(targetUserId: string) {
  const session = getUserSession();
  if (!session) throw new Error("User session required");
  const follows = readStorage<Record<string, string[]>>(
    MOCK_USER_FOLLOWS_KEY,
    {},
  );
  writeStorage(MOCK_USER_FOLLOWS_KEY, {
    ...follows,
    [session.id]: (follows[session.id] ?? []).filter(
      (id) => id !== targetUserId,
    ),
  });
  return { ok: true, following: false };
}

function listMockChatMessages(): PrivateChatMessage[] {
  return readStorage<PrivateChatMessage[]>(MOCK_CHAT_MESSAGES_KEY, []);
}

function listMockConversations(): ConversationList {
  const current = getUserSession();
  if (!current) throw new Error("Mock user session not found");
  const users = getAllMockUsers();
  const hiddenBefore =
    readStorage<Record<string, Record<string, string>>>(
      MOCK_HIDDEN_CONVERSATIONS_KEY,
      {},
    )[current.id] ?? {};
  const grouped = new Map<string, ConversationList["items"][number]>();
  for (const message of [...listMockChatMessages()].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  )) {
    const peerId =
      message.senderId === current.id ? message.recipientId : message.senderId;
    if (!peerId) continue;
    if (
      hiddenBefore[peerId] &&
      new Date(message.createdAt) <= new Date(hiddenBefore[peerId])
    )
      continue;
    const peer = users.find((item) => item.id === peerId);
    if (!peer) continue;
    const unread =
      message.recipientId === current.id && !message.readAt ? 1 : 0;
    const existing = grouped.get(peerId);
    if (existing) existing.unreadCount += unread;
    else
      grouped.set(peerId, {
        peer: {
          id: peer.id,
          name: peer.name,
          username: peer.username ?? null,
          status: peer.status ?? "active",
          avatarUrl: peer.avatarUrl ?? null,
        },
        lastMessage: message,
        unreadCount: unread,
      });
  }
  const items = [...grouped.values()];
  return {
    items,
    totalUnread: items.reduce((sum, item) => sum + item.unreadCount, 0),
  };
}

function listMockConversationMessages(
  peerId: string,
  params: URLSearchParams,
): ConversationMessages {
  const current = getUserSession();
  if (!current) throw new Error("Mock user session not found");
  const page = Math.max(1, Number(params.get("page") || 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(params.get("pageSize") || 50)),
  );
  const hiddenAt = readStorage<Record<string, Record<string, string>>>(
    MOCK_HIDDEN_CONVERSATIONS_KEY,
    {},
  )[current.id]?.[peerId];
  const messages = listMockChatMessages()
    .filter(
      (message) =>
        ((message.senderId === current.id && message.recipientId === peerId) ||
          (message.senderId === peerId &&
            message.recipientId === current.id)) &&
        (!hiddenAt || new Date(message.createdAt) > new Date(hiddenAt)),
    )
    .sort(
      (left, right) =>
        new Date(left.createdAt).getTime() -
        new Date(right.createdAt).getTime(),
    );
  const start = Math.max(0, messages.length - page * pageSize);
  const end = messages.length - (page - 1) * pageSize;
  return {
    items: messages.slice(start, end),
    total: messages.length,
    page,
    pageSize,
    hasNextPage: start > 0,
  };
}

function sendMockPrivateMessage(input: {
  recipientId: string;
  body: string;
  replyToId?: string;
}): PrivateChatMessage {
  const current = getUserSession();
  if (!current || input.recipientId === current.id)
    throw new Error("Mock message recipient invalid");
  const now = new Date().toISOString();
  const message: PrivateChatMessage = {
    id: createId(),
    senderId: current.id,
    recipientId: input.recipientId,
    body: input.body.trim(),
    status: "active",
    readAt: null,
    replyToId: input.replyToId ?? null,
    replyTo: input.replyToId
      ? (listMockChatMessages().find((item) => item.id === input.replyToId) ??
        null)
      : null,
    reactions: [],
    createdAt: now,
    updatedAt: now,
  };
  writeStorage(MOCK_CHAT_MESSAGES_KEY, [...listMockChatMessages(), message]);
  return message;
}

function editMockPrivateMessage(id: string, body: string) {
  const now = new Date().toISOString();
  let result: PrivateChatMessage | undefined;
  const messages = listMockChatMessages().map((item) =>
    item.id === id
      ? (result = { ...item, body: body.trim(), editedAt: now, updatedAt: now })
      : item,
  );
  writeStorage(MOCK_CHAT_MESSAGES_KEY, messages);
  return result;
}
function deleteMockPrivateMessage(id: string) {
  const now = new Date().toISOString();
  let result: PrivateChatMessage | undefined;
  const messages = listMockChatMessages().map((item) =>
    item.id === id
      ? (result = {
          ...item,
          body: "Bu mesaj silindi",
          status: "deleted",
          deletedAt: now,
          attachmentUrl: null,
          updatedAt: now,
        })
      : item,
  );
  writeStorage(MOCK_CHAT_MESSAGES_KEY, messages);
  return result;
}
function deleteMockConversation(peerId: string) {
  const current = getUserSession();
  if (!current) throw new Error("Session required");
  const all = readStorage<Record<string, Record<string, string>>>(
    MOCK_HIDDEN_CONVERSATIONS_KEY,
    {},
  );
  writeStorage(MOCK_HIDDEN_CONVERSATIONS_KEY, {
    ...all,
    [current.id]: {
      ...(all[current.id] ?? {}),
      [peerId]: new Date().toISOString(),
    },
  });
  return { ok: true };
}
function toggleMockMessageReaction(id: string, emoji: string) {
  const current = getUserSession();
  if (!current) throw new Error("Session required");
  let active = true;
  const messages = listMockChatMessages().map((item) => {
    if (item.id !== id) return item;
    const reactions = item.reactions ?? [];
    const exists = reactions.some(
      (reaction) => reaction.userId === current.id && reaction.emoji === emoji,
    );
    active = !exists;
    return {
      ...item,
      reactions: exists
        ? reactions.filter(
            (reaction) =>
              !(reaction.userId === current.id && reaction.emoji === emoji),
          )
        : [...reactions, { userId: current.id, emoji }],
    };
  });
  writeStorage(MOCK_CHAT_MESSAGES_KEY, messages);
  return { active, emoji };
}
function searchMockMessages(query: string): MessageSearchResult[] {
  const current = getUserSession();
  if (!current || query.trim().length < 2) return [];
  const users = getAllMockUsers();
  return listMockChatMessages()
    .filter(
      (item) =>
        (item.senderId === current.id || item.recipientId === current.id) &&
        item.body
          .toLocaleLowerCase("tr")
          .includes(query.toLocaleLowerCase("tr")),
    )
    .map((item) => {
      const peerId =
        item.senderId === current.id ? item.recipientId : item.senderId;
      const peer = users.find((user) => user.id === peerId);
      return {
        ...item,
        peer: peer
          ? {
              id: peer.id,
              name: peer.name,
              username: peer.username ?? null,
              status: peer.status ?? "active",
            }
          : null,
      };
    });
}

function markMockConversationRead(peerId: string) {
  const current = getUserSession();
  if (!current) throw new Error("Mock user session not found");
  let updated = 0;
  const now = new Date().toISOString();
  const messages = listMockChatMessages().map((message) => {
    if (
      message.senderId === peerId &&
      message.recipientId === current.id &&
      !message.readAt
    ) {
      updated += 1;
      return { ...message, readAt: now, updatedAt: now };
    }
    return message;
  });
  writeStorage(MOCK_CHAT_MESSAGES_KEY, messages);
  return { updated };
}

function listMockTagComments(tagId: string): TagComment[] {
  const session = getUserSession();
  const blockedUsers = new Set(
    listMockBlocks()
      .filter((block) => block.targetType === "user")
      .map((block) => block.targetId),
  );
  return readStorage<TagComment[]>(MOCK_TAG_COMMENTS_KEY, [])
    .filter(
      (comment) =>
        comment.tagId === tagId &&
        (!comment.author || !blockedUsers.has(comment.author.id)),
    )
    .map((comment) => ({
      ...comment,
      canDelete: comment.author?.id === session?.id,
    }));
}

function createMockTagComment(tagId: string, body: string): TagComment {
  const session = getUserSession();
  if (!session || !getStoredTags().some((tag) => tag.id === tagId))
    throw new Error("Tag comment cannot be created");
  const now = new Date().toISOString();
  const comment: TagComment = {
    id: createId(),
    tagId,
    body: body.trim(),
    likeCount: 0,
    createdAt: now,
    updatedAt: now,
    canDelete: true,
    author: { id: session.id, name: session.name, username: null },
  };
  const comments = readStorage<TagComment[]>(MOCK_TAG_COMMENTS_KEY, []);
  writeStorage(MOCK_TAG_COMMENTS_KEY, [comment, ...comments]);
  return comment;
}

function deleteMockTagComment(tagId: string, commentId: string) {
  const session = getUserSession();
  const comments = readStorage<TagComment[]>(MOCK_TAG_COMMENTS_KEY, []);
  const comment = comments.find(
    (item) => item.id === commentId && item.tagId === tagId,
  );
  if (!session || comment?.author?.id !== session.id)
    throw new Error("Tag comment cannot be deleted");
  writeStorage(
    MOCK_TAG_COMMENTS_KEY,
    comments.filter((item) => item.id !== commentId),
  );
  return { ok: true };
}
function updateMockTagComment(commentId: string, body: string) {
  let updated: TagComment | undefined;
  const comments = readStorage<TagComment[]>(MOCK_TAG_COMMENTS_KEY, []).map(
    (item) =>
      item.id === commentId
        ? (updated = {
            ...item,
            body: body.trim(),
            updatedAt: new Date().toISOString(),
          })
        : item,
  );
  if (!updated) throw new Error("Comment not found");
  writeStorage(MOCK_TAG_COMMENTS_KEY, comments);
  return updated;
}
function toggleMockTagCommentLike(commentId: string) {
  let liked = true;
  const comments = readStorage<TagComment[]>(MOCK_TAG_COMMENTS_KEY, []).map(
    (item) =>
      item.id === commentId
        ? {
            ...item,
            liked: (liked = !item.liked),
            likeCount: Math.max(0, item.likeCount + (liked ? 1 : -1)),
          }
        : item,
  );
  writeStorage(MOCK_TAG_COMMENTS_KEY, comments);
  return { liked };
}
function addMockTagCommentMedia(commentId: string, form: FormData) {
  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("File required");
  const media = {
    id: createId(),
    url: URL.createObjectURL(file),
    type: file.type.startsWith("video/") ? "video" : "image",
  };
  const comments = readStorage<TagComment[]>(MOCK_TAG_COMMENTS_KEY, []).map(
    (item) =>
      item.id === commentId
        ? { ...item, media: [...(item.media ?? []), media] }
        : item,
  );
  writeStorage(MOCK_TAG_COMMENTS_KEY, comments);
  return media;
}

function getMockDashboard(): AdminDashboard {
  const now = Date.now();
  const events = getStoredEvents();

  return {
    publishedEvents: events.filter((event) => event.status === "published")
      .length,
    draftEvents: events.filter((event) => event.status === "draft").length,
    activeTags: getStoredTags().filter((tag) => tag.status === "active").length,
    upcomingEvents: events.filter(
      (event) =>
        event.status === "published" &&
        new Date(event.startsAt).getTime() >= now,
    ).length,
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
    usageCount: 0,
  };

  setStoredTags([tag, ...tags]);
  return tag;
}

function updateMockTag(id: string, input: Partial<Tag>): Tag {
  const tags = getStoredTags();
  const updatedTags = tags.map((tag) =>
    tag.id === id ? { ...tag, ...input } : tag,
  );
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

  const reports = listMockReports().filter(
    (report) => report.targetType === "tag" && report.targetId === id,
  );
  const interestedUsers = readStorage<Record<string, string[]>>(
    USER_INTEREST_TAGS_KEY,
    {},
  );
  const interestedUserCount = Object.values(interestedUsers).filter((tagIds) =>
    tagIds.includes(id),
  ).length;

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
      events: getStoredEvents().filter((event) =>
        event.tags.some((item) => item.id === id),
      ).length,
      interestedUsers: interestedUserCount,
    },
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
        tags: nextTags.some((tag) => tag.id === targetTagId)
          ? nextTags
          : [...nextTags, targetTag],
      };
    }),
  );

  const interests = readStorage<Record<string, string[]>>(
    USER_INTEREST_TAGS_KEY,
    {},
  );
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
            targetId: targetTagId,
          });
        }

        return [
          userId,
          [
            ...new Set(
              tagIds.map((tagId) =>
                tagId === sourceTagId ? targetTagId : tagId,
              ),
            ),
          ],
        ];
      }),
    ),
  );

  writeStorage(
    MOCK_REPORTS_KEY,
    readStorage<ContentReport[]>(MOCK_REPORTS_KEY, []).map((report) =>
      report.targetType === "tag" && report.targetId === sourceTagId
        ? { ...report, targetId: targetTagId }
        : report,
    ),
  );

  const updatedSource = {
    ...sourceTag,
    status: "archived" as const,
    usageCount: 0,
  };
  setStoredTags(
    tags.map((tag) => (tag.id === sourceTagId ? updatedSource : tag)),
  );
  return updatedSource;
}

function createMockEvent(
  input: AdminEventInput,
  fallbackOrganizerName = "Konnektora Admin",
  ownerId?: string,
): Event {
  const events = getStoredEvents();
  const event: Event = {
    id: createId(),
    title: input.title,
    slug: uniqueSlug(
      input.title,
      events.map((item) => item.slug),
    ),
    summary: resolveEventSummary(input),
    description: input.description,
    status: parseEventStatus(input.status),
    startsAt: input.startsAt,
    endsAt:
      input.endsAt ??
      new Date(
        new Date(input.startsAt).getTime() + 1000 * 60 * 60 * 2,
      ).toISOString(),
    timezone: input.timezone ?? resolveEventTimezone(input.city, input.country),
    format: parseEventFormat(input.format),
    visibility: parseEventVisibility(input.visibility),
    city: input.city || null,
    country: input.country || null,
    language: input.language ?? "en",
    organizerName: input.organizerName || fallbackOrganizerName,
    externalRegistrationUrl: input.externalRegistrationUrl || null,
    liveUrl: input.liveUrl || null,
    timeline: input.timeline || null,
    lineup: input.lineup ?? [],
    ticketTypes: input.ticketTypes ?? [],
    coverImageUrl: input.coverImageUrl || null,
    capacity: input.capacity ?? null,
    price: input.price ?? 0,
    currency:
      input.currency === "EUR" ||
      input.currency === "USD" ||
      input.currency === "GBP"
        ? input.currency
        : "TRY",
    tags: getTagsByIds(input.tagIds ?? []),
  };

  setStoredEvents([event, ...events]);

  if (ownerId) {
    const userEventIds = readStorage<Record<string, string[]>>(
      MOCK_USER_EVENT_IDS_KEY,
      {},
    );
    writeStorage(MOCK_USER_EVENT_IDS_KEY, {
      ...userEventIds,
      [ownerId]: [event.id, ...(userEventIds[ownerId] ?? [])],
    });
  }

  return event;
}

function listMockUserEvents(): Event[] {
  const user = getUserSession();

  if (!user) {
    return [];
  }

  const userEventIds = readStorage<Record<string, string[]>>(
    MOCK_USER_EVENT_IDS_KEY,
    {},
  );
  const eventIds = new Set(userEventIds[user.id] ?? []);

  if (["admin", "super_admin", "curator"].includes(user.role)) {
    return getStoredEvents().filter((event) => event.status !== "archived");
  }

  return getStoredEvents().filter(
    (event) => eventIds.has(event.id) || event.createdById === user.id || event.organizerName === user.name,
  );
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
      summary: input.summary
        ? resolveEventSummary(input as AdminEventInput)
        : event.summary,
      description: input.description ?? event.description,
      status: input.status ? parseEventStatus(input.status) : event.status,
      startsAt: input.startsAt ?? event.startsAt,
      endsAt:
        input.endsAt ??
        (input.startsAt
          ? new Date(
              new Date(input.startsAt).getTime() + 1000 * 60 * 60 * 2,
            ).toISOString()
          : event.endsAt),
      timezone:
        input.timezone ??
        (input.city !== undefined || input.country !== undefined
          ? resolveEventTimezone(input.city, input.country)
          : event.timezone),
      format: input.format ? parseEventFormat(input.format) : event.format,
      visibility: input.visibility
        ? parseEventVisibility(input.visibility)
        : event.visibility,
      city: input.city === undefined ? event.city : input.city || null,
      country:
        input.country === undefined ? event.country : input.country || null,
      language: input.language ?? event.language,
      organizerName:
        input.organizerName === undefined
          ? event.organizerName
          : input.organizerName || "Konnektora Admin",
      externalRegistrationUrl:
        input.externalRegistrationUrl === undefined
          ? event.externalRegistrationUrl
          : input.externalRegistrationUrl || null,
      liveUrl:
        input.liveUrl === undefined ? event.liveUrl : input.liveUrl || null,
      timeline:
        input.timeline === undefined ? event.timeline : input.timeline || null,
      lineup: input.lineup ?? event.lineup,
      ticketTypes: input.ticketTypes ?? event.ticketTypes,
      coverImageUrl:
        input.coverImageUrl === undefined
          ? event.coverImageUrl
          : input.coverImageUrl || null,
      capacity: event.capacity,
      tags: input.tagIds ? getTagsByIds(input.tagIds) : event.tags,
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
    (
      Number(char) ^
      ((crypto.getRandomValues(new Uint8Array(1))[0] ?? 0) &
        (15 >> (Number(char) / 4)))
    ).toString(16),
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
  return value === "draft" || value === "cancelled" || value === "archived"
    ? value
    : "published";
}

function parseCmsStatus(
  value?: string,
  fallback: "active" | "passive" = "active",
) {
  return value === "passive"
    ? "passive"
    : value === "active"
      ? "active"
      : fallback;
}

function parseAnnouncementTarget(value?: string): Announcement["target"] {
  return value === "members" || value === "individual_members" || value === "corporate_members" || value === "admins" ? value : "all";
}

function parsePolicyType(value?: string): PolicyType {
  return value === "terms" || value === "cookies" || value === "about"
    ? value
    : "privacy";
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
    "private_message",
    "post",
    "post_comment",
  ];
  return allowed.includes(value as ReportTargetType)
    ? (value as ReportTargetType)
    : "event";
}

function resolveEventSummary(
  input: Pick<AdminEventInput, "title" | "summary" | "description">,
) {
  const summary = input.summary?.trim();

  if (summary) {
    return summary;
  }

  const description = input.description.trim().replace(/\s+/g, " ");
  return description.length > 300
    ? `${description.slice(0, 297)}...`
    : description || input.title;
}

function resolveEventTimezone(city?: string, country?: string) {
  const location = `${city ?? ""} ${country ?? ""}`.toLowerCase();

  if (
    location.includes("istanbul") ||
    location.includes("turkey") ||
    location.includes("türkiye")
  ) {
    return "Europe/Istanbul";
  }

  return "UTC";
}

function parseEventFormat(value?: string): Event["format"] {
  return value === "offline" || value === "hybrid" ? value : "online";
}

function parseEventVisibility(value?: string): Event["visibility"] {
  return value === "approval_required" || value === "invite_only"
    ? value
    : "open";
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

export async function listEvents(params?: URLSearchParams): Promise<EventList> {
  const query = params?.toString();
  const demoResult = !params?.toString()
    ? {
        items: mockEvents,
        total: mockEvents.length,
        page: 1,
        pageSize: Math.max(mockEvents.length, 1),
        hasNextPage: false,
      }
    : listMockEventFeed(params);
  let result: EventList;

  try {
    const path = `/events${query ? `?${query}` : ""}`;
    try {
      result = await requestJson(path, eventListSchema, { auth: "user" });
    } catch (error) {
      if (!(error instanceof ApiHttpError) || error.status !== 401) throw error;
      result = await requestJson(path, eventListSchema);
    }
  } catch (error) {
    if (USE_DEMO_CONTENT) {
      return demoResult;
    }
    throw error;
  }

  if (!USE_DEMO_CONTENT) {
    return result;
  }

  const realIds = new Set(result.items.map((event) => event.id));
  const realSlugs = new Set(result.items.map((event) => event.slug));
  const demoItems = demoResult.items.filter(
    (event) => !realIds.has(event.id) && !realSlugs.has(event.slug),
  );
  const items = [...result.items, ...demoItems];

  return {
    ...result,
    items,
    total: Math.max(result.total + demoItems.length, items.length),
    hasNextPage: result.hasNextPage || demoResult.hasNextPage,
  };
}

export async function getEvent(slug: string): Promise<Event> {
  const demoEvent = USE_DEMO_CONTENT
    ? getStoredEvents().find(
        (event) => event.status === "published" && event.slug === slug,
      )
    : undefined;

  if (demoEvent) {
    return demoEvent;
  }

  try {
    return await requestJson(`/events/${slug}`, eventSchema, { auth: "user" });
  } catch (error) {
    if (!(error instanceof ApiHttpError) || error.status !== 401) throw error;
    return requestJson(`/events/${slug}`, eventSchema);
  }
}

export async function listTags(params = new URLSearchParams()): Promise<Tag[]> {
  const query = params.toString();
  const result = await requestJson(`/tags${query ? `?${query}` : ""}`, z.array(tagSchema));
  return USE_DEMO_CONTENT && result.length === 0
    ? getStoredTags().filter((tag) => tag.status === "active")
    : result;
}

export function createUserTag(input: {
  name: string;
  description?: string;
}): Promise<Tag> {
  return requestJson("/tags", tagSchema, {
    auth: "user",
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getProfileInterests(): Promise<Tag[]> {
  return requestJson("/profile/interests", z.array(tagSchema), {
    auth: "user",
  });
}

export function getProfileAffinities(): Promise<TagAffinity[]> {
  return requestJson("/profile/affinities", tagAffinitiesSchema, {
    auth: "user",
  });
}

export function listProfileTagSuggestions(): Promise<ProfileTagSuggestion[]> {
  return requestJson("/profile/tag-suggestions", profileTagSuggestionsSchema, { auth: "user" });
}

export function createProfileTagSuggestion(targetUserId: string, input: { tagId: string; sentiment: TagSentiment }): Promise<ProfileTagSuggestion> {
  return requestJson(`/profile/tag-suggestions/${targetUserId}`, profileTagSuggestionSchema, { auth: "user", method: "POST", body: JSON.stringify(input) });
}

export function decideProfileTagSuggestion(id: string, action: "accept" | "decline" | "cancel") {
  return requestJson(`/profile/tag-suggestions/${id}`, z.object({ ok: z.literal(true), status: z.string() }), { auth: "user", method: "PATCH", body: JSON.stringify({ action }) });
}

export function getMyProfile(): Promise<Profile> {
  return requestJson("/profile", profileSchema, { auth: "user" });
}

export function updateMyProfile(input: ProfileUpdateInput): Promise<Profile> {
  return requestJson("/profile", profileSchema, {
    auth: "user",
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function upgradeCorporateAccount(input: { companyName: string; tradeName: string; companyType: string; businessCategory: string; country: string; city?: string; district?: string; address?: string }): Promise<{ ok: boolean; accountType: "corporate" }> {
  return requestJson("/profile/upgrade-corporate", z.object({ ok: z.boolean(), accountType: z.literal("corporate") }), {
    auth: "user", method: "POST", body: JSON.stringify(input),
  });
}

export function listProfileMedia(): Promise<ProfileMedia[]> {
  return requestJson("/profile/media", profileMediaListSchema, {
    auth: "user",
  });
}

export async function uploadProfileMedia(file: File): Promise<ProfileMedia> {
  const body = new FormData();
  body.append("file", file);
  const media = await requestJson("/profile/media/upload", profileMediaSchema, {
    auth: "user",
    method: "POST",
    body,
  });
  if (media.isProfilePicture) syncSessionAvatar(media.url);
  return media;
}

export function getProfileVerification(): Promise<ProfileVerificationStatus> {
  return requestJson("/profile/verification", profileVerificationStatusSchema, {
    auth: "user",
  });
}
export function submitProfileVerification(
  selfie: Blob,
  challenge: "blink" | "smile" | "turn_left" | "turn_right",
): Promise<ProfileVerificationStatus> {
  const body = new FormData();
  body.append("selfie", selfie, "verification.jpg");
  body.append("challenge", challenge);
  return requestJson("/profile/verification", profileVerificationStatusSchema, {
    auth: "user",
    method: "POST",
    body,
  });
}
export function listProfileVerifications(
  status?: "pending" | "approved" | "rejected",
): Promise<ProfileVerificationRequest[]> {
  return requestJson(
    `/admin/profile-verifications${status ? `?status=${status}` : ""}`,
    profileVerificationRequestsSchema,
    { auth: true },
  );
}
export function reviewProfileVerification(
  id: string,
  status: "approved" | "rejected",
  reason?: string,
): Promise<ProfileVerificationRequest> {
  return requestJson(
    `/admin/profile-verifications/${id}`,
    profileVerificationRequestSchema,
    { auth: true, method: "PATCH", body: JSON.stringify({ status, reason }) },
  );
}
export async function getProfileVerificationEvidence(
  id: string,
): Promise<string> {
  const response = await fetch(
    `${API_URL}/admin/profile-verifications/${id}/evidence`,
    { headers: { Authorization: `Bearer ${getAdminToken() ?? ""}` } },
  );
  if (!response.ok) throw new Error("Doğrulama karesi alınamadı.");
  return URL.createObjectURL(await response.blob());
}

export async function makeProfilePicture(mediaId: string): Promise<ProfileMedia[]> {
  const media = await requestJson(
    `/profile/media/${mediaId}/profile-picture`,
    profileMediaListSchema,
    { auth: "user", method: "PATCH" },
  );
  syncSessionAvatar(media.find((item) => item.isProfilePicture)?.url ?? null);
  return media;
}

export function reorderProfileMedia(
  mediaIds: string[],
): Promise<ProfileMedia[]> {
  return requestJson("/profile/media/order", profileMediaListSchema, {
    auth: "user",
    method: "PUT",
    body: JSON.stringify({ mediaIds }),
  });
}

export async function deleteProfileMedia(mediaId: string): Promise<ProfileMedia[]> {
  const media = await requestJson(`/profile/media/${mediaId}`, profileMediaListSchema, {
    auth: "user",
    method: "DELETE",
  });
  syncSessionAvatar(media.find((item) => item.isProfilePicture)?.url ?? null);
  return media;
}

function syncSessionAvatar(avatarUrl: string | null) {
  const user = getUserSession();
  if (user) updateUserSession({ ...user, avatarUrl });
}

export function listContentMedia(
  targetType: "event" | "place",
  targetId: string,
): Promise<ProfileMedia[]> {
  return requestJson(
    `/media?targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`,
    profileMediaListSchema,
  );
}

export function uploadContentMedia(
  targetType: "event" | "place" | "tag_comment" | "event_comment" | "place_comment" | "comment_reply",
  targetId: string,
  file: File,
): Promise<ProfileMedia> {
  const form = new FormData();
  form.append("file", file);
  return requestJson(
    `/media/${targetType}/${targetId}/upload`,
    profileMediaSchema,
    { auth: "user", method: "POST", body: form },
  );
}

export function reorderContentMedia(targetType: "event" | "place", targetId: string, mediaIds: string[]): Promise<ProfileMedia[]> {
  return requestJson(`/media/${targetType}/${targetId}/order`, profileMediaListSchema, {
    auth: "user",
    method: "PUT",
    body: JSON.stringify({ mediaIds }),
  });
}

export function deleteContentMedia(targetType: "event" | "place", targetId: string, mediaId: string): Promise<ProfileMedia[]> {
  return requestJson(`/media/${targetType}/${targetId}/${mediaId}`, profileMediaListSchema, {
    auth: "user",
    method: "DELETE",
  });
}

export function resolveMediaUrl(url: string) {
  return url.startsWith("/") ? `${API_URL}${url}` : url;
}

export function getPrivacySettings(): Promise<PrivacySettings> {
  return requestJson("/profile/privacy", privacySettingsSchema, {
    auth: "user",
  });
}

export function updatePrivacySettings(
  input: Omit<PrivacySettings, "userId" | "createdAt" | "updatedAt">,
): Promise<PrivacySettings> {
  return requestJson("/profile/privacy", privacySettingsSchema, {
    auth: "user",
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function getNotificationPreferences(): Promise<
  NotificationPreference[]
> {
  return requestJson(
    "/profile/notification-preferences",
    notificationPreferencesSchema,
    { auth: "user" },
  );
}

export function updateNotificationPreferences(
  preferences: NotificationPreference[],
): Promise<NotificationPreference[]> {
  return requestJson(
    "/profile/notification-preferences",
    notificationPreferencesSchema,
    {
      auth: "user",
      method: "PUT",
      body: JSON.stringify({ preferences }),
    },
  );
}

export async function getPushPublicKey(): Promise<string | null> {
  const result = await requestJson(
    "/notifications/push/public-key",
    z.object({ publicKey: z.string().nullable() }),
  );
  return result.publicKey;
}

export function registerPushSubscription(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<{ id: string }> {
  return requestJson(
    "/notifications/push/subscriptions",
    z.object({ id: z.string() }),
    { auth: "user", method: "POST", body: JSON.stringify(input) },
  );
}

export function removePushSubscription(
  endpoint: string,
): Promise<{ ok: true }> {
  return requestJson(
    "/notifications/push/subscriptions",
    z.object({ ok: z.literal(true) }),
    { auth: "user", method: "DELETE", body: JSON.stringify({ endpoint }) },
  );
}

const notificationDeliverySchema = z.object({
  id: z.string(),
  channel: z.string(),
  status: z.string(),
  provider: z.string().nullable(),
  attempts: z.number(),
  lastError: z.string().nullable(),
  sentAt: z.string().datetime().or(z.date()).nullable(),
  createdAt: z.string().datetime().or(z.date()),
  notification: z.object({
    type: z.string(),
    title: z.string(),
    body: z.string(),
    targetType: z.string().nullable(),
    targetId: z.string().nullable(),
  }),
  user: z.object({ id: z.string(), name: z.string(), email: z.string() }),
});
export type NotificationDelivery = z.infer<typeof notificationDeliverySchema>;
export function listAdminNotificationDeliveries(
  status?: string,
): Promise<NotificationDelivery[]> {
  return requestJson(
    `/admin/notifications/deliveries${status ? `?status=${status}` : ""}`,
    z.array(notificationDeliverySchema),
    { auth: true },
  );
}
export function retryAdminNotificationDelivery(
  id: string,
): Promise<NotificationDelivery> {
  return requestJson(
    `/admin/notifications/deliveries/${id}/retry`,
    notificationDeliverySchema,
    { auth: true, method: "POST" },
  );
}

export function listBlocks(): Promise<UserBlock[]> {
  return requestJson("/profile/blocks", userBlocksSchema, { auth: "user" });
}

export function createBlock(
  targetType: BlockedTargetType,
  targetId: string,
): Promise<{ ok: boolean }> {
  return requestJson("/profile/blocks", z.object({ ok: z.boolean() }), {
    auth: "user",
    method: "POST",
    body: JSON.stringify({ targetType, targetId }),
  });
}

export function removeBlock(
  targetType: BlockedTargetType,
  targetId: string,
): Promise<{ ok: boolean }> {
  return requestJson(
    `/profile/blocks/${targetType}/${targetId}`,
    z.object({ ok: z.boolean() }),
    {
      auth: "user",
      method: "DELETE",
    },
  );
}

export function listMemberSuggestions(): Promise<MemberCard[]> {
  return requestJson("/social/suggestions", memberCardsSchema, {
    auth: "user",
  });
}

export function listFollowing(): Promise<MemberCard[]> {
  return requestJson("/social/following", memberCardsSchema, { auth: "user" });
}

export function listNewMembers(): Promise<MemberCard[]> {
  return requestJson("/social/new-members", memberCardsSchema, { auth: "user" });
}

export function followUser(
  targetUserId: string,
): Promise<{ ok: boolean; following: boolean }> {
  return requestJson(
    `/social/following/${targetUserId}`,
    z.object({ ok: z.boolean(), following: z.boolean() }),
    { auth: "user", method: "POST" },
  );
}

export function unfollowUser(
  targetUserId: string,
): Promise<{ ok: boolean; following: boolean }> {
  return requestJson(
    `/social/following/${targetUserId}`,
    z.object({ ok: z.boolean(), following: z.boolean() }),
    { auth: "user", method: "DELETE" },
  );
}

export function listConversations(): Promise<ConversationList> {
  return requestJson("/me/conversations", conversationListSchema, {
    auth: "user",
  });
}

export function listConversationMessages(
  peerId: string,
  page = 1,
): Promise<ConversationMessages> {
  return requestJson(
    `/me/conversations/${peerId}/messages?page=${page}&pageSize=50`,
    conversationMessagesSchema,
    { auth: "user" },
  );
}

export function sendPrivateMessage(
  recipientId: string,
  body: string,
  options?: { replyToId?: string; attachment?: File },
): Promise<PrivateChatMessage> {
  const form = new FormData();
  form.set("recipientId", recipientId);
  form.set("body", body);
  if (options?.replyToId) form.set("replyToId", options.replyToId);
  if (options?.attachment) form.set("attachment", options.attachment);
  return requestJson("/me/private-messages", privateChatMessageSchema, {
    auth: "user",
    method: "POST",
    body: form,
  });
}

export function searchPrivateMessages(
  query: string,
): Promise<MessageSearchResult[]> {
  return requestJson(
    `/me/messages/search?q=${encodeURIComponent(query)}`,
    z.array(messageSearchResultSchema),
    { auth: "user" },
  );
}
export function editPrivateMessage(
  id: string,
  body: string,
): Promise<PrivateChatMessage> {
  return requestJson(`/me/private-messages/${id}`, privateChatMessageSchema, {
    auth: "user",
    method: "PATCH",
    body: JSON.stringify({ body }),
  });
}
export function deletePrivateMessage(id: string): Promise<PrivateChatMessage> {
  return requestJson(`/me/private-messages/${id}`, privateChatMessageSchema, {
    auth: "user",
    method: "DELETE",
  });
}
export function toggleMessageReaction(
  id: string,
  emoji: string,
): Promise<{ active: boolean; emoji: string }> {
  return requestJson(
    `/me/private-messages/${id}/reactions`,
    z.object({ active: z.boolean(), emoji: z.string() }),
    { auth: "user", method: "POST", body: JSON.stringify({ emoji }) },
  );
}
export function sendTyping(peerId: string): Promise<{ ok: boolean }> {
  return requestJson(
    `/me/conversations/${peerId}/typing`,
    z.object({ ok: z.boolean() }),
    { auth: "user", method: "POST" },
  );
}
export function getTyping(peerId: string): Promise<{ typing: boolean }> {
  return requestJson(
    `/me/conversations/${peerId}/typing`,
    z.object({ typing: z.boolean() }),
    { auth: "user" },
  );
}
export function updateConversationPreference(
  peerId: string,
  input: { pinned?: boolean; muted?: boolean; archived?: boolean },
): Promise<unknown> {
  return requestJson(`/me/conversations/${peerId}/preferences`, z.unknown(), {
    auth: "user",
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
export function deleteConversation(peerId: string): Promise<{ ok: boolean }> {
  return requestJson(
    `/me/conversations/${peerId}`,
    z.object({ ok: z.boolean() }),
    { auth: "user", method: "DELETE" },
  );
}

export function markConversationRead(
  peerId: string,
): Promise<{ updated: number }> {
  return requestJson(
    `/me/conversations/${peerId}/read`,
    z.object({ updated: z.number().int().nonnegative() }),
    {
      auth: "user",
      method: "PATCH",
    },
  );
}

export function getFinanceDashboard(): Promise<FinanceDashboard> {
  return requestJson("/me/finance", financeDashboardSchema, { auth: "user" });
}
export function changeBusinessPlan(
  plan: "starter" | "growth" | "scale",
  paymentMethodToken?: string,
): Promise<{ plan: string; planStartedAt: string | Date | null }> {
  return requestJson(
    "/me/finance/plan",
    z.object({
      plan: z.string(),
      planStartedAt: z.string().datetime().or(z.date()).nullable(),
    }),
    {
      auth: "user",
      method: "POST",
      body: JSON.stringify({ plan, paymentMethodToken }),
    },
  );
}
export function changeMemberPlan(
  plan: "free" | "plus" | "premium",
  paymentMethodToken?: string,
): Promise<{ plan: string; planStartedAt: string | Date | null }> {
  return requestJson(
    "/me/finance/member-plan",
    z.object({
      plan: z.string(),
      planStartedAt: z.string().datetime().or(z.date()).nullable(),
    }),
    {
      auth: "user",
      method: "POST",
      body: JSON.stringify({ plan, paymentMethodToken }),
    },
  );
}
export function getContentNotification(
  targetType: "tag" | "event" | "place" | "user",
  targetId: string,
): Promise<{ enabled: boolean }> {
  return requestJson(
    `/notifications/content/${targetType}/${targetId}`,
    z.object({ enabled: z.boolean() }),
    { auth: "user" },
  );
}
export function setContentNotification(
  targetType: "tag" | "event" | "place" | "user",
  targetId: string,
  enabled: boolean,
): Promise<{ enabled: boolean }> {
  return requestJson(
    `/notifications/content/${targetType}/${targetId}`,
    z.object({ enabled: z.boolean() }),
    { auth: "user", method: "POST", body: JSON.stringify({ enabled }) },
  );
}
export function submitCuratorApplication(input: {
  name: string;
  email: string;
  city: string;
  country?: string;
  motivation: string;
  cvUrl?: string;
}): Promise<{ id: string }> {
  return requestJson(
    "/curators/applications",
    z.object({ id: z.string() }).passthrough(),
    { method: "POST", body: JSON.stringify(input) },
  );
}
export type CuratorDashboard = {
  city: string;
  events: Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
    startsAt: string | Date;
    createdBy?: { id: string; name: string; username: string | null } | null;
  }>;
  places: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    createdBy?: { id: string; name: string; username: string | null } | null;
  }>;
  organizers: Array<{
    id: string;
    name: string;
    username: string | null;
    companyName: string | null;
    businessCategory: string | null;
  }>;
  revenue: {
    transactionCount: number;
    platformRevenue: number;
    organizerRevenue: number;
  };
};
export function getCuratorDashboard(): Promise<CuratorDashboard> {
  return requestJson(
    "/curators/dashboard",
    z.object({
      city: z.string(),
      events: z.array(z.any()),
      places: z.array(z.any()),
      organizers: z.array(z.any()),
      revenue: z.object({
        transactionCount: z.number(),
        platformRevenue: z.number(),
        organizerRevenue: z.number(),
      }),
    }) as z.ZodType<CuratorDashboard>,
    { auth: "user" },
  );
}
export function updateFinanceSettings(input: {
  preferredCurrency: string;
  legalName?: string;
  taxNumber?: string;
  taxOffice?: string;
  billingEmail?: string;
  country?: string;
  city?: string;
  postalCode?: string;
  addressLine?: string;
  bankProvider?: string;
  bankAccountLabel?: string;
  bankAccountLast4?: string;
}): Promise<unknown> {
  return requestJson("/me/finance/settings", z.unknown(), {
    auth: "user",
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
export function startFinanceKyc(): Promise<unknown> {
  return requestJson("/me/finance/kyc", z.unknown(), {
    auth: "user",
    method: "POST",
  });
}
export function createEventPayment(
  eventId: string,
  idempotencyKey: string,
): Promise<PaymentTransaction> {
  return requestJson(`/events/${eventId}/payments`, paymentTransactionSchema, {
    auth: "user",
    method: "POST",
    body: JSON.stringify({ idempotencyKey }),
  });
}
export function confirmEventPayment(
  id: string,
  paymentMethodToken: string,
): Promise<PaymentTransaction> {
  return requestJson(`/me/payments/${id}/confirm`, paymentTransactionSchema, {
    auth: "user",
    method: "POST",
    body: JSON.stringify({ paymentMethodToken }),
  });
}
export function refundEventPayment(
  id: string,
  amount?: number,
  reason?: string,
): Promise<PaymentTransaction> {
  return requestJson(`/me/payments/${id}/refund`, paymentTransactionSchema, {
    auth: "user",
    method: "POST",
    body: JSON.stringify({ amount, reason }),
  });
}
export function requestPayout(amount: number): Promise<unknown> {
  return requestJson("/me/finance/payouts", z.unknown(), {
    auth: "user",
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}
export function getCorporateKyc(): Promise<CorporateKycApplication> {
  return requestJson("/me/corporate-kyc", corporateKycApplicationSchema, {
    auth: "user",
  });
}
export function saveCorporateKyc(
  input: Record<string, unknown>,
): Promise<CorporateKycApplication> {
  return requestJson("/me/corporate-kyc", corporateKycApplicationSchema, {
    auth: "user",
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
export function uploadCorporateKycDocument(
  type: string,
  file: File,
): Promise<CorporateKycDocument> {
  const form = new FormData();
  form.set("file", file);
  return requestJson(
    `/me/corporate-kyc/documents/${type}`,
    corporateKycDocumentSchema,
    { auth: "user", method: "POST", body: form },
  );
}
export function deleteCorporateKycDocument(
  id: string,
): Promise<{ success: boolean }> {
  return requestJson(
    `/me/corporate-kyc/documents/${id}`,
    z.object({ success: z.boolean() }),
    { auth: "user", method: "DELETE" },
  );
}
export function submitCorporateKyc(): Promise<CorporateKycApplication> {
  return requestJson(
    "/me/corporate-kyc/submit",
    corporateKycApplicationSchema,
    { auth: "user", method: "POST" },
  );
}
export function listAdminCorporateKyc(
  status?: string,
): Promise<CorporateKycApplication[]> {
  return requestJson(
    `/admin/corporate-kyc${status ? `?status=${status}` : ""}`,
    z.array(corporateKycApplicationSchema),
    { auth: true },
  );
}
export function getAdminCorporateKyc(
  id: string,
): Promise<CorporateKycApplication> {
  return requestJson(
    `/admin/corporate-kyc/${id}`,
    corporateKycApplicationSchema,
    { auth: true },
  );
}
export function decideAdminCorporateKyc(
  id: string,
  status: "approved" | "rejected",
  reason?: string,
): Promise<CorporateKycApplication> {
  return requestJson(
    `/admin/corporate-kyc/${id}/decision`,
    corporateKycApplicationSchema,
    { auth: true, method: "PATCH", body: JSON.stringify({ status, reason }) },
  );
}
export async function downloadCorporateKycDocument(id: string): Promise<Blob> {
  const response = await fetch(
    `${API_URL}/me/corporate-kyc/documents/${id}/download`,
    { headers: { Authorization: `Bearer ${getUserToken() ?? ""}` } },
  );
  if (!response.ok) throw new Error("Belge indirilemedi.");
  return response.blob();
}
export async function downloadAdminCorporateKycDocument(
  id: string,
): Promise<Blob> {
  const response = await fetch(
    `${API_URL}/admin/corporate-kyc/documents/${id}/download`,
    { headers: { Authorization: `Bearer ${getAdminToken() ?? ""}` } },
  );
  if (!response.ok) throw new Error("Belge indirilemedi.");
  return response.blob();
}

export function getOnboardingStatus(): Promise<OnboardingStatus> {
  return requestJson("/me/onboarding", onboardingStatusSchema, {
    auth: "user",
  });
}
export async function getDiscoveryFeed(params?: {
  city?: string;
  country?: string;
  from?: string;
  to?: string;
  scope?: "local" | "global";
}): Promise<DiscoveryFeed> {
  const query = new URLSearchParams();
  if (params?.city) query.set("city", params.city);
  if (params?.country) query.set("country", params.country);
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  if (params?.scope) query.set("scope", params.scope);
  const result = await requestJson(
    `/discover/feed${query.size ? `?${query}` : ""}`,
    discoveryFeedSchema,
    { auth: "user" },
  );
  const isEmpty =
    result.popularMembers.length === 0 &&
    result.newMembers.length === 0 &&
    result.trendingTags.length === 0;
  return USE_DEMO_CONTENT && isEmpty ? getMockDiscoveryFeed(query) : result;
}
export function getPublicProfile(username: string): Promise<PublicProfile> {
  return requestJson(
    `/users/${encodeURIComponent(username)}`,
    publicProfileSchema,
    { auth: "user" },
  );
}
export function getPublicProfileById(id: string): Promise<PublicProfile> {
  return requestJson(
    `/users/id/${encodeURIComponent(id)}`,
    publicProfileSchema,
    { auth: "user" },
  );
}
export function searchDiscovery(query: string): Promise<DiscoverySearch> {
  return requestJson(
    `/discover/search?q=${encodeURIComponent(query)}`,
    discoverySearchSchema,
    { auth: "user" },
  );
}
export function completeOnboarding(): Promise<OnboardingStatus> {
  return requestJson("/me/onboarding/complete", onboardingStatusSchema, {
    auth: "user",
    method: "POST",
  });
}
export function getMemberPass(): Promise<MemberPass> {
  return requestJson("/me/member-pass", memberPassSchema, { auth: "user" });
}
export function rotateMemberPass(): Promise<MemberPass> {
  return requestJson("/me/member-pass/rotate", memberPassSchema, {
    auth: "user",
    method: "PATCH",
  });
}
export function listMemberScans(): Promise<MemberScan[]> {
  return requestJson("/me/member-scans", memberScansSchema, { auth: "user" });
}

export function listIncomingMemberScans(after: string): Promise<MemberScan[]> {
  return requestJson(`/me/member-scans/incoming?after=${encodeURIComponent(after)}`, memberScansSchema, { auth: "user" });
}
export function scanMember(
  payload: string,
  method: "qr" | "nfc",
): Promise<MemberScan> {
  return requestJson("/me/member-scans", memberScanSchema, {
    auth: "user",
    method: "POST",
    body: JSON.stringify({ payload, method }),
  });
}

export function updateProfileInterests(tagIds: string[]): Promise<Tag[]> {
  return requestJson("/profile/interests", z.array(tagSchema), {
    auth: "user",
    method: "PUT",
    body: JSON.stringify({ tagIds }),
  });
}

export function updateProfileAffinities(
  affinities: Array<{ tagId: string; sentiment: TagSentiment }>,
): Promise<TagAffinity[]> {
  return requestJson("/profile/affinities", tagAffinitiesSchema, {
    auth: "user",
    method: "PUT",
    body: JSON.stringify({ affinities }),
  });
}

export function listTagComments(tagId: string): Promise<TagComment[]> {
  return requestJson(`/tags/${tagId}/comments`, tagCommentsSchema);
}

export function listTagRelatedUsers(tagId: string): Promise<RelatedUser[]> {
  return requestJson(
    `/tags/${tagId}/related-users`,
    z.array(relatedUserSchema),
  );
}

export function createTagComment(
  tagId: string,
  body: string,
): Promise<TagComment> {
  return requestJson(`/tags/${tagId}/comments`, tagCommentSchema, {
    auth: "user",
    method: "POST",
    body: JSON.stringify({ body }),
  });
}
export function getTagStats(tagId: string): Promise<Record<string, number>> {
  return requestJson(
    `/tags/${tagId}/stats`,
    z.record(z.number().nonnegative()),
    { auth: "user" },
  );
}
export function likeTagComment(commentId: string): Promise<{ liked: boolean }> {
  return requestJson(
    `/tags/comments/${commentId}/like`,
    z.object({ liked: z.boolean() }),
    { auth: "user", method: "POST" },
  );
}
export function updateTagComment(
  commentId: string,
  body: string,
): Promise<TagComment> {
  return requestJson(`/tags/comments/${commentId}`, tagCommentSchema, {
    auth: "user",
    method: "PATCH",
    body: JSON.stringify({ body }),
  });
}
export function uploadTagCommentMedia(
  commentId: string,
  file: File,
): Promise<unknown> {
  const form = new FormData();
  form.set("file", file);
  return requestJson(`/tags/comments/${commentId}/media`, z.unknown(), {
    auth: "user",
    method: "POST",
    body: form,
  });
}
const recentContentViewRecords = new Map<string, number>();

export function recordContentView(
  targetType: string,
  targetId: string,
  source?: string,
  kind: "detail" | "impression" = "detail",
): Promise<unknown> {
  const cacheKey = `${kind}:${targetType}:${targetId}:${window.location.pathname}:${window.location.search}`;
  const lastRecordedAt = recentContentViewRecords.get(cacheKey) ?? 0;
  if (Date.now() - lastRecordedAt < 2_000) return Promise.resolve({ deduplicated: true });
  recentContentViewRecords.set(cacheKey, Date.now());
  const referrer = document.referrer || undefined;
  const recalledSource = kind === "detail" ? consumeRememberedContentSource(targetType, targetId) : undefined;
  const resolvedSource = source || new URLSearchParams(window.location.search).get("source") || recalledSource || inferContentSource(referrer);
  return requestJson("/views", z.unknown(), {
    auth: getUserToken() ? "user" : undefined,
    method: "POST",
    body: JSON.stringify({ targetType, targetId, source: resolvedSource, referrer, kind }),
  });
}

export function rememberContentSource(targetType: string, targetId: string, source?: string) {
  sessionStorage.setItem(`konnektora:content-source:${targetType}:${targetId}`, JSON.stringify({ source: source ?? inferPageImpressionSource(), at: Date.now() }));
}

export function recordContentImpression(targetType: string, targetId: string, source?: string): Promise<unknown> {
  return recordContentView(targetType, targetId, source ?? inferPageImpressionSource(), "impression");
}

export function recordContentShare(targetType: string, targetId: string, channel: string): Promise<unknown> {
  return requestJson("/shares", z.unknown(), {
    auth: getUserToken() ? "user" : undefined,
    method: "POST",
    body: JSON.stringify({ targetType, targetId, channel }),
  });
}

export function recordContentAction(targetType: string, targetId: string, action: string): Promise<unknown> {
  const cacheKey = `action:${targetType}:${targetId}:${action}:${window.location.pathname}`;
  const lastRecordedAt = recentContentViewRecords.get(cacheKey) ?? 0;
  if (Date.now() - lastRecordedAt < 2_000) return Promise.resolve({ deduplicated: true });
  recentContentViewRecords.set(cacheKey, Date.now());
  return requestJson("/actions", z.unknown(), {
    auth: getUserToken() ? "user" : undefined,
    method: "POST",
    body: JSON.stringify({ targetType, targetId, action }),
  });
}

export function rateContent(targetType: "event" | "place", targetId: string, score: number): Promise<unknown> {
  return requestJson("/reactions", z.unknown(), {
    auth: "user",
    method: "POST",
    body: JSON.stringify({ targetType, targetId, reaction: `rating_${score}` }),
  });
}

export function updatePreferredLanguage(language: "tr" | "en"): Promise<{ preferredLanguage: string }> {
  return requestJson("/profile/language", z.object({ preferredLanguage: z.string() }), {
    auth: "user",
    method: "PATCH",
    body: JSON.stringify({ language }),
  });
}

function inferContentSource(referrer?: string) {
  if (!referrer) return "direct";
  try {
    const source = new URL(referrer);
    if (source.origin !== window.location.origin) return source.hostname.includes("google") || source.hostname.includes("bing") ? "search_engine" : "external_referral";
    if (source.pathname === "/" || source.pathname === "/feed") return "home_feed";
    if (source.pathname.startsWith("/events")) return "event_page";
    if (source.pathname.startsWith("/places")) return "place_page";
    if (source.pathname.startsWith("/tags")) return "tag_page";
    if (source.pathname.startsWith("/users")) return "profile_page";
    if (source.pathname.startsWith("/search")) return "app_search";
    return "internal";
  } catch {
    return "direct";
  }
}

function inferPageImpressionSource() {
  const path = window.location.pathname;
  if (path === "/" || path === "/feed") return "home_feed";
  if (path === "/events") return "listing_page";
  if (path === "/places") return "listing_page";
  if (path.startsWith("/events/")) return "event_page";
  if (path.startsWith("/places/")) return "place_page";
  if (path.startsWith("/tags/")) return "tag_page";
  if (path.startsWith("/users/")) return "profile_page";
  if (path.startsWith("/search")) return "app_search";
  return "internal";
}

function consumeRememberedContentSource(targetType: string, targetId: string) {
  const key = `konnektora:content-source:${targetType}:${targetId}`;
  const raw = sessionStorage.getItem(key);
  sessionStorage.removeItem(key);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as { source?: string; at?: number };
    return parsed.source && parsed.at && Date.now() - parsed.at < 120_000 ? parsed.source : undefined;
  } catch {
    return undefined;
  }
}

export function deleteTagComment(
  tagId: string,
  commentId: string,
): Promise<{ ok: boolean }> {
  return requestJson(
    `/tags/${tagId}/comments/${commentId}`,
    z.object({ ok: z.boolean() }),
    { auth: "user", method: "DELETE" },
  );
}

export type ContentThreadComment = {
  id: string;
  targetType: string;
  targetId: string;
  parentId: string | null;
  authorId: string | null;
  body: string;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; name: string; username?: string | null; avatarUrl?: string | null } | null;
  media?: Array<{ id: string; url: string; type: string }>;
  replies?: ContentThreadComment[];
};

const contentThreadCommentSchema: z.ZodType<ContentThreadComment> = z.lazy(() =>
  z.object({
    id: z.string(),
    targetType: z.string(),
    targetId: z.string(),
    parentId: z.string().nullable(),
    authorId: z.string().nullable(),
    body: z.string(),
    likeCount: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
    author: z
      .object({
        id: z.string(),
        name: z.string(),
        username: z.string().nullable().optional(),
        avatarUrl: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    media: z.array(z.object({ id: z.string(), url: z.string(), type: z.string() })).optional(),
    replies: z.array(contentThreadCommentSchema).optional(),
  }),
);

export function listContentComments(
  targetType: "event" | "place" | "tag_comment",
  targetId: string,
): Promise<ContentThreadComment[]> {
  return requestJson(
    `/comments?targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`,
    z.array(contentThreadCommentSchema),
  );
}

export function createContentComment(
  targetType: "event" | "place" | "tag_comment",
  targetId: string,
  body: string,
  parentId?: string,
): Promise<ContentThreadComment> {
  return requestJson("/comments", contentThreadCommentSchema, {
    auth: "user",
    method: "POST",
    body: JSON.stringify({ targetType, targetId, body, parentId }),
  });
}

export function updateContentComment(id: string, body: string): Promise<ContentThreadComment> {
  return requestJson(`/comments/${id}`, contentThreadCommentSchema, { auth: "user", method: "PATCH", body: JSON.stringify({ body }) });
}

export function deleteContentComment(id: string): Promise<{ ok: boolean }> {
  return requestJson(`/comments/${id}`, z.object({ ok: z.boolean() }), { auth: "user", method: "DELETE" });
}

export function toggleContentCommentLike(id: string): Promise<{ liked: boolean }> {
  return requestJson(`/comments/${id}/like`, z.object({ liked: z.boolean() }), { auth: "user", method: "POST" });
}

export type InteractionStats = Record<string, number>;
export function getInteractionStats(
  targetType: "event" | "place",
  targetId: string,
): Promise<InteractionStats> {
  return requestJson(
    `/${targetType}-stats/${targetId}`,
    z.record(z.number().nonnegative()),
    { auth: "user" },
  );
}

export function adminLogin(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return requestJson("/admin/auth/login", loginResponseSchema, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function userLogin(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return requestJson("/auth/login", loginResponseSchema, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function socialLogin(
  provider: SocialProvider,
  credential: string,
): Promise<LoginResponse> {
  return requestJson("/auth/social", loginResponseSchema, {
    method: "POST",
    body: JSON.stringify({ provider, credential }),
  });
}
export function listSocialAccounts(): Promise<SocialAccount[]> {
  return requestJson("/auth/social/accounts", socialAccountsSchema, {
    auth: "user",
  });
}
export function connectSocialAccount(
  provider: SocialProvider,
  credential: string,
): Promise<SocialAccount[]> {
  return requestJson("/auth/social/accounts", socialAccountsSchema, {
    auth: "user",
    method: "POST",
    body: JSON.stringify({ provider, credential }),
  });
}
export function removeSocialAccount(
  provider: SocialProvider,
): Promise<SocialAccount[]> {
  return requestJson("/auth/social/accounts/remove", socialAccountsSchema, {
    auth: "user",
    method: "POST",
    body: JSON.stringify({ provider }),
  });
}
export function importContacts(
  source: "phone" | "google",
  contacts: Contact[],
): Promise<ContactImportResult> {
  return requestJson("/contacts/import", contactImportResultSchema, {
    auth: "user",
    method: "POST",
    body: JSON.stringify({ source, contacts }),
  });
}
export function searchContacts(
  query: string,
  type: "username" | "name" | "email" | "phone" = "name",
): Promise<MemberCard[]> {
  const params = new URLSearchParams({ query, type });
  return requestJson(`/contacts/search?${params}`, memberCardsSchema, {
    auth: "user",
  });
}
export function inviteContacts(
  contacts: Contact[],
): Promise<{ ok: boolean; invitedCount: number }> {
  return requestJson(
    "/contacts/invite",
    z.object({ ok: z.boolean(), invitedCount: z.number().int() }),
    { auth: "user", method: "POST", body: JSON.stringify({ contacts }) },
  );
}

export function registerUser(input: RegistrationInput): Promise<LoginResponse> {
  return requestJson("/auth/register", loginResponseSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function requestEmailVerification(
  email: string,
): Promise<{ ok: boolean; sent?: boolean; token?: string }> {
  return requestJson(
    "/auth/email/verify/request",
    z.object({ ok: z.boolean(), sent: z.boolean().optional(), token: z.string().optional() }),
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
  );
}

export function confirmEmail(token: string): Promise<LoginResponse> {
  return requestJson("/auth/email/verify", loginResponseSchema, {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export function requestPasswordReset(
  input: { channel: "email"; email: string } | { channel: "phone"; phone: string },
): Promise<{ ok: boolean; token?: string }> {
  return requestJson(
    "/auth/password/forgot",
    z.object({ ok: z.boolean(), token: z.string().optional() }),
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function resetPassword(
  token: string,
  password: string,
): Promise<LoginResponse> {
  return requestJson("/auth/password/reset", loginResponseSchema, {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: boolean }> {
  return requestJson("/auth/password/change", z.object({ ok: z.boolean() }), {
    auth: "user",
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function changeEmail(input: {
  email: string;
  currentPassword: string;
}): Promise<{ ok: boolean; sent: boolean; email: string }> {
  return requestJson("/me/email", z.object({ ok: z.boolean(), sent: z.boolean(), email: z.string().email() }), {
    auth: "user",
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deactivateAccount(input: {
  currentPassword: string;
  reason: string;
}): Promise<{ ok: boolean }> {
  return requestJson("/auth/deactivate", z.object({ ok: z.boolean() }), {
    auth: "user",
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function reactivateAccount(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return requestJson("/auth/reactivate", loginResponseSchema, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function requestPhoneVerification(phone: string) {
  return requestJson(
    "/auth/phone/verification/request",
    phoneVerificationResponseSchema,
    {
      auth: "user",
      method: "POST",
      body: JSON.stringify({ phone }),
    },
  );
}

export function checkAvailability(input: {
  email?: string;
  phone?: string;
  username?: string;
}): Promise<Availability> {
  const query = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  return requestJson(`/auth/availability?${query}`, availabilitySchema);
}

export function confirmPhoneVerification(phone: string, code: string) {
  return requestJson(
    "/auth/phone/verification/confirm",
    z.object({
      ok: z.literal(true),
      phone: phoneSchema,
      phoneVerified: z.literal(true),
    }),
    { auth: "user", method: "POST", body: JSON.stringify({ phone, code }) },
  );
}

export function acceptInvite(input: {
  token: string;
  name?: string;
  email?: string;
  password: string;
}): Promise<LoginResponse> {
  return requestJson("/auth/invite/accept", loginResponseSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getAdminDashboard(): Promise<AdminDashboard> {
  return requestJson("/admin/dashboard", adminDashboardSchema, { auth: true });
}

export function listAdminActivityLogs(params?: URLSearchParams) {
  const query = params?.toString();
  return requestJson(`/admin/activity-logs${query ? `?${query}` : ""}`, adminActivityLogListSchema, { auth: true });
}

export function listAdminUsers(
  params?: URLSearchParams,
): Promise<AdminManagedUserList> {
  const query = params?.toString();
  return requestJson(
    `/admin/users${query ? `?${query}` : ""}`,
    adminManagedUserListSchema,
    { auth: true },
  );
}

export function getAdminUser(id: string): Promise<AdminManagedUserDetail> {
  return requestJson(`/admin/users/${id}`, adminManagedUserDetailSchema, {
    auth: true,
  });
}

export function updateAdminUser(
  id: string,
  input: Partial<AdminManagedUser>,
): Promise<AdminManagedUser> {
  return requestJson(`/admin/users/${id}`, adminManagedUserSchema, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify(input),
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

export function runAdminUserAction(
  id: string,
  input: AdminUserActionInput,
): Promise<AdminManagedUserDetail> {
  return requestJson(
    `/admin/users/${id}/actions`,
    adminManagedUserDetailSchema,
    {
      auth: true,
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function listAdminRoleGroups(): Promise<AdminRoleGroup[]> {
  return requestJson("/admin/role-groups", z.array(adminRoleGroupSchema), {
    auth: true,
  });
}

export function createAdminRoleGroup(
  input: RoleGroupInput,
): Promise<AdminRoleGroup> {
  return requestJson("/admin/role-groups", adminRoleGroupSchema, {
    auth: true,
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminRoleGroup(
  id: string,
  input: Partial<RoleGroupInput> & { status?: string },
): Promise<AdminRoleGroup> {
  return requestJson(`/admin/role-groups/${id}`, adminRoleGroupSchema, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function createUserMessage(
  input: UserMessageInput,
): Promise<UserMessage> {
  return requestJson("/messages", userMessageSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listPublicFaqs(): Promise<Faq[]> {
  return requestJson("/faqs", z.array(faqSchema));
}

export function createMyMessage(input: UserMessageInput): Promise<UserMessage> {
  return requestJson("/me/messages", userMessageSchema, {
    auth: "user",
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listAdminMessages(
  type: UserMessageType,
  params?: URLSearchParams,
): Promise<UserMessageList> {
  const pathByType: Record<UserMessageType, string> = {
    faq: "/admin/messages/faq",
    account_freeze: "/admin/messages/account-freeze",
    write_to_us: "/admin/messages/write-to-us",
  };
  const query = params?.toString();

  return requestJson(
    `${pathByType[type]}${query ? `?${query}` : ""}`,
    userMessageListSchema,
    { auth: true },
  );
}

export function getAdminMessage(id: string): Promise<UserMessage> {
  return requestJson(`/admin/messages/${id}`, userMessageSchema, {
    auth: true,
  });
}

export function updateAdminMessage(
  id: string,
  status: UserMessageStatus,
): Promise<UserMessage> {
  return requestJson(`/admin/messages/${id}`, userMessageSchema, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function listAdminPlaces(
  params?: URLSearchParams,
): Promise<AdminPlace[]> {
  const query = params?.toString();
  return requestJson(
    `/admin/content/places${query ? `?${query}` : ""}`,
    z.array(adminPlaceSchema),
    { auth: true },
  );
}

export function getAdminPlace(id: string): Promise<AdminPlace> {
  return requestJson(`/admin/content/places/${id}`, adminPlaceSchema, {
    auth: true,
  });
}

export function updateAdminPlace(
  id: string,
  status: string,
): Promise<AdminPlace> {
  return requestJson(`/admin/content/places/${id}`, adminPlaceSchema, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function listAdminMedia(
  params?: URLSearchParams,
): Promise<AdminMedia[]> {
  const query = params?.toString();
  return requestJson(
    `/admin/content/media${query ? `?${query}` : ""}`,
    z.array(adminMediaSchema),
    { auth: true },
  );
}

export function getAdminMedia(id: string): Promise<AdminMedia> {
  return requestJson(`/admin/content/media/${id}`, adminMediaSchema, {
    auth: true,
  });
}

export function updateAdminMedia(
  id: string,
  status: string,
): Promise<AdminMedia> {
  return requestJson(`/admin/content/media/${id}`, adminMediaSchema, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function listAdminComments(
  params?: URLSearchParams,
): Promise<AdminComment[]> {
  const query = params?.toString();
  return requestJson(
    `/admin/content/comments${query ? `?${query}` : ""}`,
    z.array(adminCommentSchema),
    { auth: true },
  );
}

export function listAdminPosts(params?: URLSearchParams): Promise<AdminPost[]> {
  const query = params?.toString();
  return requestJson(`/admin/content/posts${query ? `?${query}` : ""}`, z.array(adminPostSchema), { auth: true });
}

export function getAdminPost(id: string): Promise<AdminPost> {
  return requestJson(`/admin/content/posts/${id}`, adminPostSchema, { auth: true });
}

export function updateAdminPost(id: string, status: string): Promise<AdminPost> {
  return requestJson(`/admin/content/posts/${id}`, adminPostSchema, { auth: true, method: "PATCH", body: JSON.stringify({ status }) });
}

export function getAdminComment(id: string): Promise<AdminComment> {
  return requestJson(`/admin/content/comments/${id}`, adminCommentSchema, {
    auth: true,
  });
}

export function updateAdminComment(
  id: string,
  status: string,
): Promise<AdminComment> {
  return requestJson(`/admin/content/comments/${id}`, adminCommentSchema, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function listAdminPrivateMessages(
  params?: URLSearchParams,
): Promise<AdminPrivateMessage[]> {
  const query = params?.toString();
  return requestJson(
    `/admin/content/private-messages${query ? `?${query}` : ""}`,
    z.array(adminPrivateMessageSchema),
    { auth: true },
  );
}

export function getAdminPrivateMessage(
  id: string,
): Promise<AdminPrivateMessage> {
  return requestJson(
    `/admin/content/private-messages/${id}`,
    adminPrivateMessageSchema,
    { auth: true },
  );
}

export function updateAdminPrivateMessage(
  id: string,
  status: string,
): Promise<AdminPrivateMessage> {
  return requestJson(
    `/admin/content/private-messages/${id}`,
    adminPrivateMessageSchema,
    { auth: true, method: "PATCH", body: JSON.stringify({ status }) },
  );
}

export function listAdminCmsCategories(): Promise<CmsCategory[]> {
  return requestJson("/admin/cms/categories", z.array(cmsCategorySchema), {
    auth: true,
  });
}

export function listPublicSupportCategories(
  type: "faq" | "write_to_us",
): Promise<CmsCategory[]> {
  return requestJson(
    `/support/categories?type=${encodeURIComponent(type)}`,
    z.array(cmsCategorySchema),
  );
}

export function createAdminCmsCategory(
  input: CmsCategoryInput,
): Promise<CmsCategory> {
  return requestJson("/admin/cms/categories", cmsCategorySchema, {
    auth: true,
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminCmsCategory(
  id: string,
  input: Partial<CmsCategory>,
): Promise<CmsCategory> {
  return requestJson(`/admin/cms/categories/${id}`, cmsCategorySchema, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteAdminCmsCategory(id: string): Promise<{ ok: true }> {
  return requestJson(
    `/admin/cms/categories/${id}`,
    z.object({ ok: z.literal(true) }),
    {
      auth: true,
      method: "DELETE",
    },
  );
}

export function listAdminFaqs(): Promise<Faq[]> {
  return requestJson("/admin/cms/faqs", z.array(faqSchema), { auth: true });
}

export function createAdminFaq(input: FaqInput): Promise<Faq> {
  return requestJson("/admin/cms/faqs", faqSchema, {
    auth: true,
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminFaq(
  id: string,
  input: Partial<FaqInput> & { status?: string },
): Promise<Faq> {
  return requestJson(`/admin/cms/faqs/${id}`, faqSchema, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteAdminFaq(id: string): Promise<{ ok: true }> {
  return requestJson(
    `/admin/cms/faqs/${id}`,
    z.object({ ok: z.literal(true) }),
    {
      auth: true,
      method: "DELETE",
    },
  );
}

export async function listAnnouncements(): Promise<Announcement[]> {
  const result = await requestJson("/announcements", announcementListSchema, { auth: "user" });
  return USE_DEMO_CONTENT && result.length === 0
    ? listMockPublicAnnouncements()
    : result;
}

export function listAdminAnnouncements(): Promise<Announcement[]> {
  return requestJson("/admin/cms/announcements", z.array(announcementSchema), {
    auth: true,
  });
}

export function listActiveAdminAnnouncements(): Promise<Announcement[]> {
  return requestJson(
    "/admin/announcements/active",
    z.array(announcementSchema),
    { auth: true },
  );
}

export function createAdminAnnouncement(
  input: AnnouncementInput,
): Promise<Announcement> {
  return requestJson("/admin/cms/announcements", announcementSchema, {
    auth: true,
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminAnnouncement(
  id: string,
  input: Partial<AnnouncementInput> & { status?: string },
): Promise<Announcement> {
  return requestJson(`/admin/cms/announcements/${id}`, announcementSchema, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function getFallbackPolicy(type: PolicyType): CmsPolicy {
  return defaultPolicies().find((policy) => policy.type === type)!;
}

export async function getPolicy(type: PolicyType): Promise<CmsPolicy> {
  try {
    return await requestJson(`/policies/${type}`, cmsPolicySchema);
  } catch (error) {
    if (USE_DEMO_CONTENT) {
      return getFallbackPolicy(type);
    }
    throw error;
  }
}

export function listAdminPolicies(): Promise<CmsPolicy[]> {
  return requestJson("/admin/cms/policies", z.array(cmsPolicySchema), {
    auth: true,
  });
}

export function upsertAdminPolicy(input: PolicyInput): Promise<CmsPolicy> {
  return requestJson("/admin/cms/policies", cmsPolicySchema, {
    auth: true,
    method: "POST",
    body: JSON.stringify(input),
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

export function createAdminTag(input: {
  name: string;
  description?: string;
}): Promise<Tag> {
  return requestJson("/admin/tags", tagSchema, {
    auth: true,
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminTag(
  id: string,
  input: { name?: string; description?: string },
): Promise<Tag> {
  return requestJson(`/admin/tags/${id}`, tagSchema, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function archiveAdminTag(id: string): Promise<Tag> {
  return requestJson(`/admin/tags/${id}`, tagSchema, {
    auth: true,
    method: "DELETE",
  });
}

export function banAdminTag(id: string): Promise<Tag> {
  return requestJson(`/admin/tags/${id}/ban`, tagSchema, {
    auth: true,
    method: "POST",
  });
}

export function mergeAdminTag(id: string, targetTagId: string): Promise<Tag> {
  return requestJson(`/admin/tags/${id}/merge`, tagSchema, {
    auth: true,
    method: "POST",
    body: JSON.stringify({ targetTagId }),
  });
}

export function archiveAdminEvent(id: string): Promise<Event> {
  return requestJson(`/admin/events/${id}`, eventSchema, {
    auth: true,
    method: "DELETE",
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
  placeId?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  language?: string;
  organizerName?: string;
  locationName?: string;
  locationAddress?: string;
  externalRegistrationUrl?: string;
  liveUrl?: string;
  timeline?: string;
  lineup?: Array<{
    type?: "heading" | "subheading" | "session" | "break";
    title: string;
    startsAt?: string;
    description?: string;
  }>;
  ticketTypes?: Array<{
    name: string;
    description?: string;
    price: number;
    currency: string;
    capacity?: number;
    perUserLimit?: number;
    saleStartsAt?: string;
    saleEndsAt?: string;
    gateOpensAt?: string;
    gateClosesAt?: string;
    status?: string;
  }>;
  price?: number;
    currency?: string;
    salesPlatform?: "door" | "konnektora" | "external";
    externalSalesUrl?: string;
  capacity?: number;
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
  userAction?: "none" | "warn_user" | "suspend_user" | "ban_user";
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
  titleEn: string;
  bodyEn: string;
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

export function updateAdminEvent(
  id: string,
  input: Partial<AdminEventInput>,
): Promise<Event> {
  return requestJson(`/admin/events/${id}`, eventSchema, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function createAdminEvent(input: AdminEventInput): Promise<Event> {
  return requestJson("/admin/events", eventSchema, {
    auth: true,
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createUserEvent(input: AdminEventInput): Promise<Event> {
  return requestJson("/events", eventSchema, {
    auth: "user",
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listMyEvents(): Promise<Event[]> {
  return requestJson("/me/events", z.array(eventSchema), { auth: "user" });
}

export function listMyTickets(): Promise<
  Array<Event & { participationStatus?: string; checkedInAt?: string | null }>
> {
  return requestJson("/me/tickets", eventListSchema.shape.items, {
    auth: "user",
  });
}

export type TicketTypeRecord = {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  capacity: number;
  perUserLimit: number | null;
  soldCount: number;
  remaining: number;
  price: number;
  currency: string;
  salesPlatform: "door" | "konnektora" | "external";
  externalSalesUrl: string | null;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  gateOpensAt: string | null;
  gateClosesAt: string | null;
  status: string;
};
export type OwnedTicketOrder = {
  id: string;
  status: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: string;
  purchasedAt: string | null;
  eventChanged: boolean;
  event: {
    id: string;
    title: string;
    slug: string;
    status: string;
    startsAt: string;
    endsAt: string | null;
    city: string | null;
    country: string | null;
    coverImageUrl: string | null;
  };
  ticketType: TicketTypeRecord;
  tickets: Array<{
    id: string;
    status: string;
    createdAt: string;
    usedAt: string | null;
    qrPayload: string;
  }>;
};

function listMockOwnedTicketOrders(): OwnedTicketOrder[] {
  const session = getUserSession();
  if (!session) return [];
  const stored = readStorage<Record<string, OwnedTicketOrder[]>>(MOCK_OWNED_TICKET_ORDERS_KEY, {});
  const existingOrders = stored[session.id];
  if (existingOrders) return existingOrders;
  const now = Date.now();
  const event = getStoredEvents().find((item) => new Date(item.endsAt ?? item.startsAt).getTime() >= now) ?? getStoredEvents()[0];
  if (!event) return [];
  const order: OwnedTicketOrder = {
    id: "77777777-0001-4000-8000-000000000001",
    status: "paid",
    quantity: 2,
    unitPrice: 350,
    totalAmount: 700,
    currency: "TRY",
    purchasedAt: new Date(now - 86_400_000).toISOString(),
    eventChanged: false,
    event: {
      id: event.id,
      title: event.title,
      slug: event.slug,
      status: event.status,
      startsAt: String(event.startsAt),
      endsAt: event.endsAt ? String(event.endsAt) : null,
      city: event.city ?? null,
      country: event.country ?? null,
      coverImageUrl: event.coverImageUrl ?? null,
    },
    ticketType: {
      id: "77777777-0002-4000-8000-000000000001",
      eventId: event.id,
      name: "Konnektora Select",
      description: "Demo bilet",
      capacity: 120,
      perUserLimit: 4,
      soldCount: 72,
      remaining: 48,
      price: 350,
      currency: "TRY",
      salesPlatform: "konnektora",
      externalSalesUrl: null,
      saleStartsAt: null,
      saleEndsAt: null,
      gateOpensAt: null,
      gateClosesAt: null,
      status: "active",
    },
    tickets: [
      "77777777-0003-4000-8000-000000000001",
      "77777777-0003-4000-8000-000000000002",
    ].map((id, index) => ({
      id,
      status: "active",
      createdAt: new Date(now - 86_400_000).toISOString(),
      usedAt: null,
      qrPayload: `konnektora-ticket:${id}:demo-token-${index + 1}`,
    })),
  };
  writeStorage(MOCK_OWNED_TICKET_ORDERS_KEY, { ...stored, [session.id]: [order] });
  return [order];
}

function transferMockOwnedTickets(input: { ticketIds: string[] }) {
  const session = getUserSession();
  if (!session) throw new Error("Mock user session not found");
  const stored = readStorage<Record<string, OwnedTicketOrder[]>>(MOCK_OWNED_TICKET_ORDERS_KEY, {});
  const orders = listMockOwnedTicketOrders();
  const selected = new Set(input.ticketIds);
  let transferred = 0;
  const next = orders.flatMap((order) => {
    const tickets = order.tickets.filter((ticket) => {
      if (!selected.has(ticket.id) || ticket.status !== "active") return true;
      transferred += 1;
      return false;
    });
    return tickets.length ? [{ ...order, quantity: tickets.length, tickets }] : [];
  });
  if (transferred !== selected.size) throw new Error("Devredilecek aktif biletler bulunamadı.");
  writeStorage(MOCK_OWNED_TICKET_ORDERS_KEY, { ...stored, [session.id]: next });
  return { transferred };
}

function refundMockTicketOrder(orderId: string) {
  const session = getUserSession();
  if (!session) throw new Error("Mock user session not found");
  const stored = readStorage<Record<string, OwnedTicketOrder[]>>(MOCK_OWNED_TICKET_ORDERS_KEY, {});
  const orders = listMockOwnedTicketOrders();
  if (!orders.some((order) => order.id === orderId)) throw new Error("Bilet siparişi bulunamadı.");
  const next = orders.map((order) => order.id === orderId ? { ...order, status: "refunded", tickets: order.tickets.map((ticket) => ({ ...ticket, status: "refunded" })) } : order);
  writeStorage(MOCK_OWNED_TICKET_ORDERS_KEY, { ...stored, [session.id]: next });
  return { status: "refunded" };
}

const ticketTypeRecordsSchema = z.array(
  z.object({
    id: z.string(),
    eventId: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    capacity: z.number(),
    perUserLimit: z.number().nullable(),
    soldCount: z.number(),
    remaining: z.number(),
    price: z.number(),
    currency: z.string(),
    salesPlatform: z.enum(["door", "konnektora", "external"]),
    externalSalesUrl: z.string().nullable(),
    saleStartsAt: z.coerce.string().nullable(),
    saleEndsAt: z.coerce.string().nullable(),
    gateOpensAt: z.coerce.string().nullable(),
    gateClosesAt: z.coerce.string().nullable(),
    status: z.string(),
  }),
);
const ownedTicketOrdersSchema = z
  .array(z.any())
  .transform((value) => value as OwnedTicketOrder[]);
export function listEventTicketTypes(
  eventId: string,
): Promise<TicketTypeRecord[]> {
  return requestJson(
    `/events/${eventId}/ticket-types`,
    ticketTypeRecordsSchema,
  );
}
export function purchaseEventTickets(
  ticketTypeId: string,
  quantity: number,
): Promise<unknown> {
  return requestJson(`/ticket-types/${ticketTypeId}/purchase`, z.any(), {
    auth: "user",
    method: "POST",
    body: JSON.stringify({ quantity }),
  });
}
export function listOwnedTickets(): Promise<OwnedTicketOrder[]> {
  return requestJson("/me/owned-tickets", ownedTicketOrdersSchema, {
    auth: "user",
  });
}
export function transferOwnedTickets(input: {
  ticketIds: string[];
  username?: string;
  email?: string;
  phone?: string;
  name?: string;
}): Promise<unknown> {
  return requestJson("/me/tickets/transfer", z.any(), {
    auth: "user",
    method: "POST",
    body: JSON.stringify(input),
  });
}
export function refundTicketOrder(
  id: string,
  reason?: string,
): Promise<unknown> {
  return requestJson(`/me/ticket-orders/${id}/refund`, z.any(), {
    auth: "user",
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function updateMyEvent(
  id: string,
  input: Partial<AdminEventInput>,
): Promise<Event> {
  return requestJson(`/me/events/${id}`, eventSchema, {
    auth: "user",
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function archiveMyEvent(id: string): Promise<Event> {
  return requestJson(`/me/events/${id}`, eventSchema, {
    auth: "user",
    method: "DELETE",
  });
}

export function createContentReport(
  input: CreateReportInput,
): Promise<ContentReport> {
  return requestJson("/reports", contentReportSchema, {
    auth: "user",
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listReportRules(
  targetType?: ReportTargetType,
): Promise<ReportRule[]> {
  const params = new URLSearchParams();

  if (targetType) {
    params.set("targetType", targetType);
  }

  const query = params.toString();
  return requestJson(
    `/report-rules${query ? `?${query}` : ""}`,
    z.array(reportRuleSchema),
  );
}

export function listAdminReports(): Promise<ContentReport[]> {
  return requestJson("/admin/reports", z.array(contentReportSchema), {
    auth: true,
  });
}

export function listAdminReportGroups(
  scope: "active" | "old" = "active",
): Promise<ReportGroup[]> {
  return requestJson(
    `/admin/report-groups?scope=${scope}`,
    z.array(reportGroupSchema),
    { auth: true },
  );
}

export function getAdminReportGroup(
  targetType: ReportTargetType,
  targetId: string,
): Promise<ReportGroupDetail> {
  return requestJson(
    `/admin/report-groups/${targetType}/${targetId}`,
    reportGroupDetailSchema,
    { auth: true },
  );
}

export function updateAdminReportGroupNote(
  targetType: ReportTargetType,
  targetId: string,
  note: string,
): Promise<ReportGroupNote> {
  return requestJson(
    `/admin/report-groups/${targetType}/${targetId}/note`,
    reportGroupNoteSchema,
    {
      auth: true,
      method: "PATCH",
      body: JSON.stringify({ note }),
    },
  );
}

export function createAdminReportGroupComment(
  targetType: ReportTargetType,
  targetId: string,
  body: string,
): Promise<ReportGroupComment> {
  return requestJson(
    `/admin/report-groups/${targetType}/${targetId}/comments`,
    reportGroupCommentSchema,
    {
      auth: true,
      method: "POST",
      body: JSON.stringify({ body }),
    },
  );
}

export function createAdminModerationDecision(
  targetType: ReportTargetType,
  targetId: string,
  input: ModerationDecisionInput,
): Promise<ModerationDecision> {
  return requestJson(
    `/admin/report-groups/${targetType}/${targetId}/decisions`,
    moderationDecisionSchema,
    {
      auth: true,
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function listAdminReportRules(): Promise<ReportRule[]> {
  return requestJson("/admin/report-rules", z.array(reportRuleSchema), {
    auth: true,
  });
}

export function createAdminReportRule(
  input: ReportRuleInput,
): Promise<ReportRule> {
  return requestJson("/admin/report-rules", reportRuleSchema, {
    auth: true,
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminReportRule(
  id: string,
  input: Partial<ReportRuleInput> & { status?: string },
): Promise<ReportRule> {
  return requestJson(`/admin/report-rules/${id}`, reportRuleSchema, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function updateAdminReport(
  id: string,
  input: UpdateReportInput,
): Promise<ContentReport> {
  return requestJson(`/admin/reports/${id}`, contentReportSchema, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function resolveAdminReportAction(
  id: string,
  input: ResolveReportActionInput,
): Promise<ContentReport> {
  return requestJson(`/admin/reports/${id}/actions`, contentReportSchema, {
    auth: true,
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listEventParticipants(
  eventId: string,
  auth: AuthMode = true,
): Promise<EventParticipant[]> {
  return requestJson(
    `/events/${eventId}/participants`,
    z.array(eventParticipantSchema),
    { auth },
  );
}

const sentEventInvitationSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  invitedAt: z.coerce.string(),
});
export function listSentEventInvitations(eventId: string) {
  return requestJson(`/events/${eventId}/invitations/sent`, z.array(sentEventInvitationSchema), { auth: "user" });
}
export function listSentPlaceInvitations(placeId: string) {
  return requestJson(`/places/${placeId}/invitations/sent`, z.array(sentEventInvitationSchema), { auth: "user" });
}

export type GuestList = {
  id: string;
  ownerId: string;
  name: string;
  access: "owner" | "read";
  owner?: { id: string; name: string; username?: string | null; uploadedMedia?: Array<{ url: string }> };
  shares?: Array<{ id: string; userId: string; user: { id: string; name: string; username?: string | null; uploadedMedia?: Array<{ url: string }> } }>;
  members: Array<{ id: string; userId: string; user: { id: string; name: string; username?: string | null; email?: string; city?: string | null; country?: string | null; gender?: string | null; birthDate?: string | null; followerCount?: number; accountType?: string; uploadedMedia?: Array<{ url: string }> } }>;
};
const guestListSchema: z.ZodType<GuestList> = z.object({
  id: z.string(), ownerId: z.string(), name: z.string(), access: z.enum(["owner", "read"]),
  owner: z.object({ id: z.string(), name: z.string(), username: z.string().nullable().optional(), uploadedMedia: z.array(z.object({ url: z.string() })).optional() }).optional(),
  shares: z.array(z.object({ id: z.string(), userId: z.string(), user: z.object({ id: z.string(), name: z.string(), username: z.string().nullable().optional(), uploadedMedia: z.array(z.object({ url: z.string() })).optional() }) })).optional(),
  members: z.array(z.object({ id: z.string(), userId: z.string(), user: z.object({ id: z.string(), name: z.string(), username: z.string().nullable().optional(), email: z.string().optional(), city: z.string().nullable().optional(), country: z.string().nullable().optional(), gender: z.string().nullable().optional(), birthDate: z.coerce.string().nullable().optional(), followerCount: z.number().optional(), accountType: z.string().optional(), uploadedMedia: z.array(z.object({ url: z.string() })).optional() }) })),
});
export function listGuestLists(): Promise<GuestList[]> { return requestJson("/guest-lists", z.array(guestListSchema), { auth: "user" }); }
export function getGuestList(id: string): Promise<GuestList> { return requestJson(`/guest-lists/${id}`, guestListSchema, { auth: "user" }); }
export function createGuestList(name: string): Promise<GuestList> { return requestJson("/guest-lists", guestListSchema, { auth: "user", method: "POST", body: JSON.stringify({ name }) }); }
export function renameGuestList(id: string, name: string) { return requestJson(`/guest-lists/${id}`, z.object({ id: z.string(), name: z.string() }), { auth: "user", method: "PATCH", body: JSON.stringify({ name }) }); }
export function deleteGuestList(id: string) { return requestJson(`/guest-lists/${id}`, z.object({ id: z.string() }), { auth: "user", method: "DELETE" }); }
export function addGuestListMember(id: string, userId: string) { return requestJson(`/guest-lists/${id}/members`, z.object({ id: z.string(), userId: z.string() }), { auth: "user", method: "POST", body: JSON.stringify({ userId }) }); }
export function removeGuestListMember(id: string, userId: string) { return requestJson(`/guest-lists/${id}/members/${userId}`, z.object({ count: z.number() }), { auth: "user", method: "DELETE" }); }
export function shareGuestList(id: string, userId: string) { return requestJson(`/guest-lists/${id}/shares`, z.object({ id: z.string(), userId: z.string() }), { auth: "user", method: "POST", body: JSON.stringify({ userId }) }); }
export function unshareGuestList(id: string, userId: string) { return requestJson(`/guest-lists/${id}/shares/${userId}`, z.object({ count: z.number() }), { auth: "user", method: "DELETE" }); }

export type RelatedUser = {
  id: string;
  name: string;
  username?: string | null;
  avatarUrl?: string | null;
  city?: string | null;
  country?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  commonTagCount?: number;
  sentiment?: string;
  profileVerifiedAt?: string | null;
  relation: string;
  status?: string;
  checkedIn: boolean;
};
const relatedUserSchema: z.ZodType<RelatedUser> = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  birthDate: z.string().datetime().nullable().optional(),
  commonTagCount: z.number().int().nonnegative().optional(),
  sentiment: z.string().optional(),
  profileVerifiedAt: z.string().nullable().optional(),
  relation: z.string(),
  status: z.string().optional(),
  checkedIn: z.boolean(),
});
export function listEventRelatedUsers(eventId: string): Promise<RelatedUser[]> {
  return requestJson(
    `/events/${eventId}/related-users`,
    z.array(relatedUserSchema),
  );
}

export type EventInviteRecommendation = {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
  score: number;
  sharedInterestCount: number;
  reasons: string[];
};
const eventInviteRecommendationSchema: z.ZodType<EventInviteRecommendation> = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  avatarUrl: z.string().nullable().optional(),
  score: z.number(),
  sharedInterestCount: z.number().int().nonnegative(),
  reasons: z.array(z.string()),
});
export function listEventInviteRecommendations(eventId: string): Promise<EventInviteRecommendation[]> {
  return requestJson(
    `/events/${eventId}/invite-recommendations`,
    z.array(eventInviteRecommendationSchema),
    { auth: "user" },
  );
}

export function requestEventAttendance(
  eventId: string,
): Promise<EventParticipant> {
  return requestJson(`/events/${eventId}/attend`, eventParticipantSchema, {
    auth: "user",
    method: "POST",
  });
}

export function getMyEventTicket(eventId: string): Promise<EventTicket> {
  return requestJson(`/events/${eventId}/ticket`, eventTicketSchema, {
    auth: "user",
  });
}

export function scanEventTicket(
  eventId: string,
  token: string,
): Promise<CheckInPassport> {
  return requestJson(
    `/events/${eventId}/check-in/scan`,
    checkInPassportSchema,
    {
      auth: "user",
      method: "POST",
      body: JSON.stringify({ token }),
    },
  );
}

export function previewEventCheckIn(eventId: string, token: string, method: "qr" | "nfc"): Promise<CheckInPassport> {
  return requestJson(`/events/${eventId}/check-in/preview`, checkInPassportSchema, {
    auth: "user",
    method: "POST",
    body: JSON.stringify({ token, method }),
  });
}

export function getEventCheckInPassport(eventId: string, userId: string): Promise<CheckInPassport> {
  return requestJson(`/events/${eventId}/check-in/passport/${userId}`, checkInPassportSchema, { auth: "user" });
}

export function decideEventCheckInPassport(eventId: string, userId: string, decision: "admit" | "decline", method: "manual" | "qr" | "nfc"): Promise<EventParticipant> {
  return requestJson(`/events/${eventId}/check-in/passport/${userId}/decision`, eventParticipantSchema, {
    auth: "user",
    method: "POST",
    body: JSON.stringify({ decision, method }),
  });
}

export function inviteEventParticipant(
  eventId: string,
  input: {
    userId?: string;
    username?: string;
    email?: string;
    phone?: string;
    name?: string;
    role?: string;
  },
  auth: AuthMode = true,
): Promise<EventParticipant> {
  return requestJson(`/events/${eventId}/invite`, eventParticipantSchema, {
    auth,
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateEventParticipantStatus(
  eventId: string,
  userId: string,
  status: string,
  auth: AuthMode = true,
): Promise<EventParticipant> {
  return requestJson(
    `/events/${eventId}/participants/${userId}`,
    eventParticipantSchema,
    {
      auth,
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}

export function updateEventParticipant(
  eventId: string,
  userId: string,
  changes: { status?: string; role?: string },
  auth: AuthMode = true,
): Promise<EventParticipant> {
  return requestJson(`/events/${eventId}/participants/${userId}`, eventParticipantSchema, { auth, method: "PATCH", body: JSON.stringify(changes) });
}

export function checkInEventParticipant(
  eventId: string,
  userId: string,
  auth: AuthMode = true,
): Promise<EventParticipant> {
  return requestJson(
    `/events/${eventId}/participants/${userId}/check-in`,
    eventParticipantSchema,
    {
      auth,
      method: "POST",
    },
  );
}

export type PlaceInput = {
  name: string;
  description?: string;
  placeType?: string;
  visibility?: string;
  tagIds?: string[];
  country?: string;
  city?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  coverImageUrl?: string;
};

export async function listPlaces(params?: URLSearchParams): Promise<PlaceList> {
  const query = params?.toString();
  const path = `/places${query ? `?${query}` : ""}`;
  let result: PlaceList;
  try {
    result = await requestJson(path, placeListSchema, { auth: "user" });
  } catch (error) {
    if (!(error instanceof ApiHttpError) || error.status !== 401) throw error;
    result = await requestJson(path, placeListSchema);
  }
  return USE_DEMO_CONTENT && result.items.length === 0
    ? listMockPublicPlaces(params ?? new URLSearchParams())
    : result;
}

export async function getPlace(slug: string): Promise<Place> {
  try {
    return await requestJson(`/places/${slug}`, placeSchema, { auth: "user" });
  } catch (error) {
    let finalError = error;
    if (error instanceof ApiHttpError && error.status === 401) {
      try {
        return await requestJson(`/places/${slug}`, placeSchema);
      } catch (anonymousError) {
        finalError = anonymousError;
      }
    }
    // Production shows the curated demo places when the live catalogue is empty.
    // Their detail routes must resolve from the same source as the list.
    if (USE_DEMO_CONTENT && finalError instanceof ApiHttpError && finalError.status === 404) {
      return getMockPublicPlace(slug);
    }
    throw finalError;
  }
}

export function createPlace(input: PlaceInput): Promise<Place> {
  return requestJson("/places", placeSchema, {
    auth: "user",
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listMyPlaces(): Promise<Place[]> {
  return requestJson("/me/places", z.array(placeSchema), { auth: "user" });
}

export function updateMyPlace(
  id: string,
  input: Partial<PlaceInput>,
): Promise<Place> {
  return requestJson(`/me/places/${id}`, placeSchema, {
    auth: "user",
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function archiveMyPlace(
  id: string,
): Promise<{ id: string; status: string }> {
  return requestJson(
    `/me/places/${id}`,
    z.object({ id: z.string().uuid(), status: z.string() }),
    { auth: "user", method: "DELETE" },
  );
}

export function followPlace(id: string): Promise<{ following: boolean }> {
  return requestJson(
    `/places/${id}/follow`,
    z.object({ following: z.boolean() }),
    { auth: "user", method: "POST" },
  );
}

export function unfollowPlace(id: string): Promise<{ following: boolean }> {
  return requestJson(
    `/places/${id}/follow`,
    z.object({ following: z.boolean() }),
    { auth: "user", method: "DELETE" },
  );
}

export function listPlaceMembers(id: string): Promise<PlaceMember[]> {
  return requestJson(`/places/${id}/members`, z.array(placeMemberSchema), {
    auth: "user",
  });
}

export function listPlaceRelatedUsers(id: string): Promise<RelatedUser[]> {
  return requestJson(`/places/${id}/related-users`, z.array(relatedUserSchema));
}

export function invitePlaceMember(
  id: string,
  input: { userId?: string; email?: string; phone?: string; username?: string; name?: string; role?: string },
): Promise<PlaceMember> {
  return requestJson(`/places/${id}/invite`, placeMemberSchema, {
    auth: "user",
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updatePlaceMember(
  id: string,
  userId: string,
  input: { status?: string; role?: string },
): Promise<PlaceMember> {
  return requestJson(`/places/${id}/members/${userId}`, placeMemberSchema, {
    auth: "user",
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
export function checkInPlaceMember(
  id: string,
  userId: string,
): Promise<PlaceMember> {
  return requestJson(
    `/places/${id}/members/${userId}/check-in`,
    placeMemberSchema,
    { auth: "user", method: "POST" },
  );
}
export function scanPlaceMemberPass(
  id: string,
  payload: string,
): Promise<CheckInPassport> {
  return requestJson(`/places/${id}/check-in/scan`, checkInPassportSchema, {
    auth: "user",
    method: "POST",
    body: JSON.stringify({ payload }),
  });
}

export function previewPlaceCheckIn(id: string, payload: string, method: "qr" | "nfc"): Promise<CheckInPassport> {
  return requestJson(`/places/${id}/check-in/preview`, checkInPassportSchema, {
    auth: "user",
    method: "POST",
    body: JSON.stringify({ payload, method }),
  });
}

export function getPlaceCheckInPassport(id: string, userId: string): Promise<CheckInPassport> {
  return requestJson(`/places/${id}/check-in/passport/${userId}`, checkInPassportSchema, { auth: "user" });
}

export function decidePlaceCheckInPassport(id: string, userId: string, decision: "admit" | "decline", method: "manual" | "qr" | "nfc"): Promise<PlaceMember> {
  return requestJson(`/places/${id}/check-in/passport/${userId}/decision`, placeMemberSchema, {
    auth: "user",
    method: "POST",
    body: JSON.stringify({ decision, method }),
  });
}

export function respondPlaceInvite(
  id: string,
  status: "accepted" | "declined",
): Promise<PlaceMember> {
  return requestJson(`/places/${id}/membership`, placeMemberSchema, {
    auth: "user",
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}
