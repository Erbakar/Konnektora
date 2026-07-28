import { Body, Controller, Delete, Get, Headers, Post, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
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
