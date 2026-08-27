import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { BlockedTargetType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserBlockDto, NotificationPreferenceDto, TagAffinityInputDto, UpgradeCorporateAccountDto, UpdateNotificationPreferencesDto, UpdatePrivacySettingsDto, UpdateProfileDto } from "./profile.dto";

const notificationTopics: NotificationPreferenceDto["topic"][] = [
  "tag_request", "private_message", "mention", "comment", "password_changed", "email_changed", "phone_changed",
  "login", "admin_message", "event_invite", "event_manager", "place_invite", "place_manager"
];
const emailOnlyTopics = new Set<NotificationPreferenceDto["topic"]>(["password_changed", "email_changed", "phone_changed", "login"]);

const profileSelect = {
  id: true,
  accountType: true,
  name: true,
  username: true,
  email: true,
  phone: true,
  phoneVerified: true,
  country: true,
  city: true,
  district: true,
  address: true,
  gender: true,
  birthDate: true,
  website: true,
  companyName: true,
  tradeName: true,
  companyType: true,
  businessCategory: true,
  emailVerified: true,
  status: true,
  createdAt: true,
  updatedAt: true
} as const;

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.user.findUnique({ where: { id: userId }, select: profileSelect });

    if (!profile) {
      throw new NotFoundException("Kullanıcı bulunamadı.");
    }

    return profile;
  }

  async updateProfile(userId: string, input: UpdateProfileDto) {
    const current = await this.getProfile(userId);
    const username = input.username?.trim() || null;

    if (input.phone !== undefined && (input.phone.trim() || null) !== current.phone) {
      throw new BadRequestException("Telefon numarası doğrulama akışıyla değiştirilmelidir.");
    }
    const email = input.email?.trim().toLowerCase();
    if (email && email !== current.email) {
      const owner = await this.prisma.user.findFirst({ where: { email, id: { not: userId } }, select: { id: true } });
      if (owner) throw new ConflictException("Bu e-posta adresi zaten kullanılıyor.");
    }

    if (username) {
      const owner = await this.prisma.user.findFirst({ where: { username, id: { not: userId } }, select: { id: true } });
      if (owner) {
        throw new ConflictException("Bu kullanıcı adı zaten kullanılıyor.");
      }
    }

    const companyName = this.optionalText(input.companyName, current.companyName);
    const tradeName = this.optionalText(input.tradeName, current.tradeName);
    if (current.accountType === "corporate" && (!companyName || !tradeName)) {
      throw new BadRequestException("Kurumsal hesaplarda işletme adı ve ticari unvan zorunludur.");
    }

    const birthDate = input.birthDate ? new Date(input.birthDate) : null;
    const shouldActivate = current.status === "pending"
      && current.phoneVerified
      && Boolean(username && input.country?.trim())
      && (current.accountType === "corporate" || Boolean(birthDate));
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name.trim(),
        email: email ?? current.email,
        ...(email && email !== current.email ? { emailVerified: false } : {}),
        username,
        phone: current.phone,
        country: this.optionalText(input.country, current.country),
        city: this.optionalText(input.city, current.city),
        district: this.optionalText(input.district, current.district),
        address: this.optionalText(input.address, current.address),
        gender: input.gender ?? null,
        birthDate,
        website: this.optionalText(input.website, current.website),
        companyName,
        tradeName,
        companyType: this.optionalText(input.companyType, current.companyType),
        businessCategory: this.optionalText(input.businessCategory, current.businessCategory),
        ...(shouldActivate ? { status: "active" as const } : {}),
      },
      select: profileSelect
    });
  }

  async upgradeCorporateAccount(userId: string, input: UpgradeCorporateAccountDto) {
    const current = await this.getProfile(userId);
    if (current.accountType === "corporate") return { ok: true, accountType: "corporate" as const };
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        accountType: "corporate",
        companyName: input.companyName.trim(),
        tradeName: input.tradeName.trim(),
        companyType: input.companyType?.trim() || null,
        businessCategory: input.businessCategory?.trim() || null,
      },
    });
    return { ok: true, accountType: "corporate" as const };
  }

  async getPrivacySettings(userId: string) {
    const settings = await this.prisma.privacySettings.findUnique({ where: { userId } });
    return settings ?? {
      userId,
      messageAudience: "everybody" as const,
      directoryDiscoverable: true,
      eventAudience: "everybody" as const,
      eventInviteAudience: "everybody" as const,
      placeAudience: "everybody" as const,
      placeInviteAudience: "everybody" as const,
      profileNameAudience: "everybody" as const,
      demographicsAudience: "everybody" as const,
      locationAudience: "everybody" as const,
      websiteAudience: "everybody" as const,
      businessAudience: "everybody" as const,
      addressAudience: "everybody" as const,
      tradeNameAudience: "everybody" as const
    };
  }

  updatePrivacySettings(userId: string, input: UpdatePrivacySettingsDto) {
    return this.prisma.privacySettings.upsert({
      where: { userId },
      create: { userId, ...input },
      update: input
    });
  }

  async getNotificationPreferences(userId: string) {
    const stored = await this.prisma.notificationPreference.findMany({ where: { userId } });
    const channels = new Map(stored.map((item) => [item.topic, item.channel]));
    return notificationTopics.map((topic) => ({
      topic,
      channel: channels.get(topic) ?? (emailOnlyTopics.has(topic) ? "email" : "both")
    }));
  }

  async updateNotificationPreferences(userId: string, input: UpdateNotificationPreferencesDto) {
    const unique = new Map(input.preferences.map((preference) => [preference.topic, preference]));
    if (unique.size !== input.preferences.length) {
      throw new BadRequestException("Aynı bildirim konusu birden fazla kez gönderilemez.");
    }
    await this.prisma.$transaction(
      [...unique.values()].map((preference) =>
        this.prisma.notificationPreference.upsert({
          where: { userId_topic: { userId, topic: preference.topic } },
          create: { userId, ...preference },
          update: { channel: preference.channel }
        })
      )
    );
    return this.getNotificationPreferences(userId);
  }

  async listBlocks(userId: string) {
    const blocks = await this.prisma.userBlock.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    const ids = (type: BlockedTargetType) => blocks.filter((block) => block.targetType === type).map((block) => block.targetId);
    const [users, tags, events, places] = await Promise.all([
      this.prisma.user.findMany({ where: { id: { in: ids("user") } }, select: { id: true, name: true, username: true, email: true } }),
      this.prisma.tag.findMany({ where: { id: { in: ids("tag") } }, select: { id: true, name: true, slug: true } }),
      this.prisma.event.findMany({ where: { id: { in: ids("event") } }, select: { id: true, title: true, slug: true } }),
      this.prisma.place.findMany({ where: { id: { in: ids("place") } }, select: { id: true, name: true, slug: true } })
    ]);
    const details = new Map<string, { label: string; subtitle?: string | null }>();
    users.forEach((item) => details.set(`user:${item.id}`, { label: item.username ? `@${item.username}` : item.name, subtitle: item.email }));
    tags.forEach((item) => details.set(`tag:${item.id}`, { label: item.name, subtitle: item.slug }));
    events.forEach((item) => details.set(`event:${item.id}`, { label: item.title, subtitle: item.slug }));
    places.forEach((item) => details.set(`place:${item.id}`, { label: item.name, subtitle: item.slug }));
    return blocks.map((block) => ({
      targetType: block.targetType,
      targetId: block.targetId,
      label: details.get(`${block.targetType}:${block.targetId}`)?.label ?? "Silinmiş içerik",
      subtitle: details.get(`${block.targetType}:${block.targetId}`)?.subtitle ?? null,
      createdAt: block.createdAt
    }));
  }

  async createBlock(userId: string, input: CreateUserBlockDto) {
    if (input.targetType === "user" && input.targetId === userId) {
      throw new BadRequestException("Kullanıcı kendisini engelleyemez.");
    }
    if (!(await this.blockTargetExists(input.targetType, input.targetId))) {
      throw new NotFoundException("Engellenecek içerik bulunamadı.");
    }
    const blockOperation = this.prisma.userBlock.upsert({
      where: { userId_targetType_targetId: { userId, targetType: input.targetType, targetId: input.targetId } },
      create: { userId, targetType: input.targetType, targetId: input.targetId },
      update: {}
    });
    if (input.targetType !== "user") {
      await blockOperation;
      return { ok: true as const };
    }

    const relationships = await this.prisma.userFollow.findMany({
      where: {
        OR: [
          { followerId: userId, followingId: input.targetId },
          { followerId: input.targetId, followingId: userId }
        ]
      },
      select: { followerId: true, followingId: true }
    });
    const countUpdates = relationships.flatMap((relationship) => [
      this.prisma.user.updateMany({ where: { id: relationship.followerId, followingCount: { gt: 0 } }, data: { followingCount: { decrement: 1 } } }),
      this.prisma.user.updateMany({ where: { id: relationship.followingId, followerCount: { gt: 0 } }, data: { followerCount: { decrement: 1 } } })
    ]);
    await this.prisma.$transaction([
      blockOperation,
      this.prisma.userFollow.deleteMany({
        where: {
          OR: [
            { followerId: userId, followingId: input.targetId },
            { followerId: input.targetId, followingId: userId }
          ]
        }
      }),
      ...countUpdates
    ]);
    return { ok: true as const };
  }

  async removeBlock(userId: string, targetType: string, targetId: string) {
    if (!Object.values(BlockedTargetType).includes(targetType as BlockedTargetType)) {
      throw new BadRequestException("Geçersiz engel türü.");
    }
    await this.prisma.userBlock.deleteMany({ where: { userId, targetType: targetType as BlockedTargetType, targetId } });
    return { ok: true as const };
  }

  async getInterests(userId: string) {
    const blocked = await this.prisma.userBlock.findMany({ where: { userId, targetType: "tag" }, select: { targetId: true } });
    const interests = await this.prisma.userInterestTag.findMany({
      where: { userId, tagId: { notIn: blocked.map((item) => item.targetId) } },
      orderBy: { createdAt: "asc" },
      include: { tag: true }
    });

    return interests.map((interest) => interest.tag);
  }

  async getAffinities(userId: string) {
    const blocked = await this.prisma.userBlock.findMany({ where: { userId, targetType: "tag" }, select: { targetId: true } });
    const affinities = await this.prisma.userInterestTag.findMany({
      where: { userId, tagId: { notIn: blocked.map((item) => item.targetId) } },
      orderBy: { createdAt: "asc" },
      include: { tag: true }
    });
    return affinities.map((affinity) => ({
      tag: affinity.tag,
      sentiment: affinity.sentiment,
      createdAt: affinity.createdAt,
      updatedAt: affinity.updatedAt
    }));
  }

  async updateInterests(userId: string, tagIds: string[]) {
    const existing = await this.prisma.userInterestTag.findMany({ where: { userId }, select: { tagId: true, sentiment: true } });
    const sentiments = new Map(existing.map((item) => [item.tagId, item.sentiment]));
    await this.updateAffinities(
      userId,
      [...new Set(tagIds)].map((tagId) => ({ tagId, sentiment: sentiments.get(tagId) ?? "like" }))
    );
    return this.getInterests(userId);
  }

  async updateAffinities(userId: string, affinities: TagAffinityInputDto[]) {
    const unique = new Map(affinities.map((affinity) => [affinity.tagId, affinity]));
    if (unique.size !== affinities.length) {
      throw new BadRequestException("Aynı tag birden fazla kez seçilemez.");
    }
    const uniqueTagIds = [...unique.keys()];
    const blocked = await this.prisma.userBlock.findMany({ where: { userId, targetType: "tag" }, select: { targetId: true } });
    const activeTagCount = await this.prisma.tag.count({
      where: {
        id: { in: uniqueTagIds },
        NOT: { id: { in: blocked.map((item) => item.targetId) } },
        status: "active"
      }
    });

    if (activeTagCount !== uniqueTagIds.length) {
      throw new BadRequestException("Geçersiz veya pasif tag seçimi var.");
    }
    const existing = await this.prisma.userInterestTag.findMany({ where: { userId }, select: { tagId: true } });
    const existingIds = new Set(existing.map((item) => item.tagId));
    const nextIds = new Set(uniqueTagIds);
    const added = uniqueTagIds.filter((tagId) => !existingIds.has(tagId));
    const removed = [...existingIds].filter((tagId) => !nextIds.has(tagId));
    await this.prisma.$transaction([
      this.prisma.userInterestTag.deleteMany({ where: { userId, tagId: { in: removed } } }),
      ...[...unique.values()].map((affinity) =>
        this.prisma.userInterestTag.upsert({
          where: { userId_tagId: { userId, tagId: affinity.tagId } },
          create: { userId, tagId: affinity.tagId, sentiment: affinity.sentiment },
          update: { sentiment: affinity.sentiment }
        })
      ),
      this.prisma.tag.updateMany({ where: { id: { in: added } }, data: { usageCount: { increment: 1 } } }),
      this.prisma.tag.updateMany({ where: { id: { in: removed }, usageCount: { gt: 0 } }, data: { usageCount: { decrement: 1 } } })
    ]);
    return this.getAffinities(userId);
  }

  getNotifications(userId: string) {
    return (this.prisma as any).notification.findMany({
      where: { userId },
      orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
      take: 100
    });
  }

  async markNotificationRead(userId: string, id: string) {
    const notification = await (this.prisma as any).notification.findFirst({ where: { id, userId } });

    if (!notification) {
      throw new NotFoundException("Bildirim bulunamadı.");
    }

    return (this.prisma as any).notification.update({
      where: { id },
      data: { readAt: new Date() }
    });
  }

  private optionalText(value: string | undefined, current: string | null) {
    return value === undefined ? current : value.trim() || null;
  }

  private async blockTargetExists(targetType: BlockedTargetType, targetId: string) {
    if (targetType === "user") return Boolean(await this.prisma.user.findUnique({ where: { id: targetId }, select: { id: true } }));
    if (targetType === "tag") return Boolean(await this.prisma.tag.findUnique({ where: { id: targetId }, select: { id: true } }));
    if (targetType === "event") return Boolean(await this.prisma.event.findUnique({ where: { id: targetId }, select: { id: true } }));
    return Boolean(await this.prisma.place.findUnique({ where: { id: targetId }, select: { id: true } }));
  }
}
