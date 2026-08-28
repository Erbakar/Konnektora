import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [ProfileController],
  providers: [ProfileService]
})
export class ProfileModule {}
