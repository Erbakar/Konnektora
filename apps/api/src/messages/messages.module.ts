import { MailModule } from "../mail/mail.module";
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MessagesController } from "./messages.controller";
import { MessagesService } from "./messages.service";

@Module({
  imports: [AuthModule, MailModule],
  controllers: [MessagesController],
  providers: [MessagesService]
})
export class MessagesModule {}
