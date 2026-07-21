import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { IdentityService } from "./identity.service";
import { ScanMemberDto } from "./identity.dto";

@Controller("me")
@UseGuards(JwtAuthGuard)
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Get("onboarding") status(@CurrentUser() user: User) { return this.identityService.onboardingStatus(user.id); }
  @Post("onboarding/complete") complete(@CurrentUser() user: User) { return this.identityService.completeOnboarding(user.id); }
  @Get("member-pass") pass(@CurrentUser() user: User) { return this.identityService.memberPass(user.id); }
  @Patch("member-pass/rotate") rotate(@CurrentUser() user: User) { return this.identityService.rotateMemberPass(user.id); }
  @Post("member-scans") scan(@CurrentUser() user: User, @Body() body: ScanMemberDto) { return this.identityService.scan(user.id, body); }
  @Get("member-scans") history(@CurrentUser() user: User) { return this.identityService.scanHistory(user.id); }
}
