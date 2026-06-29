import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ReportTargetType, User } from "@prisma/client";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateCommentDto, CreateMediaDto, CreatePlaceDto, CreatePrivateMessageDto, CreateReactionDto } from "./content.dto";
import { ContentService } from "./content.service";

@Controller()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get("places")
  listPlaces() {
    return this.contentService.listPlaces();
  }

  @Post("places")
  @UseGuards(JwtAuthGuard)
  createPlace(@Body() body: CreatePlaceDto, @CurrentUser() user: User) {
    return this.contentService.createPlace(body, user);
  }

  @Get("media")
  listMedia(@Query("targetType") targetType?: ReportTargetType, @Query("targetId") targetId?: string) {
    return this.contentService.listMedia(targetType, targetId);
  }

  @Post("media")
  @UseGuards(JwtAuthGuard)
  createMedia(@Body() body: CreateMediaDto, @CurrentUser() user: User) {
    return this.contentService.createMedia(body, user);
  }

  @Get("comments")
  listComments(@Query("targetType") targetType: ReportTargetType, @Query("targetId") targetId: string) {
    return this.contentService.listComments(targetType, targetId);
  }

  @Post("comments")
  @UseGuards(JwtAuthGuard)
  createComment(@Body() body: CreateCommentDto, @CurrentUser() user: User) {
    return this.contentService.createComment(body, user);
  }

  @Get("me/private-messages")
  @UseGuards(JwtAuthGuard)
  listPrivateMessages(@CurrentUser() user: User) {
    return this.contentService.listPrivateMessages(user);
  }

  @Post("me/private-messages")
  @UseGuards(JwtAuthGuard)
  createPrivateMessage(@Body() body: CreatePrivateMessageDto, @CurrentUser() user: User) {
    return this.contentService.createPrivateMessage(body, user);
  }

  @Post("reactions")
  @UseGuards(JwtAuthGuard)
  createReaction(@Body() body: CreateReactionDto, @CurrentUser() user: User) {
    return this.contentService.createReaction(body, user);
  }

  @Post("views")
  createView(@Body() body: { targetType: ReportTargetType; targetId: string }) {
    return this.contentService.createView(body.targetType, body.targetId);
  }
}
