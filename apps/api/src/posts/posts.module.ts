import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PostsController } from "./posts.controller";
import { PostsService } from "./posts.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({ imports: [AuthModule, NotificationsModule], controllers: [PostsController], providers: [PostsService] })
export class PostsModule {}
