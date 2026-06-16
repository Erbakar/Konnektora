import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ReportTargetType } from "@prisma/client";
import { User } from "@prisma/client";
import { AdminGuard } from "../auth/admin.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../auth/permissions";
import {
  CreateReportDto,
  CreateModerationDecisionDto,
  CreateReportRuleDto,
  ResolveReportActionDto,
  UpdateReportDto,
  UpdateReportGroupNoteDto,
  UpdateReportRuleDto
} from "./reports.dto";
import { ReportsService } from "./reports.service";

@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post("reports")
  @UseGuards(JwtAuthGuard)
  createReport(@Body() body: CreateReportDto, @CurrentUser() user: User) {
    return this.reportsService.createReport(body, user);
  }

  @Get("admin/reports")
  @UseGuards(AdminGuard)
  @RequirePermissions("reports.manage")
  listAdminReports() {
    return this.reportsService.listAdminReports();
  }

  @Get("admin/report-groups")
  @UseGuards(AdminGuard)
  @RequirePermissions("reports.manage")
  listAdminReportGroups(@Query("scope") scope?: "active" | "old") {
    return this.reportsService.listAdminReportGroups(scope === "old" ? "old" : "active");
  }

  @Get("admin/report-groups/:targetType/:targetId")
  @UseGuards(AdminGuard)
  @RequirePermissions("reports.manage")
  getAdminReportGroup(@Param("targetType") targetType: ReportTargetType, @Param("targetId") targetId: string) {
    return this.reportsService.getAdminReportGroup(targetType, targetId);
  }

  @Patch("admin/report-groups/:targetType/:targetId/note")
  @UseGuards(AdminGuard)
  @RequirePermissions("reports.manage")
  updateReportGroupNote(
    @Param("targetType") targetType: ReportTargetType,
    @Param("targetId") targetId: string,
    @Body() body: UpdateReportGroupNoteDto,
    @CurrentUser() user: User
  ) {
    return this.reportsService.updateGroupNote(targetType, targetId, body, user);
  }

  @Post("admin/report-groups/:targetType/:targetId/decisions")
  @UseGuards(AdminGuard)
  @RequirePermissions("reports.manage")
  createModerationDecision(
    @Param("targetType") targetType: ReportTargetType,
    @Param("targetId") targetId: string,
    @Body() body: CreateModerationDecisionDto,
    @CurrentUser() user: User
  ) {
    return this.reportsService.createModerationDecision(targetType, targetId, body, user);
  }

  @Get("report-rules")
  listPublicRules(@Query("targetType") targetType?: ReportTargetType) {
    return this.reportsService.listPublicRules(targetType);
  }

  @Get("admin/report-rules")
  @UseGuards(AdminGuard)
  @RequirePermissions("reports.manage")
  listAdminRules() {
    return this.reportsService.listAdminRules();
  }

  @Post("admin/report-rules")
  @UseGuards(AdminGuard)
  @RequirePermissions("reports.manage")
  createRule(@Body() body: CreateReportRuleDto) {
    return this.reportsService.createRule(body);
  }

  @Patch("admin/report-rules/:id")
  @UseGuards(AdminGuard)
  @RequirePermissions("reports.manage")
  updateRule(@Param("id") id: string, @Body() body: UpdateReportRuleDto) {
    return this.reportsService.updateRule(id, body);
  }

  @Patch("admin/reports/:id")
  @UseGuards(AdminGuard)
  @RequirePermissions("reports.manage")
  updateReport(@Param("id") id: string, @Body() body: UpdateReportDto, @CurrentUser() user: User) {
    return this.reportsService.updateReport(id, body, user);
  }

  @Post("admin/reports/:id/actions")
  @UseGuards(AdminGuard)
  @RequirePermissions("reports.manage")
  resolveWithAction(@Param("id") id: string, @Body() body: ResolveReportActionDto, @CurrentUser() user: User) {
    return this.reportsService.resolveWithAction(id, body, user);
  }
}
