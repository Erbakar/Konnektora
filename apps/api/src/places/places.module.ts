import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { PlacesController } from "./places.controller";
import { PlacesService } from "./places.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [AuthModule, PrismaModule, NotificationsModule],
  controllers: [PlacesController],
  providers: [PlacesService]
})
export class PlacesModule {}
