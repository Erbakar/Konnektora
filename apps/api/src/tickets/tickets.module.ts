import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MailModule } from "../mail/mail.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SmsModule } from "../sms/sms.module";
import { TicketsController } from "./tickets.controller";
import { TicketsService } from "./tickets.service";
@Module({ imports: [AuthModule, MailModule, NotificationsModule, SmsModule], controllers: [TicketsController], providers: [TicketsService] }) export class TicketsModule {}
