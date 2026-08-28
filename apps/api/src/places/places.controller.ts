import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/optional-jwt-auth.guard";
import {
  CreatePlaceDto,
  InvitePlaceMemberDto,
  PlaceCheckInDecisionDto,
  PlaceCheckInPreviewDto,
  PlaceQueryDto,
  RespondPlaceInviteDto,
  UpdatePlaceDto,
  UpdatePlaceMemberDto,
} from "./places.dto";
import { PlacesService } from "./places.service";

@Controller()
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get("places")
  @UseGuards(OptionalJwtAuthGuard)
  list(@Query() query: PlaceQueryDto, @CurrentUser() user?: User) {
    return this.placesService.list(query, user?.id);
  }

  @Get("places/:slug")
  @UseGuards(OptionalJwtAuthGuard)
  get(@Param("slug") slug: string, @CurrentUser() user?: User) {
    return this.placesService.getBySlug(slug, user?.id);
  }

  @Get("place-stats/:id")
  @UseGuards(JwtAuthGuard)
  stats(@Param("id") id: string, @CurrentUser() user: User) {
    return this.placesService.getInteractionStats(id, user);
  }

  @Get("places/:id/related-users")
  @UseGuards(OptionalJwtAuthGuard)
  relatedUsers(@Param("id") id: string, @CurrentUser() user?: User) {
    return this.placesService.listRelatedUsers(id, user);
  }

  @Post("places")
  @UseGuards(JwtAuthGuard)
  create(@Body() body: CreatePlaceDto, @CurrentUser() user: User) {
    return this.placesService.create(body, user);
  }

  @Get("me/places")
  @UseGuards(JwtAuthGuard)
  listManaged(@CurrentUser() user: User) {
    return this.placesService.listManaged(user);
  }

  @Patch("me/places/:id")
  @UseGuards(JwtAuthGuard)
  update(
    @Param("id") id: string,
    @Body() body: UpdatePlaceDto,
    @CurrentUser() user: User,
  ) {
    return this.placesService.update(id, body, user);
  }

  @Delete("me/places/:id")
  @UseGuards(JwtAuthGuard)
  archive(@Param("id") id: string, @CurrentUser() user: User) {
    return this.placesService.archive(id, user);
  }

  @Post("places/:id/follow")
  @UseGuards(JwtAuthGuard)
  follow(@Param("id") id: string, @CurrentUser() user: User) {
    return this.placesService.follow(id, user.id);
  }

  @Delete("places/:id/follow")
  @UseGuards(JwtAuthGuard)
  unfollow(@Param("id") id: string, @CurrentUser() user: User) {
    return this.placesService.unfollow(id, user.id);
  }

  @Get("places/:id/members")
  @UseGuards(JwtAuthGuard)
  members(@Param("id") id: string, @CurrentUser() user: User) {
    return this.placesService.listMembers(id, user);
  }

  @Post("places/:id/invite")
  @UseGuards(JwtAuthGuard)
  invite(
    @Param("id") id: string,
    @Body() body: InvitePlaceMemberDto,
    @CurrentUser() user: User,
  ) {
    return this.placesService.invite(id, body, user);
  }

  @Patch("places/:id/members/:userId")
  @UseGuards(JwtAuthGuard)
  updateMember(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @Body() body: UpdatePlaceMemberDto,
    @CurrentUser() user: User,
  ) {
    return this.placesService.updateMember(id, userId, body, user);
  }

  @Post("places/:id/members/:userId/check-in")
  @UseGuards(JwtAuthGuard)
  checkIn(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @CurrentUser() user: User,
  ) {
    return this.placesService.checkInMember(id, userId, user);
  }

  @Post("places/:id/check-in/scan")
  @UseGuards(JwtAuthGuard)
  scanCheckIn(
    @Param("id") id: string,
    @Body() body: { payload: string },
    @CurrentUser() user: User,
  ) {
    return this.placesService.checkInMemberPass(id, body.payload, user);
  }

  @Post("places/:id/check-in/preview")
  @UseGuards(JwtAuthGuard)
  previewCheckIn(
    @Param("id") id: string,
    @Body() body: PlaceCheckInPreviewDto,
    @CurrentUser() user: User,
  ) {
    return this.placesService.previewMemberPass(id, body.payload, body.method, user);
  }

  @Get("places/:id/check-in/passport/:userId")
  @UseGuards(JwtAuthGuard)
  passport(
    @Param("id") id: string,
    @Param("userId") memberUserId: string,
    @CurrentUser() user: User,
  ) {
    return this.placesService.getCheckInPassport(id, memberUserId, user);
  }

  @Post("places/:id/check-in/passport/:userId/decision")
  @UseGuards(JwtAuthGuard)
  decidePassport(
    @Param("id") id: string,
    @Param("userId") memberUserId: string,
    @Body() body: PlaceCheckInDecisionDto,
    @CurrentUser() user: User,
  ) {
    return this.placesService.decideCheckInPassport(id, memberUserId, body, user);
  }

  @Put("places/:id/membership")
  @UseGuards(JwtAuthGuard)
  respond(
    @Param("id") id: string,
    @Body() body: RespondPlaceInviteDto,
    @CurrentUser() user: User,
  ) {
    return this.placesService.respondToInvite(id, body.status, user.id);
  }
}
