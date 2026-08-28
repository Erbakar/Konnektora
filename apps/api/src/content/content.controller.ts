import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ReportTargetType, User } from "@prisma/client";
import { randomUUID } from "crypto";
import { mkdirSync } from "fs";
import { unlink } from "fs/promises";
import { diskStorage } from "multer";
import { resolve } from "path";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OnboardingJwtAuthGuard } from "../auth/onboarding-jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/optional-jwt-auth.guard";
import { CreateCommentDto, CreateMediaDto, CreateReactionDto, ReorderProfileMediaDto, UpdateCommentDto } from "./content.dto";
import { ContentService } from "./content.service";

mkdirSync(resolve(process.cwd(), "uploads"), { recursive: true });
const mediaExtensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/webm": ".webm"
};

@Controller()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get("media")
  listMedia(@Query("targetType") targetType?: ReportTargetType, @Query("targetId") targetId?: string) {
    return this.contentService.listMedia(targetType, targetId);
  }

  @Post("media")
  @UseGuards(JwtAuthGuard)
  createMedia(@Body() body: CreateMediaDto, @CurrentUser() user: User) {
    return this.contentService.createMedia(body, user);
  }

  @Post("media/:targetType/:targetId/upload")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor("file", {
    storage: diskStorage({ destination: resolve(process.cwd(), "uploads"), filename: (_request, file, callback) => callback(null, `${randomUUID()}${mediaExtensions[file.mimetype] ?? ""}`) }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => { const allowed = Boolean(mediaExtensions[file.mimetype]); callback(allowed ? null : new BadRequestException("Yalnız JPG, PNG, WebP, GIF, MP4 veya WebM yüklenebilir."), allowed); }
  }))
  async uploadContentMedia(@Param("targetType") targetType: ReportTargetType, @Param("targetId") targetId: string, @UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() user: User) {
    if (!file) throw new BadRequestException("Yüklenecek dosya bulunamadı.");
    try { return await this.contentService.createContentMedia(targetType, targetId, user, `/uploads/${file.filename}`, file.mimetype.startsWith("image/") ? "image" : "video"); }
    catch (error) { await unlink(file.path).catch(() => undefined); throw error; }
  }

  @Put("media/:targetType/:targetId/order")
  @UseGuards(JwtAuthGuard)
  reorderContentMedia(@Param("targetType") targetType: ReportTargetType, @Param("targetId") targetId: string, @Body() body: ReorderProfileMediaDto, @CurrentUser() user: User) {
    return this.contentService.reorderContentMedia(targetType, targetId, body.mediaIds, user);
  }

  @Delete("media/:targetType/:targetId/:id")
  @UseGuards(JwtAuthGuard)
  deleteContentMedia(@Param("targetType") targetType: ReportTargetType, @Param("targetId") targetId: string, @Param("id") id: string, @CurrentUser() user: User) {
    return this.contentService.deleteContentMedia(targetType, targetId, id, user);
  }

  @Get("profile/media")
  @UseGuards(OnboardingJwtAuthGuard)
  listProfileMedia(@CurrentUser() user: User) {
    return this.contentService.listProfileMedia(user.id);
  }

  @Post("profile/media/upload")
  @UseGuards(OnboardingJwtAuthGuard)
  @UseInterceptors(FileInterceptor("file", {
    storage: diskStorage({
      destination: resolve(process.cwd(), "uploads"),
      filename: (_request, file, callback) => callback(null, `${randomUUID()}${mediaExtensions[file.mimetype] ?? ""}`)
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
      const allowed = Boolean(mediaExtensions[file.mimetype]);
      callback(allowed ? null : new BadRequestException("Yalnız JPG, PNG, WebP, GIF, MP4 veya WebM yüklenebilir."), allowed);
    }
  }))
  async uploadProfileMedia(@UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() user: User) {
    if (!file) throw new BadRequestException("Yüklenecek dosya bulunamadı.");
    try {
      return await this.contentService.createProfileMedia(user.id, `/uploads/${file.filename}`, file.mimetype.startsWith("image/") ? "image" : "video");
    } catch (error) {
      await unlink(file.path).catch(() => undefined);
      throw error;
    }
  }

  @Patch("profile/media/:id/profile-picture")
  @UseGuards(JwtAuthGuard)
  makeProfilePicture(@Param("id") id: string, @CurrentUser() user: User) {
    return this.contentService.makeProfilePicture(user.id, id);
  }

  @Put("profile/media/order")
  @UseGuards(JwtAuthGuard)
  reorderProfileMedia(@Body() body: ReorderProfileMediaDto, @CurrentUser() user: User) {
    return this.contentService.reorderProfileMedia(user.id, body.mediaIds);
  }

  @Delete("profile/media/:id")
  @UseGuards(JwtAuthGuard)
  deleteProfileMedia(@Param("id") id: string, @CurrentUser() user: User) {
    return this.contentService.deleteProfileMedia(user.id, id);
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

  @Patch("comments/:id")
  @UseGuards(JwtAuthGuard)
  updateComment(@Param("id") id: string, @Body() body: UpdateCommentDto, @CurrentUser() user: User) {
    return this.contentService.updateComment(id, body.body, user);
  }

  @Delete("comments/:id")
  @UseGuards(JwtAuthGuard)
  deleteComment(@Param("id") id: string, @CurrentUser() user: User) {
    return this.contentService.deleteComment(id, user);
  }

  @Post("comments/:id/like")
  @UseGuards(JwtAuthGuard)
  toggleCommentLike(@Param("id") id: string, @CurrentUser() user: User) {
    return this.contentService.toggleCommentLike(id, user);
  }

  @Post("reactions")
  @UseGuards(JwtAuthGuard)
  createReaction(@Body() body: CreateReactionDto, @CurrentUser() user: User) {
    return this.contentService.createReaction(body, user);
  }

  @Post("views")
  @UseGuards(OptionalJwtAuthGuard)
  createView(@Body() body: { targetType: ReportTargetType; targetId: string; source?: string; referrer?: string; kind?: string }, @CurrentUser() user?: User) {
    return this.contentService.createView(body.targetType, body.targetId, user, body.source, body.referrer, body.kind);
  }

  @Post("shares")
  @UseGuards(OptionalJwtAuthGuard)
  createShare(@Body() body: { targetType: ReportTargetType; targetId: string; channel: string }, @CurrentUser() user?: User) {
    return this.contentService.createShare(body.targetType, body.targetId, body.channel, user);
  }

  @Post("actions")
  @UseGuards(OptionalJwtAuthGuard)
  createAction(@Body() body: { targetType: ReportTargetType; targetId: string; action: string }, @CurrentUser() user?: User) {
    return this.contentService.createAction(body.targetType, body.targetId, body.action, user);
  }
}
