import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { CmsModule } from "./cms/cms.module";
import { ChatModule } from "./chat/chat.module";
import { ContentAdminModule } from "./content-admin/content-admin.module";
import { ContentModule } from "./content/content.module";
import { ContactsModule } from "./contacts/contacts.module";
import { EventsModule } from "./events/events.module";
import { HealthController } from "./health.controller";
import { MessagesModule } from "./messages/messages.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProfileModule } from "./profile/profile.module";
import { PlacesModule } from "./places/places.module";
import { ReportsModule } from "./reports/reports.module";
import { TagsModule } from "./tags/tags.module";
import { SocialModule } from "./social/social.module";
import { IdentityModule } from "./identity/identity.module";
import { DiscoveryModule } from "./discovery/discovery.module";
import { PublicProfileModule } from "./public-profile/public-profile.module";
import { ProfileVerificationModule } from "./profile-verification/profile-verification.module";
import { PostsModule } from "./posts/posts.module";
import { FinanceModule } from "./finance/finance.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CmsModule,
    ChatModule,
    ContentAdminModule,
    ContentModule,
    ContactsModule,
    DiscoveryModule,
    AdminModule,
    EventsModule,
    FinanceModule,
    IdentityModule,
    MessagesModule,
    ProfileModule,
    PublicProfileModule,
    ProfileVerificationModule,
    PostsModule,
    PlacesModule,
    ReportsModule,
    SocialModule,
    TagsModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
