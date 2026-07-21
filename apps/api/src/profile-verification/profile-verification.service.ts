import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { readFile } from "fs/promises";
import { basename, resolve } from "path";
import { PrismaService } from "../prisma/prisma.service";
import { ReviewProfileVerificationDto } from "./profile-verification.dto";

@Injectable()
export class ProfileVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async status(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { accountType: true, profileVerifiedAt: true },
    });
    if (!user) throw new NotFoundException("Kullanıcı bulunamadı.");
    const request = await this.prisma.profileVerification.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return {
      eligible: user.accountType === "individual",
      verified: Boolean(user.profileVerifiedAt),
      verifiedAt: user.profileVerifiedAt,
      request,
    };
  }

  async submit(userId: string, selfieUrl: string, challenge: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { accountType: true, profileVerifiedAt: true },
    });
    if (!user) throw new NotFoundException("Kullanıcı bulunamadı.");
    if (user.accountType !== "individual")
      throw new BadRequestException(
        "Kurumsal hesaplar KYC doğrulamasını kullanmalıdır.",
      );
    if (user.profileVerifiedAt)
      throw new ConflictException("Profil zaten doğrulandı.");
    const pending = await this.prisma.profileVerification.findFirst({
      where: { userId, status: "pending" },
      select: { id: true },
    });
    if (pending)
      throw new ConflictException(
        "İncelenen bir doğrulama başvurusu zaten var.",
      );
    const reference = await this.prisma.mediaFile.findFirst({
      where: {
        contentType: "user",
        contentId: userId,
        type: "image",
        status: "active",
      },
      orderBy: [{ isProfilePicture: "desc" }, { sortOrder: "asc" }],
    });
    if (!reference)
      throw new BadRequestException(
        "Önce bir profil fotoğrafı yüklemelisiniz.",
      );
    const decision = await this.verify(reference.url, selfieUrl, challenge);
    const request = await this.prisma.$transaction(async (tx) => {
      const created = await tx.profileVerification.create({
        data: {
          userId,
          referenceMediaId: reference.id,
          selfieUrl,
          challenge,
          ...decision,
          reviewedAt: decision.status === "pending" ? null : new Date(),
        },
      });
      if (decision.status === "approved")
        await tx.user.update({
          where: { id: userId },
          data: { profileVerifiedAt: new Date() },
        });
      return created;
    });
    return {
      eligible: true,
      verified: request.status === "approved",
      verifiedAt: request.status === "approved" ? request.reviewedAt : null,
      request,
    };
  }

  listAdmin(status?: "pending" | "approved" | "rejected") {
    return this.prisma.profileVerification.findMany({
      where: { status },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            accountType: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async review(
    id: string,
    reviewerId: string,
    input: ReviewProfileVerificationDto,
  ) {
    const request = await this.prisma.profileVerification.findUnique({
      where: { id },
    });
    if (!request)
      throw new NotFoundException("Doğrulama başvurusu bulunamadı.");
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.profileVerification.update({
        where: { id },
        data: {
          status: input.status,
          decisionReason: input.reason?.trim() || null,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
        },
      });
      await tx.user.update({
        where: { id: request.userId },
        data: {
          profileVerifiedAt: input.status === "approved" ? new Date() : null,
        },
      });
      return updated;
    });
  }

  async evidencePath(id: string) {
    const request = await this.prisma.profileVerification.findUnique({
      where: { id },
      select: { selfieUrl: true },
    });
    if (!request) throw new NotFoundException("Doğrulama kanıtı bulunamadı.");
    return resolve(
      process.cwd(),
      "verification-uploads",
      basename(request.selfieUrl),
    );
  }

  private async verify(
    referenceUrl: string,
    selfieUrl: string,
    challenge: string,
  ) {
    const webhook = this.config.get<string>("FACE_VERIFICATION_URL");
    if (!webhook) {
      if (this.config.get<string>("NODE_ENV") === "production")
        return {
          status: "pending" as const,
          provider: "manual",
          decisionReason: "Otomatik doğrulama sağlayıcısı yapılandırılmadı.",
        };
      return {
        status: "approved" as const,
        provider: "development_simulator",
        faceMatchScore: 0.98,
        livenessScore: 0.97,
        decisionReason: "Geliştirme ortamı otomatik doğrulaması.",
      };
    }
    const selfieBase64 = (
      await readFile(
        resolve(process.cwd(), "verification-uploads", basename(selfieUrl)),
      )
    ).toString("base64");
    const apiUrl =
      this.config.get<string>("PUBLIC_API_URL")?.replace(/\/$/, "") ??
      "http://localhost:3000";
    const response = await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.config.get<string>("FACE_VERIFICATION_API_KEY")
          ? {
              Authorization: `Bearer ${this.config.get<string>("FACE_VERIFICATION_API_KEY")}`,
            }
          : {}),
      },
      body: JSON.stringify({
        referenceUrl: referenceUrl.startsWith("/")
          ? `${apiUrl}${referenceUrl}`
          : referenceUrl,
        selfie: { mimeType: "image/jpeg", base64: selfieBase64 },
        challenge,
      }),
    });
    if (!response.ok)
      return {
        status: "pending" as const,
        provider: "external",
        decisionReason:
          "Otomatik servis yanıt vermedi; manuel inceleme gerekli.",
      };
    const result = (await response.json()) as {
      faceMatchScore: number;
      livenessScore: number;
    };
    const approved =
      result.faceMatchScore >= 0.9 && result.livenessScore >= 0.9;
    const rejected =
      result.faceMatchScore < 0.65 || result.livenessScore < 0.65;
    return {
      status: approved
        ? ("approved" as const)
        : rejected
          ? ("rejected" as const)
          : ("pending" as const),
      provider: "external",
      faceMatchScore: result.faceMatchScore,
      livenessScore: result.livenessScore,
      decisionReason: approved
        ? "Otomatik doğrulama başarılı."
        : rejected
          ? "Yüz veya canlılık kontrolü başarısız."
          : "Manuel inceleme gerekli.",
    };
  }
}
