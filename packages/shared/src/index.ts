import { z } from "zod";

export type RichTextToken = {
  type: "text" | "tag" | "url" | "email" | "mention";
  text: string;
  href?: string;
};
const richTextPattern =
  /(“”[^“”]+“”|""[^"]+""|[^\s|]+\|(?:https?:\/\/)?[^\s]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|@[\p{L}\p{N}_.]{2,30})/gu;
export function parseRichText(value: string): RichTextToken[] {
  return value
    .split(richTextPattern)
    .filter(Boolean)
    .map((text): RichTextToken => {
      if (text.startsWith("@"))
        return {
          type: "mention",
          text,
          href: `/users/${encodeURIComponent(text.slice(1))}`,
        };
      if (/^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(text))
        return { type: "email", text, href: `mailto:${text}` };
      if (text.includes("|")) {
        const unwrapped = /^(?:“”|"").+(?:“”|"")$/u.test(text) ? text.slice(2, -2) : text;
        const separator = unwrapped.indexOf("|");
        const label = unwrapped.slice(0, separator).trim();
        const raw = unwrapped.slice(separator + 1).trim();
        if (!/^https?:\/\//i.test(raw) && !/^[^\s]+\.[A-Za-z]{2,}(?:\/\S*)?$/.test(raw)) {
          const slug = richTagSlug(raw);
          return { type: "tag", text: label, href: `/tags/${encodeURIComponent(slug)}` };
        }
        const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
        return { type: "url", text: label, href };
      }
      if (/^(?:“”.+“”|"".+"")$/u.test(text)) {
        const label = text.slice(2, -2);
        const slug = richTagSlug(label);
        return { type: "tag", text: label, href: `/tags/${encodeURIComponent(slug)}` };
      }
      return { type: "text", text };
    });
}

function richTagSlug(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/ı/g, "i")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const eventStatusSchema = z.enum([
  "draft",
  "published",
  "cancelled",
  "archived",
]);
export const eventFormatSchema = z.enum(["online", "offline", "hybrid"]);
export const eventVisibilitySchema = z.enum([
  "open",
  "approval_required",
  "invite_only",
]);
export const tagStatusSchema = z.enum(["active", "hidden", "archived"]);
export const userRoleSchema = z.enum([
  "user",
  "curator",
  "admin",
  "super_admin",
]);
export const accountTypeSchema = z.enum(["individual", "corporate"]);
export const companyTypeSchema = z.enum([
  "sole_proprietorship",
  "limited_or_corporation",
  "association",
  "foundation",
  "public_body",
  "other",
]);
export const businessCategorySchema = z.enum([
  "event_organizer",
  "restaurant_bar_cafe",
  "night_club",
  "university_club",
  "ngo",
  "brand",
  "tourism_company",
  "sports_club",
  "other",
]);
export const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/[a-z]/, "Şifre en az bir küçük harf içermelidir.")
  .regex(/[A-Z]/, "Şifre en az bir büyük harf içermelidir.")
  .regex(/[^A-Za-z0-9]/, "Şifre en az bir özel karakter içermelidir.");
export const phoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/);
export const phoneVerificationResponseSchema = z.object({
  ok: z.literal(true),
  expiresInSeconds: z.number().int().positive(),
  demoCode: z.string().length(6).optional(),
  developmentCode: z.string().length(6).optional(),
  verificationMode: z.enum(["sms", "demo", "temporary_bypass"]).optional(),
});
export const availabilitySchema = z.object({
  emailAvailable: z.boolean().nullable(),
  phoneAvailable: z.boolean().nullable(),
  usernameAvailable: z.boolean().nullable(),
});
export type Availability = z.infer<typeof availabilitySchema>;
export const privacyAudienceSchema = z.enum([
  "everybody",
  "following",
  "network",
  "nobody",
]);
export const privacySettingsSchema = z.object({
  userId: z.string().uuid(),
  messageAudience: privacyAudienceSchema,
  directoryDiscoverable: z.boolean(),
  eventAudience: privacyAudienceSchema,
  eventInviteAudience: privacyAudienceSchema,
  placeAudience: privacyAudienceSchema,
  placeInviteAudience: privacyAudienceSchema,
  profileNameAudience: privacyAudienceSchema,
  demographicsAudience: privacyAudienceSchema,
  locationAudience: privacyAudienceSchema,
  websiteAudience: privacyAudienceSchema,
  businessAudience: privacyAudienceSchema,
  addressAudience: privacyAudienceSchema,
  tradeNameAudience: privacyAudienceSchema,
  createdAt: z.string().datetime().or(z.date()).optional(),
  updatedAt: z.string().datetime().or(z.date()).optional(),
});
export const notificationTopicSchema = z.enum([
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
]);
export const deliveryChannelSchema = z.enum(["none", "both", "email", "push"]);
export const notificationPreferenceSchema = z.object({
  topic: notificationTopicSchema,
  channel: deliveryChannelSchema,
});
export const notificationPreferencesSchema = z.array(
  notificationPreferenceSchema,
);
export const blockedTargetTypeSchema = z.enum([
  "user",
  "tag",
  "event",
  "place",
]);
export const userBlockSchema = z.object({
  targetType: blockedTargetTypeSchema,
  targetId: z.string().uuid(),
  label: z.string(),
  subtitle: z.string().nullable().optional(),
  createdAt: z.string().datetime().or(z.date()),
});
export const userBlocksSchema = z.array(userBlockSchema);
export const memberCardSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  username: z.string().nullable(),
  accountType: accountTypeSchema,
  city: z.string().nullable(),
  country: z.string().nullable(),
  followerCount: z.number().int().nonnegative(),
  commonTagCount: z.number().int().nonnegative(),
  following: z.boolean(),
  gender: z.string().nullable().optional(),
  birthDate: z.string().datetime().or(z.date()).nullable().optional(),
  createdAt: z.string().datetime().or(z.date()).optional(),
});
export const memberCardsSchema = z.array(memberCardSchema);
export const socialProviderSchema = z.enum(["google", "facebook"]);
export const socialAccountSchema = z.object({
  provider: socialProviderSchema,
  email: z.string().nullable(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  connectedAt: z.string().datetime().or(z.date()),
  lastUsedAt: z.string().datetime().or(z.date()),
});
export const socialAccountsSchema = z.array(socialAccountSchema);
export const contactSchema = z.object({
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});
export const contactImportResultSchema = z.object({
  source: z.enum(["phone", "google"]),
  importedCount: z.number().int().nonnegative(),
  matches: z.array(
    z.object({ contactName: z.string(), member: memberCardSchema }),
  ),
  invitees: z.array(contactSchema),
});
export type SocialProvider = z.infer<typeof socialProviderSchema>;
export type SocialAccount = z.infer<typeof socialAccountSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type ContactImportResult = z.infer<typeof contactImportResultSchema>;
export const onboardingStepSchema = z.object({
  key: z.enum(["phone", "personal_info", "photo", "interests", "people"]),
  title: z.string(),
  completed: z.boolean(),
  path: z.string(),
});
export const onboardingStatusSchema = z.object({
  completed: z.boolean(),
  completedAt: z.string().datetime().or(z.date()).nullable(),
  progress: z.number().int().min(0).max(100),
  currentStep: onboardingStepSchema.nullable(),
  steps: z.array(onboardingStepSchema),
});
export const memberPassSchema = z.object({
  member: memberCardSchema.pick({
    id: true,
    name: true,
    username: true,
    city: true,
    country: true,
    followerCount: true,
  }),
  qrPayload: z.string(),
  nfcPayload: z.string(),
  version: z.number().int().positive(),
});
export const memberScanSchema = z.object({
  id: z.string().uuid(),
  method: z.enum(["qr", "nfc"]),
  createdAt: z.string().datetime().or(z.date()),
  member: memberCardSchema.pick({
    id: true,
    name: true,
    username: true,
    city: true,
    country: true,
    followerCount: true,
  }),
  following: z.boolean(),
});
export const memberScansSchema = z.array(memberScanSchema);
export const discoveryItemSchema = z.object({
  kind: z.enum(["user", "tag", "event", "place"]),
  id: z.string().uuid(),
  title: z.string(),
  subtitle: z.string().nullable(),
  href: z.string(),
  imageUrl: z.string().nullable(),
  meta: z.string().nullable(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  attendeeCount: z.number().int().nonnegative().optional(),
  organizer: z.boolean().optional(),
});
export const discoveryActivitySchema = discoveryItemSchema.extend({
  action: z.string(),
  occurredAt: z.string().datetime().or(z.date()),
  ownerId: z.string().uuid().nullable(),
});
export const discoveryFeedSchema = z.object({
  popularMembers: z.array(discoveryItemSchema),
  newMembers: z.array(discoveryItemSchema),
  localEvents: z.array(discoveryItemSchema),
  trendingTags: z.array(discoveryItemSchema),
  popularPlaces: z.array(discoveryItemSchema),
  activeUserCount: z.number().int().nonnegative(),
  scope: z.enum(["local", "global"]),
  location: z.string().nullable(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  activities: z.array(discoveryActivitySchema),
});
export const discoverySearchSchema = z.object({
  query: z.string(),
  total: z.number().int().nonnegative(),
  items: z.array(discoveryItemSchema),
});
export const userStatusSchema = z.enum([
  "invited",
  "pending",
  "active",
  "disabled",
  "frozen",
  "deleted",
  "suspended",
  "banned",
]);
export const eventParticipantStatusSchema = z.enum([
  "invited",
  "requested",
  "accepted",
  "declined",
  "banned",
  "attended",
]);
export const eventParticipantRoleSchema = z.enum([
  "attendee",
  "organizer",
  "manager",
]);
export const eventTicketSchema = z.object({
  eventId: z.string().uuid(),
  eventTitle: z.string(),
  token: z.string().min(32),
  qrPayload: z.string(),
  issuedAt: z.string().datetime(),
});
export const reportTargetTypeSchema = z.enum([
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
]);

export const postVisibilitySchema = z.enum([
  "everybody",
  "following",
  "network",
]);
export const postAuthorSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  username: z.string().nullable().optional(),
  profileVerifiedAt: z.string().datetime().or(z.date()).nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
});
export const postMediaSchema = z.object({
  id: z.string().uuid(),
  postId: z.string().uuid(),
  url: z.string(),
  type: z.string(),
  sortOrder: z.number().int(),
  createdAt: z.string().datetime().or(z.date()),
});
export const socialPostSchema = z.object({
  id: z.string().uuid(),
  authorId: z.string().uuid(),
  body: z.string(),
  visibility: postVisibilitySchema,
  status: z.string(),
  likeCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
  liked: z.boolean(),
  author: postAuthorSchema,
  media: z.array(postMediaSchema),
});
export const socialPostFeedSchema = z.object({
  items: z.array(socialPostSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});
export const socialPostCommentSchema = z.object({
  id: z.string().uuid(),
  postId: z.string().uuid(),
  authorId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  body: z.string(),
  status: z.string(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
  author: postAuthorSchema,
});
export const reportStatusSchema = z.enum([
  "open",
  "reviewing",
  "resolved",
  "dismissed",
]);
export const userMessageTypeSchema = z.enum([
  "faq",
  "account_freeze",
  "write_to_us",
]);
export const userMessageStatusSchema = z.enum(["unread", "read"]);
export const cmsCategoryTypeSchema = z.enum(["faq", "write_to_us"]);
export const adminPermissionSchema = z.enum([
  "cms.manage",
  "cms.categories.manage",
  "cms.faq.manage",
  "cms.announcements.manage",
  "cms.policies.manage",
  "reports.manage",
  "users.manage",
  "roles.manage",
  "tags.manage",
  "events.manage",
  "messages.manage",
  "messages.faq.manage",
  "messages.account_freeze.manage",
  "messages.write_to_us.manage",
  "places.manage",
  "posts.manage",
  "comments.manage",
  "media.manage",
  "private_messages.manage",
  "user_activity.manage",
  "finance.manage",
]);

export const slugSchema = z
  .string()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const adminRoleGroupSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(120),
  description: z.string().max(500).nullable(),
  permissions: z.array(adminPermissionSchema),
  status: z.string(),
  createdAt: z.string().datetime().or(z.date()).optional(),
  updatedAt: z.string().datetime().or(z.date()).optional(),
  _count: z.object({ users: z.number().int().nonnegative() }).optional(),
});

export const cmsCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(120),
  slug: slugSchema,
  description: z.string().max(500).nullable(),
  type: cmsCategoryTypeSchema,
  status: z.enum(["active", "passive"]),
  createdAt: z.string().datetime().or(z.date()).optional(),
  updatedAt: z.string().datetime().or(z.date()).optional(),
  _count: z.object({ faqs: z.number().int().nonnegative() }).optional(),
});

