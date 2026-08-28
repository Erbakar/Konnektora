import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { IdentityController } from "./identity.controller";
import { IdentityService } from "./identity.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [IdentityController],
  providers: [IdentityService],
  exports: [IdentityService],
})
export class IdentityModule {}
