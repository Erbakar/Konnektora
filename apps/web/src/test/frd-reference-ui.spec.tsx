import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LanguageProvider } from "../lib/i18n";
import { mockEvents } from "../lib/mockData";
import { EventDetailPage } from "../pages/EventDetailPage";
import { InteractionStatsPage } from "../pages/InteractionStatsPage";
import { MutualismPage } from "../pages/MutualismPage";

const apiMocks = vi.hoisted(() => ({
  getContentNotification: vi.fn(),
  getEvent: vi.fn(),
  getInteractionStats: vi.fn(),
  getPublicProfile: vi.fn(),
  getPublicProfileById: vi.fn(),
  getTagStats: vi.fn(),
  getUserSession: vi.fn(),
  listEventRelatedUsers: vi.fn(),
  listEventParticipants: vi.fn(),
  listEventTicketTypes: vi.fn(),
  listEvents: vi.fn(),
  listFollowing: vi.fn(),
  purchaseEventTickets: vi.fn(),
  recordContentView: vi.fn(),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, ...apiMocks };
});

vi.mock("../components/ContentComments", () => ({
  ContentComments: () => <section aria-label="İlgili postlar" />,
}));
vi.mock("../components/ContentMediaGallery", () => ({
  ContentMediaGallery: () => <section aria-label="Medya galerisi" />,
}));
vi.mock("../components/ContentRating", () => ({
  ContentRating: () => <section aria-label="Değerlendirme" />,
}));
vi.mock("../components/LocationMap", () => ({
  LocationMap: () => <section aria-label="Etkinlik haritası" />,
}));

