import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { AdminGuard } from "../auth/admin.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateEventDto, EventQueryDto } from "./events.dto";
import { EventsService } from "./events.service";

@Controller()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get("events")
  listPublicEvents(@Query() query: EventQueryDto) {
    return this.eventsService.listPublicEvents(query);
  }

  @Get("events/:slug")
  getPublicEvent(@Param("slug") slug: string) {
    return this.eventsService.getPublicEvent(slug);
  }

  @Post("events")
  @UseGuards(JwtAuthGuard)
  createUserEvent(@Body() body: CreateEventDto, @CurrentUser() user: User) {
    return this.eventsService.createEvent(body, user.id);
  }

  @Get("admin/events")
  @UseGuards(AdminGuard)
  listAdminEvents() {
    return this.eventsService.listAdminEvents();
  }

  @Post("admin/events")
  @UseGuards(AdminGuard)
  createEvent(@Body() body: CreateEventDto, @CurrentUser() user: User) {
    return this.eventsService.createEvent(body, user.id);
  }

  @Patch("admin/events/:id")
  @UseGuards(AdminGuard)
  updateEvent(@Param("id") id: string, @Body() body: Partial<CreateEventDto>, @CurrentUser() user: User) {
    return this.eventsService.updateEvent(id, body, user.id);
  }

  @Delete("admin/events/:id")
  @UseGuards(AdminGuard)
  archiveEvent(@Param("id") id: string, @CurrentUser() user: User) {
    return this.eventsService.archiveEvent(id, user.id);
  }
}
