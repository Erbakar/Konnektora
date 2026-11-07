import { WalletGuard } from "./wallet-access.controller";
import { Body, Controller, Get, Param, ParseEnumPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AdminGuard } from "../auth/admin.guard";
import { RequirePermissions } from "../auth/permissions";
import { KycStatus, PayoutStatus } from "@prisma/client";
import { BusinessPlanDto, ConfirmPaymentDto, CreatePaymentDto, FinanceSettingsDto, MemberPlanDto, PayoutDto, RefundPaymentDto } from "./finance.dto";
import { FinanceService } from "./finance.service";

@Controller() @UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}
  @Get("me/membership") membership(@CurrentUser() user: User) { return this.finance.membership(user); }
  @Get("me/finance/transactions") @UseGuards(WalletGuard) history(@Query() query: Record<string,string>, @CurrentUser() user: User) { return this.finance.transactionsPage(query, user); }
  @Get("me/finance") @UseGuards(WalletGuard) dashboard(@CurrentUser() user: User) { return this.finance.dashboard(user); }
  @Patch("me/finance/settings") @UseGuards(WalletGuard) settings(@Body() body: FinanceSettingsDto, @CurrentUser() user: User) { return this.finance.updateSettings(user, body); }
  @Post("me/finance/kyc") kyc(@CurrentUser() user: User) { return this.finance.startKyc(user); }
  @Post("events/:eventId/payments") create(@Param("eventId") eventId: string, @Body() body: CreatePaymentDto, @CurrentUser() user: User) { return this.finance.createPayment(eventId, user, body); }
  @Post("me/payments/:id/confirm") confirm(@Param("id") id: string, @Body() body: ConfirmPaymentDto, @CurrentUser() user: User) { return this.finance.confirm(id, user, body); }
  @Post("me/payments/:id/refund") refund(@Param("id") id: string, @Body() body: RefundPaymentDto, @CurrentUser() user: User) { return this.finance.refund(id, user, body); }
  @Post("me/finance/payouts") @UseGuards(WalletGuard) payout(@Body() body: PayoutDto, @CurrentUser() user: User) { return this.finance.payout(user, body); }
  @Post("me/finance/plan") plan(@Body() body: BusinessPlanDto, @CurrentUser() user: User) { return this.finance.changeBusinessPlan(user, body); }
  @Post("me/finance/member-plan") memberPlan(@Body() body: MemberPlanDto, @CurrentUser() user: User) { return this.finance.changeMemberPlan(user, body); }
}

@Controller("admin/finance") @UseGuards(AdminGuard) @RequirePermissions("finance.manage")
export class AdminFinanceController {
  constructor(private readonly finance: FinanceService) {}
  @Get("platform-report") platformReport(@Query() query: Record<string,string>) { return this.finance.platformReport(query); }
  @Get("held-events/:id") heldDetail(@Param("id") id:string) { return this.finance.heldEventDetail(id); }
  @Get("held-events") heldEvents() { return this.finance.listHeldEvents(); }
  @Post("held-events/:id/release") release(@Param("id") id: string, @CurrentUser() user: User) { return this.finance.releaseEventIncome(id, user); }
  @Get("transactions/page") history(@Query() query: Record<string,string>) { return this.finance.transactionsPage(query); }
  @Get("transactions") transactions() { return this.finance.listAdminTransactions(); }
  @Get("accounts") accounts() { return this.finance.listAdminAccounts(); }
  @Get("payouts") payouts() { return this.finance.listAdminPayouts(); }
  @Patch("accounts/:userId/kyc") kyc(@Param("userId") userId: string, @Body("status", new ParseEnumPipe(KycStatus)) status: KycStatus) { return this.finance.updateKyc(userId, status); }
  @Patch("payouts/:id") payout(@Param("id") id: string, @Body("status", new ParseEnumPipe(PayoutStatus)) status: PayoutStatus) { return this.finance.updatePayout(id, status); }
}
