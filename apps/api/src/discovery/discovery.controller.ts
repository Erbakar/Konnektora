import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { OptionalJwtAuthGuard } from "../auth/optional-jwt-auth.guard";
import { DiscoveryFeedQueryDto, DiscoverySearchQueryDto } from "./discovery.dto";
import { DiscoveryService } from "./discovery.service";

@Controller("discover")
@UseGuards(OptionalJwtAuthGuard)
export class DiscoveryController {
  constructor(private readonly discovery: DiscoveryService) {}
  @Get("feed") feed(@Query() query: DiscoveryFeedQueryDto, @CurrentUser() user?: User) { return this.discovery.feed(user?.id, query); }
  @Get("search") search(@Query() query: DiscoverySearchQueryDto, @CurrentUser() user?: User) { return this.discovery.search(query.q, user?.id); }
}
