import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationPreferenceDto, UpdateNotificationPreferencesDto, UpdatePrivacySettingsDto, UpdateProfileDto } from "./profile.dto";

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

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name.trim(),
        username,
        phone: current.phone,
        country: this.optionalText(input.country, current.country),
        city: this.optionalText(input.city, current.city),
        district: this.optionalText(input.district, current.district),
        address: this.optionalText(input.address, current.address),
        gender: input.gender ?? null,
        birthDate: input.birthDate ? new Date(input.birthDate) : null,
        website: this.optionalText(input.website, current.website),
        companyName,
        tradeName,
        companyType: this.optionalText(input.companyType, current.companyType),
        businessCategory: this.optionalText(input.businessCategory, current.businessCategory)
      },
      select: profileSelect
    });
  }

  async getPrivacySettings(userId: string) {
    const settings = await this.prisma.privacySettings.findUnique({ where: { userId } });
    return settings ?? {
      userId,
      messageAudience: "everybody" as const,
      directoryDiscoverable: false,
      eventAudience: "everybody" as const,
      eventInviteAudience: "everybody" as const,
      placeAudience: "everybody" as const,
      placeInviteAudience: "everybody" as const
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

  async getInterests(userId: string) {
    const interests = await this.prisma.userInterestTag.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: { tag: true }
    });

    return interests.map((interest) => interest.tag);
  }

  async updateInterests(userId: string, tagIds: string[]) {
    const uniqueTagIds = [...new Set(tagIds)];
    const activeTagCount = await this.prisma.tag.count({
      where: {
        id: { in: uniqueTagIds },
        status: "active"
      }
    });

    if (activeTagCount !== uniqueTagIds.length) {
      throw new BadRequestException("Geçersiz veya pasif tag seçimi var.");
    }

    await this.prisma.$transaction([
      this.prisma.userInterestTag.deleteMany({ where: { userId } }),
      this.prisma.userInterestTag.createMany({
        data: uniqueTagIds.map((tagId) => ({ userId, tagId })),
        skipDuplicates: true
      })
    ]);

    return this.getInterests(userId);
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
}
