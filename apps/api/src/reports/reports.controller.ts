import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { AdminGuard } from "../auth/admin.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateReportDto, UpdateReportDto } from "./reports.dto";
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
  listAdminReports() {
    return this.reportsService.listAdminReports();
  }

  @Patch("admin/reports/:id")
  @UseGuards(AdminGuard)
  updateReport(@Param("id") id: string, @Body() body: UpdateReportDto, @CurrentUser() user: User) {
    return this.reportsService.updateReport(id, body, user);
  }
}
