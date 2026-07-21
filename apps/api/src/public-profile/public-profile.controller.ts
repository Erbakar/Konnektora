import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { OptionalJwtAuthGuard } from "../auth/optional-jwt-auth.guard";
import { PublicProfileService } from "./public-profile.service";

@Controller("users")
export class PublicProfileController {
  constructor(private readonly profiles: PublicProfileService) {}
  @Get(":username") @UseGuards(OptionalJwtAuthGuard)
  get(@Param("username") username: string, @CurrentUser() viewer?: User) { return this.profiles.getByUsername(username, viewer?.id); }
}
