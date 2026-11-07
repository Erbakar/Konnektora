import { NotFoundException } from "@nestjs/common";
import { injectSocialPreview } from "./social-preview-html";
import { SocialPreviewService } from "./social-preview.service";

describe("Public social previews", () => {
  const prisma = { user: { findFirst: jest.fn() }, event: { findFirst: jest.fn() }, place: { findFirst: jest.fn() }, tag: { findFirst: jest.fn() } };
  const service = new SocialPreviewService(prisma as never, { get: () => "https://konnektora.com" } as never);
  beforeEach(() => { jest.resetAllMocks(); });
  it("uses the event cover and canonical route and excludes invite-only events", async () => {
    prisma.event.findFirst.mockResolvedValue({ title: "Sunset", slug: "sunset", description: "Music", startsAt: new Date("2026-10-08T18:00:00Z"), city: "İstanbul", country: "Türkiye", coverImageUrl: "/uploads/id.webp", place: { name: "Sahil" }, tags: [{ tag: { name: "caz" } }] });
    const preview = await service.get("event", "sunset", "https://konnektora.com/api");
    expect(prisma.event.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { slug: "sunset", status: "published", visibility: { not: "invite_only" } } }));
    expect(preview).toMatchObject({ image: "https://konnektora.com/api/uploads/id.webp", path: "/events/sunset" });
    expect(preview.description).toContain("Sahil");
    expect(preview.description).toContain("#caz");
    prisma.event.findFirst.mockResolvedValue(null);
    await expect(service.get("event", "secret", "https://konnektora.com/api")).rejects.toBeInstanceOf(NotFoundException);
  });
  it("does not disclose private names, company names or location in the profile preview", async () => {
    prisma.user.findFirst.mockResolvedValue({ id: "person", username: "ada", name: "Private Name", companyName: "Private Business", accountType: "corporate", city: "Private City", country: "Private Country", followerCount: 12, privacySettings: { profileNameAudience: "only_me", locationAudience: "friends", businessAudience: "only_me" }, uploadedMedia: [{ url: "/uploads/avatar.png" }], interestTags: [{ tag: { name: "caz" } }] });
    const preview = await service.get("user", "ada", "https://api.konnektora.com");
    expect(preview.title).toBe("@ada");
    expect(JSON.stringify(preview)).not.toContain("Private");
    expect(preview.image).toBe("https://api.konnektora.com/uploads/avatar.png");
  });
  it("escapes untrusted HTML in metadata and preserves the app entry point", () => {
    const html = injectSocialPreview('<html><head><title>Old</title><meta name="description" content="Old"></head><body><div id="root"></div><script src="/assets/app.js"></script></body></html>', { title: '"><script>bad()</script>', description: '" onmouseover="bad()', image: "https://example.com/image.png", path: "/events/sunset" }, "https://konnektora.com");
    expect(html).not.toContain("<script>bad()");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain('property="og:url" content="https://konnektora.com/events/sunset"');
    expect(html).toContain('src="/assets/app.js"');
    expect(html).not.toContain("<title>Old</title>");
  });
});
