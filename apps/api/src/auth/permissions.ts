import { SetMetadata } from "@nestjs/common";

export const ADMIN_PERMISSIONS = [
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
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const REQUIRED_PERMISSIONS_KEY = "requiredAdminPermissions";

export const RequirePermissions = (...permissions: AdminPermission[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
