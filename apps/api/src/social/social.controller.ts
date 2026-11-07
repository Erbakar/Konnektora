import { BadRequestException, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SocialService } from "./social.service";

@Controller("social")
@UseGuards(JwtAuthGuard)
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Get("invite-assessment")
  inviteAssessment(@CurrentUser() user: User, @Query("kind") kind: string, @Query("targetId") targetId: string, @Query("ids") value = "") {
    const ids = value.split(",").filter(Boolean); if (!["event","place"].includes(kind) || ids.length>100 || [...ids,targetId].some(id=>!id||!/^[0-9a-f-]{36}$/i.test(id))) throw new BadRequestException("Geçersiz davet değerlendirmesi.");
    return this.socialService.inviteAssessment(user.id,kind as "event"|"place",targetId,ids);
  }

  @Get("compatibility")
  compatibility(@CurrentUser() user: User, @Query("ids") value = "") {
    const ids = value.split(",").filter(Boolean);
    if (ids.length > 100 || ids.some(id => !/^[0-9a-f-]{36}$/i.test(id))) throw new BadRequestException("En fazla 100 geçerli kullanıcı seçiniz.");
    return this.socialService.compatibility(user.id, ids);
  }

  @Get("suggestions")
  suggestions(@CurrentUser() user: User) {
    return this.socialService.suggestions(user.id);
  }

  @Get("following")
  following(@CurrentUser() user: User) {
    return this.socialService.listFollowing(user.id);
  }

  @Get("new-members")
  newMembers(@CurrentUser() user: User) {
    return this.socialService.newMembers(user.id);
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
