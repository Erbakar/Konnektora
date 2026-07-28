import { Module } from "@nestjs/common";
import { MailModule } from "../mail/mail.module";
import { AuthModule } from "../auth/auth.module";
import { AdminNotificationsController, NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { PushService } from "./push.service";

@Module({
  imports: [AuthModule, MailModule],
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [NotificationsService, PushService],
  exports: [NotificationsService]
})
export class NotificationsModule {}