export const faqSchema = z.object({
  id: z.string().uuid(),
  categoryId: z.string().uuid(),
  title: z.string().min(3).max(160),
  body: z.string().min(3),
  status: z.enum(["active", "passive"]),
  createdAt: z.string().datetime().or(z.date()).optional(),
  updatedAt: z.string().datetime().or(z.date()).optional(),
  category: cmsCategorySchema.optional(),
});

export const announcementSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3).max(160),
  body: z.string().min(3),
  titleEn: z.string().min(3).max(160).nullable().optional(),
  bodyEn: z.string().min(3).nullable().optional(),
  target: z.enum(["all", "members", "individual_members", "corporate_members", "admins"]),
  targetLastLoginFrom: z.string().datetime().or(z.date()).nullable().optional(),
  targetLastLoginTo: z.string().datetime().or(z.date()).nullable().optional(),
  targetJoinedFrom: z.string().datetime().or(z.date()).nullable().optional(),
  targetJoinedTo: z.string().datetime().or(z.date()).nullable().optional(),
  targetAppVersion: z.string().max(80).nullable().optional(),
  publishMode: z.enum(["scheduled", "after_signup", "login_window"]).optional(),
  status: z.enum(["active", "passive"]),
  publishAt: z.string().datetime().or(z.date()),
  expiresAt: z.string().datetime().or(z.date()).nullable(),
  createdAt: z.string().datetime().or(z.date()).optional(),
  updatedAt: z.string().datetime().or(z.date()).optional(),
});

