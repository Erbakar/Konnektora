import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { LoginResponse } from "@konnektora/shared";
import { ShareDialog, instagramNotice } from "../components/ContentDialogs";
import { ProfileVerificationPanel } from "../components/ProfileVerificationPanel";
import { CameraAccessError, cameraErrorMessage, classifyCameraError, openCamera } from "../lib/camera";
import { setUserSession } from "../lib/api";
import { LanguageProvider } from "../lib/i18n";
import {
  eventInstagramCaption,
  eventPostInstagramCaption,
  instagramCaptionWithLink,
  placeInstagramCaption,
  placePostInstagramCaption,
  profileInstagramCaption,
  tagInstagramCaption,
  tagPostInstagramCaption,
} from "../lib/shareCaptions";
import { AccountPage } from "../pages/AccountPage";

const apiMocks = vi.hoisted(() => ({
  getProfileVerification: vi.fn(),
  recordContentShare: vi.fn(),
  listTags: vi.fn(),
  listMyEvents: vi.fn(),
  listSocialAccounts: vi.fn(),
  getPrivacySettings: vi.fn(),
}));
const socialTemplateMocks = vi.hoisted(() => ({ createShareImageFile: vi.fn(), createCaptionCardFile: vi.fn(), downloadSocialFile: vi.fn() }));
const navigateMock = vi.hoisted(() => vi.fn());

