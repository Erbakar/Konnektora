import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OnboardingJwtAuthGuard } from "../auth/onboarding-jwt-auth.guard";
import { CreateProfileTagSuggestionDto, CreateUserBlockDto, DecideProfileTagSuggestionDto, UpgradeCorporateAccountDto, UpdateNotificationPreferencesDto, UpdatePrivacySettingsDto, UpdateProfileDto, UpdateProfileInterestsDto, UpdateTagAffinitiesDto } from "./profile.dto";
import { ProfileService } from "./profile.service";

@Controller("profile")
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @UseGuards(OnboardingJwtAuthGuard)
  getProfile(@CurrentUser() user: User) {
    return this.profileService.getProfile(user.id);
  }

  @Put()
  @UseGuards(OnboardingJwtAuthGuard)
  updateProfile(@CurrentUser() user: User, @Body() body: UpdateProfileDto) {
    return this.profileService.updateProfile(user.id, body);
  }

  @Patch("language")
  @UseGuards(JwtAuthGuard)
  updatePreferredLanguage(@CurrentUser() user: User, @Body() body: { language?: string }) {
    return this.profileService.updatePreferredLanguage(user.id, body.language);
  }

  @Post("upgrade-corporate")
  @UseGuards(JwtAuthGuard)
  upgradeCorporateAccount(@CurrentUser() user: User, @Body() body: UpgradeCorporateAccountDto) {
    return this.profileService.upgradeCorporateAccount(user.id, body);
  }

  @Get("privacy")
  @UseGuards(JwtAuthGuard)
  getPrivacySettings(@CurrentUser() user: User) {
    return this.profileService.getPrivacySettings(user.id);
  }

  @Put("privacy")
  @UseGuards(JwtAuthGuard)
  updatePrivacySettings(@CurrentUser() user: User, @Body() body: UpdatePrivacySettingsDto) {
    return this.profileService.updatePrivacySettings(user.id, body);
  }

  @Get("notification-preferences")
  @UseGuards(JwtAuthGuard)
  getNotificationPreferences(@CurrentUser() user: User) {
    return this.profileService.getNotificationPreferences(user.id);
  }

  @Put("notification-preferences")
  @UseGuards(JwtAuthGuard)
  updateNotificationPreferences(@CurrentUser() user: User, @Body() body: UpdateNotificationPreferencesDto) {
    return this.profileService.updateNotificationPreferences(user.id, body);
  }

  @Get("blocks")
  @UseGuards(JwtAuthGuard)
  listBlocks(@CurrentUser() user: User) {
    return this.profileService.listBlocks(user.id);
  }

  @Post("blocks")
  @UseGuards(JwtAuthGuard)
  createBlock(@CurrentUser() user: User, @Body() body: CreateUserBlockDto) {
    return this.profileService.createBlock(user.id, body);
  }

  @Delete("blocks/:targetType/:targetId")
  @UseGuards(JwtAuthGuard)
  removeBlock(@CurrentUser() user: User, @Param("targetType") targetType: string, @Param("targetId") targetId: string) {
    return this.profileService.removeBlock(user.id, targetType, targetId);
  }

  @Get("interests")
  @UseGuards(OnboardingJwtAuthGuard)
  getInterests(@CurrentUser() user: User) {
    return this.profileService.getInterests(user.id);
  }

  @Get("affinities")
  @UseGuards(OnboardingJwtAuthGuard)
  getAffinities(@CurrentUser() user: User) {
    return this.profileService.getAffinities(user.id);
  }

  @Put("affinities")
  @UseGuards(OnboardingJwtAuthGuard)
  updateAffinities(@CurrentUser() user: User, @Body() body: UpdateTagAffinitiesDto) {
    return this.profileService.updateAffinities(user.id, body.affinities);
  }

  @Get("tag-suggestions")
  @UseGuards(JwtAuthGuard)
  listTagSuggestions(@CurrentUser() user: User) {
    return this.profileService.listTagSuggestions(user.id);
  }

  @Post("tag-suggestions/:targetUserId")
  @UseGuards(JwtAuthGuard)
  createTagSuggestion(@CurrentUser() user: User, @Param("targetUserId") targetUserId: string, @Body() body: CreateProfileTagSuggestionDto) {
    return this.profileService.createTagSuggestion(user.id, targetUserId, body);
  }

  @Patch("tag-suggestions/:id")
  @UseGuards(JwtAuthGuard)
  decideTagSuggestion(@CurrentUser() user: User, @Param("id") id: string, @Body() body: DecideProfileTagSuggestionDto) {
    return this.profileService.decideTagSuggestion(user.id, id, body.action);
  }

  @Put("interests")
  @UseGuards(OnboardingJwtAuthGuard)
  updateInterests(@CurrentUser() user: User, @Body() body: UpdateProfileInterestsDto) {
    return this.profileService.updateInterests(user.id, body.tagIds);
  }

  @Get("notifications")
  @UseGuards(JwtAuthGuard)
  getNotifications(@CurrentUser() user: User) {
    return this.profileService.getNotifications(user.id);
  }

  @Patch("notifications/:id/read")
  @UseGuards(JwtAuthGuard)
  markNotificationRead(@CurrentUser() user: User, @Param("id") id: string) {
    return this.profileService.markNotificationRead(user.id, id);
  }
}
