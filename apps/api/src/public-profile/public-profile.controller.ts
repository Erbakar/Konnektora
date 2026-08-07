import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { OptionalJwtAuthGuard } from "../auth/optional-jwt-auth.guard";
import { PublicProfileService } from "./public-profile.service";

@Controller("users")
export class PublicProfileController {
  constructor(private readonly profiles: PublicProfileService) {}
  @Get("id/:id") @UseGuards(OptionalJwtAuthGuard)
  getById(@Param("id") id: string, @CurrentUser() viewer?: User) { return this.profiles.getById(id, viewer?.id); }
  @Get(":username") @UseGuards(OptionalJwtAuthGuard)
  get(@Param("username") username: string, @CurrentUser() viewer?: User) { return this.profiles.getByUsername(username, viewer?.id); }
}
