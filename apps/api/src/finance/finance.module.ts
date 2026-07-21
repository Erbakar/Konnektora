import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdminFinanceController, FinanceController } from "./finance.controller";
import { FinanceService } from "./finance.service";
@Module({ imports: [AuthModule], controllers: [FinanceController, AdminFinanceController], providers: [FinanceService] })
export class FinanceModule {}
