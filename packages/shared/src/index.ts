import { z } from "zod";

export const eventStatusSchema = z.enum(["draft", "published", "cancelled", "archived"]);
export const eventFormatSchema = z.enum(["online", "offline", "hybrid"]);
export const eventVisibilitySchema = z.enum(["open", "approval_required", "invite_only"]);
export const tagStatusSchema = z.enum(["active", "hidden", "archived"]);
export const userRoleSchema = z.enum(["user", "admin", "super_admin"]);

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
  visibility: eventVisibilitySchema.default("open"),
  city: z.string().max(120).nullable(),
  country: z.string().max(120).nullable(),
  language: z.string().min(2).max(16),
  organizerName: z.string().max(160).nullable(),
  externalRegistrationUrl: z.string().url().nullable(),
  coverImageUrl: z.string().url().nullable(),
  capacity: z.number().int().positive().nullable(),
  tags: z.array(tagSchema)
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
  role: userRoleSchema
});

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  user: adminUserSchema
});

export type EventStatus = z.infer<typeof eventStatusSchema>;
export type EventFormat = z.infer<typeof eventFormatSchema>;
export type TagStatus = z.infer<typeof tagStatusSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type Tag = z.infer<typeof tagSchema>;
export type Event = z.infer<typeof eventSchema>;
export type AdminDashboard = z.infer<typeof adminDashboardSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
