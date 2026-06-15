import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../auth/admin.guard";
import { RequirePermissions } from "../auth/permissions";
import { CmsService } from "./cms.service";
import {
  CreateAnnouncementDto,
  CreateCmsCategoryDto,
  CreateFaqDto,
  UpdateAnnouncementDto,
  UpdateCmsCategoryDto,
  UpdateFaqDto,
  UpsertPolicyDto
} from "./cms.dto";

@Controller()
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get("faqs")
  listPublicFaqs() {
    return this.cmsService.listPublicFaqs();
  }

  @Get("announcements")
  listPublicAnnouncements() {
    return this.cmsService.listPublicAnnouncements();
  }

  @Get("policies/:type")
  getPublicPolicy(@Param("type") type: string) {
    return this.cmsService.getPublicPolicy(type);
  }

  @Get("admin/cms/categories")
  @UseGuards(AdminGuard)
  @RequirePermissions("cms.manage")
  listCategories() {
    return this.cmsService.listCategories();
  }

  @Post("admin/cms/categories")
  @UseGuards(AdminGuard)
  @RequirePermissions("cms.manage")
  createCategory(@Body() body: CreateCmsCategoryDto) {
    return this.cmsService.createCategory(body);
  }

  @Patch("admin/cms/categories/:id")
  @UseGuards(AdminGuard)
  @RequirePermissions("cms.manage")
  updateCategory(@Param("id") id: string, @Body() body: UpdateCmsCategoryDto) {
    return this.cmsService.updateCategory(id, body);
  }

  @Get("admin/cms/faqs")
  @UseGuards(AdminGuard)
  @RequirePermissions("cms.manage")
  listFaqs() {
    return this.cmsService.listFaqs();
  }

  @Post("admin/cms/faqs")
  @UseGuards(AdminGuard)
  @RequirePermissions("cms.manage")
  createFaq(@Body() body: CreateFaqDto) {
    return this.cmsService.createFaq(body);
  }

  @Patch("admin/cms/faqs/:id")
  @UseGuards(AdminGuard)
  @RequirePermissions("cms.manage")
  updateFaq(@Param("id") id: string, @Body() body: UpdateFaqDto) {
    return this.cmsService.updateFaq(id, body);
  }

  @Get("admin/cms/announcements")
  @UseGuards(AdminGuard)
  @RequirePermissions("cms.manage")
  listAnnouncements() {
    return this.cmsService.listAnnouncements();
  }

  @Post("admin/cms/announcements")
  @UseGuards(AdminGuard)
  @RequirePermissions("cms.manage")
  createAnnouncement(@Body() body: CreateAnnouncementDto) {
    return this.cmsService.createAnnouncement(body);
  }

  @Patch("admin/cms/announcements/:id")
  @UseGuards(AdminGuard)
  @RequirePermissions("cms.manage")
  updateAnnouncement(@Param("id") id: string, @Body() body: UpdateAnnouncementDto) {
    return this.cmsService.updateAnnouncement(id, body);
  }

  @Get("admin/cms/policies")
  @UseGuards(AdminGuard)
  @RequirePermissions("cms.manage")
  listPolicies() {
    return this.cmsService.listPolicies();
  }

  @Post("admin/cms/policies")
  @UseGuards(AdminGuard)
  @RequirePermissions("cms.manage")
  upsertPolicy(@Body() body: UpsertPolicyDto) {
    return this.cmsService.upsertPolicy(body);
  }
}
