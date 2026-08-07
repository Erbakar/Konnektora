import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/optional-jwt-auth.guard";
import { CuratorApplicationDto } from "./curators.dto";
import { CuratorsService } from "./curators.service";
@Controller("curators") export class CuratorsController { constructor(private readonly service: CuratorsService) {}
  @Post("applications") @UseGuards(OptionalJwtAuthGuard) apply(@Body() body: CuratorApplicationDto, @CurrentUser() user?: User) { return this.service.apply(body, user); }
  @Get("dashboard") @UseGuards(JwtAuthGuard) dashboard(@CurrentUser() user: User) { return this.service.dashboard(user); }
}
