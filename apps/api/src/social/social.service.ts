import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const memberSelect = {
  id: true,
  name: true,
  username: true,
  accountType: true,
  city: true,
  country: true,
  followerCount: true,
  interestTags: { select: { tagId: true } }
} as const;

@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  async suggestions(userId: string) {
    const [viewer, follows, ownBlocks, blockedBy] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { interestTags: { select: { tagId: true } } } }),
      this.prisma.userFollow.findMany({ where: { followerId: userId }, select: { followingId: true } }),
      this.prisma.userBlock.findMany({ where: { userId, targetType: "user" }, select: { targetId: true } }),
      this.prisma.userBlock.findMany({ where: { targetType: "user", targetId: userId }, select: { userId: true } })
    ]);
    if (!viewer) throw new NotFoundException("Kullanıcı bulunamadı.");
    const followingIds = new Set(follows.map((follow) => follow.followingId));
    const excluded = [userId, ...followingIds, ...ownBlocks.map((block) => block.targetId), ...blockedBy.map((block) => block.userId)];
    const ownTags = new Set(viewer.interestTags.map((item) => item.tagId));
    const candidates = await this.prisma.user.findMany({
      where: { id: { notIn: excluded }, status: "active", role: "user" },
      select: memberSelect,
      orderBy: { followerCount: "desc" },
      take: 100
    });
    return candidates
      .map((user) => this.toMemberCard(user, ownTags, false))
      .sort((first, second) => second.commonTagCount - first.commonTagCount || second.followerCount - first.followerCount)
      .slice(0, 20);
  }

  async listFollowing(userId: string) {
    const ownTags = new Set(
      (await this.prisma.userInterestTag.findMany({ where: { userId }, select: { tagId: true } })).map((item) => item.tagId)
    );
    const follows = await this.prisma.userFollow.findMany({
      where: { followerId: userId },
      include: { following: { select: memberSelect } },
      orderBy: { createdAt: "desc" }
    });
    return follows.map((follow) => this.toMemberCard(follow.following, ownTags, true));
  }

  async follow(userId: string, targetUserId: string) {
    if (userId === targetUserId) throw new BadRequestException("Kullanıcı kendisini takip edemez.");
    const [target, existing, blocked] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: targetUserId, status: "active", role: "user" }, select: { id: true } }),
      this.prisma.userFollow.findUnique({ where: { followerId_followingId: { followerId: userId, followingId: targetUserId } } }),
      this.prisma.userBlock.findFirst({
        where: {
          targetType: "user",
          OR: [
            { userId, targetId: targetUserId },
            { userId: targetUserId, targetId: userId }
          ]
        },
        select: { userId: true }
      })
    ]);
    if (!target) throw new NotFoundException("Takip edilecek kullanıcı bulunamadı.");
    if (blocked) throw new ForbiddenException("Engellenmiş kullanıcılar takip edilemez.");
    if (existing) return { ok: true as const, following: true };

    await this.prisma.$transaction([
      this.prisma.userFollow.create({ data: { followerId: userId, followingId: targetUserId } }),
      this.prisma.user.update({ where: { id: userId }, data: { followingCount: { increment: 1 } } }),
      this.prisma.user.update({ where: { id: targetUserId }, data: { followerCount: { increment: 1 } } })
    ]);
    return { ok: true as const, following: true };
  }

  async unfollow(userId: string, targetUserId: string) {
    const deleted = await this.prisma.userFollow.deleteMany({ where: { followerId: userId, followingId: targetUserId } });
    if (deleted.count > 0) {
      await this.prisma.$transaction([
        this.prisma.user.updateMany({ where: { id: userId, followingCount: { gt: 0 } }, data: { followingCount: { decrement: 1 } } }),
        this.prisma.user.updateMany({ where: { id: targetUserId, followerCount: { gt: 0 } }, data: { followerCount: { decrement: 1 } } })
      ]);
    }
    return { ok: true as const, following: false };
  }

  private toMemberCard(user: { id: string; name: string; username: string | null; accountType: string; city: string | null; country: string | null; followerCount: number; interestTags: { tagId: string }[] }, ownTags: Set<string>, following: boolean) {
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      accountType: user.accountType === "corporate" ? "corporate" as const : "individual" as const,
      city: user.city,
      country: user.country,
      followerCount: user.followerCount,
      commonTagCount: user.interestTags.filter((item) => ownTags.has(item.tagId)).length,
      following
    };
  }
}
