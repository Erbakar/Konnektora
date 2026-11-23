import { afterEach, describe, expect, it, vi } from "vitest";
import { placeSchema } from "@konnektora/shared";
import { placeLocationLabel } from "../lib/formats";
import { postMediaCount, totalPostMedia } from "../lib/postMedia";
import { listEventRelatedUsers, listPlaceRelatedUsers } from "../lib/api";

afterEach(() => { vi.restoreAllMocks(); window.localStorage.clear(); });

describe("23/11 test turu", () => {
  it("#48, #49: mekân konumu ilçe/şehir/eyalet sırasıyla yazılır", () => {
    expect(placeLocationLabel({ city: "Beyoğlu", region: "İstanbul", country: "Türkiye" }, "tr")).toBe("Beyoğlu, İstanbul, Türkiye");
    expect(placeLocationLabel({ address: "İstiklal Cd. 1", city: "Beyoğlu", postalCode: "34430", region: "İstanbul", country: "Türkiye" }, "tr", true)).toBe("İstiklal Cd. 1, Beyoğlu, 34430, İstanbul, Türkiye");
    expect(placeLocationLabel({ city: "Austin", region: "Texas", country: "Amerika Birleşik Devletleri" }, "tr")).toBe("Austin, Texas, Amerika Birleşik Devletleri");
    expect(placeLocationLabel({ city: "Ankara", region: "Ankara", country: "Türkiye" }, "tr")).toBe("Ankara, Türkiye");
  });

  it("#54, #60, #61: Medya sekmesi yüklenen medya ile YouTube/SoundCloud paylaşımlarını sayar", () => {
    const posts = [
      { body: "Bak https://www.youtube.com/watch?v=abc123 ve https://soundcloud.com/a/b", media: [] },
      { body: "Fotoğraflar", media: [{ type: "image" }, { type: "video" }] },
      { body: "Sadece yazı", media: [] },
    ];
    expect(postMediaCount(posts[0]!)).toBe(2);
    expect(postMediaCount(posts[2]!)).toBe(0);
    expect(totalPostMedia(posts)).toBe(4);
  });

  it("#43: onay bekleyen mekân üyeliği şemayı bozmaz", () => {
    const parsed = placeSchema.shape.viewerMembership.safeParse({ status: "pending", role: "member" });
    expect(parsed.success).toBe(true);
  });

  it("#35, #36, #40: ilgili kullanıcılar oturumla istenir (yönetici sekmeleri dolu gelir)", async () => {
    window.localStorage.setItem("konnektora_user_token", "token-123");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("[]", { status: 200, headers: { "content-type": "application/json" } }));
    await listEventRelatedUsers("event-1").catch(() => undefined);
    await listPlaceRelatedUsers("place-1").catch(() => undefined);
    const headers = fetchMock.mock.calls.map((call) => new Headers((call[1] as RequestInit | undefined)?.headers).get("Authorization"));
    expect(headers.filter((value) => value === "Bearer token-123").length).toBeGreaterThanOrEqual(2);
  });
});
