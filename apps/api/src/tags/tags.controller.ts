import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { AdminGuard } from "../auth/admin.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateTagDto } from "./tags.dto";
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
  listAdminTags() {
    return this.tagsService.listAdminTags();
  }

  @Post("admin/tags")
  @UseGuards(AdminGuard)
  createTag(@Body() body: CreateTagDto, @CurrentUser() user: User) {
    return this.tagsService.createTag(body, user.id);
  }

  @Patch("admin/tags/:id")
  @UseGuards(AdminGuard)
  updateTag(@Param("id") id: string, @Body() body: Partial<CreateTagDto>, @CurrentUser() user: User) {
    return this.tagsService.updateTag(id, body, user.id);
  }

  @Delete("admin/tags/:id")
  @UseGuards(AdminGuard)
  archiveTag(@Param("id") id: string, @CurrentUser() user: User) {
    return this.tagsService.archiveTag(id, user.id);
  }
}
