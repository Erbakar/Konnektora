import { z } from "zod";

export const eventStatusSchema = z.enum(["draft", "published", "cancelled", "archived"]);
export const eventFormatSchema = z.enum(["online", "offline", "hybrid"]);
export const eventVisibilitySchema = z.enum(["open", "approval_required", "invite_only"]);
export const tagStatusSchema = z.enum(["active", "hidden", "archived"]);
export const userRoleSchema = z.enum(["user", "admin", "super_admin"]);
export const userStatusSchema = z.enum(["invited", "pending", "active", "disabled"]);
export const eventParticipantStatusSchema = z.enum([
  "invited",
  "requested",
  "accepted",
  "declined",
  "banned",
  "attended"
]);
export const eventParticipantRoleSchema = z.enum(["attendee", "organizer", "manager"]);
export const reportTargetTypeSchema = z.enum(["event", "tag", "user"]);
export const reportStatusSchema = z.enum(["open", "reviewing", "resolved", "dismissed"]);

export const slugSchema = z
  .string()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

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
  reporter: adminUserSchema.optional(),
  resolvedBy: adminUserSchema.optional().nullable()
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
export type Tag = z.infer<typeof tagSchema>;
export type Event = z.infer<typeof eventSchema>;
export type EventList = z.infer<typeof eventListSchema>;
export type AdminDashboard = z.infer<typeof adminDashboardSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type EventParticipant = z.infer<typeof eventParticipantSchema>;
export type ContentReport = z.infer<typeof contentReportSchema>;
