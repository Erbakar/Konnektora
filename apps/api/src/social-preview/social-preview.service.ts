import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { SocialPreview } from "./social-preview-html";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SocialPreviewService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}
  async get(type: string, identity: string, apiOrigin: string): Promise<SocialPreview> {
    const webOrigin = this.config.get<string>("WEB_ORIGIN", "https://konnektora.com");
    const image = (raw?: string | null) => {
      if (!raw) return new URL("/brand/app-icon-1024.png", webOrigin).toString();
      const resolved = raw.startsWith("/uploads/") ? new URL(`${apiOrigin}${raw}`) : new URL(raw, webOrigin);
      return /^https?:$/.test(resolved.protocol) ? resolved.toString() : new URL("/brand/app-icon-1024.png", webOrigin).toString();
    };
    if (type === "event") {
      const event = await this.prisma.event.findFirst({ where: { slug: identity, status: "published", visibility: { not: "invite_only" } }, select: { title: true, slug: true, description: true, startsAt: true, city: true, country: true, coverImageUrl: true, place: { select: { name: true } }, tags: { orderBy: { sortOrder: "asc" }, take: 4, select: { tag: { select: { name: true } } } } } });
      if (!event) throw new NotFoundException();
      return { title: event.title, description: [`📍 ${event.place?.name ?? [event.city, event.country].filter(Boolean).join(" · ")}`, `📅 ${event.startsAt.toISOString()}`, event.tags.map(item => `#${item.tag.name}`).join(" "), event.description ?? ""].join("\n"), image: image(event.coverImageUrl), path: `/events/${event.slug}` };
    }
    if (type === "place") {
      const place = await this.prisma.place.findFirst({ where: { slug: identity, status: "active", visibility: { not: "invite_only" } }, select: { name: true, slug: true, description: true, city: true, country: true, coverImageUrl: true, followerCount: true, tags: { take: 4, select: { tag: { select: { name: true } } } } } });
      if (!place) throw new NotFoundException();
      return { title: place.name, description: [`📍 ${[place.city, place.country].filter(Boolean).join(" · ")}`, place.tags.map(item => `#${item.tag.name}`).join(" "), `✨ ${place.followerCount} takipçi`, place.description ?? ""].join("\n"), image: image(place.coverImageUrl), path: `/places/${place.slug}` };
    }
    if (type === "tag") {
      const tag = await this.prisma.tag.findFirst({ where: { slug: identity, status: "active" }, select: { name: true, slug: true, description: true, usageCount: true } });
      if (!tag) throw new NotFoundException();
      return { title: `#${tag.name}`, description: `${tag.description ?? ""}\n✨ ${tag.usageCount} kişi bu ilgi alanıyla bağlantılı`, image: image(), path: `/tags/${tag.slug}` };
    }
    if (type === "user" || type === "user-id") {
      const person = await this.prisma.user.findFirst({ where: { ...(type === "user-id" ? { id: identity } : { username: { equals: identity, mode: "insensitive" } }), status: "active" }, select: { id: true, username: true, name: true, companyName: true, accountType: true, city: true, country: true, followerCount: true, privacySettings: { select: { profileNameAudience: true, locationAudience: true, businessAudience: true } }, uploadedMedia: { where: { contentType: "user", status: "active", isProfilePicture: true }, take: 1, select: { url: true } }, interestTags: { where: { sentiment: "like", tag: { status: "active" } }, take: 10, orderBy: { createdAt: "desc" }, select: { tag: { select: { name: true } } } } } });
      if (!person) throw new NotFoundException();
      const privacy = person.privacySettings;
      const publicName = !privacy || privacy.profileNameAudience === "everybody";
      const publicBusiness = person.accountType === "corporate" && (!privacy || privacy.businessAudience === "everybody");
      const title = publicBusiness && person.companyName ? person.companyName : person.username ? `@${person.username}` : publicName ? person.name : "Konnektora üyesi";
      const location = !privacy || privacy.locationAudience === "everybody" ? [person.city, person.country].filter(Boolean).join(" · ") : "";
      return { title, description: [location, person.interestTags.map(item => `#${item.tag.name}`).join(" "), `✨ ${person.followerCount} takipçi`, "Seni bağlayan ortak noktaları bul."].filter(Boolean).join("\n"), image: image(person.uploadedMedia[0]?.url), path: person.username ? `/users/${encodeURIComponent(person.username)}` : `/users/id/${person.id}` };
    }
    throw new NotFoundException();
  }
}