export const announcementListSchema = z.array(announcementSchema);

export const policyTypeSchema = z.enum([
  "privacy",
  "terms",
  "cookies",
  "about",
]);

export const cmsPolicySchema = z.object({
  id: z.string().uuid(),
  type: policyTypeSchema,
  title: z.string().min(3).max(160),
  body: z.string().min(10),
  status: z.enum(["active", "passive"]),
  publishedAt: z.string().datetime().or(z.date()).nullable(),
  createdAt: z.string().datetime().or(z.date()).optional(),
  updatedAt: z.string().datetime().or(z.date()).optional(),
});

export const tagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(80),
  slug: slugSchema,
  description: z.string().max(500).nullable(),
  categoryId: z.string().uuid().nullable(),
  status: tagStatusSchema,
  usageCount: z.number().int().nonnegative(),
  eventCount: z.number().int().nonnegative().optional(),
  placeCount: z.number().int().nonnegative().optional(),
});
export const publicProfileInterestSchema = z.object({
  tag: tagSchema,
  sentiment: z.enum(["like", "ok", "dislike"]),
  common: z.boolean(),
  commentCount: z.number().int().nonnegative().optional(),
  lastActivityAt: z.string().datetime().or(z.date()).optional(),
});
export const mutualismAnalysisSchema = z.object({
  total: z.number().int().nonnegative(),
  hiddenCount: z.number().int().nonnegative(),
  sameSentimentTags: z.array(publicProfileInterestSchema),
  events: z.array(discoveryItemSchema),
  places: z.array(discoveryItemSchema),
  people: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    username: z.string().nullable().optional(),
    avatarUrl: z.string().nullable().optional(),
  })),
  sharedReactionCount: z.number().int().nonnegative(),
  sharedCommentTargetCount: z.number().int().nonnegative(),
  scores: z.object({
    overall: z.number().int().min(0).max(100),
    friendship: z.number().int().min(0).max(100),
    networking: z.number().int().min(0).max(100),
    eventPartner: z.number().int().min(0).max(100),
    travel: z.number().int().min(0).max(100),
    business: z.number().int().min(0).max(100),
  }),
  explanation: z.string(),
  actions: z.array(z.string()),
});
export const publicProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  username: z.string(),
  accountType: accountTypeSchema,
  website: z.string().nullable(),
  gender: z.string().nullable().optional(),
  birthDate: z.string().datetime().or(z.date()).nullable().optional(),
  district: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  companyName: z.string().nullable().optional(),
  tradeName: z.string().nullable().optional(),
  companyType: z.string().nullable().optional(),
  businessCategory: z.string().nullable().optional(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  followerCount: z.number().int().nonnegative(),
  followingCount: z.number().int().nonnegative(),
  verified: z.boolean(),
  memberSince: z.string().datetime().or(z.date()),
  media: z.array(
    z.object({
      id: z.string().uuid(),
      url: z.string(),
      type: z.string(),
      sortOrder: z.number().int(),
      isProfilePicture: z.boolean(),
    }),
  ),
  interests: z.array(publicProfileInterestSchema),
  commonInterestCount: z.number().int().nonnegative(),
  mutualism: mutualismAnalysisSchema.optional(),
  relationship: z.object({
    isSelf: z.boolean(),
    following: z.boolean(),
    canMessage: z.boolean(),
    blockedByViewer: z.boolean().optional(),
  }),
  events: z.array(discoveryItemSchema),
  places: z.array(discoveryItemSchema),
  stats: z.record(z.number().nonnegative()).optional(),
});

export const profileVerificationRequestSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  referenceMediaId: z.string().uuid(),
  selfieUrl: z.string(),
  challenge: z.enum(["blink", "smile", "turn_left", "turn_right"]),
  status: z.enum(["pending", "approved", "rejected"]),
  provider: z.string(),
  faceMatchScore: z.number().nullable(),
  livenessScore: z.number().nullable(),
  decisionReason: z.string().nullable(),
  reviewedById: z.string().uuid().nullable(),
  reviewedAt: z.string().datetime().or(z.date()).nullable(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
  user: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      username: z.string().nullable(),
      avatarUrl: z.string().nullable().optional(),
      email: z.string().email(),
      accountType: z.string(),
    })
    .optional(),
});
export const profileVerificationStatusSchema = z.object({
  eligible: z.boolean(),
  verified: z.boolean(),
  verifiedAt: z.string().datetime().or(z.date()).nullable(),
  request: profileVerificationRequestSchema.nullable(),
});
export const profileVerificationRequestsSchema = z.array(
  profileVerificationRequestSchema,
);
export type ProfileVerificationRequest = z.infer<
  typeof profileVerificationRequestSchema
>;
export type ProfileVerificationStatus = z.infer<
  typeof profileVerificationStatusSchema
>;

export const tagSentimentSchema = z.enum(["like", "ok", "dislike"]);
export const tagAffinitySchema = z.object({
  tag: tagSchema,
  sentiment: tagSentimentSchema,
  createdAt: z.string().datetime().or(z.date()).optional(),
  updatedAt: z.string().datetime().or(z.date()).optional(),
});
export const tagAffinitiesSchema = z.array(tagAffinitySchema);
const profileTagSuggestionUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  username: z.string().nullable().optional(),
  email: z.string().email(),
  role: z.string(),
  status: z.string(),
});
export const profileTagSuggestionSchema = z.object({
  id: z.string().uuid(),
  targetUserId: z.string().uuid(),
  suggestedById: z.string().uuid(),
  tagId: z.string().uuid(),
  sentiment: tagSentimentSchema,
  status: z.enum(["pending", "accepted", "declined", "cancelled"]),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
  tag: tagSchema,
  targetUser: profileTagSuggestionUserSchema,
  suggestedBy: profileTagSuggestionUserSchema,
});
export const profileTagSuggestionsSchema = z.array(profileTagSuggestionSchema);
export const tagCommentSchema = z.object({
  id: z.string().uuid(),
  tagId: z.string().uuid(),
  body: z.string().max(1000),
  likeCount: z.number().int().nonnegative(),
  liked: z.boolean().optional(),
  replyCount: z.number().int().nonnegative().optional(),
  media: z
    .array(
      z.object({ id: z.string().uuid(), url: z.string(), type: z.string() }),
    )
    .optional(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
  canDelete: z.boolean(),
  author: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      username: z.string().nullable(),
      avatarUrl: z.string().nullable().optional(),
    })
    .nullable(),
});
export const tagCommentsSchema = z.array(tagCommentSchema);

