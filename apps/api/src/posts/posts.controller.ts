import { contentMediaExtensions, contentMediaHelp } from "../common/media-policy";
import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { User } from "@prisma/client";
import { randomUUID } from "crypto";
import { mkdirSync } from "fs";
import { durableStorage, removeDurableUpload } from "../media-storage/durable-storage";
import { resolve } from "path";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/optional-jwt-auth.guard";
import { CreatePostCommentDto, CreatePostDto, FeedQueryDto, UpdatePostDto } from "./posts.dto";
import { PostsService } from "./posts.service";

mkdirSync(resolve(process.cwd(), "uploads"), { recursive: true });
const extensions = contentMediaExtensions;

@Controller()
export class PostsController {
  constructor(private readonly posts: PostsService) {}
  @Get("feed/posts") @UseGuards(OptionalJwtAuthGuard) feed(@Query() query: FeedQueryDto, @CurrentUser() user?: User) { return this.posts.feed(query, user); }
  @Post("posts") @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor("media", 4, { storage: durableStorage({ destination: resolve(process.cwd(), "uploads"), filename: (_request, file, callback) => callback(null, `${randomUUID()}${extensions[file.mimetype] ?? ""}`) }), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (_request, file, callback) => { const allowed = Boolean(extensions[file.mimetype]); callback(allowed ? null : new BadRequestException(contentMediaHelp), allowed); } }))
  async create(@Body() body: CreatePostDto, @UploadedFiles() files: Express.Multer.File[] = [], @CurrentUser() user: User) { try { return await this.posts.create(body, files, user); } catch (error) { await Promise.all(files.map((file) => removeDurableUpload(file.path).catch(() => undefined))); throw error; } }
  @Patch("posts/:id") @UseGuards(JwtAuthGuard) update(@Param("id") id: string, @Body() body: UpdatePostDto, @CurrentUser() user: User) { return this.posts.update(id, body, user); }
  @Delete("posts/:id") @UseGuards(JwtAuthGuard) remove(@Param("id") id: string, @CurrentUser() user: User) { return this.posts.remove(id, user); }
  @Post("posts/:id/like") @UseGuards(JwtAuthGuard) like(@Param("id") id: string, @CurrentUser() user: User) { return this.posts.toggleLike(id, user); }
  @Get("posts/:id/comments") @UseGuards(OptionalJwtAuthGuard) comments(@Param("id") id: string, @CurrentUser() user?: User) { return this.posts.comments(id, user); }
  @Post("posts/:id/comments") @UseGuards(JwtAuthGuard) comment(@Param("id") id: string, @Body() body: CreatePostCommentDto, @CurrentUser() user: User) { return this.posts.createComment(id, body, user); }
  @Delete("posts/:postId/comments/:commentId") @UseGuards(JwtAuthGuard) removeComment(@Param("postId") postId: string, @Param("commentId") commentId: string, @CurrentUser() user: User) { return this.posts.removeComment(postId, commentId, user); }
}
