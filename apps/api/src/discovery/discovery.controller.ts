import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { OptionalJwtAuthGuard } from "../auth/optional-jwt-auth.guard";
import { DiscoveryFeedQueryDto, DiscoverySearchQueryDto } from "./discovery.dto";
import { DiscoveryService } from "./discovery.service";

@Controller("discover")
@UseGuards(OptionalJwtAuthGuard)
export class DiscoveryController {
  constructor(private readonly discovery: DiscoveryService) {}
  @Get("feed") feed(@Query() query: DiscoveryFeedQueryDto, @Req() request: { headers: Record<string, string | string[] | undefined> }, @CurrentUser() user?: User) {
    const header = (key: string) => { const value = request.headers[key]; const raw = Array.isArray(value) ? value[0] ?? "" : value ?? ""; try { return decodeURIComponent(raw).trim() || undefined; } catch { return raw.trim() || undefined; } };
    const localizedQuery = {
      ...query,
      city: query.city || header("x-vercel-ip-city") || header("cf-ipcity"),
      country: query.country || header("x-vercel-ip-country") || header("cf-ipcountry"),
    };
    return this.discovery.feed(user?.id, localizedQuery);
  }
  @Get("search") search(@Query() query: DiscoverySearchQueryDto, @CurrentUser() user?: User) { return this.discovery.search(query.q, user?.id); }
}
