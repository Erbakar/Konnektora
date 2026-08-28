import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Announcement, Event, Place } from "@konnektora/shared";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { AppLayout } from "../components/AppLayout";
import { AnnouncementPopup } from "../components/AnnouncementPopup";
import { NotificationDialog, ShareDialog } from "../components/ContentDialogs";
import { EventCard } from "../components/EventCard";
import { PlaceCard } from "../components/PlaceCard";
import { ReportDialog } from "../components/ReportDialog";
import { LanguageProvider } from "../lib/i18n";
import { mockEvents, mockTags } from "../lib/mockData";
import { EventsPage } from "../pages/EventsPage";

const apiMocks = vi.hoisted(() => ({
  getDiscoveryFeed: vi.fn(),
  getMyProfile: vi.fn(),
  getUserSession: vi.fn(),
  createContentReport: vi.fn(),
  listConversations: vi.fn(),
  listEvents: vi.fn(),
  listMyNotifications: vi.fn(),
  listReportRules: vi.fn(),
  listTags: vi.fn(),
  markMyNotificationRead: vi.fn(),
  recordContentImpression: vi.fn(),
  recordContentShare: vi.fn(),
  rememberContentSource: vi.fn(),
  updatePreferredLanguage: vi.fn(),
}));

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,cXI=") },
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, ...apiMocks };
});

function providers(children: ReactNode, initialEntries = ["/"]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <LanguageProvider>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="current-search">{location.search}</output>;
}

