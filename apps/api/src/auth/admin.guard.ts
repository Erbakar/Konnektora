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
    const hasAllPermissions = requiredPermissions.every((permission) => permissions.has(permission));

    if (!hasAllPermissions) {
      throw new UnauthorizedException("Bu işlem için yetki gerekli.");
    }

    return true;
  }
}
