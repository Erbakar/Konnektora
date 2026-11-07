import { notifyUserActivity } from "../notifications/activity-events";
import { notificationCards } from "../notifications/notification-cards";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { BlockedTargetType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProfileTagSuggestionDto, CreateUserBlockDto, NotificationPreferenceDto, TagAffinityInputDto, UpgradeCorporateAccountDto, UpdateNotificationPreferencesDto, UpdatePrivacySettingsDto, UpdateProfileDto } from "./profile.dto";
import { NotificationsService } from "../notifications/notifications.service";
import { AuthService } from "../auth/auth.service";

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
  region: true, postalCode: true,
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly authService: AuthService,
  ) {}

  async updatePreferredLanguage(userId: string, language?: string) {
    const preferredLanguage = language === "en" ? "en" : language === "tr" ? "tr" : null;
    if (!preferredLanguage) throw new BadRequestException("Desteklenmeyen dil tercihi.");
    await this.prisma.user.update({ where: { id: userId }, data: { preferredLanguage } });
    return { preferredLanguage };
  }

  async getProfile(userId: string) {
    const profile = await this.prisma.user.findUnique({ where: { id: userId }, select: profileSelect });

    if (!profile) {
      throw new NotFoundException("Kullanıcı bulunamadı.");
    }

    return profile;
  }

  async updateProfile(userId: string, input: UpdateProfileDto) {
    const current = await this.getProfile(userId);
    const username = input.username === undefined ? current.username : input.username.trim();
    if (input.username !== undefined && !username) throw new BadRequestException("Kullanıcı adı zorunludur.");

    if (input.phone !== undefined && (input.phone.trim() || null) !== current.phone) {
      throw new BadRequestException("Telefon numarası doğrulama akışıyla değiştirilmelidir.");
    }
    const email = input.email?.trim().toLowerCase();
    if (email && email !== current.email) {
      const owner = await this.prisma.user.findFirst({ where: { email, id: { not: userId } }, select: { id: true } });
      if (owner) throw new ConflictException("Bu e-posta adresi zaten kullanılıyor.");
    }

    if (username) {
      const owner = await this.prisma.user.findFirst({ where: { username: { equals: username, mode: "insensitive" }, id: { not: userId } }, select: { id: true } });
      if (owner) {
        throw new ConflictException("Bu kullanıcı adı zaten kullanılıyor.");
      }
    }

    const companyName = this.optionalText(input.companyName, current.companyName);
    const tradeName = this.optionalText(input.tradeName, current.tradeName);
    if (current.accountType === "corporate" && (!companyName || !tradeName)) {
      throw new BadRequestException("Kurumsal hesaplarda işletme adı ve ticari unvan zorunludur.");
    }

    const birthDate = input.birthDate === undefined ? current.birthDate : input.birthDate ? new Date(input.birthDate) : null;
    if (current.accountType === "individual") {
      const latestBirthDate = new Date();
      latestBirthDate.setUTCFullYear(latestBirthDate.getUTCFullYear() - 18);
      if (!birthDate || !Number.isFinite(birthDate.getTime()) || birthDate > latestBirthDate) throw new BadRequestException("Üyelik için geçerli bir doğum tarihi ve en az 18 yaş gereklidir.");
    }
    const shouldActivate = current.status === "pending"
      && current.phoneVerified
      && Boolean(username && input.country?.trim())
      && (current.accountType === "corporate" || Boolean(birthDate));
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name.trim(),
        email: email ?? current.email,
        ...(email && email !== current.email ? { emailVerified: false } : {}),
        username,
        phone: current.phone,
        region: this.optionalText(input.region, current.region), postalCode: this.optionalText(input.postalCode, current.postalCode),
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
    if (shouldActivate && updated.status === "active") {
      await this.authService.sendAccountActivatedEmailOnce({
        userId: updated.id,
        to: updated.email,
        name: updated.name,
      });
    }
    return updated;
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
        companyType: input.companyType,
        businessCategory: input.businessCategory,
        region: input.region?.trim() || null, postalCode: input.postalCode?.trim() || null,
        country: input.country.trim(),
        city: input.city?.trim() || null,
        district: input.district?.trim() || null,
        address: input.address?.trim() || null,
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
      channel: emailOnlyTopics.has(topic) && channels.get(topic) === "none" ? "email" : channels.get(topic) ?? (emailOnlyTopics.has(topic) ? "email" : "both")
    }));
  }

  async updateNotificationPreferences(userId: string, input: UpdateNotificationPreferencesDto) {
    const unique = new Map(input.preferences.map((preference) => [preference.topic, preference]));
    if (unique.size !== input.preferences.length) {
      throw new BadRequestException("Aynı bildirim konusu birden fazla kez gönderilemez.");
    }
    if ([...unique.values()].some((preference) => emailOnlyTopics.has(preference.topic) && preference.channel === "none")) {
      throw new BadRequestException("Hesap güvenliği bildirimleri kapatılamaz.");
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
      this.prisma.user.findMany({ where: { id: { in: ids("user") } }, select: { id: true, name: true, username: true } }),
      this.prisma.tag.findMany({ where: { id: { in: ids("tag") } }, select: { id: true, name: true, slug: true } }),
      this.prisma.event.findMany({ where: { id: { in: ids("event") } }, select: { id: true, title: true, slug: true, startsAt: true, endsAt: true, city: true, country: true } }),
      this.prisma.place.findMany({ where: { id: { in: ids("place") } }, select: { id: true, name: true, slug: true, city: true, country: true } })
    ]);
    const details = new Map<string, { label: string; subtitle?: string | null; href: string }>();
    users.forEach((item) => details.set(`user:${item.id}`, { label: item.username ? `@${item.username}` : item.name, subtitle: null, href: item.username ? `/users/${item.username}` : `/users/id/${item.id}` }));
    tags.forEach((item) => details.set(`tag:${item.id}`, { label: item.name, subtitle: null, href: `/tags/${item.slug}` }));
    events.forEach((item) => details.set(`event:${item.id}`, { label: item.title, href: `/events/${item.slug}`, subtitle: [item.startsAt?.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" }), item.endsAt?.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" }), item.city, item.country].filter(Boolean).join(" · ") }));
    places.forEach((item) => details.set(`place:${item.id}`, { label: item.name, href: `/places/${item.slug}`, subtitle: [item.city, item.country].filter(Boolean).join(", ") }));
    return blocks.map((block) => ({
      href: details.get(`${block.targetType}:${block.targetId}`)?.href ?? null,
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
    for (const tagId of added) await notifyUserActivity(this.prisma, userId, "tag", tagId, "tagged", `tagged:${userId}:${tagId}`);
    return this.getAffinities(userId);
  }

  async listTagSuggestions(userId: string) {
    return this.prisma.profileTagSuggestion.findMany({
      where: { status: "pending", OR: [{ targetUserId: userId }, { suggestedById: userId }] },
      orderBy: { createdAt: "desc" },
      include: {
        tag: true,
        targetUser: { select: { id: true, name: true, username: true, role: true, status: true } },
        suggestedBy: { select: { id: true, name: true, username: true, role: true, status: true } },
      },
    });
  }

  async createTagSuggestion(suggestedById: string, targetUserId: string, input: CreateProfileTagSuggestionDto) {
    if (suggestedById === targetUserId) throw new BadRequestException("Kendi profilinize etiketi doğrudan ekleyebilirsiniz.");
    const [target, tag, existing, pending] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: targetUserId, status: "active" }, select: { id: true } }),
      this.prisma.tag.findFirst({ where: { id: input.tagId, status: "active" }, select: { id: true, name: true } }),
      this.prisma.userInterestTag.findUnique({ where: { userId_tagId: { userId: targetUserId, tagId: input.tagId } } }),
      this.prisma.profileTagSuggestion.findFirst({ where: { targetUserId, suggestedById, tagId: input.tagId, status: "pending" } }),
    ]);
    if (!target || !tag) throw new NotFoundException("Kullanıcı veya etiket bulunamadı.");
    if (existing) throw new ConflictException("Bu etiket kullanıcının profilinde zaten var.");
    if (pending) throw new ConflictException("Bu etiket daha önce onaya gönderildi.");
    const suggestion = await this.prisma.profileTagSuggestion.create({
      data: { targetUserId, suggestedById, tagId: input.tagId, sentiment: input.sentiment },
      include: { tag: true, targetUser: { select: { id: true, name: true, username: true, role: true, status: true } }, suggestedBy: { select: { id: true, name: true, username: true, role: true, status: true } } },
    });
    const sentimentLabel = input.sentiment === "like" ? "Beğeniyorum" : input.sentiment === "dislike" ? "Beğenmiyorum" : "Nötr";
    // Uygulama içinde yalnız onay kartı gösterilir; bu kayıt e-posta/anlık bildirim teslimi içindir.
    await this.notifications.dispatch({ userId: targetUserId, topic: "tag_request", type: "profile_tag_suggestion", title: "Profil etiketi onayınızı bekliyor", body: `${suggestion.suggestedBy.username ? `@${suggestion.suggestedBy.username}` : suggestion.suggestedBy.name}, “${tag.name}” etiketini “${sentimentLabel}” duygusuyla profilinize eklemek istiyor.`, targetType: "tag", targetId: tag.id, context: { targetLabel: tag.name, targetUrl: "/notifications?tab=waiting" } });
    return suggestion;
  }

  async decideTagSuggestion(userId: string, id: string, action: "accept" | "decline" | "cancel") {
    const suggestion = await this.prisma.profileTagSuggestion.findUnique({ where: { id }, include: { tag: true, targetUser: { select: { username: true } } } });
    if (!suggestion || suggestion.status !== "pending") throw new NotFoundException("Bekleyen etiket önerisi bulunamadı.");
    if (action === "cancel" ? suggestion.suggestedById !== userId : suggestion.targetUserId !== userId) throw new BadRequestException("Bu öneri üzerinde işlem yapamazsınız.");
    if (action === "accept") {
      const exists = await this.prisma.userInterestTag.findUnique({ where: { userId_tagId: { userId: suggestion.targetUserId, tagId: suggestion.tagId } } });
      await this.prisma.$transaction([
        this.prisma.userInterestTag.upsert({ where: { userId_tagId: { userId: suggestion.targetUserId, tagId: suggestion.tagId } }, create: { userId: suggestion.targetUserId, tagId: suggestion.tagId, sentiment: suggestion.sentiment }, update: { sentiment: suggestion.sentiment } }),
        this.prisma.profileTagSuggestion.update({ where: { id }, data: { status: "accepted" } }),
        ...(exists ? [] : [this.prisma.tag.update({ where: { id: suggestion.tagId }, data: { usageCount: { increment: 1 } } })]),
      ]);
    } else {
      await this.prisma.profileTagSuggestion.update({ where: { id }, data: { status: action === "cancel" ? "cancelled" : "declined" } });
    }
    if (action !== "cancel") await this.notifications.dispatch({ userId: suggestion.suggestedById, topic: "tag_request", type: "profile_tag_suggestion_result", title: action === "accept" ? "Etiket öneriniz kabul edildi" : "Etiket öneriniz reddedildi", body: `${suggestion.targetUser?.username ? `@${suggestion.targetUser.username} profiline ` : "Profile "}“”${suggestion.tag.name}|${suggestion.tag.slug ?? suggestion.tag.name}“” etiketi için gönderdiğiniz öneri ${action === "accept" ? "kabul edildi" : "reddedildi"}.`, targetType: "user", targetId: suggestion.targetUserId });
    return { ok: true as const, status: action === "accept" ? "accepted" : action === "cancel" ? "cancelled" : "declined" };
  }

  async getNotifications(userId: string) {
    const items = await (this.prisma as any).notification.findMany({
      where: { userId, type: { notIn: ["private_message", "profile_tag_suggestion"] } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100
    });
    const ids = (type: string) => items.filter((item: any) => item.targetType === type && item.targetId).map((item: any) => item.targetId);
    const [events, places, tags, users] = await Promise.all([
      ids("event").length ? this.prisma.event.findMany({ where: { id: { in: ids("event") } }, select: { id: true, slug: true, title: true } }) : [],
      ids("place").length ? this.prisma.place.findMany({ where: { id: { in: ids("place") } }, select: { id: true, slug: true, name: true } }) : [],
      ids("tag").length ? this.prisma.tag.findMany({ where: { id: { in: ids("tag") } }, select: { id: true, slug: true, name: true } }) : [],
      ids("user").length ? this.prisma.user.findMany({ where: { id: { in: ids("user") } }, select: { id: true, username: true } }) : [],
    ]);
    const paths = new Map([...events.map(item => [item.id, `/events/${item.slug}`] as const), ...places.map(item => [item.id, `/places/${item.slug}`] as const), ...tags.map(item => [item.id, `/tags/${item.slug}`] as const)]);
    const labels = new Map([...events.map(item => [item.id, item.title] as const), ...places.map(item => [item.id, item.name] as const), ...tags.map(item => [item.id, item.name] as const), ...users.map(item => [item.id, item.username ? `@${item.username}` : "Kullanıcı profili"] as const)]);
    const legacyTagNames = items.filter((item: any) => item.type === "profile_tag_suggestion_result" && !item.body.includes("“”")).map((item: any) => item.body.match(/^(.*?) etiketi için gönderdiğiniz öneri/)?.[1]).filter(Boolean);
    const legacyTags = legacyTagNames.length ? await this.prisma.tag.findMany({ where: { name: { in: legacyTagNames }, status: "active" }, select: { name: true, slug: true } }) : [];
    const resolvedItems = items.map((item: any) => {
      if (item.type !== "profile_tag_suggestion_result" || item.body.includes("“”")) return item;
      const tagName = item.body.match(/^(.*?) etiketi için gönderdiğiniz öneri/)?.[1];
      const tag = legacyTags.find(tag => tag.name === tagName);
      const target = users.find(user => user.id === item.targetId);
      return tag && target?.username ? { ...item, body: `@${target.username} profiline “”${tag.name}|${tag.slug}“”${item.body.slice(tagName.length)}` } : item;
    });
    return notificationCards(this.prisma, userId, resolvedItems.map((item: any) => ({ ...item, targetLabel: labels.get(item.targetId) ?? null, targetUrl: item.targetType === "user" && item.targetId ? `/users/id/${item.targetId}` : paths.get(item.targetId) ?? null })));
  }

  async markNotificationRead(userId: string, id: string) {
    const notification = await (this.prisma as any).notification.findFirst({ where: { id, userId } });

    if (!notification) {
      throw new NotFoundException("Bildirim bulunamadı.");
    }

    const groupKey = notification.context?.groupKey;
    if (groupKey) await this.prisma.notification.updateMany({ where: { userId, context: { path: ["groupKey"], equals: groupKey } }, data: { readAt: new Date() } });
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
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
