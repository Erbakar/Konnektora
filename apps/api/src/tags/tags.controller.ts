import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { AdminGuard } from "../auth/admin.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../auth/permissions";
import { CreateTagDto, MergeTagDto } from "./tags.dto";
import { TagsService } from "./tags.service";

@Controller()
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get("tags")
  listPublicTags() {
    return this.tagsService.listPublicTags();
  }

  @Get("tag-categories")
  listTagCategories() {
    return this.tagsService.listTagCategories();
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
  updateTag(@Param("id") id: string, @Body() body: Partial<CreateTagDto>, @CurrentUser() user: User) {
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
  mergeTag(@Param("id") id: string, @Body() body: MergeTagDto, @CurrentUser() user: User) {
    return this.tagsService.mergeTag(id, body.targetTagId, user.id);
  }
}
