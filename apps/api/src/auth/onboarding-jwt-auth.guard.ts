import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Injectable()
export class OnboardingJwtAuthGuard extends JwtAuthGuard {
  constructor(jwtService: JwtService, prisma: PrismaService) {
    super(jwtService, prisma);
  }

  protected override isAllowedUser(user: { status: string }) {
    return user.status === "active" || user.status === "pending";
  }
}