export const eventSchema = z.object({
  id: z.string().uuid(),
  placeId: z.string().uuid().nullable().optional(),
  createdById: z.string().uuid().nullable().optional(),
  title: z.string().min(3).max(160),
  slug: slugSchema,
  summary: z.string().min(10).max(300),
  description: z.string().min(10),
  status: eventStatusSchema,
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable(),
  timezone: z.string().min(2).max(80),
  format: eventFormatSchema,
  visibility: eventVisibilitySchema,
  city: z.string().max(120).nullable(),
  country: z.string().max(120).nullable(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  locationName: z.string().max(180).nullable().optional(),
  locationAddress: z.string().max(500).nullable().optional(),
  place: z.object({ id: z.string().uuid(), name: z.string(), slug: slugSchema, address: z.string().nullable(), city: z.string().nullable(), country: z.string().nullable() }).nullable().optional(),
  attendeeCount: z.number().int().nonnegative().optional(),
  invitedCount: z.number().int().nonnegative().optional(),
  followingAttendeeCount: z.number().int().nonnegative().optional(),
  viewerParticipation: z
    .object({ role: z.string(), status: z.string() })
    .nullable()
    .optional(),
  language: z.string().min(2).max(16),
  organizerName: z.string().max(160).nullable(),
  externalRegistrationUrl: z.string().url().nullable(),
  liveUrl: z.string().url().nullable().optional(),
  timeline: z.string().nullable().optional(),
  lineup: z
    .array(
      z.object({
        type: z.enum(["heading", "subheading", "session", "break"]).optional(),
        title: z.string(),
        startsAt: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .nullable()
    .optional(),
  ticketTypes: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        price: z.number().nonnegative(),
        currency: z.string(),
        salesPlatform: z.enum(["door", "konnektora", "external"]).optional(),
        externalSalesUrl: z.string().url().optional(),
        capacity: z.number().int().positive().optional(),
        perUserLimit: z.number().int().positive().optional(),
        saleStartsAt: z.string().optional(),
        saleEndsAt: z.string().optional(),
        gateOpensAt: z.string().optional(),
        gateClosesAt: z.string().optional(),
        status: z.string().optional(),
      }),
    )
    .nullable()
    .optional(),
  coverImageUrl: z.string().url().nullable(),
  capacity: z.number().int().positive().nullable(),
  price: z.number().nonnegative(),
  currency: z.enum(["TRY", "EUR", "USD", "GBP"]),
  tags: z.array(tagSchema),
});

export const eventListSchema = z.object({
  items: z.array(eventSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  hasNextPage: z.boolean(),
});

export const paymentStatusSchema = z.enum([
  "pending",
  "succeeded",
  "failed",
  "refunded",
  "partially_refunded",
  "cancelled",
]);
export const financeAccountSchema = z.object({
  userId: z.string().uuid(),
  preferredCurrency: z.string(),
  bankProvider: z.string().nullable(),
  bankAccountLabel: z.string().nullable(),
  bankAccountLast4: z.string().nullable(),
  kycStatus: z.enum(["not_started", "pending", "approved", "rejected"]),
  kycProvider: z.string().nullable(),
  availableBalance: z.coerce.number(),
  pendingBalance: z.coerce.number(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
});
export const billingProfileSchema = z.object({
  userId: z.string().uuid(),
  legalName: z.string().nullable(),
  taxNumber: z.string().nullable(),
  taxOffice: z.string().nullable(),
  billingEmail: z.string().nullable(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  postalCode: z.string().nullable(),
  addressLine: z.string().nullable(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
});
export const paymentTransactionSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  payerId: z.string().uuid(),
  payeeId: z.string().uuid(),
  grossAmount: z.coerce.number(),
  platformFee: z.coerce.number(),
  netAmount: z.coerce.number(),
  refundedAmount: z.coerce.number(),
  currency: z.string(),
  status: paymentStatusSchema,
  provider: z.string(),
  providerRef: z.string().nullable(),
  idempotencyKey: z.string(),
  failureReason: z.string().nullable(),
  paidAt: z.string().datetime().or(z.date()).nullable(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
  event: z
    .object({ id: z.string().uuid(), title: z.string(), slug: z.string() })
    .optional(),
  payer: z.object({ id: z.string().uuid(), name: z.string() }).optional(),
  payee: z.object({ id: z.string().uuid(), name: z.string() }).optional(),
});
export const payoutSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  amount: z.coerce.number(),
  currency: z.string(),
  status: z.string(),
  providerRef: z.string().nullable(),
  requestedAt: z.string().datetime().or(z.date()),
  processedAt: z.string().datetime().or(z.date()).nullable(),
});
export const financeDashboardSchema = z.object({
  account: financeAccountSchema,
  billing: billingProfileSchema.nullable(),
  transactions: z.array(paymentTransactionSchema),
  payouts: z.array(payoutSchema),
  member: z.object({
    plan: z.enum(["free", "plus", "premium"]),
    planStartedAt: z.string().datetime().or(z.date()).nullable(),
  }),
  business: z.object({
    plan: z.enum(["starter", "growth", "scale"]),
    planStartedAt: z.string().datetime().or(z.date()).nullable(),
    companyName: z.string().nullable(),
    category: z.string().nullable(),
    managedEventCount: z.number().int().nonnegative(),
    managedPlaceCount: z.number().int().nonnegative(),
  }),
  summary: z.object({
    availableBalance: z.number(),
    pendingBalance: z.number(),
    lifetimeNetRevenue: z.number(),
    currency: z.string(),
  }),
});
export const beneficialOwnerSchema = z.object({
  name: z.string(),
  nationality: z.string(),
  ownershipPercent: z.coerce.number(),
  identityNumberLast4: z.string().optional(),
});
export const corporateKycDocumentSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number().int(),
  status: z.string(),
  createdAt: z.string().datetime().or(z.date()),
});
export const corporateKycApplicationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.enum(["not_started", "pending", "approved", "rejected"]),
  version: z.number().int(),
  legalName: z.string().nullable(),
  registrationNumber: z.string().nullable(),
  taxNumber: z.string().nullable(),
  incorporationCountry: z.string().nullable(),
  incorporationDate: z.string().datetime().or(z.date()).nullable(),
  registeredAddress: z.string().nullable(),
  website: z.string().nullable(),
  businessActivity: z.string().nullable(),
  representativeName: z.string().nullable(),
  representativeTitle: z.string().nullable(),
  representativeEmail: z.string().nullable(),
  representativePhone: z.string().nullable(),
  representativeBirthDate: z.string().datetime().or(z.date()).nullable(),
  beneficialOwners: z.array(beneficialOwnerSchema),
  termsAccepted: z.boolean(),
  informationConfirmed: z.boolean(),
  submittedAt: z.string().datetime().or(z.date()).nullable(),
  reviewedAt: z.string().datetime().or(z.date()).nullable(),
  decisionReason: z.string().nullable(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
  documents: z.array(corporateKycDocumentSchema),
  requiredDocumentTypes: z.array(z.string()),
  completion: z.number().min(0).max(100),
  auditLogs: z
    .array(
      z.object({
        id: z.string().uuid(),
        action: z.string(),
        note: z.string().nullable().optional(),
        createdAt: z.string().datetime().or(z.date()),
      }),
    )
    .optional(),
});

