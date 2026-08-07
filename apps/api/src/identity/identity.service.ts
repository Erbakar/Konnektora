import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ScanMemberDto } from "./identity.dto";

const memberSelect = {
  id: true,
  name: true,
  username: true,
  city: true,
  country: true,
  followerCount: true,
} as const;

@Injectable()
export class IdentityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async onboardingStatus(userId: string) {
    const [user, photoCount, interestCount, followingCount] = await Promise.all(
      [
        this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            phoneVerified: true,
            username: true,
            country: true,
            birthDate: true,
            onboardingCompletedAt: true,
          },
        }),
        this.prisma.mediaFile.count({
          where: {
            contentType: "user",
            contentId: userId,
            status: "active",
            type: "image",
          },
        }),
        this.prisma.userInterestTag.count({ where: { userId } }),
        this.prisma.userFollow.count({ where: { followerId: userId } }),
      ],
    );
    if (!user) throw new NotFoundException("Kullanıcı bulunamadı.");
    const steps = [
      {
        key: "phone" as const,
        title: "Telefonunu doğrula",
        completed: user.phoneVerified,
        path: "/onboarding",
      },
      {
        key: "personal_info" as const,
        title: "Temel bilgilerini tamamla",
        completed: Boolean(user.username && user.country && user.birthDate),
        path: "/onboarding",
      },
      {
        key: "photo" as const,
        title: "Profil fotoğrafı ekle",
        completed: photoCount > 0,
        path: "/onboarding",
      },
      {
        key: "interests" as const,
        title: "İlgi alanlarını seç",
        completed: interestCount > 0,
        path: "/onboarding",
      },
      {
        key: "people" as const,
        title: "Topluluğunu keşfet",
        completed: followingCount > 0,
        path: "/onboarding",
      },
    ];
    const completedCount = steps.filter((step) => step.completed).length;
    return {
      completed: Boolean(user.onboardingCompletedAt),
      completedAt: user.onboardingCompletedAt,
      progress: completedCount * 20,
      currentStep: steps.find((step) => !step.completed) ?? null,
      steps,
    };
  }

  async completeOnboarding(userId: string) {
    const status = await this.onboardingStatus(userId);
    const requiredMissing = status.steps
      .slice(0, 4)
      .filter((step) => !step.completed);
    if (requiredMissing.length)
      throw new BadRequestException(
        "Onboarding tamamlanmadan önce zorunlu adımları bitirin.",
      );
    await this.prisma.user.update({
      where: { id: userId },
      data: { onboardingCompletedAt: new Date() },
    });
    return this.onboardingStatus(userId);
  }

  async memberPass(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ...memberSelect, memberPassVersion: true, status: true },
    });
    if (!user || user.status !== UserStatus.active)
      throw new NotFoundException("Üye bulunamadı.");
    const token = await this.jwt.signAsync(
      { sub: user.id, purpose: "member-pass", version: user.memberPassVersion },
      { expiresIn: "365d" },
    );
    const payload = `konnektora://member?token=${encodeURIComponent(token)}`;
    const version = user.memberPassVersion;
    const member = {
      id: user.id,
      name: user.name,
      username: user.username,
      city: user.city,
      country: user.country,
      followerCount: user.followerCount,
    };
    return { member, qrPayload: payload, nfcPayload: payload, version };
  }

  async rotateMemberPass(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { memberPassVersion: { increment: 1 } },
    });
    return this.memberPass(userId);
  }

  async scan(scannerId: string, input: ScanMemberDto) {
    const memberId = await this.resolveMemberPass(input.payload);
    if (memberId === scannerId)
      throw new BadRequestException("Üye kartı geçersiz.");
    const [member, block, existing] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: memberId },
        select: { ...memberSelect, memberPassVersion: true, status: true },
      }),
      this.prisma.userBlock.findFirst({
        where: {
          targetType: "user",
          OR: [
            { userId: scannerId, targetId: memberId },
            { userId: memberId, targetId: scannerId },
          ],
        },
        select: { userId: true },
      }),
      this.prisma.userFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId: scannerId,
            followingId: memberId,
          },
        },
      }),
    ]);
    if (!member || member.status !== UserStatus.active)
      throw new BadRequestException("Üye kartı artık geçerli değil.");
    if (block)
      throw new ForbiddenException("Engellenen kullanıcı kartı taranamaz.");
    const scan = await this.prisma.$transaction(async (tx) => {
      if (!existing) {
        await tx.userFollow.create({
          data: { followerId: scannerId, followingId: member.id },
        });
        await tx.user.update({
          where: { id: scannerId },
          data: { followingCount: { increment: 1 } },
        });
        await tx.user.update({
          where: { id: member.id },
          data: { followerCount: { increment: 1 } },
        });
      }
      return tx.memberScan.create({
        data: { scannerId, memberId: member.id, method: input.method },
      });
    });
    const card = {
      id: member.id,
      name: member.name,
      username: member.username,
      city: member.city,
      country: member.country,
      followerCount: member.followerCount,
    };
    return {
      id: scan.id,
      method: input.method,
      createdAt: scan.createdAt,
      member: card,
      following: true,
    };
  }

  async resolveMemberPass(payload: string) {
    const token = this.extractToken(payload);
    let claim: { sub?: string; purpose?: string; version?: number };
    try {
      claim = await this.jwt.verifyAsync(token);
    } catch {
      throw new BadRequestException("Üye kartı geçersiz veya süresi dolmuş.");
    }
    if (!claim.sub || claim.purpose !== "member-pass")
      throw new BadRequestException("Üye kartı geçersiz.");
    const member = await this.prisma.user.findUnique({
      where: { id: claim.sub },
      select: { id: true, memberPassVersion: true, status: true },
    });
    if (
      !member ||
      member.status !== UserStatus.active ||
      member.memberPassVersion !== claim.version
    )
      throw new BadRequestException("Üye kartı artık geçerli değil.");
    return member.id;
  }

  async scanHistory(userId: string) {
    const scans = await this.prisma.memberScan.findMany({
      where: { scannerId: userId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { member: { select: memberSelect } },
    });
    return scans.map((scan) => ({
      id: scan.id,
      method: scan.method,
      createdAt: scan.createdAt,
      member: scan.member,
      following: true,
    }));
  }

  private extractToken(payload: string) {
    if (!payload.startsWith("konnektora://member?")) return payload.trim();
    const token = new URL(payload).searchParams.get("token");
    if (!token)
      throw new BadRequestException("Üye kartı token bilgisi içermiyor.");
    return token;
  }
}