function providers(children: ReactNode, initialEntry: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <LanguageProvider>
        <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

function renderStats(targetType: "event" | "place" | "tag" | "user", targetId: string) {
  return render(providers(
    <Routes>
      <Route path="/:targetType/:targetId" element={<InteractionStatsPage />} />
    </Routes>,
    `/${targetType}/${targetId}`,
  ));
}

beforeEach(() => {
  window.localStorage.clear();
  apiMocks.getUserSession.mockReturnValue(null);
  apiMocks.getContentNotification.mockResolvedValue({ enabled: false });
  apiMocks.listEventRelatedUsers.mockResolvedValue([]);
  apiMocks.listEventParticipants.mockResolvedValue([]);
  apiMocks.listEventTicketTypes.mockResolvedValue([]);
  apiMocks.listEvents.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0, hasNextPage: false });
  apiMocks.listFollowing.mockResolvedValue([]);
  apiMocks.purchaseEventTickets.mockResolvedValue({ id: "ticket-1" });
  apiMocks.recordContentView.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("FRD referanslı ekran davranışları", () => {
  it("etkinlik ve mekân bilgi bağlantısını gerçek ayrıntı modalına açar", async () => {
    const event = {
      ...mockEvents[0]!,
      title: "Konnektora Hibrit Buluşması",
      description: "Topluluk, program ve erişim ayrıntıları burada açıklanır.",
      format: "hybrid" as const,
      visibility: "open" as const,
      latitude: 41.036,
      longitude: 28.986,
      locationName: "Konnektora Studio",
      locationAddress: "İstiklal Caddesi 10",
      liveUrl: "https://meet.example.com/konnektora",
      place: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        name: "Konnektora Studio",
        slug: "konnektora-studio-310001",
        address: "İstiklal Caddesi 10",
        city: "İstanbul",
        country: "Türkiye",
      },
    };
    apiMocks.getEvent.mockResolvedValue(event);

    render(providers(
      <Routes><Route path="/events/:slug" element={<EventDetailPage />} /></Routes>,
      `/events/${event.slug}`,
    ));

    await userEvent.click(await screen.findByRole("button", { name: "Etkinlik ve mekân hakkında daha fazla bilgi" }));
    const dialog = screen.getByRole("dialog", { name: event.title });
    expect(dialog).toBeVisible();
    expect(within(dialog).queryByText(event.description)).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Etkinlik haritası" })).toBeVisible();
    expect(screen.getByRole("link", { name: event.place.name })).toHaveAttribute("href", `/places/${event.place.slug}`);
    expect(screen.getByRole("link", { name: event.liveUrl })).toHaveAttribute("target", "_blank");
    await userEvent.click(screen.getByRole("button", { name: "Kapat" }));
    expect(screen.queryByRole("dialog", { name: event.title })).not.toBeInTheDocument();
  });

  it("süresi dolmuş etkinlikte check-in kontrolünü açmayıp düzenleme yönlendirmeli uyarı verir", async () => {
    const expiredEvent = {
      ...mockEvents[0]!,
      createdById: "viewer-1",
      startsAt: "2026-01-10T18:00:00.000Z",
      endsAt: "2026-01-10T22:00:00.000Z",
    };
    apiMocks.getUserSession.mockReturnValue({ id: "viewer-1", username: "kadir", role: "admin" });
    apiMocks.getEvent.mockResolvedValue(expiredEvent);

    render(providers(
      <Routes><Route path="/events/:slug" element={<EventDetailPage />} /></Routes>,
      `/events/${expiredEvent.slug}`,
    ));

    expect(await screen.findByRole("heading", { name: expiredEvent.title })).toBeVisible();
    const actions = document.querySelector('summary[aria-label="Etkinlik işlemleri"]');
    expect(actions).toBeInTheDocument();
    fireEvent.click(actions!);
    await userEvent.click(screen.getByRole("button", { name: "Check-in kontrolü" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Bitmiş bir etkinlik için check-in kontrolü yapamazsınız.");
    expect(screen.getByRole("alert")).toHaveTextContent("Etkinlik Düzenle");
  });

  it("onaylı etkinlikte yöneticinin bekleyen sayısını doğru sekmeye bağlar, uzun açıklamayı açar ve program maddesini etikete dönüştürür", async () => {
    const description = `${"Uzun etkinlik açıklaması ve kuralları. ".repeat(22)}SON BÖLÜM`;
    const event = {
      ...mockEvents[0]!,
      createdById: "viewer-1",
      visibility: "approval_required" as const,
      description,
      tags: [{ id: "tag-ada", name: "Ada Quartet", slug: "ada-quartet" }],
      lineup: [{ type: "session" as const, title: "Ada Quartet" }],
    };
    apiMocks.getUserSession.mockReturnValue({ id: "viewer-1", username: "kadir", role: "user" });
    apiMocks.getEvent.mockResolvedValue(event);
    apiMocks.listEventParticipants.mockResolvedValue([
      { id: "participant-1", status: "requested" },
      { id: "participant-2", status: "requested" },
      { id: "participant-3", status: "invited" },
    ]);

    render(providers(
      <Routes><Route path="/events/:slug" element={<EventDetailPage />} /></Routes>,
      `/events/${event.slug}`,
    ));

    expect(await screen.findByRole("link", { name: "2 bekleyen" })).toHaveAttribute("href", `/events/${event.slug}/users?filter=pending`);
    expect(screen.queryByText(/SON BÖLÜM/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Devamını göster" }));
    expect(screen.getByText(/SON BÖLÜM/)).toBeVisible();
    expect(screen.getAllByRole("link", { name: "#Ada Quartet" }).at(-1)).toHaveAttribute("href", "/tags/ada-quartet");
  });

  it("sıfır fiyatlı bileti ödeme adımı olmadan satın alır", async () => {
    const event = { ...mockEvents[0]!, price: 0 };
    const freeTicket = {
      id: "free-ticket",
      name: "Ücretsiz Katılım",
      description: "Topluluk bileti",
      price: 0,
      currency: "TRY",
      remaining: 20,
      status: "active",
      salesPlatform: "konnektora",
      perUserLimit: 2,
      saleStartsAt: null,
      saleEndsAt: null,
    };
    apiMocks.getUserSession.mockReturnValue({ id: "viewer-2", username: "ada", role: "user" });
    apiMocks.getEvent.mockResolvedValue(event);
    apiMocks.listEventTicketTypes.mockResolvedValue([freeTicket]);

    render(providers(
      <Routes><Route path="/events/:slug" element={<EventDetailPage />} /></Routes>,
      `/events/${event.slug}`,
    ));

    const viewTickets = await screen.findAllByRole("button", { name: "Biletleri gör" });
    await userEvent.click(viewTickets.at(-1)!);
    const dialog = screen.getByRole("dialog", { name: "Biletler" });
    expect(within(dialog).getByText("Ücretsiz", { exact: false, selector: "span" })).toBeVisible();
    await userEvent.click(within(dialog).getByRole("button", { name: "+" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Satın al" }));

    await waitFor(() => expect(apiMocks.purchaseEventTickets).toHaveBeenCalled());
    expect(apiMocks.purchaseEventTickets.mock.calls[0]?.[0]).toBe("free-ticket");
    expect(apiMocks.purchaseEventTickets.mock.calls[0]?.[1]).toBe(1);
  });

  it("etkinlik analizinde FRD performans, keşif, huni, demografi ve gelir gruplarını gösterir", async () => {
    apiMocks.getInteractionStats.mockResolvedValue({
      views: 1200,
      detailViews: 420,
      invited: 160,
      accepted: 110,
      ticketsSold: 86,
      attended: 72,
      socialConnections: 38,
      performanceScore: 84,
      ticketRevenue: 25800,
      refundAmount: 450,
      platformCommission: 1806,
      organizerRevenue: 23544,
      source_app_search: 144,
      age_25_34: 58,
      decision_event_day: 19,
      ticketTypeSold_VIP: 24,
    });
    renderStats("event", "event-1");

    expect(await screen.findByRole("heading", { name: "Etkinlik istatistikleri" })).toBeVisible();
    await screen.findByRole("heading", { name: "Genel bakış" });
    for (const heading of ["Dönüşüm hunisi", "Bilet ve gelir", "Keşif kaynakları", "Yaş dağılımı", "Katılım kararı zamanı", "Bilet türüne göre satış", "Veriye dayalı içgörüler"]) {
      expect(screen.getByRole("heading", { name: heading })).toBeVisible();
    }
    expect(screen.getAllByText("1.200").length).toBeGreaterThan(0);
    expect(screen.getByText("25.800 TRY")).toBeVisible();
  });

  it("mekân analizinde trafik, doluluk, sadakat ve organizatör ölçümlerini gösterir", async () => {
    apiMocks.getInteractionStats.mockResolvedValue({
      views: 900,
      detailViews: 310,
      followers: 240,
      members: 180,
      checkedIn: 142,
      performanceScore: 79,
      repeatVisitorRate: 44,
      day_cuma: 76,
      hour_18_23: 91,
      monthlyOccupancyRate_2026_08: 83,
      monthlyOccupancyPeople_2026_08: 166,
      organizerAttendanceRate_konnektora: 88,
      topVisitor_ada: 12,
    });
    renderStats("place", "place-1");

    expect(await screen.findByRole("heading", { name: "Mekân istatistikleri" })).toBeVisible();
    await screen.findByRole("heading", { name: "Günlere göre etkinlik" });
    for (const heading of ["Saat aralıkları", "Aylara göre doluluk oranı", "Aylara göre biletli ziyaretçi", "Organizatör katılım oranı", "En sık gelen ziyaretçiler"]) {
      expect(screen.getByRole("heading", { name: heading })).toBeVisible();
    }
    expect(screen.getByText("Tekrar ziyaret oranı")).toBeVisible();
  });

  it("etiket analizinde duygu trendleri, demografi, ilişki ve fırsat ölçümlerini gösterir", async () => {
    apiMocks.getTagStats.mockResolvedValue({
      views: 640,
      shares: 42,
      followers: 138,
      events: 17,
      places: 6,
      opportunityScore: 87,
      likeLast7d: 49,
      okLast7d: 21,
      dislikeLast7d: 4,
      likeAge_25_34: 31,
      likeRelatedInterest_startup: 27,
      averageEventsPerInterestedUser: 3.4,
      averageConnectionsPerInterestedUser: 7.1,
    });
    renderStats("tag", "tag-1");

    expect(await screen.findByRole("heading", { name: "İlgi alanı istatistikleri" })).toBeVisible();
    expect(await screen.findByRole("heading", { name: "Zaman içindeki eğilim" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Olumlu · yaş" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Olumlu · ilişkili ilgi alanları" })).toBeVisible();
    expect(screen.getByText("Fırsat puanı")).toBeVisible();
  });

  it("profil analizinde bireysel ve kurumsal profil, ağ, takipçi ve etkinlik ölçümlerini gösterir", async () => {
    apiMocks.getPublicProfileById.mockResolvedValue({
      stats: {
        profileViews: 750,
        profileViewsLast7d: 90,
        profileViewsLast30d: 310,
        profileViewsLast90d: 690,
        searchImpressions: 1100,
        searchClickRate: 28,
        websiteClicks: 76,
        locationViews: 54,
        followers: 320,
        totalConnections: 144,
        averageFollowDurationDays: 186,
        visitorCountry_Türkiye: 410,
        followerAge_25_34: 170,
        followerLanguage_tr: 230,
        networkCity_İstanbul: 98,
        eventAttendanceRate: 72,
        ticketRevenue: 48000,
      },
    });
    renderStats("user", "user-1");

    expect(await screen.findByRole("heading", { name: "Profil istatistikleri" })).toBeVisible();
    await screen.findByRole("heading", { name: "Zaman içindeki eğilim" });
    for (const heading of ["Ziyaretçi ülkeleri", "Takipçi yaş dağılımı", "Takipçi dilleri", "Bağlantı şehirleri", "Bilet ve gelir"]) {
      expect(screen.getByRole("heading", { name: heading })).toBeVisible();
    }
    expect(screen.getByText("Aramadan profile tıklama oranı")).toBeVisible();
  });

  it("Mutualizm analizini yalnız başka profilde ve tüm doğrulanmış sinyal gruplarıyla gösterir", async () => {
    apiMocks.getUserSession.mockReturnValue({ id: "viewer-1", username: "kadir", role: "user" });
    apiMocks.getPublicProfileById.mockResolvedValue({
      id: "person-1",
      name: "Ada Yılmaz",
      username: "ada",
      relationship: { isSelf: false, following: false, canMessage: true },
      mutualism: {
        total: 12,
        hiddenCount: 2,
        sameSentimentTags: [{
          sentiment: "like",
          tag: { id: "tag-1", name: "Girişimcilik", slug: "girisimcilik" },
        }],
        events: [],
        places: [],
        people: [],
        sharedReactionCount: 5,
        sharedCommentTargetCount: 3,
        scores: { overall: 86, friendship: 82, networking: 91, eventPartner: 88, travel: 74, business: 93 },
        explanation: "Ortak ilgi alanlarınız ve etkinlik davranışlarınız güçlü biçimde eşleşiyor.",
        actions: ["Birlikte yakın bir girişimcilik etkinliğine katılabilirsiniz."],
      },
    });

    render(providers(
      <Routes><Route path="/users/id/:userId/mutualism" element={<MutualismPage />} /></Routes>,
      "/users/id/person-1/mutualism",
    ));

    expect(await screen.findByRole("heading", { name: "Ada Yılmaz ile uyumunuz" })).toBeVisible();
    expect(screen.getByText("%86")).toBeVisible();
    for (const label of ["Arkadaşlık uyumu: 82%", "Networking uyumu: 91%", "Etkinlik partneri uyumu: 88%", "Seyahat uyumu: 74%", "İş uyumu: 93%"]) {
      expect(screen.getByLabelText(label)).toBeVisible();
    }
    expect(screen.getByRole("link", { name: /Girişimcilik/ })).toHaveAttribute("href", "/tags/girisimcilik");
    expect(screen.getByText("5")).toBeVisible();
    expect(screen.getByText("3")).toBeVisible();
    expect(screen.getByText("2")).toBeVisible();
    expect(screen.getByText("Birlikte yakın bir girişimcilik etkinliğine katılabilirsiniz.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Sohbet başlat" })).toHaveAttribute("href", "/messages?peer=person-1");
  });

  it("kendi profilinde Mutualizm analizini göstermeyip açık durum mesajı verir", async () => {
    apiMocks.getUserSession.mockReturnValue({ id: "viewer-1", username: "kadir", role: "user" });
    apiMocks.getPublicProfileById.mockResolvedValue({
      id: "viewer-1",
      name: "Kadir",
      username: "kadir",
      relationship: { isSelf: true, following: true, canMessage: false },
      mutualism: undefined,
    });

    render(providers(
      <Routes><Route path="/users/id/:userId/mutualism" element={<MutualismPage />} /></Routes>,
      "/users/id/viewer-1/mutualism",
    ));

    expect(await screen.findByRole("heading", { name: "Karşılaştırma yapılamıyor" })).toBeVisible();
    expect(screen.getByText("Kendi profiliniz için Mutualizm Analizi gösterilmez.")).toBeVisible();
  });
});