function listPage(items: Event[], page: number, total: number) {
  return {
    items,
    page,
    pageSize: 15,
    total,
    hasNextPage: page * 15 < total,
  };
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  apiMocks.getUserSession.mockReturnValue(null);
  apiMocks.createContentReport.mockResolvedValue({ ok: true });
  apiMocks.getDiscoveryFeed.mockResolvedValue({
    popularMembers: [], newMembers: [], localEvents: [], trendingTags: [],
    popularPlaces: [], activeUserCount: 0, scope: "global", location: null,
    city: null, country: null, activities: [],
  });
  apiMocks.getMyProfile.mockResolvedValue(null);
  apiMocks.listConversations.mockResolvedValue([]);
  apiMocks.listMyNotifications.mockResolvedValue([]);
  apiMocks.listReportRules.mockResolvedValue([]);
  apiMocks.listTags.mockResolvedValue([]);
  apiMocks.markMyNotificationRead.mockResolvedValue({ ok: true });
  apiMocks.recordContentImpression.mockResolvedValue(undefined);
  apiMocks.recordContentShare.mockResolvedValue(undefined);
  apiMocks.rememberContentSource.mockReturnValue(undefined);
  apiMocks.updatePreferredLanguage.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("157 maddelik listenin kritik web davranışları", () => {
  it("konum tanıtımını izin istemeden kapatmaya izin verir", async () => {
    const geolocation = { getCurrentPosition: vi.fn() };
    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: geolocation,
    });

    render(providers(
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/events" element={<main>Etkinlik içeriği</main>} />
        </Route>
      </Routes>,
      ["/events"],
    ));

    expect(await screen.findByRole("dialog", { name: "Size daha yakın deneyimleri gösterelim" })).toBeVisible();
    await userEvent.click(screen.getAllByRole("button", { name: "Şimdi değil" }).at(-1)!);

    expect(screen.queryByRole("dialog", { name: "Size daha yakın deneyimleri gösterelim" })).not.toBeInTheDocument();
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled();
  });

  it("etkinlik listesini 15 kayıtla sayfalar ve dönüşte kart sayısını korur", async () => {
    const firstPage = mockEvents.slice(0, 15);
    const secondPage = [mockEvents[15]!];
    apiMocks.listEvents.mockImplementation(async (params: URLSearchParams) => {
      if (params.get("pageSize") === "50") return listPage([], 1, 0);
      return params.get("page") === "2"
        ? listPage(secondPage, 2, 16)
        : listPage(firstPage, 1, 16);
    });

    const { container } = render(providers(
      <>
        <EventsPage />
        <LocationProbe />
      </>,
      ["/events"],
    ));

    await waitFor(() => expect(container.querySelectorAll(".event-discovery-all .event-card")).toHaveLength(15));
    await userEvent.click(screen.getByRole("button", { name: "Sonraki" }));
    await waitFor(() => expect(screen.getByLabelText("current-search")).toHaveTextContent("?page=2"));
    await waitFor(() => expect(container.querySelectorAll(".event-discovery-all .event-card")).toHaveLength(1));
    expect(screen.getByRole("link", { name: secondPage[0]!.title })).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "1. sayfaya git" }));
    await waitFor(() => expect(screen.getByLabelText("current-search")).toBeEmptyDOMElement());
    await waitFor(() => expect(container.querySelectorAll(".event-discovery-all .event-card")).toHaveLength(15));
  });

  it("keşif widget'ında tüm sayfaları sağa kaydırılabilir kartlarda birleştirir, farklı cihaz şehrini ve gerçek trend sırasını gösterir", async () => {
    apiMocks.getUserSession.mockReturnValue({
      id: "member-1", name: "Ada", role: "user", status: "active", onboardingCompleted: true,
    });
    apiMocks.getMyProfile.mockResolvedValue({ city: "İstanbul", country: "Türkiye" });
    apiMocks.getDiscoveryFeed.mockResolvedValue({
      popularMembers: [], newMembers: [], localEvents: [], trendingTags: [], popularPlaces: [],
      activeUserCount: 0, scope: "local", location: "Ankara", city: "Ankara", country: "Türkiye", activities: [],
    });
    apiMocks.listTags.mockResolvedValue([
      { ...mockTags[0]!, id: "tag-zero", name: "Etkinliksiz", slug: "etkinliksiz", eventCount: 0 },
      { ...mockTags[1]!, id: "tag-three", name: "Seramik", slug: "seramik", eventCount: 3 },
      { ...mockTags[2]!, id: "tag-eight", name: "Teknoloji", slug: "teknoloji", eventCount: 8 },
    ]);
    const ankaraEvents = Array.from({ length: 101 }, (_, index) => ({
      ...mockEvents[index % mockEvents.length]!,
      id: `ankara-event-${index + 1}`,
      slug: `ankara-etkinligi-${index + 1}`,
      title: `Ankara Etkinliği ${index + 1}`,
      city: "Ankara",
    }));
    apiMocks.listEvents.mockImplementation(async (params: URLSearchParams) => {
      if (params.get("pageSize") !== "50") return listPage([], 1, 0);
      if (params.get("city") !== "Ankara") return { items: [], page: 1, pageSize: 50, total: 0, hasNextPage: false };
      const page = Number(params.get("page") ?? "1");
      const start = (page - 1) * 50;
      return {
        items: ankaraEvents.slice(start, start + 50),
        page,
        pageSize: 50,
        total: ankaraEvents.length,
        hasNextPage: page * 50 < ankaraEvents.length,
      };
    });

    const { container } = render(providers(<EventsPage />, ["/events"]));

    expect(await screen.findByRole("heading", { name: "Ankara etkinlikleri" })).toBeVisible();
    await waitFor(() => expect(container.querySelectorAll(".event-discovery-device_location .event-card")).toHaveLength(101));
    expect(apiMocks.listEvents.mock.calls.some(([params]) => params.get("city") === "Ankara" && params.get("page") === "2")).toBe(true);
    expect(apiMocks.listEvents.mock.calls.some(([params]) => params.get("city") === "Ankara" && params.get("page") === "3")).toBe(true);
    expect(screen.getByRole("link", { name: "Tümünü göster" })).toHaveAttribute("href", "/events?city=Ankara");

    await waitFor(() => expect(container.querySelectorAll(".event-tag-filter-cloud button")).toHaveLength(2));
    expect([...container.querySelectorAll<HTMLButtonElement>(".event-tag-filter-cloud button")].map((button) => button.textContent)).toEqual([
      "#Teknoloji8", "#Seramik3",
    ]);
  });

  it("üyeliği tamamlanmamış kullanıcıyı eski üye alanı yerine onboarding'e yönlendirir", async () => {
    window.sessionStorage.setItem("konnektora:location-intro", "seen");
    apiMocks.getUserSession.mockReturnValue({
      id: "business-1", name: "Mahmut Tuncer", role: "user", status: "pending",
      accountType: "corporate", onboardingCompleted: false,
    });

    render(providers(
      <Routes>
        <Route element={<AppLayout />}><Route path="/feed" element={<main>Eski üye alanı</main>} /></Route>
        <Route path="/onboarding" element={<main>Kurumsal onboarding</main>} />
      </Routes>,
      ["/feed"],
    ));

    expect(await screen.findByText("Kurumsal onboarding")).toBeVisible();
    expect(screen.queryByText("Eski üye alanı")).not.toBeInTheDocument();
  });

  it("etkinlik kartında görünürlük, zaman, konum ve topluluk özetini birlikte gösterir", async () => {
    const event: Event = {
      ...mockEvents[0]!,
      title: "Topluluk Buluşması",
      format: "hybrid",
      visibility: "open",
      place: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        name: "Konnektora Studio",
        slug: "konnektora-studio-310001",
        address: "İstiklal Caddesi",
        city: "İstanbul",
        country: "Türkiye",
      },
      city: "İstanbul",
      country: "Türkiye",
      attendeeCount: 24,
      invitedCount: 8,
      followingAttendeeCount: 3,
    };
    apiMocks.getUserSession.mockReturnValue({ city: "İstanbul", country: "Türkiye" });

    render(providers(<EventCard event={event} />));

    expect(screen.getByText("Herkese açık")).toBeVisible();
    expect(screen.getByRole("link", { name: "Topluluk Buluşması" })).toHaveAttribute("href", `/events/${event.slug}`);
    expect(screen.getByText("Çevrim içi & Konnektora Studio")).toBeVisible();
    expect(screen.getByText("24 katılımcı · 3 takip ettiğiniz")).toBeVisible();
    expect(await screen.findByRole("button", { name: /Konum için izin verin/ })).toBeVisible();
  });

  it("mekân kartını ortak görünürlük, tür, konum ve etkinlik bilgileriyle standartlaştırır", async () => {
    const place: Place = {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      name: "Konnektora Sahne",
      slug: "konnektora-sahne-310002",
      description: "Topluluk etkinlikleri için sahne ve çalışma alanı.",
      placeType: "events_venues",
      visibility: "invite_only",
      status: "active",
      coverImageUrl: null,
      country: "Türkiye",
      city: "İstanbul",
      address: "Beyoğlu",
      latitude: 41.03,
      longitude: 28.98,
      followerCount: 30,
      inviteCount: 5,
      memberCount: 30,
      followingMemberCount: 4,
      upcomingEventCount: 6,
      createdById: null,
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-01T10:00:00.000Z",
      isFollowing: false,
      viewerMembership: null,
      tags: [],
    };

    render(providers(<PlaceCard place={place} />));

    expect(screen.getByText("Sadece davetli")).toBeVisible();
    expect(screen.getByText("🎭 Etkinlik & Mekân")).toBeVisible();
    expect(screen.getByRole("link", { name: place.name })).toHaveAttribute("href", `/places/${place.slug}`);
    expect(screen.getByText("İstanbul, Türkiye")).toBeVisible();
    expect(screen.getByText("30 üye · 4 takip ettiğiniz")).toBeVisible();
    expect(screen.getByText("6 yaklaşan etkinlik")).toBeVisible();
  });

  it("duyuruyu çift dilli gösterir ve sonra hatırlat seçimiyle oturum boyunca kapatır", async () => {
    window.localStorage.setItem("konnektora_language", "en");
    const announcement: Announcement = {
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      title: "Yeni topluluk özelliği",
      body: "Topluluk keşfi yenilendi.",
      titleEn: "A new community feature",
      bodyEn: "Community discovery has been improved.",
      target: "all",
      publishMode: "scheduled",
      status: "active",
      publishAt: "2026-08-28T01:00:00.000Z",
      expiresAt: null,
    };

    const { rerender } = render(providers(<AnnouncementPopup announcements={[announcement]} />));
    expect(screen.getByRole("heading", { name: announcement.titleEn! })).toBeVisible();
    expect(screen.getByText(announcement.bodyEn!)).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Remind me later" }));
    expect(screen.queryByRole("heading", { name: announcement.titleEn! })).not.toBeInTheDocument();

    rerender(providers(<AnnouncementPopup announcements={[announcement]} />));
    expect(screen.queryByRole("heading", { name: announcement.titleEn! })).not.toBeInTheDocument();
  });

  it("rapor kategorilerini A-Z listeler ve seçilen kuralı rapora bağlar", async () => {
    apiMocks.listReportRules.mockResolvedValue([
      { id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", title: "Spam", targetType: "event", description: null, violationScore: 1, status: "active" },
      { id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", title: "Dolandırıcılık", targetType: "event", description: null, violationScore: 5, status: "active" },
    ]);
    const onClose = vi.fn();
    render(providers(<ReportDialog open onClose={onClose} targetId="ffffffff-ffff-4fff-8fff-ffffffffffff" targetType="event" />));

    const subject = await screen.findByRole("combobox", { name: "Konu" });
    await waitFor(() => expect(subject.querySelectorAll("option")).toHaveLength(3));
    expect([...subject.querySelectorAll("option")].map((option) => option.textContent)).toEqual([
      "Konu seçin", "Dolandırıcılık", "Spam",
    ]);
    await userEvent.selectOptions(subject, "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee|Dolandırıcılık");
    await userEvent.type(screen.getByPlaceholderText("Neyi incelememiz gerektiğini kısaca anlatın…"), "Sahte ödeme bağlantısı paylaşılıyor.");
    await userEvent.click(screen.getByRole("button", { name: "Raporu gönder" }));

    await waitFor(() => expect(apiMocks.createContentReport).toHaveBeenCalled());
    expect(apiMocks.createContentReport.mock.calls[0]?.[0]).toEqual({
      targetType: "event",
      targetId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      ruleId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      reason: "Dolandırıcılık",
      details: "Sahte ödeme bağlantısı paylaşılıyor.",
    });
  });

  it("paylaşım ekranında kopyalama durumunu ve ayrı QR modalını çalıştırır", async () => {
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    Object.defineProperty(window.navigator, "clipboard", { configurable: true, value: clipboard });
    render(providers(<ShareDialog
      onClose={vi.fn()}
      open
      targetId="11111111-2222-4333-8444-555555555555"
      targetType="event"
      title="Konnektora Etkinliği"
      url="https://konnektora.com/events/konnektora-etkinligi-420999"
    />));

    await userEvent.click(screen.getByRole("button", { name: "Bağlantıyı kopyala" }));
    expect(clipboard.writeText).toHaveBeenCalledWith("https://konnektora.com/events/konnektora-etkinligi-420999");
    expect(screen.getByRole("button", { name: "URL kopyalandı!" })).toBeVisible();

    const qrButton = screen.getByRole("button", { name: "QR kodu" });
    await waitFor(() => expect(qrButton).toBeEnabled());
    expect(screen.queryByRole("dialog", { name: "QR kodu" })).not.toBeInTheDocument();
    await userEvent.click(qrButton);
    expect(screen.getByRole("dialog", { name: "QR kodu" })).toBeVisible();
    expect(screen.getByRole("img", { name: "Konnektora Etkinliği QR" })).toBeVisible();
  });

  it("bildirim açma ekranında varsayılan takvim seçeneğini yalnız etkinleştirirken gösterir", () => {
    const calendar = {
      title: "Konnektora Etkinliği",
      startsAt: "2026-09-01T18:00:00.000Z",
      endsAt: "2026-09-01T20:00:00.000Z",
    };
    const { rerender } = render(providers(<NotificationDialog
      calendar={calendar}
      enabled={false}
      onClose={vi.fn()}
      onConfirm={vi.fn()}
      open
      pending={false}
      title={calendar.title}
    />));
    expect(screen.getByRole("checkbox", { name: "Bu etkinliği varsayılan takvimime de eklemek istiyorum." })).toBeVisible();

    rerender(providers(<NotificationDialog
      calendar={calendar}
      enabled
      onClose={vi.fn()}
      onConfirm={vi.fn()}
      open
      pending={false}
      title={calendar.title}
    />));
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bildirimleri kapat" })).toBeVisible();
  });
});
