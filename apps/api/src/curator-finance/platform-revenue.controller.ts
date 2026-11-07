import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { AdminGuard } from "../auth/admin.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { RequirePermissions } from "../auth/permissions";
import { PlatformRevenueService } from "./platform-revenue.service";
import { PlatformRevenueDto, RevenueRefundDto } from "./platform-revenue.dto";
@Controller("admin/finance/revenues") @UseGuards(AdminGuard) @RequirePermissions("finance.manage")
export class PlatformRevenueController {
 constructor(private readonly service:PlatformRevenueService) {}
 @Get() list(){return this.service.list();}
 @Post() record(@Body() body:PlatformRevenueDto,@CurrentUser() user:User){return this.service.record(body,user);}
 @Post(":id/refund") refund(@Param("id") id:string,@Body() body:RevenueRefundDto){return this.service.refund(id,body.refundedAmount);}
}
