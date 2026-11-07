import { PlansService } from "../plans/plans.service";
import { PlansController, AdminPlansController } from "../plans/plans.controller";
import { PlatformRevenueService } from "../curator-finance/platform-revenue.service";
import { PlatformRevenueController } from "../curator-finance/platform-revenue.controller";
import { SmsModule } from "../sms/sms.module";
import { MailModule } from "../mail/mail.module";
import { WalletAccessController, WalletGuard } from "./wallet-access.controller";
import { WalletAccessService } from "./wallet-access.service";
import { AdminFinanceInvoicesController, FinanceInvoicesController } from "./finance-invoices.controller";
import { FinanceInvoicesService } from "./finance-invoices.service";
import { AdminCuratorFinanceController, CuratorFinanceController } from "../curator-finance/curator-finance.controller";
import { CuratorFinanceService } from "../curator-finance/curator-finance.service";
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdminFinanceController, FinanceController } from "./finance.controller";
import { FinanceService } from "./finance.service";
@Module({ imports: [AuthModule, SmsModule, MailModule], controllers: [PlansController, AdminPlansController, PlatformRevenueController, WalletAccessController, FinanceController, AdminFinanceController, AdminCuratorFinanceController, CuratorFinanceController, AdminFinanceInvoicesController, FinanceInvoicesController], providers: [PlansService, PlatformRevenueService, WalletAccessService, WalletGuard, FinanceService, CuratorFinanceService, FinanceInvoicesService] })
export class FinanceModule {}
