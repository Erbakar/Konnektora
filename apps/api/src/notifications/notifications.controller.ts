import { Body, Controller, Delete, Get, Headers, Param, Post, Query, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { AdminGuard } from "../auth/admin.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../auth/permissions";
import { RegisterPushSubscriptionDto } from "./notifications.dto";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get("push/public-key")
  publicKey() {
    return this.notifications.publicKey();
  }

  @Post("push/subscriptions")
  @UseGuards(JwtAuthGuard)
  register(@CurrentUser() user: User, @Body() body: RegisterPushSubscriptionDto, @Headers("user-agent") userAgent?: string) {
    return this.notifications.registerPushSubscription(user.id, body, userAgent);
  }

  @Delete("push/subscriptions")
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUser() user: User, @Body("endpoint") endpoint: string) {
    return this.notifications.removePushSubscription(user.id, endpoint);
  }
}

@Controller("admin/notifications")
@UseGuards(AdminGuard)
@RequirePermissions("messages.manage")
export class AdminNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get("deliveries")
  list(@Query("status") status?: string) {
    return this.notifications.listDeliveries(status);
  }

  @Post("deliveries/:id/retry")
  retry(@Param("id") id: string) {
    return this.notifications.retryDelivery(id);
  }
}
