import { Body, CanActivate, Controller, ExecutionContext, Injectable, Post, Req, UseGuards } from "@nestjs/common";
import { IsString, Matches } from "class-validator";
import { Request } from "express";
import { User } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { WalletAccessService } from "./wallet-access.service";
class WalletCodeDto { @IsString() @Matches(/^\d{8}$/) code!: string; }
@Injectable()
export class WalletGuard implements CanActivate {
  constructor(private readonly wallet: WalletAccessService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request & { user: User }>();
    await this.wallet.authorize(req.user, req.get("authorization") ?? "", req.get("x-wallet-token") ?? "");
    req.res?.setHeader("Cache-Control", "private, no-store");
    return true;
  }
}
@Controller("me/wallet") @UseGuards(JwtAuthGuard)
export class WalletAccessController {
  constructor(private readonly wallet: WalletAccessService) {}
  @Post("request") request(@CurrentUser() user: User, @Req() req: Request) { return this.wallet.request(user, req.get("authorization") ?? ""); }
  @Post("verify") verify(@CurrentUser() user: User, @Req() req: Request, @Body() body: WalletCodeDto) { return this.wallet.verify(user, req.get("authorization") ?? "", body.code, { ip: req.ip ?? "", agent: (req.get("user-agent") ?? "").slice(0, 300) }); }
  @Post("close") close(@CurrentUser() user: User, @Req() req: Request) { return this.wallet.close(user, req.get("authorization") ?? ""); }
}
