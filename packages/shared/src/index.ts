import { z } from "zod";

export const eventStatusSchema = z.enum(["draft", "published", "cancelled", "archived"]);
export const eventFormatSchema = z.enum(["online", "offline", "hybrid"]);
export const eventVisibilitySchema = z.enum(["open", "approval_required", "invite_only"]);
export const tagStatusSchema = z.enum(["active", "hidden", "archived"]);
export const userRoleSchema = z.enum(["user", "admin", "super_admin"]);
export const userStatusSchema = z.enum(["invited", "pending", "active", "disabled", "frozen", "deleted", "suspended", "banned"]);
export const eventParticipantStatusSchema = z.enum([
  "invited",
  "requested",
  "accepted",
  "declined",
  "banned",
  "attended"
]);
export const eventParticipantRoleSchema = z.enum(["attendee", "organizer", "manager"]);
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
  "private_message"
]);
export const reportStatusSchema = z.enum(["open", "reviewing", "resolved", "dismissed"]);
export const userMessageTypeSchema = z.enum(["faq", "account_freeze", "write_to_us"]);
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
  "comments.manage",
  "media.manage"
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
  _count: z.object({ users: z.number().int().nonnegative() }).optional()
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
  _count: z.object({ faqs: z.number().int().nonnegative() }).optional()
});

export const faqSchema = z.object({
  id: z.string().uuid(),
  categoryId: z.string().uuid(),
  title: z.string().min(3).max(160),
  body: z.string().min(3),
  status: z.enum(["active", "passive"]),
  createdAt: z.string().datetime().or(z.date()).optional(),
  updatedAt: z.string().datetime().or(z.date()).optional(),
  category: cmsCategorySchema.optional()
});

export const announcementSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3).max(160),
  body: z.string().min(3),
  target: z.enum(["all", "members", "admins"]),
  status: z.enum(["active", "passive"]),
  publishAt: z.string().datetime().or(z.date()),
  expiresAt: z.string().datetime().or(z.date()).nullable(),
  createdAt: z.string().datetime().or(z.date()).optional(),
  updatedAt: z.string().datetime().or(z.date()).optional()
});

export const announcementListSchema = z.array(announcementSchema);

export const policyTypeSchema = z.enum(["privacy", "terms", "cookies"]);

export const cmsPolicySchema = z.object({
  id: z.string().uuid(),
  type: policyTypeSchema,
  title: z.string().min(3).max(160),
  body: z.string().min(10),
  status: z.enum(["active", "passive"]),
  publishedAt: z.string().datetime().or(z.date()).nullable(),
  createdAt: z.string().datetime().or(z.date()).optional(),
  updatedAt: z.string().datetime().or(z.date()).optional()
});

export const tagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(80),
  slug: slugSchema,
  description: z.string().max(500).nullable(),
  categoryId: z.string().uuid().nullable(),
  status: tagStatusSchema,
  usageCount: z.number().int().nonnegative()
});

export const eventSchema = z.object({
  id: z.string().uuid(),
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
  language: z.string().min(2).max(16),
  organizerName: z.string().max(160).nullable(),
  externalRegistrationUrl: z.string().url().nullable(),
  coverImageUrl: z.string().url().nullable(),
  capacity: z.number().int().positive().nullable(),
  tags: z.array(tagSchema)
});

export const eventListSchema = z.object({
  items: z.array(eventSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  hasNextPage: z.boolean()
});

export const adminDashboardSchema = z.object({
  publishedEvents: z.number().int().nonnegative(),
  draftEvents: z.number().int().nonnegative(),
  activeTags: z.number().int().nonnegative(),
  upcomingEvents: z.number().int().nonnegative()
});

export const adminUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: userRoleSchema,
  status: userStatusSchema.optional()
});

export const adminTagDetailSchema = tagSchema.extend({
  category: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      slug: slugSchema,
      description: z.string().nullable().optional(),
      sortOrder: z.number().int().optional()
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
      interestedUsers: z.number().int().nonnegative()
    })
    .optional()
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
      submittedReports: z.number().int().nonnegative()
    })
    .optional()
});

export const adminManagedUserListSchema = z.object({
  items: z.array(adminManagedUserSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  hasNextPage: z.boolean()
});

export const adminManagedUserDetailSchema = adminManagedUserSchema.extend({
  invitedBy: adminUserSchema.nullable().optional(),
  invitedUsers: z.array(adminUserSchema).optional(),
  stats: z.object({
    createdEvents: z.number().int().nonnegative(),
    eventParticipations: z.number().int().nonnegative(),
    submittedReports: z.number().int().nonnegative(),
    resolvedReports: z.number().int().nonnegative()
  }),
  interestTags: z.array(tagSchema)
});

export const eventParticipantSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  userId: z.string().uuid(),
  status: eventParticipantStatusSchema,
  role: eventParticipantRoleSchema,
  checkedInAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime().or(z.date()).optional(),
  updatedAt: z.string().datetime().or(z.date()).optional(),
  user: adminUserSchema.optional()
});

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  user: adminUserSchema
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
      updatedAt: z.string().datetime().or(z.date()).optional()
    })
    .optional()
    .nullable(),
  reporter: adminUserSchema.optional(),
  resolvedBy: adminUserSchema.optional().nullable()
});

