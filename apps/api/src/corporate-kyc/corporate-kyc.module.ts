import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdminCorporateKycController, CorporateKycController } from "./corporate-kyc.controller";
import { CorporateKycService } from "./corporate-kyc.service";
import { NotificationsModule } from "../notifications/notifications.module";
@Module({ imports: [AuthModule, NotificationsModule], controllers: [CorporateKycController, AdminCorporateKycController], providers: [CorporateKycService] })
export class CorporateKycModule {}
