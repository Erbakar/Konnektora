import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { AdminPermission, REQUIRED_PERMISSIONS_KEY } from "./permissions";

@Injectable()
export class AdminGuard extends JwtAuthGuard implements CanActivate {
  constructor(
    jwtService: JwtService,
    prisma: PrismaService,
    private readonly reflector: Reflector
  ) {
    super(jwtService, prisma);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!["admin", "super_admin"].includes(user.role)) {
      throw new UnauthorizedException("Admin yetkisi gerekli.");
    }

    if (user.role === "super_admin") {
      return true;
    }

    const requiredPermissions =
      this.reflector.getAllAndOverride<AdminPermission[]>(REQUIRED_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass()
      ]) ?? [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    const adminUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { adminRoleGroup: true }
    });
    const permissions = new Set(adminUser?.adminRoleGroup?.permissions ?? []);
    const hasAllPermissions = requiredPermissions.every((permission) => this.hasPermission(permission, permissions));

    if (!hasAllPermissions) {
      throw new UnauthorizedException("Bu işlem için yetki gerekli.");
    }

    return true;
  }

  private hasPermission(permission: AdminPermission, permissions: Set<string>) {
    if (permissions.has(permission)) {
      return true;
    }

    if (permission.startsWith("messages.") && permissions.has("messages.manage")) {
      return true;
    }

    if (permission.startsWith("cms.") && permissions.has("cms.manage")) {
      return true;
    }

    if (permission === "messages.manage") {
      return ["messages.faq.manage", "messages.account_freeze.manage", "messages.write_to_us.manage"].some((item) =>
        permissions.has(item)
      );
    }

    if (permission === "cms.manage") {
      return ["cms.categories.manage", "cms.faq.manage", "cms.announcements.manage", "cms.policies.manage"].some((item) =>
        permissions.has(item)
      );
    }

    return false;
  }
}
