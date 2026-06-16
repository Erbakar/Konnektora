import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { CmsModule } from "./cms/cms.module";
import { EventsModule } from "./events/events.module";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { ProfileModule } from "./profile/profile.module";
import { ReportsModule } from "./reports/reports.module";
import { TagsModule } from "./tags/tags.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CmsModule,
    AdminModule,
    EventsModule,
    ProfileModule,
    ReportsModule,
    TagsModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
