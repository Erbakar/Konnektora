import { Module } from "@nestjs/common";
import { MailModule } from "../mail/mail.module";
import { SmsModule } from "../sms/sms.module";
import { AutomationsController } from "./automations.controller";
import { AutomationsService } from "./automations.service";
@Module({ imports: [MailModule, SmsModule], controllers: [AutomationsController], providers: [AutomationsService] }) export class AutomationsModule {}
