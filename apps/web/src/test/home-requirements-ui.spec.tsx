import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "../lib/i18n";
import { mockEvents, mockTags } from "../lib/mockData";
import { HomePage } from "../pages/HomePage";

const apiMocks = vi.hoisted(() => ({
  clearUserSession: vi.fn(),
  getDiscoveryFeed: vi.fn(),
  getUserSession: vi.fn(),
  listAnnouncements: vi.fn(),
  listEvents: vi.fn(),
  listPlaces: vi.fn(),
  listTags: vi.fn(),
  recordContentImpression: vi.fn(),
  rememberContentSource: vi.fn(),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, ...apiMocks };
});

function providers(children: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <LanguageProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

const discovery = {
  popularMembers: [],
  newMembers: [],
  localEvents: [],
  trendingTags: [{ id: "tag-1", title: "Teknoloji", href: "/tags/teknoloji", meta: null }],
  popularPlaces: [],
  activeUserCount: 0,
  scope: "local",
  location: "İstanbul",
  city: "İstanbul",
  country: "Türkiye",
  activities: [],
};

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  apiMocks.getUserSession.mockReturnValue(null);
  apiMocks.listAnnouncements.mockResolvedValue([]);
  apiMocks.listEvents.mockResolvedValue({
    items: mockEvents.slice(0, 3), total: 3, page: 1, pageSize: 8, hasNextPage: false,
  });
  apiMocks.listPlaces.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 8, hasNextPage: false });
  apiMocks.listTags.mockResolvedValue(mockTags.slice(0, 3));
  apiMocks.getDiscoveryFeed.mockResolvedValue(discovery);
  apiMocks.recordContentImpression.mockResolvedValue(undefined);
  apiMocks.rememberContentSource.mockReturnValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ana sayfa 108–123 gereksinimleri", () => {
  it("oturumsuz ziyaretçiye popüler etkinlikleri, trend ilgi alanlarını ve iki üyelik yolunu gösterir", async () => {
    render(providers(<HomePage />));

    expect(await screen.findByText(/Konnektora, insanların ilgi alanları, etkinlikler, mekânlar/)).toBeVisible();
    expect(await screen.findByRole("heading", { name: "İstanbul yakınında popüler etkinlikler" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Gündemdeki ilgi alanları" })).toBeVisible();
    expect(screen.getByRole("link", { name: "#Teknoloji" })).toHaveAttribute("href", "/tags/teknoloji");
    expect(screen.getAllByRole("link", { name: "Topluluğa katıl" })).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Etiketler" })).toHaveAttribute("href", "/tags");
    expect(screen.getByRole("link", { name: "Organizatör araçları" })).toHaveAttribute("href", "/business");
    expect(screen.getByRole("link", { name: "Daha fazla" })).toHaveAttribute("href", "/business");
    expect(screen.getByRole("button", { name: /Bireysel üyelik/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Kurumsal üyelik/ })).toBeVisible();
  });

  it("bireysel üyeye üç doğru mesajı, ilgi alanı bölüm bağlantısını ve üyelik değiştirme onayını gösterir", async () => {
    apiMocks.getUserSession.mockReturnValue({
      id: "member-1", name: "Kadir", username: "kadir", role: "user", status: "active",
      accountType: "individual", onboardingCompleted: true,
    });
    render(providers(<HomePage />));

    expect(await screen.findByRole("link", { name: "İlgi alanlarını gör" })).toHaveAttribute("href", "/tags");
    expect(screen.queryByRole("link", { name: "Topluluğa katıl" })).not.toBeInTheDocument();
    const messages = screen.getByRole("region", { name: "Üye duyuruları" });
    expect(within(messages).getAllByRole("article")).toHaveLength(3);
    expect(within(messages).getByRole("link", { name: "arkadaşlarını bul ve davet et" })).toHaveAttribute("href", "/contacts");
    expect(within(messages).getByRole("link", { name: "etiketler ekleyerek" })).toHaveAttribute("href", "/users/id/member-1#interests");
    expect(within(messages).getByRole("link", { name: "Ayarlarını kişiselleştirerek" })).toHaveAttribute("href", "/settings");

    await userEvent.click(screen.getByRole("button", { name: /Kurumsal üyelik/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Zaten üyesiniz" })).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Çıkış yap" })).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Vazgeç" })).toBeVisible();
  });

  it("kurumsal üyeye ayrı üç mesaj ve doğru hedefleri gösterir", async () => {
    apiMocks.getUserSession.mockReturnValue({
      id: "business-1", name: "Konnektora Ltd", username: "konnektora", role: "user", status: "active",
      accountType: "corporate", onboardingCompleted: true,
    });
    render(providers(<HomePage />));

    const messages = await screen.findByRole("region", { name: "Üye duyuruları" });
    expect(within(messages).getAllByRole("article")).toHaveLength(3);
    expect(within(messages).getByRole("link", { name: "etiketler ekleyerek" })).toHaveAttribute("href", "/users/id/business-1#interests");
    expect(within(messages).getByRole("link", { name: "etiket sayfalarına" })).toHaveAttribute("href", "/tags");
    expect(within(messages).getByRole("link", { name: "bağlantılarını buraya taşı" })).toHaveAttribute("href", "/contacts");
    expect(within(messages).getByRole("link", { name: "Kimliğini güvenle doğrula" })).toHaveAttribute("href", "/finance/kyc");
    expect(within(messages).getByRole("link", { name: "İşletmeler için" })).toHaveAttribute("href", "/business");
  });

  it("yerel etiket yoksa Global'e geçer ve herkese açık duyuruyu sonra hatırlat ile kapatır", async () => {
    apiMocks.getDiscoveryFeed.mockImplementation(async ({ scope }: { scope?: string } = {}) => scope === "global"
      ? { ...discovery, scope: "global", location: null, city: null, country: null }
      : { ...discovery, trendingTags: [] });
    apiMocks.listAnnouncements.mockResolvedValue([{
      id: "announcement-1",
      title: "Yeni keşif deneyimi",
      body: "Toplulukta yeni bir gelişme var.",
      titleEn: "A new discovery experience",
      bodyEn: "There is something new in the community.",
      target: "all",
      status: "active",
      publishMode: "immediate",
      publishAt: "2026-08-28T00:00:00.000Z",
      expiresAt: null,
      createdAt: "2026-08-28T00:00:00.000Z",
      updatedAt: "2026-08-28T00:00:00.000Z",
    }]);
    render(providers(<HomePage />));

    await waitFor(() => expect(apiMocks.getDiscoveryFeed).toHaveBeenCalledWith({ scope: "global" }));
    expect(screen.getByRole("button", { name: "Global" })).toHaveClass("active");
    const dialog = await screen.findByRole("dialog", { name: "Yeni keşif deneyimi" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Sonra hatırlat" }));
    expect(screen.queryByRole("dialog", { name: "Yeni keşif deneyimi" })).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem("konnektora_announcement_later_announcement-1")).toBe("1");
  });
});