export const adminDashboardSchema = z.object({
  publishedEvents: z.number().int().nonnegative(),
  draftEvents: z.number().int().nonnegative(),
  activeTags: z.number().int().nonnegative(),
  upcomingEvents: z.number().int().nonnegative(),
});

export const adminUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  username: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  role: userRoleSchema,
  accountType: accountTypeSchema.optional(),
  emailVerified: z.boolean().optional(),
  status: userStatusSchema.optional(),
  onboardingCompleted: z.boolean().optional(),
  avatarUrl: z.string().nullable().optional(),
  followerCount: z.number().int().nonnegative().optional(),
  relatedFollowerCount: z.number().int().nonnegative().optional(),
});

export const profileSchema = z.object({
  id: z.string().uuid(),
  accountType: accountTypeSchema,
  name: z.string().min(2).max(160),
  username: z.string().min(2).max(80).nullable(),
  email: z.string().email(),
  phone: z.string().max(40).nullable(),
  phoneVerified: z.boolean(),
  country: z.string().max(120).nullable(),
  city: z.string().max(120).nullable(),
  district: z.string().max(120).nullable(),
  address: z.string().max(500).nullable(),
  gender: z.enum(["male", "female"]).nullable(),
  birthDate: z.string().datetime().or(z.date()).nullable(),
  website: z.string().url().nullable(),
  companyName: z.string().max(160).nullable(),
  tradeName: z.string().max(160).nullable(),
  companyType: z.string().max(80).nullable(),
  businessCategory: z.string().max(120).nullable(),
  emailVerified: z.boolean(),
  status: userStatusSchema.optional(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
});

export const adminTagDetailSchema = tagSchema.extend({
  category: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      slug: slugSchema,
      description: z.string().nullable().optional(),
      sortOrder: z.number().int().optional(),
    })
    .nullable()
    .optional(),
  createdBy: adminUserSchema.optional().nullable(),
  updatedBy: adminUserSchema.optional().nullable(),
  reportCount: z.number().int().nonnegative(),
  likeCount: z.number().int().nonnegative(),
  okCount: z.number().int().nonnegative(),
  dislikeCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
  viewCount: z.number().int().nonnegative(),
  viewerCount: z.number().int().nonnegative(),
  firstCommenter: adminUserSchema.optional().nullable(),
  firstProfileUser: adminUserSchema.optional().nullable(),
  _count: z
    .object({
      events: z.number().int().nonnegative(),
      interestedUsers: z.number().int().nonnegative(),
    })
    .optional(),
});

export const adminManagedUserSchema = adminUserSchema.extend({
  status: userStatusSchema,
  username: z.string().nullable().optional(),
  accountType: z.string(),
  phone: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  birthDate: z.string().datetime().or(z.date()).nullable().optional(),
  website: z.string().nullable().optional(),
  companyName: z.string().nullable().optional(),
  tradeName: z.string().nullable().optional(),
  companyType: z.string().nullable().optional(),
  businessCategory: z.string().nullable().optional(),
  followerCount: z.number().int().nonnegative(),
  followingCount: z.number().int().nonnegative(),
  lastOnlineAt: z.string().datetime().or(z.date()).nullable().optional(),
  emailVerified: z.boolean(),
  invitedById: z.string().uuid().nullable().optional(),
  penaltyScoreLastYear: z.number().int().nonnegative(),
  penaltyScoreAllTime: z.number().int().nonnegative(),
  adminRoleGroupId: z.string().uuid().nullable().optional(),
  adminRoleGroup: adminRoleGroupSchema.nullable().optional(),
  createdAt: z.string().datetime().or(z.date()).optional(),
  updatedAt: z.string().datetime().or(z.date()).optional(),
  _count: z
    .object({
      createdEvents: z.number().int().nonnegative(),
      eventParticipations: z.number().int().nonnegative(),
      submittedReports: z.number().int().nonnegative(),
    })
    .optional(),
});

export const adminManagedUserListSchema = z.object({
  items: z.array(adminManagedUserSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  hasNextPage: z.boolean(),
});

export const adminManagedUserDetailSchema = adminManagedUserSchema.extend({
  invitedBy: adminUserSchema.nullable().optional(),
  invitedUsers: z.array(adminUserSchema).optional(),
  stats: z.object({
    createdEvents: z.number().int().nonnegative(),
    eventParticipations: z.number().int().nonnegative(),
    submittedReports: z.number().int().nonnegative(),
    resolvedReports: z.number().int().nonnegative(),
  }),
  interestTags: z.array(tagSchema),
});

export const eventParticipantSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  userId: z.string().uuid(),
  status: eventParticipantStatusSchema,
  role: eventParticipantRoleSchema,
  checkedInAt: z.string().datetime().nullable(),
  checkInMethod: z.enum(["manual", "qr", "nfc"]).nullable().optional(),
  checkInOrder: z.number().int().positive().nullable().optional(),
  checkInDecisionAt: z.string().datetime().or(z.date()).nullable().optional(),
  joinOrder: z.number().int().positive().optional(),
  createdAt: z.string().datetime().or(z.date()).optional(),
  updatedAt: z.string().datetime().or(z.date()).optional(),
  user: adminUserSchema.optional(),
  tickets: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().nonnegative(),
    currency: z.string(),
    gateOpensAt: z.string().datetime().or(z.date()).nullable(),
    gateClosesAt: z.string().datetime().or(z.date()).nullable(),
  })).optional(),
});

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  user: adminUserSchema,
  verificationEmailSent: z.boolean().optional(),
});

export const contentReportSchema = z.object({
  id: z.string().uuid(),
  targetType: reportTargetTypeSchema,
  targetId: z.string().uuid(),
  reason: z.string().min(3).max(120),
  details: z.string().max(1000).nullable(),
  status: reportStatusSchema,
  resolutionNote: z.string().max(1000).nullable(),
  reporterId: z.string().uuid(),
  resolvedById: z.string().uuid().nullable(),
  resolvedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime().or(z.date()).optional(),
  updatedAt: z.string().datetime().or(z.date()).optional(),
  ruleId: z.string().uuid().nullable().optional(),
  rule: z
    .object({
      id: z.string().uuid(),
      targetType: reportTargetTypeSchema,
      title: z.string().min(3).max(160),
      description: z.string().max(500).nullable(),
      violationScore: z.number().int().min(1).max(100),
      status: z.enum(["active", "passive"]),
      createdAt: z.string().datetime().or(z.date()).optional(),
      updatedAt: z.string().datetime().or(z.date()).optional(),
    })
    .optional()
    .nullable(),
  reporter: adminUserSchema.optional(),
  resolvedBy: adminUserSchema.optional().nullable(),
});

