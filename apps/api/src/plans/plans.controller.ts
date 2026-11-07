import { Body, Controller, Get, Param, Put, Post, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { PlanCatalog } from "./plan-catalog";
import { AdminGuard } from "../auth/admin.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { RequirePermissions } from "../auth/permissions";
import { PlansService } from "./plans.service";
@Controller("plans")
export class PlansController {
 constructor(private readonly service:PlansService){}
 @Get() catalog(){return this.service.catalog();}
}
@Controller("admin/plans") @UseGuards(AdminGuard) @RequirePermissions("finance.manage")
export class AdminPlansController {
 constructor(private readonly service:PlansService){}
 @Put() update(@Body() body:{revision:number;plans:PlanCatalog},@CurrentUser() user:User){return this.service.update(body,user);}
 @Post("gifts/:userId") gift(@Param("userId") id:string,@Body() body:{audience:string;plan:string;duration:number;unit:string;reason:string;revoke?:boolean},@CurrentUser() user:User){return this.service.gift(id,body,user);}
 @Get("history") history(){return this.service.history();}
}