vi.mock("qrcode", () => ({ default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,cXI=") } }));
vi.mock("../lib/api", async () => ({ ...(await vi.importActual<typeof import("../lib/api")>("../lib/api")), ...apiMocks }));
vi.mock("../lib/socialTemplates", async () => ({ ...(await vi.importActual<typeof import("../lib/socialTemplates")>("../lib/socialTemplates")), ...socialTemplateMocks }));
vi.mock("react-router-dom", async () => ({ ...(await vi.importActual<typeof import("react-router-dom")>("react-router-dom")), useNavigate: () => navigateMock }));
vi.mock("../components/SocialAuthButtons", () => ({
  SocialAuthButtons: ({ onSuccess }: { onSuccess: (response: LoginResponse) => void }) => <button onClick={() => onSuccess({ accessToken: "token", user: { id: "member-1", name: "Ada", email: "ada@example.com", status: "active", accountType: "individual", role: "user", onboardingCompleted: true } } as LoginResponse)} type="button">Complete provider login</button>,
}));

function providers(children: ReactNode, initialEntries = ["/"]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}><LanguageProvider><MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter></LanguageProvider></QueryClientProvider>;
}

function setNavigator(key: string, value: unknown) {
  Object.defineProperty(window.navigator, key, { configurable: true, value, writable: true });
}

beforeEach(() => {
  window.localStorage.clear();
  apiMocks.recordContentShare.mockResolvedValue(undefined);
  apiMocks.getProfileVerification.mockResolvedValue({ verified: false, eligible: true, request: null });
  apiMocks.listTags.mockResolvedValue([]);
  socialTemplateMocks.createShareImageFile.mockResolvedValue(null);
  socialTemplateMocks.createCaptionCardFile.mockResolvedValue(null);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  setNavigator("share", undefined);
  setNavigator("canShare", undefined);
});

describe("17/10 #3–#9: Instagram paylaşım şablonları", () => {
  it("#3 Etkinlik Detay > Post paylaş", () => {
    expect(instagramCaptionWithLink(eventPostInstagramCaption({ author: "@selatin", body: "Some moments are better when shared.", eventTitle: "Electronic Sunset Sessions", venue: "Moda Sahil", city: "Istanbul", startsAt: "2026-10-17T18:00:00.000Z", timezone: "Europe/Istanbul" }, "en"), "https://konnektora.com/events/sunset#post-1")).toBe([
      "@selatin at Electronic Sunset Sessions",
      "“Some moments are better when shared.”",
      "",
      "📍 Moda Sahil, Istanbul",
      "🎪 Electronic Sunset Sessions",
      "📅 Oct 17, 2026",
      "",
      "🌎 See the post on Konnektora →",
      "konnektora.com/events/sunset#post-1",
    ].join("\n"));
  });

  it("#4 Mekân Detay > Post paylaş: mekân tipi ikonu ve en fazla 4 etiket", () => {
    expect(placePostInstagramCaption({ author: "@selatin", body: "Perfect place for a sunset coffee and good conversation.", placeName: "Moda Sahil Café", icon: "☕", city: "Istanbul", tags: ["Coffee", "live music", "sunset", "outdoor", "fifth"] }, "en")).toBe([
      "@selatin at Moda Sahil Café ☕",
      "“Perfect place for a sunset coffee and good conversation.”",
      "",
      "📍 Moda Sahil Café · Istanbul",
      "#Coffee #live music #sunset #outdoor",
      "",
      "🌎 See the post on Konnektora →",
    ].join("\n"));
  });

  it("#5 İlgi Alanı Detay > Post paylaş: beğeni sayısı binlik ayırıcıyla", () => {
    expect(tagPostInstagramCaption({ author: "@selatin", body: "Last night was something else. 🔥", tagName: "Electronic Music", likeCount: 2840 }, "en")).toBe([
      "@selatin shared a post in #Electronic Music",
      "“Last night was something else. 🔥”",
      "",
      "✨ 2,840 people like this post.",
      "",
      "🌎 See this post on Konnektora →",
    ].join("\n"));
  });

  it("#6 Etkinlik Detay > Etkinlik paylaş", () => {
    expect(eventInstagramCaption({ title: "Electronic Sunset Sessions", venue: "Moda Sahil", startsAt: "2026-10-17T18:00:00.000Z", timezone: "Europe/Istanbul", tags: ["electronic music", "sunset", "beach"] }, "en")).toBe([
      "🎪 Electronic Sunset Sessions",
      "📍 Moda Sahil",
      "📅 Oct 17 · 21:00",
      "#electronic music #sunset #beach",
      "",
      "🌎 Konnektora →",
    ].join("\n"));
  });

  it("#7 Mekân Detay > Mekân paylaş", () => {
    expect(placeInstagramCaption({ name: "Moda Sahil Café", icon: "☕", address: "Moda Cd. 1", city: "Istanbul", tags: ["Coffee", "live music", "sunset", "outdoor"], followerCount: 12 }, "en")).toBe([
      "Moda Sahil Café ☕",
      "📍 Moda Cd. 1, Istanbul",
      "#Coffee #live music #sunset #outdoor",
      "",
      "✨ 12 members follow this place",
      "",
      "🌎 Discover on Konnektora →",
    ].join("\n"));
  });

  it("#8 İlgi Alanı Detay > İlgi alanı paylaş: açıklama satırında etiket adı geçer", () => {
    expect(tagInstagramCaption({ name: "Electronic Music", memberCount: 2840 }, "en")).toBe([
      "#Electronic Music",
      "✨ 2,840 members added this tag into their profile",
      "",
      "Discover events, places & people connected to #Electronic Music.",
      "",
      "🌎 Explore on Konnektora →",
    ].join("\n"));
  });

  it("#9 Profil paylaş: konum yoksa satır atlanır, en fazla 10 etiket", () => {
    const tags = ["Electronic Music", "Movies", "Coffee", "Nature", "5", "6", "7", "8", "9", "10", "11"];
    expect(profileInstagramCaption({ displayName: "@selatin", city: "Istanbul", country: "Türkiye", likedTags: tags, followerCount: 12 }, "en")).toBe([
      "🤡 @selatin",
      "Istanbul · Türkiye",
      "#Electronic Music #Movies #Coffee #Nature #5 #6 #7 #8 #9 #10",
      "",
      "✨ 12 members follow",
      "",
      "Find what connects you.",
      "",
      "🌎 View page on Konnektora →",
    ].join("\n"));
    expect(profileInstagramCaption({ displayName: "Ada", city: null, country: null, likedTags: [], followerCount: 0 }, "tr")).toBe([
      "🤡 Ada",
      "",
      "✨ 0 üye takip ediyor",
      "",
      "Seni bağlayan ortak noktaları bul.",
      "",
      "🌎 Sayfayı Konnektora’da gör →",
    ].join("\n"));
  });

  it("Türkçe arayüzde aynı düzeni Türkçe metinlerle üretir", () => {
    expect(tagInstagramCaption({ name: "Elektronik Müzik", memberCount: 2840 }, "tr")).toBe([
      "#Elektronik Müzik",
      "✨ 2.840 üye bu etiketi profiline ekledi",
      "",
      "#Elektronik Müzik ile bağlantılı etkinlikleri, mekânları ve insanları keşfet.",
      "",
      "🌎 Konnektora’da keşfet →",
    ].join("\n"));
    expect(eventInstagramCaption({ title: "Gün Batımı", venue: null, startsAt: "2026-10-17T18:00:00.000Z", timezone: "Europe/Istanbul", tags: [] }, "tr")).toBe("🎪 Gün Batımı\n📅 17 Eki · 21:00\n\n🌎 Konnektora →");
  });
});

describe("17/10 #3–#9: Instagram'da paylaş düğmesi", () => {
  const caption = "#Electronic Music\n✨ 2,840 members added this tag into their profile";
  const url = "https://konnektora.com/tags/electronic-music";
  const dialog = (props: Partial<Parameters<typeof ShareDialog>[0]> = {}) => providers(<ShareDialog onClose={vi.fn()} open targetId="tag-1" targetType="tag" title="#Electronic Music" text="WhatsApp metni" url={url} instagramText={caption} {...props}/>);

  it("Web Share yoksa açıklamayı panoya kopyalar, önizler ve Instagram bağlantısı verir", async () => {
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    setNavigator("clipboard", clipboard);
    render(dialog());
    const button = screen.getByRole("button", { name: "Instagram'da paylaş" });
    await waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);

    const expected = `${caption}\nkonnektora.com/tags/electronic-music`;
    await waitFor(() => expect(clipboard.writeText).toHaveBeenCalledWith(expected));
    expect(await screen.findByLabelText("Instagram açıklaması")).toHaveTextContent("konnektora.com/tags/electronic-music");
    expect(screen.getByLabelText("Instagram açıklaması").textContent).toBe(expected);
    expect(screen.getByText(/Açıklama panoya kopyalandı/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Instagram'ı aç" })).toHaveAttribute("href", "https://www.instagram.com/");
    expect(screen.queryByRole("button", { name: "Açıklamayı kopyala" })).not.toBeInTheDocument();
    expect(apiMocks.recordContentShare).toHaveBeenCalledWith("tag", "tag-1", "instagram_story_dm");
    // WhatsApp bağlantısı kendi metnini kullanmaya devam eder.
    expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", `https://wa.me/?text=${encodeURIComponent(`WhatsApp metni\n${url}`)}`);
  });

  it("görsel ve Web Share destekleniyorsa görseli açıklamayla birlikte paylaşım menüsüne gönderir", async () => {
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    setNavigator("clipboard", clipboard);
    const share = vi.fn().mockResolvedValue(undefined);
    setNavigator("share", share);
    setNavigator("canShare", vi.fn().mockReturnValue(true));
    const file = new File(["image"], "konnektora-instagram.png", { type: "image/png" });
    socialTemplateMocks.createCaptionCardFile.mockResolvedValue(file);
    render(dialog({ instagramImageUrl: "https://cdn.example.com/cover.jpg" }));
    const button = screen.getByRole("button", { name: "Instagram'da paylaş" });
    await waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);

    await waitFor(() => expect(share).toHaveBeenCalledWith({ title: "#Electronic Music", text: `${caption}\nkonnektora.com/tags/electronic-music`, files: [file] }));
    // 18/11: paylaşılan görsel, şablon metnini (ve varsa fotoğrafı) içeren karttır; QR'lı yedek kart kullanılmaz.
    expect(socialTemplateMocks.createCaptionCardFile).toHaveBeenCalledWith({ caption: `${caption}\nkonnektora.com/tags/electronic-music`, imageUrl: "https://cdn.example.com/cover.jpg", language: "tr" });
    expect(await screen.findByText(/Paylaşım menüsü açıldı/)).toBeVisible();
    expect(screen.queryByRole("link", { name: "Instagram'ı aç" })).not.toBeInTheDocument();
    expect(socialTemplateMocks.downloadSocialFile).not.toHaveBeenCalled();
  });

  it("18/11 test sonucu: fotoğraf yokken de telefonda QR kartı değil, şablon metnini içeren kart paylaşılır", async () => {
    setNavigator("clipboard", { writeText: vi.fn().mockResolvedValue(undefined) });
    const share = vi.fn().mockResolvedValue(undefined);
    setNavigator("share", share);
    setNavigator("canShare", vi.fn().mockReturnValue(true));
    const card = new File(["card"], "konnektora-instagram.png", { type: "image/png" });
    socialTemplateMocks.createCaptionCardFile.mockResolvedValue(card);
    render(dialog());
    const button = screen.getByRole("button", { name: "Instagram'da paylaş" });
    await waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);
    await waitFor(() => expect(share).toHaveBeenCalledWith(expect.objectContaining({ files: [card] })));
    expect(socialTemplateMocks.createCaptionCardFile).toHaveBeenCalledWith({ caption: `${caption}\nkonnektora.com/tags/electronic-music`, imageUrl: undefined, language: "tr" });
    expect(share.mock.calls[0]![0].files[0].name).not.toMatch(/story/);
  });

  it("görsel var ama dosya paylaşımı desteklenmiyorsa görseli indirir; pano başarısızsa elle kopyalama sunar", async () => {
    setNavigator("clipboard", { writeText: vi.fn().mockRejectedValue(new Error("denied")) });
    const file = new File(["image"], "konnektora-instagram.png", { type: "image/png" });
    socialTemplateMocks.createCaptionCardFile.mockResolvedValue(file);
    render(dialog({ instagramImageUrl: "https://cdn.example.com/cover.jpg" }));
    const button = screen.getByRole("button", { name: "Instagram'da paylaş" });
    await waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);

    await waitFor(() => expect(socialTemplateMocks.downloadSocialFile).toHaveBeenCalledWith(file));
    expect(await screen.findByText(/Görsel indirildi/)).toBeVisible();
    expect(screen.getByText(/otomatik kopyalanamadı/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Açıklamayı kopyala" })).toBeVisible();
  });

  it("profil paylaşımında da Instagram düğmesini gösterir; şablon verilmeyen eski kullanımlarda profil için göstermez", async () => {
    const view = render(providers(<ShareDialog onClose={vi.fn()} open targetId="u1" targetType="user" title="Ada" url="https://konnektora.com/users/ada" instagramText="🤡 @ada"/>));
    expect(screen.getByRole("button", { name: "Instagram'da paylaş" })).toBeInTheDocument();
    view.unmount();
    render(providers(<ShareDialog onClose={vi.fn()} open targetId="u1" targetType="user" title="Ada" url="https://konnektora.com/users/ada"/>));
    expect(screen.queryByRole("button", { name: "Instagram'da paylaş" })).not.toBeInTheDocument();
  });

  it("bildirim metni sonucu ve pano durumunu ayrı ayrı anlatır", () => {
    expect(instagramNotice({ mode: "caption_only", captionCopied: true, hasImage: false }, "tr")).toContain("Instagram'ı açıp");
    expect(instagramNotice({ mode: "shared", captionCopied: false, hasImage: true }, "en")).toContain("could not be copied automatically");
  });
});

describe("17/10 #15: fotoğraf doğrulama kamerası", () => {
  const named = (name: string) => Object.assign(new Error(name), { name });

  it("hata türlerini ayrıştırır", () => {
    expect(classifyCameraError(named("NotAllowedError"), false)).toBe("denied");
    expect(classifyCameraError(named("NotAllowedError"), true)).toBe("policy");
    expect(classifyCameraError(named("NotFoundError"), false)).toBe("no_camera");
    expect(classifyCameraError(named("OverconstrainedError"), false)).toBe("no_camera");
    expect(classifyCameraError(named("NotReadableError"), false)).toBe("in_use");
    expect(classifyCameraError(new Error("?"), false)).toBe("unknown");
    const messages = (["denied", "no_camera", "policy", "in_use", "insecure", "unsupported", "unknown"] as const).map((reason) => cameraErrorMessage(reason, "tr"));
    expect(new Set(messages).size).toBe(messages.length);
  });

  it("tercih edilen kısıtlar karşılanamazsa yalın video isteğiyle yeniden dener", async () => {
    const stream = { getTracks: () => [] } as unknown as MediaStream;
    const getUserMedia = vi.fn().mockRejectedValueOnce(named("OverconstrainedError")).mockResolvedValueOnce(stream);
    setNavigator("mediaDevices", { getUserMedia });
    await expect(openCamera()).resolves.toBe(stream);
    expect(getUserMedia).toHaveBeenNthCalledWith(2, { video: true, audio: false });
  });

  it("kamera API'si yoksa veya politika engelliyorsa getUserMedia çağırmadan ayrı neden döndürür", async () => {
    setNavigator("mediaDevices", undefined);
    await expect(openCamera()).rejects.toMatchObject({ reason: "unsupported" });
    const getUserMedia = vi.fn();
    setNavigator("mediaDevices", { getUserMedia });
    Object.defineProperty(document, "featurePolicy", { configurable: true, value: { allowsFeature: () => false } });
    try {
      await expect(openCamera()).rejects.toBeInstanceOf(CameraAccessError);
      await expect(openCamera()).rejects.toMatchObject({ reason: "policy" });
      expect(getUserMedia).not.toHaveBeenCalled();
    } finally {
      Reflect.deleteProperty(document, "featurePolicy");
    }
  });

  it.each([
    ["NotAllowedError", /Kamera izni verilmemiş/],
    ["NotFoundError", /kullanılabilir bir kamera bulunamadı/],
    ["NotReadableError", /başka bir uygulama veya sekme/],
  ])("panelde %s için ayrı mesaj gösterir", async (name, message) => {
    setNavigator("mediaDevices", { getUserMedia: vi.fn().mockRejectedValue(named(name)) });
    render(providers(<ProfileVerificationPanel userId="member-1"/>));
    await userEvent.click(await screen.findByRole("button", { name: "Kamerayı aç" }));
    expect(await screen.findByText(message)).toBeVisible();
    expect(screen.queryByText("Kamera açılamadı. Tarayıcı kamera iznini kontrol et.")).not.toBeInTheDocument();
  });
});

describe("17/10 #11: giriş sonrası ara sayfa", () => {
  it("başarılı girişten sonra Üye alanı yerine yükleme durumunu gösterir ve Akış'a yönlendirir", async () => {
    render(providers(<AccountPage initialMode="login"/>, ["/login"]));
    expect(screen.getByRole("heading", { name: "Üye alanı" })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Complete provider login" }));

    expect(navigateMock).toHaveBeenCalledWith("/feed");
    expect(await screen.findByTestId("post-login-redirect")).toHaveTextContent("Sayfa yükleniyor…");
    expect(screen.queryByRole("heading", { name: "Üye alanı" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Çıkış" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Sosyal hesapla giriş yapıldı/)).not.toBeInTheDocument();
  });

  it("oturumu açık üye /login adresine gelirse de Üye alanı görünmez", async () => {
    setUserSession({ accessToken: "token", user: { id: "member-1", name: "Ada", email: "ada@example.com", status: "active", accountType: "individual", role: "user", onboardingCompleted: true } } as LoginResponse);
    render(providers(<AccountPage initialMode="login"/>, ["/login"]));
    expect(screen.getByTestId("post-login-redirect")).toBeVisible();
    expect(navigateMock).toHaveBeenCalledWith("/feed", { replace: true });
  });
});

describe("17/10 #17, #19, #27, #28: stil kuralları", () => {
  const css = readFileSync(resolve(__dirname, "../styles/nov17-share.css"), "utf8");
  const tablet = css.slice(css.indexOf("@media (min-width: 761px) and (max-width: 1100px)"));

  it("#27 Üyeler sekmesini yalnız tablet aralığında gösterir, hamburger girişini yalnız tablette gizler", () => {
    expect(css).toMatch(/^\.mobile-tab-bar > a\.nav-tablet-only \{ display: none; \}/m);
    expect(tablet).toContain(".mobile-tab-bar > a.nav-tablet-only { display: flex; }");
    expect(tablet).toContain(".corp-mobile-menu-panel > a.nav-hide-on-tablet { display: none; }");
    expect(css.match(/nav-hide-on-tablet/g)).toHaveLength(1);
  });

  it("#28 tablet hamburger menüsünü tab bar yüksekliği kadar kısaltıp kaydırılabilir yapar", () => {
    expect(tablet).toMatch(/\.corp-mobile-menu-panel \{[^}]*max-height: calc\(100dvh - 72px - 64px[^}]*overflow-y: auto;/);
  });

  it("#17 ilişkili etkinlik barı Biletler widget'ının koyu zemin / açık yazı renklerini kullanır", () => {
    expect(css).toMatch(/\.tag-related-events-notice[^{]*\{\s*background: #101c15;\s*border-color: #263b2c;\s*color: #fff;/);
    expect(readFileSync(resolve(__dirname, "../styles.css"), "utf8")).toContain(".event-ticket-summary { background: #101c15; color: #fff; border-color: #263b2c; }");
  });

  it("#19 mutualizm satırlarını yalnız mobilde alt alta dizer", () => {
    const mobile = css.slice(css.indexOf("@media (max-width: 700px)"), css.indexOf("/* #27"));
    expect(mobile).toContain(".mutualism-bar .mutualism-line { display: block; white-space: nowrap; }");
    expect(css.match(/mutualism-line/g)).toHaveLength(1);
  });
});