export const reportRuleSchema = z.object({
  id: z.string().uuid(),
  targetType: reportTargetTypeSchema,
  title: z.string().min(3).max(160),
  description: z.string().max(500).nullable(),
  violationScore: z.number().int().min(1).max(100),
  status: z.enum(["active", "passive"]),
  createdAt: z.string().datetime().or(z.date()).optional(),
  updatedAt: z.string().datetime().or(z.date()).optional(),
});

export const reportGroupNoteSchema = z.object({
  id: z.string().uuid(),
  targetType: reportTargetTypeSchema,
  targetId: z.string().uuid(),
  note: z.string(),
  updatedById: z.string().uuid().nullable().optional(),
  createdAt: z.string().datetime().or(z.date()).optional(),
  updatedAt: z.string().datetime().or(z.date()).optional(),
  updatedBy: adminUserSchema.optional().nullable(),
});

export const reportGroupCommentSchema = z.object({
  id: z.string().uuid(),
  targetType: reportTargetTypeSchema,
  targetId: z.string().uuid(),
  body: z.string(),
  createdById: z.string().uuid().nullable().optional(),
  createdAt: z.string().datetime().or(z.date()).optional(),
  updatedAt: z.string().datetime().or(z.date()).optional(),
  createdBy: adminUserSchema.optional().nullable(),
});

export const adminActivityLogSchema = z.object({
  id: z.string().uuid(),
  actorId: z.string().uuid().nullable().optional(),
  action: z.string(),
  targetType: z.string(),
  targetId: z.string(),
  note: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  createdAt: z.string().datetime().or(z.date()).optional(),
  actor: adminUserSchema.optional().nullable(),
});

