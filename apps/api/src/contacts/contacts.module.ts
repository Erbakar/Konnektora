import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MailModule } from "../mail/mail.module";
import { SmsModule } from "../sms/sms.module";
import { ContactsController } from "./contacts.controller";
import { ContactsService } from "./contacts.service";

@Module({
  imports: [AuthModule, MailModule, SmsModule],
  controllers: [ContactsController],
  providers: [ContactsService],
})
export class ContactsModule {}
