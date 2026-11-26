import { beforeEach, describe, expect, it } from "vitest";
import { readRecent, rememberQuery, searchItemSubtitle } from "../components/HeaderSearch";
import { captureSignupInviteRef, readSignupInviteRef, signupInviteLink } from "../lib/signupInviteRef";

const base = { id: "11111111-1111-4111-8111-111111111111", title: "Caz Gecesi", subtitle: "Özet", href: "/events/caz", imageUrl: null, meta: null };
const startsAt = new Date(2026, 11, 5, 20, 30).toISOString();

describe("26/11 #82 başlık araması sonuç biçimi", () => {
  beforeEach(() => window.localStorage.clear());

  it("etkinlik: çevrim içi, yüz yüze ve hibrit konum satırı", () => {
    const venue = { venueName: "Moda Sahnesi", city: "Kadıköy", region: "İstanbul", country: "Türkiye", startsAt };
    expect(searchItemSubtitle({ ...base, kind: "event", eventFormat: "online", startsAt }, "tr")).toBe("05.12.2026 20:30 @Çevrim içi");
    expect(searchItemSubtitle({ ...base, kind: "event", eventFormat: "offline", ...venue }, "tr")).toBe("05.12.2026 20:30 @Moda Sahnesi, Kadıköy, İstanbul, Türkiye");
    expect(searchItemSubtitle({ ...base, kind: "event", eventFormat: "hybrid", ...venue }, "tr")).toBe("05.12.2026 20:30 @Çevrim içi & Moda Sahnesi, Kadıköy, İstanbul, Türkiye");
  });

  it("mekân: ilçe, şehir, ülke; diğer türler değişmez", () => {
    expect(searchItemSubtitle({ ...base, kind: "place", city: "Kadıköy", region: "İstanbul", country: "Türkiye" }, "tr")).toBe("Kadıköy, İstanbul, Türkiye");
    expect(searchItemSubtitle({ ...base, kind: "user", subtitle: "Ada" }, "tr")).toBe("Ada");
  });

  it("Enter ile yapılan arama son aramalara eklenir", () => {
    rememberQuery("  caz ");
    expect(readRecent()).toEqual([expect.objectContaining({ kind: "query", title: "caz", href: "/search?q=caz" })]);
  });
});

describe("26/11 #118 davet bağlantısı", () => {
  beforeEach(() => window.localStorage.clear());
  it("bağlantıdaki ref saklanır ve kayıtta kullanılır", () => {
    const id = "22222222-2222-4222-8222-222222222222";
    expect(signupInviteLink(id, "https://konnektora.com")).toBe(`https://konnektora.com/onboarding?ref=${id}`);
    captureSignupInviteRef("?ref=gecersiz");
    expect(readSignupInviteRef()).toBeUndefined();
    captureSignupInviteRef(`?ref=${id}`);
    expect(readSignupInviteRef()).toBe(id);
  });
});
