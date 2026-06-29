import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../auth/admin.guard";
import { RequirePermissions } from "../auth/permissions";
import { AdminContentQueryDto, UpdateAdminContentStatusDto } from "./content-admin.dto";
import { ContentAdminService } from "./content-admin.service";

@Controller("admin/content")
@UseGuards(AdminGuard)
export class ContentAdminController {
  constructor(private readonly contentAdminService: ContentAdminService) {}

  @Get("places")
  @RequirePermissions("places.manage")
  listPlaces(@Query() query: AdminContentQueryDto) {
    return this.contentAdminService.listPlaces(query);
  }

  @Get("places/:id")
  @RequirePermissions("places.manage")
  getPlace(@Param("id") id: string) {
    return this.contentAdminService.getPlace(id);
  }

  @Patch("places/:id")
  @RequirePermissions("places.manage")
  updatePlace(@Param("id") id: string, @Body() body: UpdateAdminContentStatusDto) {
    return this.contentAdminService.updatePlace(id, body);
  }

  @Get("media")
  @RequirePermissions("media.manage")
  listMedia(@Query() query: AdminContentQueryDto) {
    return this.contentAdminService.listMedia(query);
  }

  @Get("media/:id")
  @RequirePermissions("media.manage")
  getMedia(@Param("id") id: string) {
    return this.contentAdminService.getMedia(id);
  }

  @Patch("media/:id")
  @RequirePermissions("media.manage")
  updateMedia(@Param("id") id: string, @Body() body: UpdateAdminContentStatusDto) {
    return this.contentAdminService.updateMedia(id, body);
  }

  @Get("comments")
  @RequirePermissions("comments.manage")
  listComments(@Query() query: AdminContentQueryDto) {
    return this.contentAdminService.listComments(query);
  }

  @Get("comments/:id")
  @RequirePermissions("comments.manage")
  getComment(@Param("id") id: string) {
    return this.contentAdminService.getComment(id);
  }

  @Patch("comments/:id")
  @RequirePermissions("comments.manage")
  updateComment(@Param("id") id: string, @Body() body: UpdateAdminContentStatusDto) {
    return this.contentAdminService.updateComment(id, body);
  }

  @Get("private-messages")
  @RequirePermissions("messages.write_to_us.manage")
  listPrivateMessages(@Query() query: AdminContentQueryDto) {
    return this.contentAdminService.listPrivateMessages(query);
  }

  @Get("private-messages/:id")
  @RequirePermissions("messages.write_to_us.manage")
  getPrivateMessage(@Param("id") id: string) {
    return this.contentAdminService.getPrivateMessage(id);
  }

  @Patch("private-messages/:id")
  @RequirePermissions("messages.write_to_us.manage")
  updatePrivateMessage(@Param("id") id: string, @Body() body: UpdateAdminContentStatusDto) {
    return this.contentAdminService.updatePrivateMessage(id, body);
  }
}
