import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization as string | undefined;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      throw new UnauthorizedException("Token gerekli.");
    }

    let payload: { sub: string; role: string };

    try {
      payload = await this.jwtService.verifyAsync<{ sub: string; role: string }>(token);
    } catch {
      throw new UnauthorizedException("Geçersiz token.");
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || user.status !== "active") {
      throw new UnauthorizedException("Aktif kullanıcı gerekli.");
    }

    request.user = user;
    return true;
  }
}

