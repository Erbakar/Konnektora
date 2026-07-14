import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { AdminGuard } from "../auth/admin.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/optional-jwt-auth.guard";
import { RequirePermissions } from "../auth/permissions";
import { CreateEventDto, EventQueryDto, InviteParticipantDto, UpdateParticipantDto } from "./events.dto";
import { EventsService } from "./events.service";

@Controller()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get("events")
  @UseGuards(OptionalJwtAuthGuard)
  listPublicEvents(@Query() query: EventQueryDto, @CurrentUser() user?: User) {
    return this.eventsService.listPublicEvents(query, user?.id);
  }

  @Get("events/:slug")
  @UseGuards(OptionalJwtAuthGuard)
  getPublicEvent(@Param("slug") slug: string, @CurrentUser() user?: User) {
    return this.eventsService.getPublicEvent(slug, user?.id);
  }

  @Post("events")
  @UseGuards(JwtAuthGuard)
  createUserEvent(@Body() body: CreateEventDto, @CurrentUser() user: User) {
    return this.eventsService.createEvent(body, user.id);
  }

  @Get("me/events")
  @UseGuards(JwtAuthGuard)
  listMyEvents(@CurrentUser() user: User) {
    return this.eventsService.listManagedEvents(user);
  }

  @Patch("me/events/:id")
  @UseGuards(JwtAuthGuard)
  updateMyEvent(@Param("id") id: string, @Body() body: Partial<CreateEventDto>, @CurrentUser() user: User) {
    return this.eventsService.updateManagedEvent(id, body, user);
  }

  @Delete("me/events/:id")
  @UseGuards(JwtAuthGuard)
  archiveMyEvent(@Param("id") id: string, @CurrentUser() user: User) {
    return this.eventsService.archiveManagedEvent(id, user);
  }

  @Get("events/:id/participants")
  @UseGuards(JwtAuthGuard)
  listParticipants(@Param("id") id: string, @CurrentUser() user: User) {
    return this.eventsService.listParticipants(id, user);
  }

  @Post("events/:id/attend")
  @UseGuards(JwtAuthGuard)
  requestAttendance(@Param("id") id: string, @CurrentUser() user: User) {
    return this.eventsService.requestAttendance(id, user.id);
  }

  @Post("events/:id/invite")
  @UseGuards(JwtAuthGuard)
  inviteParticipant(@Param("id") id: string, @Body() body: InviteParticipantDto, @CurrentUser() user: User) {
    return this.eventsService.inviteParticipant(id, body, user);
  }

  @Patch("events/:id/participants/:userId")
  @UseGuards(JwtAuthGuard)
  updateParticipant(
    @Param("id") id: string,
    @Param("userId") participantUserId: string,
    @Body() body: UpdateParticipantDto,
    @CurrentUser() user: User
  ) {
    return this.eventsService.updateParticipantStatus(id, participantUserId, body.status, user);
  }

  @Post("events/:id/participants/:userId/check-in")
  @UseGuards(JwtAuthGuard)
  checkInParticipant(@Param("id") id: string, @Param("userId") participantUserId: string, @CurrentUser() user: User) {
    return this.eventsService.checkInParticipant(id, participantUserId, user);
  }

  @Get("admin/events")
  @UseGuards(AdminGuard)
  @RequirePermissions("events.manage")
  listAdminEvents() {
    return this.eventsService.listAdminEvents();
  }

  @Post("admin/events")
  @UseGuards(AdminGuard)
  @RequirePermissions("events.manage")
  createEvent(@Body() body: CreateEventDto, @CurrentUser() user: User) {
    return this.eventsService.createEvent(body, user.id);
  }

  @Patch("admin/events/:id")
  @UseGuards(AdminGuard)
  @RequirePermissions("events.manage")
  updateEvent(@Param("id") id: string, @Body() body: Partial<CreateEventDto>, @CurrentUser() user: User) {
    return this.eventsService.updateEvent(id, body, user.id);
  }

  @Delete("admin/events/:id")
  @UseGuards(AdminGuard)
  @RequirePermissions("events.manage")
  archiveEvent(@Param("id") id: string, @CurrentUser() user: User) {
    return this.eventsService.archiveEvent(id, user.id);
  }
}
