import { Body, Controller, Get, Param, Patch, Put, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UpdateProfileInterestsDto } from "./profile.dto";
import { ProfileService } from "./profile.service";

@Controller("profile")
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get("interests")
  getInterests(@CurrentUser() user: User) {
    return this.profileService.getInterests(user.id);
  }

  @Put("interests")
  updateInterests(@CurrentUser() user: User, @Body() body: UpdateProfileInterestsDto) {
    return this.profileService.updateInterests(user.id, body.tagIds);
  }

  @Get("notifications")
  getNotifications(@CurrentUser() user: User) {
    return this.profileService.getNotifications(user.id);
  }

  @Patch("notifications/:id/read")
  markNotificationRead(@CurrentUser() user: User, @Param("id") id: string) {
    return this.profileService.markNotificationRead(user.id, id);
  }
}
