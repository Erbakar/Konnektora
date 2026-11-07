import { WalletGuard } from "../finance/wallet-access.controller";
import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { AdminGuard } from "../auth/admin.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../auth/permissions";
import { CuratorAgreementDto, CuratorEntryDto } from "./curator-finance.dto";
import { CuratorFinanceService } from "./curator-finance.service";
@Controller("admin/finance/curators") @UseGuards(AdminGuard) @RequirePermissions("finance.manage")
export class AdminCuratorFinanceController {
 constructor(private readonly finance: CuratorFinanceService) {}
 @Get("events") events(@Query("q") q = "") { return this.finance.events(q); }
 @Get("candidates") candidates(@Query("q") q = "") { return this.finance.candidates(q); }
 @Get() list() { return this.finance.list(); }
 @Get(":id/agreements") agreements(@Param("id") id: string) { return this.finance.agreements(id); }
 @Post(":id/agreements") save(@Param("id") id: string, @Body() body: CuratorAgreementDto, @CurrentUser() user: User) { return this.finance.saveAgreement(id, body, user); }
 @Get(":id/ledger") ledger(@Param("id") id: string, @Query() query: Record<string,string>) { return this.finance.ledger(id, query); }
 @Post(":id/ledger") entry(@Param("id") id: string, @Body() body: CuratorEntryDto, @CurrentUser() user: User) { return this.finance.manual(id, body, user); }
 @Post(":id/ledger/:entryId/correction") correct(@Param("id") id: string, @Param("entryId") entryId: string, @Body() body: CuratorEntryDto, @CurrentUser() user: User) { return this.finance.manual(id, body, user, entryId); }
}
@Controller("curators/finance") @UseGuards(JwtAuthGuard, WalletGuard)
export class CuratorFinanceController {
 constructor(private readonly finance: CuratorFinanceService) {}
 @Get() ledger(@CurrentUser() user: User, @Query() query: Record<string,string>) { return this.finance.ownLedger(user, query); }
}
