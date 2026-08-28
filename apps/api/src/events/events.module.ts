import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MailModule } from "../mail/mail.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SmsModule } from "../sms/sms.module";
import { EventsController } from "./events.controller";
import { EventsService } from "./events.service";

@Module({
  imports: [AuthModule, MailModule, NotificationsModule, SmsModule],
  controllers: [EventsController],
  providers: [EventsService]
})
export class EventsModule {}
