import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";
import { AdminGuard } from "../auth/admin.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { RequirePermissions } from "../auth/permissions";
import { AdminUserQueryDto, CreateAdminRoleGroupDto, UpdateAdminRoleGroupDto, UpdateAdminUserDto } from "./admin.dto";
import { AdminService } from "./admin.service";

@Controller("admin")
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("dashboard")
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get("users")
  @RequirePermissions("users.manage")
  listUsers(@Query() query: AdminUserQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Get("users/:id")
  @RequirePermissions("users.manage")
  getUser(@Param("id") id: string) {
    return this.adminService.getUser(id);
  }

  @Patch("users/:id")
  @RequirePermissions("users.manage")
  updateUser(@Param("id") id: string, @Body() body: UpdateAdminUserDto, @CurrentUser() admin: User) {
    return this.adminService.updateUser(id, body, admin);
  }

  @Get("role-groups")
  @RequirePermissions("roles.manage")
  listRoleGroups() {
    return this.adminService.listRoleGroups();
  }

  @Patch("role-groups/:id")
  @RequirePermissions("roles.manage")
  updateRoleGroup(@Param("id") id: string, @Body() body: UpdateAdminRoleGroupDto) {
    return this.adminService.updateRoleGroup(id, body);
  }

  @Post("role-groups")
  @RequirePermissions("roles.manage")
  createRoleGroup(@Body() body: CreateAdminRoleGroupDto) {
    return this.adminService.createRoleGroup(body);
  }
}
