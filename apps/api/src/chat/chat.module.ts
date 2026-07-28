import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";

@Module({ imports: [AuthModule, PrismaModule, NotificationsModule], controllers: [ChatController], providers: [ChatService] })
export class ChatModule {}