export const reportRuleSchema = z.object({
  id: z.string().uuid(),
  targetType: reportTargetTypeSchema,
  title: z.string().min(3).max(160),
  description: z.string().max(500).nullable(),
  violationScore: z.number().int().min(1).max(100),
  status: z.enum(["active", "passive"]),
  createdAt: z.string().datetime().or(z.date()).optional(),
  updatedAt: z.string().datetime().or(z.date()).optional()
});

export const reportGroupNoteSchema = z.object({
  id: z.string().uuid(),
  targetType: reportTargetTypeSchema,
  targetId: z.string().uuid(),
  note: z.string(),
  updatedById: z.string().uuid().nullable().optional(),
  createdAt: z.string().datetime().or(z.date()).optional(),
  updatedAt: z.string().datetime().or(z.date()).optional(),
  updatedBy: adminUserSchema.optional().nullable()
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
    "remove_private_messages"
  ]),
  penaltyScore: z.number().int().nonnegative(),
  note: z.string().max(2000).nullable(),
  userId: z.string().uuid().nullable().optional(),
  issuedById: z.string().uuid().nullable().optional(),
  suspensionEndsAt: z.string().datetime().or(z.date()).nullable(),
  createdAt: z.string().datetime().or(z.date()).optional(),
  user: adminUserSchema.optional().nullable(),
  issuedBy: adminUserSchema.optional().nullable()
});

export const adminPlaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: slugSchema,
  description: z.string().nullable(),
  status: z.string(),
  coverImageUrl: z.string().nullable(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  address: z.string().nullable(),
  followerCount: z.number().int().nonnegative(),
  inviteCount: z.number().int().nonnegative(),
  createdById: z.string().uuid().nullable(),
  updatedById: z.string().uuid().nullable(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
  createdBy: adminUserSchema.optional().nullable(),
  updatedBy: adminUserSchema.optional().nullable(),
  reportCount: z.number().int().nonnegative().optional()
});

export const adminMediaSchema = z.object({
  id: z.string().uuid(),
  url: z.string(),
  type: z.string(),
  status: z.string(),
  contentType: reportTargetTypeSchema,
  contentId: z.string(),
  uploadedById: z.string().uuid().nullable(),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
  uploadedBy: adminUserSchema.optional().nullable(),
  reportCount: z.number().int().nonnegative().optional()
});

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
  parent: z.object({ id: z.string().uuid(), body: z.string(), author: adminUserSchema.optional().nullable() }).optional().nullable(),
  _count: z.object({ replies: z.number().int().nonnegative() }).optional(),
  reportCount: z.number().int().nonnegative().optional()
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
  reportCount: z.number().int().nonnegative().optional()
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
  readBy: adminUserSchema.optional().nullable()
});

export const userMessageListSchema = z.object({
  items: z.array(userMessageSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  hasNextPage: z.boolean()
});

export const reportGroupSchema = z.object({
  targetType: reportTargetTypeSchema,
  targetId: z.string().uuid(),
  totalReports: z.number().int().nonnegative(),
  activeReports: z.number().int().nonnegative(),
  oldReports: z.number().int().nonnegative(),
  violationScore: z.number().int().nonnegative(),
  latestReportAt: z.string().datetime().or(z.date()),
  statuses: z.array(reportStatusSchema),
  reasons: z.array(z.string()),
  note: reportGroupNoteSchema.nullable().optional(),
  decisions: z.array(moderationDecisionSchema).optional()
});

export const reportGroupDetailSchema = reportGroupSchema.extend({
  reports: z.array(contentReportSchema)
});

export type EventStatus = z.infer<typeof eventStatusSchema>;
export type EventFormat = z.infer<typeof eventFormatSchema>;
export type TagStatus = z.infer<typeof tagStatusSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;
export type EventParticipantStatus = z.infer<typeof eventParticipantStatusSchema>;
export type EventParticipantRole = z.infer<typeof eventParticipantRoleSchema>;
export type ReportTargetType = z.infer<typeof reportTargetTypeSchema>;
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
export type EventList = z.infer<typeof eventListSchema>;
export type AdminDashboard = z.infer<typeof adminDashboardSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type EventParticipant = z.infer<typeof eventParticipantSchema>;
export type ContentReport = z.infer<typeof contentReportSchema>;
export type ReportRule = z.infer<typeof reportRuleSchema>;
export type ReportGroupNote = z.infer<typeof reportGroupNoteSchema>;
export type ModerationDecision = z.infer<typeof moderationDecisionSchema>;
export type AdminPlace = z.infer<typeof adminPlaceSchema>;
export type AdminMedia = z.infer<typeof adminMediaSchema>;
export type AdminComment = z.infer<typeof adminCommentSchema>;
export type AdminPrivateMessage = z.infer<typeof adminPrivateMessageSchema>;
export type UserMessage = z.infer<typeof userMessageSchema>;
export type UserMessageList = z.infer<typeof userMessageListSchema>;
export type ReportGroup = z.infer<typeof reportGroupSchema>;
export type ReportGroupDetail = z.infer<typeof reportGroupDetailSchema>;
export type AdminManagedUser = z.infer<typeof adminManagedUserSchema>;
export type AdminManagedUserList = z.infer<typeof adminManagedUserListSchema>;
export type AdminManagedUserDetail = z.infer<typeof adminManagedUserDetailSchema>;