export const adminActivityLogListSchema = z.object({
  items: z.array(adminActivityLogSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  hasNextPage: z.boolean(),
});

export const moderationDecisionSchema = z.object({
  id: z.string().uuid(),
  targetType: reportTargetTypeSchema,
  targetId: z.string().uuid(),
  decision: z.enum(["violation", "no_violation"]),
  action: z.enum([
    "none",
    "warn_user",
    "suspend_user",
    "ban_user",
    "archive_event",
    "archive_tag",
    "remove_media",
    "archive_place",
    "remove_comment",
    "reset_username",
    "remove_website",
    "remove_private_messages",
  ]),
  penaltyScore: z.number().int().nonnegative(),
  note: z.string().max(2000).nullable(),
  userId: z.string().uuid().nullable().optional(),
  issuedById: z.string().uuid().nullable().optional(),
  suspensionEndsAt: z.string().datetime().or(z.date()).nullable(),
  createdAt: z.string().datetime().or(z.date()).optional(),
  user: adminUserSchema.optional().nullable(),
  issuedBy: adminUserSchema.optional().nullable(),
});

export const adminPlaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: slugSchema,
  description: z.string().nullable(),
  placeType: z.string().optional(),
  visibility: eventVisibilitySchema.optional(),
  status: z.string(),
  coverImageUrl: z.string().nullable(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  address: z.string().nullable(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  followerCount: z.number().int().nonnegative(),
  inviteCount: z.number().int().nonnegative(),
  createdById: z.string().uuid().nullable(),
  updatedById: z.string().uuid().nullable(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
  createdBy: adminUserSchema.optional().nullable(),
  updatedBy: adminUserSchema.optional().nullable(),
  reportCount: z.number().int().nonnegative().optional(),
  tags: z.array(tagSchema).optional(),
});

export const placeMemberStatusSchema = z.enum([
  "invited",
  "accepted",
  "declined",
  "banned",
]);
export const placeMemberRoleSchema = z.enum(["member", "manager", "organizer"]);
export const placeSchema = adminPlaceSchema
  .pick({
    id: true,
    name: true,
    slug: true,
    description: true,
    placeType: true,
    visibility: true,
    status: true,
    coverImageUrl: true,
    country: true,
    city: true,
    address: true,
    latitude: true,
    longitude: true,
    followerCount: true,
    inviteCount: true,
    createdById: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    tags: z.array(tagSchema).optional(),
    isFollowing: z.boolean(),
    memberCount: z.number().int().nonnegative().optional(),
    followingMemberCount: z.number().int().nonnegative().optional(),
    upcomingEventCount: z.number().int().nonnegative().optional(),
    viewerMembership: z
      .object({
        status: placeMemberStatusSchema,
        role: placeMemberRoleSchema,
      })
      .nullable(),
    events: z.array(eventSchema).optional(),
    managers: z.array(z.object({ id: z.string().uuid(), name: z.string(), username: z.string().nullable(), role: placeMemberRoleSchema, avatarUrl: z.string().nullable().optional() })).optional(),
  });

export const placeListSchema = z.object({
  items: z.array(placeSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  hasNextPage: z.boolean(),
});

export const placeMemberSchema = z.object({
  placeId: z.string().uuid(),
  userId: z.string().uuid(),
  status: placeMemberStatusSchema,
  role: placeMemberRoleSchema,
  checkedInAt: z.string().datetime().or(z.date()).nullable().optional(),
  checkInMethod: z.enum(["manual", "qr", "nfc"]).nullable().optional(),
  checkInOrder: z.number().int().positive().nullable().optional(),
  checkInDecisionAt: z.string().datetime().or(z.date()).nullable().optional(),
  joinOrder: z.number().int().positive().optional(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
  user: adminUserSchema.optional(),
});

export const checkInPassportSchema = z.object({
  targetType: z.enum(["event", "place"]),
  targetId: z.string().uuid(),
  targetName: z.string(),
  user: adminUserSchema.extend({
    followerCount: z.number().int().nonnegative(),
    plan: z.string().optional(),
    profileVerifiedAt: z.string().datetime().or(z.date()).nullable().optional(),
    media: z.array(z.object({ id: z.string().uuid(), url: z.string(), type: z.string() })),
  }),
  status: z.string(),
  role: z.string(),
  alreadyInside: z.boolean(),
  checkedInAt: z.string().datetime().or(z.date()).nullable(),
  checkInOrder: z.number().int().positive().nullable(),
  checkInMethod: z.enum(["manual", "qr", "nfc"]).nullable(),
  invitedBy: z.array(z.string()),
  relatedFollowerCount: z.number().int().nonnegative(),
  guestLists: z.array(z.object({ id: z.string().uuid(), name: z.string() })),
  relatedPlace: z.object({
    id: z.string().uuid(),
    name: z.string(),
    status: z.string(),
    role: z.string(),
    checkedInAt: z.string().datetime().or(z.date()).nullable(),
    order: z.number().int().positive().nullable(),
    invitedBy: z.array(z.string()),
  }).nullable().optional(),
  tickets: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().nonnegative(),
    currency: z.string(),
    gateOpensAt: z.string().datetime().or(z.date()).nullable(),
    gateClosesAt: z.string().datetime().or(z.date()).nullable(),
  })),
});

export const adminMediaSchema = z.object({
  id: z.string().uuid(),
  url: z.string(),
  type: z.string(),
  status: z.string(),
  contentType: reportTargetTypeSchema,
  contentId: z.string(),
  uploadedById: z.string().uuid().nullable(),
  sortOrder: z.number().int().nonnegative(),
  isProfilePicture: z.boolean(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
  uploadedBy: adminUserSchema.optional().nullable(),
  reportCount: z.number().int().nonnegative().optional(),
});

export const profileMediaSchema = adminMediaSchema.pick({
  id: true,
  url: true,
  type: true,
  status: true,
  contentType: true,
  contentId: true,
  uploadedById: true,
  sortOrder: true,
  isProfilePicture: true,
  createdAt: true,
  updatedAt: true,
});
export const profileMediaListSchema = z.array(profileMediaSchema);

export const adminCommentSchema = z.object({
  id: z.string().uuid(),
  targetType: reportTargetTypeSchema,
  targetId: z.string(),
  parentId: z.string().uuid().nullable(),
  authorId: z.string().uuid().nullable(),
  body: z.string(),
  status: z.string(),
  likeCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
  author: adminUserSchema.optional().nullable(),
  parent: z
    .object({
      id: z.string().uuid(),
      body: z.string(),
      author: adminUserSchema.optional().nullable(),
    })
    .optional()
    .nullable(),
  _count: z.object({ replies: z.number().int().nonnegative() }).optional(),
  reportCount: z.number().int().nonnegative().optional(),
});

export const adminPostSchema = z.object({
  id: z.string().uuid(),
  authorId: z.string().uuid(),
  body: z.string(),
  visibility: postVisibilitySchema,
  status: z.string(),
  likeCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
  author: adminUserSchema.optional(),
  media: z.array(postMediaSchema).optional(),
  reportCount: z.number().int().nonnegative().optional(),
});

export const adminPrivateMessageSchema = z.object({
  id: z.string().uuid(),
  senderId: z.string().uuid().nullable(),
  recipientId: z.string().uuid().nullable(),
  body: z.string(),
  status: z.string(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
  sender: adminUserSchema.optional().nullable(),
  recipient: adminUserSchema.optional().nullable(),
  reportCount: z.number().int().nonnegative().optional(),
});

export const privateChatMessageSchema = z.object({
  id: z.string().uuid(),
  senderId: z.string().uuid().nullable(),
  recipientId: z.string().uuid().nullable(),
  body: z.string().max(5000),
  replyToId: z.string().uuid().nullable().optional(),
  attachmentUrl: z.string().nullable().optional(),
  attachmentType: z.string().nullable().optional(),
  attachmentName: z.string().nullable().optional(),
  attachmentSize: z.number().int().nonnegative().nullable().optional(),
  status: z.string(),
  readAt: z.string().datetime().or(z.date()).nullable(),
  editedAt: z.string().datetime().or(z.date()).nullable().optional(),
  deletedAt: z.string().datetime().or(z.date()).nullable().optional(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
  replyTo: z
    .object({
      id: z.string().uuid(),
      body: z.string(),
      senderId: z.string().uuid().nullable(),
      status: z.string(),
    })
    .nullable()
    .optional(),
  reactions: z
    .array(z.object({ emoji: z.string(), userId: z.string().uuid() }))
    .optional(),
});

export const conversationSchema = z.object({
  peer: z.object({
    id: z.string().uuid(),
    name: z.string(),
    username: z.string().nullable(),
    status: userStatusSchema,
  }),
  lastMessage: privateChatMessageSchema,
  unreadCount: z.number().int().nonnegative(),
  preference: z
    .object({ pinned: z.boolean(), muted: z.boolean(), archived: z.boolean() })
    .optional(),
});

export const messageSearchResultSchema = privateChatMessageSchema.extend({
  peer: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      username: z.string().nullable(),
      status: userStatusSchema,
    })
    .nullable(),
});

export const conversationListSchema = z.object({
  items: z.array(conversationSchema),
  totalUnread: z.number().int().nonnegative(),
});

export const conversationMessagesSchema = z.object({
  items: z.array(privateChatMessageSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  hasNextPage: z.boolean(),
});

export const userMessageSchema = z.object({
  id: z.string().uuid(),
  type: userMessageTypeSchema,
  category: z.string().max(120).nullable(),
  userId: z.string().uuid().nullable(),
  name: z.string().min(2).max(160),
  email: z.string().email(),
  phone: z.string().max(40).nullable(),
  body: z.string().min(3).max(5000),
  status: userMessageStatusSchema,
  appVersion: z.string().max(80).nullable(),
  systemInfo: z.string().max(500).nullable(),
  readAt: z.string().datetime().or(z.date()).nullable(),
  readById: z.string().uuid().nullable(),
  createdAt: z.string().datetime().or(z.date()).optional(),
  updatedAt: z.string().datetime().or(z.date()).optional(),
  user: adminUserSchema.optional().nullable(),
  readBy: adminUserSchema.optional().nullable(),
});

export const userMessageListSchema = z.object({
  items: z.array(userMessageSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  hasNextPage: z.boolean(),
});

export const notificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  targetType: z.string().nullable().optional(),
  targetId: z.string().nullable().optional(),
  readAt: z.string().datetime().or(z.date()).nullable(),
  createdAt: z.string().datetime().or(z.date()).optional(),
});

const reportTargetOwnerSchema = adminUserSchema
  .extend({
    status: userStatusSchema.optional(),
    username: z.string().nullable().optional(),
    accountType: z.string().optional(),
    phone: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    district: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    companyName: z.string().nullable().optional(),
    followerCount: z.number().int().nonnegative().optional(),
    followingCount: z.number().int().nonnegative().optional(),
    lastOnlineAt: z.string().datetime().or(z.date()).nullable().optional(),
    emailVerified: z.boolean().optional(),
    penaltyScoreLastYear: z.number().int().nonnegative().optional(),
    penaltyScoreAllTime: z.number().int().nonnegative().optional(),
    createdAt: z.string().datetime().or(z.date()).optional(),
  })
  .passthrough();

export const reportGroupSchema = z.object({
  targetType: reportTargetTypeSchema,
  targetId: z.string().uuid(),
  targetSummary: z
    .object({
      title: z.string(),
      subtitle: z.string().nullable().optional(),
      status: z.string().nullable().optional(),
      owner: reportTargetOwnerSchema.nullable().optional(),
      metrics: z.record(z.string(), z.number().int().nonnegative()).optional(),
      payload: z.record(z.string(), z.unknown()).optional(),
    })
    .nullable()
    .optional(),
  totalReports: z.number().int().nonnegative(),
  activeReports: z.number().int().nonnegative(),
  oldReports: z.number().int().nonnegative(),
  violationScore: z.number().int().nonnegative(),
  latestReportAt: z.string().datetime().or(z.date()),
  statuses: z.array(reportStatusSchema),
  reasons: z.array(z.string()),
  note: reportGroupNoteSchema.nullable().optional(),
  comments: z.array(reportGroupCommentSchema).optional(),
  activityLogs: z.array(adminActivityLogSchema).optional(),
  decisions: z.array(moderationDecisionSchema).optional(),
});

export const reportGroupDetailSchema = reportGroupSchema.extend({
  reports: z.array(contentReportSchema),
});

export type EventStatus = z.infer<typeof eventStatusSchema>;
export type EventFormat = z.infer<typeof eventFormatSchema>;
export type TagStatus = z.infer<typeof tagStatusSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type AccountType = z.infer<typeof accountTypeSchema>;
export type CompanyType = z.infer<typeof companyTypeSchema>;
export type BusinessCategory = z.infer<typeof businessCategorySchema>;
export type PrivacyAudience = z.infer<typeof privacyAudienceSchema>;
export type PrivacySettings = z.infer<typeof privacySettingsSchema>;
export type NotificationTopic = z.infer<typeof notificationTopicSchema>;
export type DeliveryChannel = z.infer<typeof deliveryChannelSchema>;
export type NotificationPreference = z.infer<
  typeof notificationPreferenceSchema
>;
export type BlockedTargetType = z.infer<typeof blockedTargetTypeSchema>;
export type UserBlock = z.infer<typeof userBlockSchema>;
export type MemberCard = z.infer<typeof memberCardSchema>;
export type OnboardingStatus = z.infer<typeof onboardingStatusSchema>;
export type MemberPass = z.infer<typeof memberPassSchema>;
export type MemberScan = z.infer<typeof memberScanSchema>;
export type DiscoveryItem = z.infer<typeof discoveryItemSchema>;
export type DiscoveryFeed = z.infer<typeof discoveryFeedSchema>;
export type DiscoverySearch = z.infer<typeof discoverySearchSchema>;
export type PublicProfile = z.infer<typeof publicProfileSchema>;
export type TagSentiment = z.infer<typeof tagSentimentSchema>;
export type TagAffinity = z.infer<typeof tagAffinitySchema>;
export type ProfileTagSuggestion = z.infer<typeof profileTagSuggestionSchema>;
export type TagComment = z.infer<typeof tagCommentSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;
export type EventParticipantStatus = z.infer<
  typeof eventParticipantStatusSchema
>;
export type EventParticipantRole = z.infer<typeof eventParticipantRoleSchema>;
export type EventTicket = z.infer<typeof eventTicketSchema>;
export type ReportTargetType = z.infer<typeof reportTargetTypeSchema>;
export type PostVisibility = z.infer<typeof postVisibilitySchema>;
export type SocialPost = z.infer<typeof socialPostSchema>;
export type SocialPostFeed = z.infer<typeof socialPostFeedSchema>;
export type SocialPostComment = z.infer<typeof socialPostCommentSchema>;
export type ReportStatus = z.infer<typeof reportStatusSchema>;
export type UserMessageType = z.infer<typeof userMessageTypeSchema>;
export type UserMessageStatus = z.infer<typeof userMessageStatusSchema>;
export type AdminPermission = z.infer<typeof adminPermissionSchema>;
export type AdminRoleGroup = z.infer<typeof adminRoleGroupSchema>;
export type CmsCategory = z.infer<typeof cmsCategorySchema>;
export type Faq = z.infer<typeof faqSchema>;
export type Announcement = z.infer<typeof announcementSchema>;
export type PolicyType = z.infer<typeof policyTypeSchema>;
export type CmsPolicy = z.infer<typeof cmsPolicySchema>;
export type Tag = z.infer<typeof tagSchema>;
export type AdminTagDetail = z.infer<typeof adminTagDetailSchema>;
export type Event = z.infer<typeof eventSchema>;
export type FinanceDashboard = z.infer<typeof financeDashboardSchema>;
export type PaymentTransaction = z.infer<typeof paymentTransactionSchema>;
export type CorporateKycApplication = z.infer<
  typeof corporateKycApplicationSchema
>;
export type CorporateKycDocument = z.infer<typeof corporateKycDocumentSchema>;
export type BeneficialOwner = z.infer<typeof beneficialOwnerSchema>;
export type EventList = z.infer<typeof eventListSchema>;
export type AdminDashboard = z.infer<typeof adminDashboardSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type EventParticipant = z.infer<typeof eventParticipantSchema>;
export type ContentReport = z.infer<typeof contentReportSchema>;
export type ReportRule = z.infer<typeof reportRuleSchema>;
export type ReportGroupNote = z.infer<typeof reportGroupNoteSchema>;
export type ReportGroupComment = z.infer<typeof reportGroupCommentSchema>;
export type AdminActivityLog = z.infer<typeof adminActivityLogSchema>;
export type ModerationDecision = z.infer<typeof moderationDecisionSchema>;
export type AdminPlace = z.infer<typeof adminPlaceSchema>;
export type Place = z.infer<typeof placeSchema>;
export type PlaceList = z.infer<typeof placeListSchema>;
export type PlaceMember = z.infer<typeof placeMemberSchema>;
export type CheckInPassport = z.infer<typeof checkInPassportSchema>;
export type PlaceMemberStatus = z.infer<typeof placeMemberStatusSchema>;
export type PlaceMemberRole = z.infer<typeof placeMemberRoleSchema>;
export type AdminMedia = z.infer<typeof adminMediaSchema>;
export type ProfileMedia = z.infer<typeof profileMediaSchema>;
export type AdminComment = z.infer<typeof adminCommentSchema>;
export type AdminPost = z.infer<typeof adminPostSchema>;
export type AdminPrivateMessage = z.infer<typeof adminPrivateMessageSchema>;
export type PrivateChatMessage = z.infer<typeof privateChatMessageSchema>;
export type MessageSearchResult = z.infer<typeof messageSearchResultSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type ConversationList = z.infer<typeof conversationListSchema>;
export type ConversationMessages = z.infer<typeof conversationMessagesSchema>;
export type UserMessage = z.infer<typeof userMessageSchema>;
export type UserMessageList = z.infer<typeof userMessageListSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type ReportGroup = z.infer<typeof reportGroupSchema>;
export type ReportGroupDetail = z.infer<typeof reportGroupDetailSchema>;
export type AdminManagedUser = z.infer<typeof adminManagedUserSchema>;
export type AdminManagedUserList = z.infer<typeof adminManagedUserListSchema>;
export type AdminManagedUserDetail = z.infer<
  typeof adminManagedUserDetailSchema
>;
export type Profile = z.infer<typeof profileSchema>;
