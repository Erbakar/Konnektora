import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { compare, hash } from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto, RegisterDto } from "./auth.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async login(input: LoginDto, options: { adminOnly?: boolean } = {}) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });

    if (!user || user.status !== "active") {
      throw new UnauthorizedException("Geçersiz kullanıcı hesabı.");
    }

    if (options.adminOnly && !["admin", "super_admin"].includes(user.role)) {
      throw new UnauthorizedException("Admin yetkisi gerekli.");
    }

    const passwordMatches = await compare(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException("Geçersiz kullanıcı hesabı.");
    }

    return {
      accessToken: await this.jwtService.signAsync({ sub: user.id, role: user.role }),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status
      }
    };
  }

  async register(input: RegisterDto) {
    const email = input.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      throw new ConflictException("Bu email adresi zaten kullanılıyor.");
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        name: input.name.trim(),
        passwordHash: await hash(input.password, 10),
        role: "user",
        status: "active"
      }
    });

    return {
      accessToken: await this.jwtService.signAsync({ sub: user.id, role: user.role }),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status
      }
    };
  }
}
