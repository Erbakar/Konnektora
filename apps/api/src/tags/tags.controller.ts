import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { randomUUID } from "crypto";
import { resolve } from "path";
import { User } from "@prisma/client";
import { AdminGuard } from "../auth/admin.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/optional-jwt-auth.guard";
import { RequirePermissions } from "../auth/permissions";
import { CreateTagCommentDto, CreateTagDto, MergeTagDto } from "./tags.dto";
import { TagsService } from "./tags.service";

@Controller()
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get("tags")
  @UseGuards(OptionalJwtAuthGuard)
  listPublicTags(@CurrentUser() user?: User) {
    return this.tagsService.listPublicTags(user?.id);
  }

  @Get("tag-categories")
  listTagCategories() {
    return this.tagsService.listTagCategories();
  }

  @Get("tags/:tagId/comments")
  @UseGuards(OptionalJwtAuthGuard)
  listTagComments(@Param("tagId") tagId: string, @CurrentUser() user?: User) {
    return this.tagsService.listTagComments(tagId, user?.id);
  }

  @Get("tags/:tagId/stats")
  @UseGuards(OptionalJwtAuthGuard)
  stats(@Param("tagId") tagId: string, @CurrentUser() user?: User) {
    return this.tagsService.getPublicStats(tagId, user?.id);
  }

  @Get("tags/:tagId/related-users")
  @UseGuards(OptionalJwtAuthGuard)
  relatedUsers(@Param("tagId") tagId: string, @CurrentUser() user?: User) {
    return this.tagsService.listRelatedUsers(tagId, user?.id);
  }

  @Post("tags/:tagId/comments")
  @UseGuards(JwtAuthGuard)
  createTagComment(
    @Param("tagId") tagId: string,
    @Body() body: CreateTagCommentDto,
    @CurrentUser() user: User,
  ) {
    return this.tagsService.createTagComment(tagId, body.body, user.id);
  }

  @Post("tags/comments/:commentId/like")
  @UseGuards(JwtAuthGuard)
  likeComment(
    @Param("commentId") commentId: string,
    @CurrentUser() user: User,
  ) {
    return this.tagsService.toggleCommentLike(commentId, user.id);
  }

  @Patch("tags/comments/:commentId")
  @UseGuards(JwtAuthGuard)
  updateComment(
    @Param("commentId") commentId: string,
    @Body() body: CreateTagCommentDto,
    @CurrentUser() user: User,
  ) {
    return this.tagsService.updateTagComment(commentId, body.body, user);
  }

  @Post("tags/comments/:commentId/media")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: resolve(process.cwd(), "uploads"),
        filename: (_request, file, callback) =>
          callback(
            null,
            `${randomUUID()}${file.mimetype.startsWith("video/") ? ".mp4" : ".jpg"}`,
          ),
      }),
      limits: { fileSize: 20 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        const allowed = [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
          "video/mp4",
          "video/webm",
        ].includes(file.mimetype);
        callback(
          allowed
            ? null
            : new BadRequestException(
                "Yalnız fotoğraf veya video yüklenebilir.",
              ),
          allowed,
        );
      },
    }),
  )
  uploadCommentMedia(
    @Param("commentId") commentId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    if (!file) throw new BadRequestException("Dosya gereklidir.");
    return this.tagsService.addCommentMedia(
      commentId,
      user,
      `/uploads/${file.filename}`,
      file.mimetype.startsWith("video/") ? "video" : "image",
    );
  }

  @Delete("tags/:tagId/comments/:commentId")
  @UseGuards(JwtAuthGuard)
  deleteTagComment(
    @Param("tagId") tagId: string,
    @Param("commentId") commentId: string,
    @CurrentUser() user: User,
  ) {
    return this.tagsService.deleteTagComment(tagId, commentId, user);
  }

  @Post("tags")
  @UseGuards(JwtAuthGuard)
  createUserTag(@Body() body: CreateTagDto, @CurrentUser() user: User) {
    return this.tagsService.createUserTag(body, user.id);
  }

  @Get("admin/tags")
  @UseGuards(AdminGuard)
  @RequirePermissions("tags.manage")
  listAdminTags() {
    return this.tagsService.listAdminTags();
  }

  @Post("admin/tags")
  @UseGuards(AdminGuard)
  @RequirePermissions("tags.manage")
  createTag(@Body() body: CreateTagDto, @CurrentUser() user: User) {
    return this.tagsService.createTag(body, user.id);
  }

  @Get("admin/tags/:id")
  @UseGuards(AdminGuard)
  @RequirePermissions("tags.manage")
  getAdminTag(@Param("id") id: string) {
    return this.tagsService.getAdminTag(id);
  }

  @Patch("admin/tags/:id")
  @UseGuards(AdminGuard)
  @RequirePermissions("tags.manage")
  updateTag(
    @Param("id") id: string,
    @Body() body: Partial<CreateTagDto>,
    @CurrentUser() user: User,
  ) {
    return this.tagsService.updateTag(id, body, user.id);
  }

  @Delete("admin/tags/:id")
  @UseGuards(AdminGuard)
  @RequirePermissions("tags.manage")
  archiveTag(@Param("id") id: string, @CurrentUser() user: User) {
    return this.tagsService.archiveTag(id, user.id);
  }

  @Post("admin/tags/:id/ban")
  @UseGuards(AdminGuard)
  @RequirePermissions("tags.manage")
  banTag(@Param("id") id: string, @CurrentUser() user: User) {
    return this.tagsService.banTag(id, user.id);
  }

  @Post("admin/tags/:id/merge")
  @UseGuards(AdminGuard)
  @RequirePermissions("tags.manage")
  mergeTag(
    @Param("id") id: string,
    @Body() body: MergeTagDto,
    @CurrentUser() user: User,
  ) {
    return this.tagsService.mergeTag(id, body.targetTagId, user.id);
  }
}
