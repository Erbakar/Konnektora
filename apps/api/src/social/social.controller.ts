import { Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SocialService } from "./social.service";

@Controller("social")
@UseGuards(JwtAuthGuard)
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Get("suggestions")
  suggestions(@CurrentUser() user: User) {
    return this.socialService.suggestions(user.id);
  }

  @Get("following")
  following(@CurrentUser() user: User) {
    return this.socialService.listFollowing(user.id);
  }

  @Post("following/:targetUserId")
  follow(@CurrentUser() user: User, @Param("targetUserId") targetUserId: string) {
    return this.socialService.follow(user.id, targetUserId);
  }

  @Delete("following/:targetUserId")
  unfollow(@CurrentUser() user: User, @Param("targetUserId") targetUserId: string) {
    return this.socialService.unfollow(user.id, targetUserId);
  }
}
