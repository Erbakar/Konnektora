import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { User } from "@prisma/client";
import { randomUUID } from "crypto";
import { memoryStorage } from "multer";
import type { Response } from "express";
import { AdminGuard } from "../auth/admin.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RequirePermissions } from "../auth/permissions";
import {
  CreateProfileVerificationDto,
  ReviewProfileVerificationDto,
} from "./profile-verification.dto";
import { ProfileVerificationService } from "./profile-verification.service";


@Controller()
export class ProfileVerificationController {
  constructor(private readonly verification: ProfileVerificationService) {}

  @Get("profile/verification")
  @UseGuards(JwtAuthGuard)
  status(@CurrentUser() user: User) {
    return this.verification.status(user.id);
  }

  @Post("profile/verification")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor("selfie", {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_request, file, callback) =>
        callback(
          file.mimetype === "image/jpeg"
            ? null
            : new BadRequestException("Doğrulama karesi JPEG olmalıdır."),
          file.mimetype === "image/jpeg",
        ),
    }),
  )
  async submit(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: CreateProfileVerificationDto,
    @CurrentUser() user: User,
  ) {
    if (!file) throw new BadRequestException("Kamera karesi bulunamadı.");
    return this.verification.submit(user.id, `${randomUUID()}.jpg`, body.challenge, new Uint8Array(file.buffer));
  }

  @Get("admin/profile-verifications")
  @UseGuards(AdminGuard)
  @RequirePermissions("media.manage")
  list(@Query("status") status?: "pending" | "approved" | "rejected") {
    return this.verification.listAdmin(status);
  }

  @Get("admin/profile-verifications/:id/evidence")
  @UseGuards(AdminGuard)
  @RequirePermissions("media.manage")
  async evidence(@Param("id") id: string, @Res({ passthrough: true }) response: Response) {
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    return new StreamableFile(
      await this.verification.evidence(id),
      { type: "image/jpeg" },
    );
  }

  @Patch("admin/profile-verifications/:id")
  @UseGuards(AdminGuard)
  @RequirePermissions("media.manage")
  review(
    @Param("id") id: string,
    @Body() body: ReviewProfileVerificationDto,
    @CurrentUser() admin: User,
  ) {
    return this.verification.review(id, admin.id, body);
  }
}
