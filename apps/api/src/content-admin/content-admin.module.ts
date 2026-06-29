import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ContentAdminController } from "./content-admin.controller";
import { ContentAdminService } from "./content-admin.service";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ContentAdminController],
  providers: [ContentAdminService]
})
export class ContentAdminModule {}
