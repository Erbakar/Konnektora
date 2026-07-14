import { Body, Controller, Get, Param, Patch, Put, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UpdateNotificationPreferencesDto, UpdatePrivacySettingsDto, UpdateProfileDto, UpdateProfileInterestsDto } from "./profile.dto";
import { ProfileService } from "./profile.service";

@Controller("profile")
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getProfile(@CurrentUser() user: User) {
    return this.profileService.getProfile(user.id);
  }

  @Put()
  updateProfile(@CurrentUser() user: User, @Body() body: UpdateProfileDto) {
    return this.profileService.updateProfile(user.id, body);
  }

  @Get("privacy")
  getPrivacySettings(@CurrentUser() user: User) {
    return this.profileService.getPrivacySettings(user.id);
  }

  @Put("privacy")
  updatePrivacySettings(@CurrentUser() user: User, @Body() body: UpdatePrivacySettingsDto) {
    return this.profileService.updatePrivacySettings(user.id, body);
  }

  @Get("notification-preferences")
  getNotificationPreferences(@CurrentUser() user: User) {
    return this.profileService.getNotificationPreferences(user.id);
  }

  @Put("notification-preferences")
  updateNotificationPreferences(@CurrentUser() user: User, @Body() body: UpdateNotificationPreferencesDto) {
    return this.profileService.updateNotificationPreferences(user.id, body);
  }

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
