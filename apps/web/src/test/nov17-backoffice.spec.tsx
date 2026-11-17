import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AdminBackofficeSummary, Announcement, CmsCategory } from "@konnektora/shared";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminFinancePanel } from "../components/AdminFinancePanel";
import { BackofficeDashboard, BackofficeHeader, BackofficeSidebar } from "../components/BackofficeNavigation";
import {
  BACKOFFICE_NAV,
  backofficeBadgeCount,
  backofficeEntries,
  backofficeHref,
  backofficeMainFor,
  isBackofficeEntryGroup,
  resolveBackofficeSection,
} from "../lib/backofficeNav";
import { LanguageProvider } from "../lib/i18n";
import { AdminDashboardPage, CmsAdminPanel } from "../pages/AdminDashboardPage";

const api = vi.hoisted(() => {
  const emptyList = () => vi.fn().mockResolvedValue([]);
  return {
    getAdminToken: vi.fn(),
    clearAdminToken: vi.fn(),
    getAdminBackofficeSummary: vi.fn(),
    listAdminMessages: vi.fn(),
    listAdminCorporateKyc: emptyList(),
    listAdminNotificationDeliveries: emptyList(),
    listAdminFinanceAccounts: emptyList(),
    listAdminFinancePayouts: emptyList(),
    listAdminFinanceTransactions: emptyList(),
    listHeldFinanceEvents: emptyList(),
    listAdminEvents: emptyList(),
    listAdminPlaces: emptyList(),
    listAdminMedia: emptyList(),
    listProfileVerifications: emptyList(),
    listAdminComments: emptyList(),
    listAdminPosts: emptyList(),
    listAdminPrivateMessages: emptyList(),
    listAdminTags: emptyList(),
    listAdminReports: emptyList(),
    listAdminReportRules: emptyList(),
    listAdminReportGroups: emptyList(),
    listAdminRoleGroups: emptyList(),
    listAdminCmsCategories: emptyList(),
    listAdminFaqs: emptyList(),
    listAdminAnnouncements: emptyList(),
    listActiveAdminAnnouncements: emptyList(),
    listAdminPolicies: emptyList(),
  };
});

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, ...api };
});

const summary: AdminBackofficeSummary = {
  openReports: 7,
  openReportGroups: 3,
  messages: { faq: 4, writeToUs: 2, accountFreeze: 1, dataDeletion: 5 },
  openMessages: 12,
  pendingKyc: 6,
  heldEvents: { expired: 2, notExpired: 9 },
  activeAnnouncements: 8,
  customerPayoutRequests: 13,
  curatorPayoutRequests: 14,
  pendingFinanceRequests: 44,
};

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>;
}

function mount(children: ReactNode, path = "/admin") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LanguageProvider>
        <MemoryRouter initialEntries={[path]}>
          {children}
          <LocationProbe />
        </MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  api.getAdminToken.mockReturnValue("admin-token");
  api.getAdminBackofficeSummary.mockResolvedValue(summary);
  api.listAdminMessages.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25, hasNextPage: false });
  api.listAdminFinancePayouts.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("17/10 #1 — backoffice information architecture", () => {
  it("defines the main navigation in the requested order", () => {
    expect(BACKOFFICE_NAV.map((main) => main.label)).toEqual([
      "Moderasyon",
      "İletişim",
      "Kullanıcılar",
      "İçerikler",
      "CMS",
      "Muhasebe & Finans",
    ]);
  });

  it("lists every requested sub-category under its main item", () => {
    const tree = Object.fromEntries(
      BACKOFFICE_NAV.map((main) => [
        main.label,
        main.children.map((node) => (isBackofficeEntryGroup(node) ? { [node.label]: node.items.map((item) => item.label) } : node.label)),
      ]),
    );

    expect(tree).toEqual({
      Moderasyon: ["Şikayetler", "Özel Mesajlar", "Kural Yönetimi"],
      İletişim: ["SSS mesajları", "Write to us mesajları", "Hesap dondurma mesajları", "Veri silme talepleri"],
      Kullanıcılar: ["Üye yönetimi", "Rol / Yetki yönetimi", "User activity log"],
      İçerikler: ["Etkinlikler", "Mekanlar", "Medya", "Post'lar", "Yorumlar", "İlgi Alanları"],
      CMS: [
        { Kategoriler: ["Sık Sorulan Sorular kategorileri", "Write to Us kategorileri"] },
        "Duyuru yönetimi",
        "Yasal Politika Sayfaları",
        "Email Tokenları",
        "Bildirim teslimatları",
      ],
      "Muhasebe & Finans": [
        "KYB / KYC başvuruları",
        "Blokeli etkinlikler",
        {
          Küratörler: [
            "Küratör anlaşmaları ve gelir oranları",
            "Resmi etkinlik ve sponsorluk geliri girme",
            "Küratör para çekme talebi",
            "Küratör hesap ekstresi",
          ],
        },
        {
          Müşteriler: [
            "Müşteri hakkında",
            "Kullanıcının hesap hareketleri ekstresi",
            "Kullanıcının paket kullanım raporu",
            "Müşteri para çekme talebi",
          ],
        },
        "Faturalar / İade belgeleri",
        { "Paket ve hizmetlerin yönetimi": ["Paket ve hizmet fiyatları ve haklarını ayarlama", "Hediye denemeler"] },
        "Konnektora gelirleri raporu",
      ],
    });
  });

  it("gives every sub-category a unique deep link that resolves back to its main item", () => {
    const ids = BACKOFFICE_NAV.flatMap((main) => backofficeEntries(main).map((entry) => entry.id));
    expect(new Set(ids).size).toBe(ids.length);

    for (const main of BACKOFFICE_NAV) {
      for (const entry of backofficeEntries(main)) {
        expect(backofficeHref(entry.id)).toBe(`/admin?section=${entry.id}`);
        expect(resolveBackofficeSection(entry.id)).toBe(entry.id);
        expect(backofficeMainFor(entry.id)).toBe(main);
      }
    }
  });

  it("keeps old section links working and falls back to the dashboard", () => {
    expect(resolveBackofficeSection("messages")).toBe("messages-faq");
    expect(resolveBackofficeSection("cms")).toBe("cms-faq-categories");
    expect(resolveBackofficeSection("finance")).toBe("kyc");
    expect(resolveBackofficeSection("reports")).toBe("reports");
    expect(resolveBackofficeSection("unknown")).toBe("dashboard");
    expect(resolveBackofficeSection(null)).toBe("dashboard");
    expect(backofficeHref("dashboard")).toBe("/admin");
    expect(backofficeMainFor("dashboard")).toBeNull();
  });

  it("maps pending counts to the requested badges", () => {
    const badges = Object.fromEntries(
      BACKOFFICE_NAV.flatMap((main) => [main, ...backofficeEntries(main)])
        .filter((item) => item.badge)
        .map((item) => [item.label, backofficeBadgeCount(summary, item.badge)]),
    );

    expect(badges).toEqual({
      Moderasyon: 7,
      Şikayetler: 7,
      İletişim: 12,
      "SSS mesajları": 4,
      "Write to us mesajları": 2,
      "Hesap dondurma mesajları": 1,
      "Veri silme talepleri": 5,
      "Muhasebe & Finans": 44,
      "KYB / KYC başvuruları": 6,
      "Blokeli etkinlikler": 11,
      "Küratör para çekme talebi": 14,
      "Müşteri para çekme talebi": 13,
    });
    expect(backofficeBadgeCount(undefined, "openReports")).toBe(0);
  });
});

describe("17/10 #1 — backoffice header and sidebar", () => {
  it("shows BACKOFFICE under the logo and links the logo to the dashboard", () => {
    mount(<BackofficeHeader onLogout={vi.fn()} summary={summary} />);

    const brand = screen.getByRole("link", { name: "Backoffice Dashboard" });
    expect(brand).toHaveAttribute("href", "/admin");
    expect(within(brand).getByRole("img", { name: "Konnektora" })).toBeInTheDocument();
    expect(within(brand).getByText("BACKOFFICE")).toBeInTheDocument();
  });

  it("renders the main navigation with red pending counts and a logout action", async () => {
    const onLogout = vi.fn();
    mount(<BackofficeHeader activeMain={BACKOFFICE_NAV[1]} onLogout={onLogout} summary={summary} />);

    const nav = screen.getByRole("navigation", { name: "Backoffice ana navigasyon" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Moderasyon7",
      "İletişim12",
      "Kullanıcılar",
      "İçerikler",
      "CMS",
      "Muhasebe & Finans44",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/admin?section=reports",
      "/admin?section=messages-faq",
      "/admin?section=users",
      "/admin?section=events",
      "/admin?section=cms-faq-categories",
      "/admin?section=kyc",
    ]);
    expect(within(links[0]!).getByText("7")).toHaveClass("backoffice-badge");

    await userEvent.click(within(nav).getByRole("button", { name: "Çıkış" }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("marks only the selected main item as current", () => {
    mount(<BackofficeHeader activeMain={BACKOFFICE_NAV[1]} onLogout={vi.fn()} summary={summary} />);

    const current = screen.getAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("İletişim");
    expect(current[0]).toHaveClass("active");
  });

  it("hides zero badges and the navigation before admin login", () => {
    mount(<BackofficeHeader />);

    expect(screen.getByText("BACKOFFICE")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Çıkış" })).not.toBeInTheDocument();
  });

  it("shows the finance sub-categories with third-level groups and pending counts", () => {
    const finance = BACKOFFICE_NAV[5]!;
    mount(<BackofficeSidebar activeSection="curator-payouts" main={finance} summary={{ ...summary, pendingKyc: 0 }} />);

    const sidebar = screen.getByRole("navigation", { name: "Muhasebe & Finans alt kategorileri" });
    const curators = within(sidebar).getByRole("group", { name: "Küratörler" });
    expect(within(curators).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Küratör anlaşmaları ve gelir oranları",
      "Resmi etkinlik ve sponsorluk geliri girme",
      "Küratör para çekme talebi14",
      "Küratör hesap ekstresi",
    ]);
    expect(within(sidebar).getByRole("link", { name: /Küratör para çekme talebi/ })).toHaveAttribute("aria-current", "page");
    expect(within(sidebar).getByRole("link", { name: /Blokeli etkinlikler/ })).toHaveTextContent("Blokeli etkinlikler11");
    expect(within(sidebar).getByRole("link", { name: /Müşteri para çekme talebi/ })).toHaveTextContent("13");
    // Bekleyen iş yoksa rozet gösterilmez.
    expect(within(sidebar).getByRole("link", { name: "KYB / KYC başvuruları" })).toHaveTextContent(/^KYB \/ KYC başvuruları$/);
  });
});

describe("17/10 #2 — backoffice dashboard", () => {
  it("shows exactly the requested counters, each linking to its section", () => {
    mount(<BackofficeDashboard summary={summary} />);

    const rows = screen.getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")]);
    expect(rows).toEqual([
      ["Açık şikayet grupları3", "/admin?section=reports"],
      ["Açık SSS mesajları4", "/admin?section=messages-faq"],
      ["Açık Write to us mesajları2", "/admin?section=messages-write-to-us"],
      ["Açık hesap dondurma mesajları1", "/admin?section=messages-account-freeze"],
      ["Açık veri silme talepleri5", "/admin?section=messages-data-deletion"],
      ["Bekleyen KYB / KYC başvuruları6", "/admin?section=kyc"],
      ["Süresi dolan2", "/admin?section=held-events"],
      ["Süresi dolmamış9", "/admin?section=held-events"],
      ["Aktif duyurular8", "/admin?section=cms-announcements"],
      ["Müşteri para çekme talebi13", "/admin?section=customer-payouts"],
      ["Küratör para çekme talebi14", "/admin?section=curator-payouts"],
    ]);
    expect(within(screen.getByRole("region", { name: "Açık iletişim mesajları" })).getByText("12")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Blokeli etkinlikler" })).toBeInTheDocument();
  });

  it("does not invent numbers while the counters are loading or failed", () => {
    const { unmount } = mount(<BackofficeDashboard />);
    expect(screen.getByRole("status")).toHaveTextContent("Sayaçlar yükleniyor");
    expect(screen.getByRole("link", { name: /Açık şikayet grupları/ })).toHaveTextContent("—");
    unmount();

    mount(<BackofficeDashboard error={new Error("offline")} onRetry={vi.fn()} />);
    expect(screen.getByText("Sayaçlar yüklenemedi")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("17/10 #1-#2 — backoffice page", () => {
  it("opens on the counters-only dashboard without a sidebar", async () => {
    mount(<AdminDashboardPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Backoffice Dashboard" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("link", { name: /Açık şikayet grupları/ })).toHaveTextContent("3"));
    expect(screen.queryByRole("navigation", { name: /alt kategorileri/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Modüller")).not.toBeInTheDocument();
    expect(screen.queryByText("Yayınlanan etkinlikler")).not.toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "Backoffice ana navigasyon" })).queryByRole("link", { current: "page" })).not.toBeInTheDocument();
  });

  it("opens a deep-linked section with its main item selected and sub-categories in the sidebar", async () => {
    mount(<AdminDashboardPage />, "/admin?section=messages-data-deletion");

    expect(screen.getByRole("heading", { level: 1, name: "Veri silme talepleri" })).toBeInTheDocument();
    const mainNav = screen.getByRole("navigation", { name: "Backoffice ana navigasyon" });
    expect(within(mainNav).getByRole("link", { current: "page" })).toHaveTextContent("İletişim");

    const sidebar = screen.getByRole("navigation", { name: "İletişim alt kategorileri" });
    expect(within(sidebar).getAllByRole("link")).toHaveLength(4);
    expect(within(sidebar).getByRole("link", { current: "page" })).toHaveTextContent("Veri silme talepleri");
    await waitFor(() => expect(within(sidebar).getByRole("link", { current: "page" })).toHaveTextContent("5"));

    await waitFor(() => expect(api.listAdminMessages).toHaveBeenCalled());
    const [type, params] = api.listAdminMessages.mock.calls[0]!;
    expect(type).toBe("write_to_us");
    expect((params as URLSearchParams).get("dataDeletion")).toBe("only");
    expect(screen.queryByRole("tablist", { name: "Mesaj türü" })).not.toBeInTheDocument();
  });

  it("keeps data deletion requests out of the Write to us inbox", async () => {
    mount(<AdminDashboardPage />, "/admin?section=messages-write-to-us");

    await waitFor(() => expect(api.listAdminMessages).toHaveBeenCalled());
    const [type, params] = api.listAdminMessages.mock.calls[0]!;
    expect(type).toBe("write_to_us");
    expect((params as URLSearchParams).get("dataDeletion")).toBe("exclude");
  });

  it("navigates from a main item to its first sub-category and back to the dashboard via the logo", async () => {
    mount(<AdminDashboardPage />);
    const mainNav = screen.getByRole("navigation", { name: "Backoffice ana navigasyon" });

    await userEvent.click(within(mainNav).getByRole("link", { name: /Moderasyon/ }));
    expect(screen.getByTestId("location")).toHaveTextContent("/admin?section=reports");
    expect(screen.getByRole("heading", { level: 1, name: "Şikayetler" })).toBeInTheDocument();

    const sidebar = screen.getByRole("navigation", { name: "Moderasyon alt kategorileri" });
    await userEvent.click(within(sidebar).getByRole("link", { name: "Kural Yönetimi" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/admin?section=report-rules");
    expect(screen.getByRole("heading", { level: 2, name: "Kural yönetimi" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("link", { name: "Backoffice Dashboard" }));
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/admin$/);
    expect(screen.getByRole("heading", { level: 1, name: "Backoffice Dashboard" })).toBeInTheDocument();
  });

  it("embeds KYB / KYC review and notification deliveries as backoffice sections", async () => {
    const { unmount } = mount(<AdminDashboardPage />, "/admin?section=finance");
    expect(screen.getByRole("heading", { level: 1, name: "KYB / KYC başvuruları" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Kurumsal KYC inceleme" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Admin paneline dön/ })).not.toBeInTheDocument();
    await waitFor(() => expect(api.listAdminCorporateKyc).toHaveBeenCalledWith("pending"));
    unmount();

    mount(<AdminDashboardPage />, "/admin?section=notification-deliveries");
    expect(screen.getByRole("heading", { level: 2, name: "Bildirim teslimatları" })).toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "Backoffice ana navigasyon" })).getByRole("link", { current: "page" })).toHaveTextContent("CMS");
    await waitFor(() => expect(api.listAdminNotificationDeliveries).toHaveBeenCalledWith("failed"));
  });

  it("logs out from the header and returns to the admin login with only the brand", async () => {
    mount(<AdminDashboardPage />, "/admin?section=users");

    await userEvent.click(screen.getByRole("button", { name: "Çıkış" }));

    expect(api.clearAdminToken).toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1, name: "Giriş" })).toBeInTheDocument();
    expect(screen.getByText("BACKOFFICE")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Backoffice ana navigasyon" })).not.toBeInTheDocument();
  });
});

describe("17/10 #1 — finance sub-categories", () => {
  const payout = (id: string, name: string, isCurator: boolean, status = "pending") => ({
    id, amount: 100, currency: "TRY", status, requestedAt: new Date("2026-11-10T10:00:00Z"), isCurator,
    user: { id: `u-${id}`, name, email: `${id}@example.com` },
  });

  beforeEach(() => {
    api.listAdminFinancePayouts.mockResolvedValue([
      payout("p1", "Küratör Ada", true),
      payout("p2", "Müşteri Deniz", false),
      payout("p3", "Müşteri Ece", false, "paid"),
    ]);
  });

  it("lists only curator withdrawal requests under Küratörler", async () => {
    mount(<AdminFinancePanel view="curator-payouts" />);

    expect(await screen.findByText("Küratör Ada")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Küratör para çekme talepleri" })).toBeInTheDocument();
    expect(screen.getByText("Değerlendirilmeyi bekleyen: 1")).toBeInTheDocument();
    expect(screen.queryByText("Müşteri Deniz")).not.toBeInTheDocument();
    expect(api.listHeldFinanceEvents).not.toHaveBeenCalled();
    expect(api.listAdminFinanceAccounts).not.toHaveBeenCalled();
  });

  it("lists only customer withdrawal requests under Müşteriler", async () => {
    mount(<AdminFinancePanel view="customer-payouts" />);

    expect(await screen.findByText("Müşteri Deniz")).toBeInTheDocument();
    expect(screen.getByText("Müşteri Ece")).toBeInTheDocument();
    expect(screen.getByText("Değerlendirilmeyi bekleyen: 1")).toBeInTheDocument();
    expect(screen.queryByText("Küratör Ada")).not.toBeInTheDocument();
  });

  it("shows only blocked events in the Blokeli etkinlikler section", async () => {
    mount(<AdminFinancePanel view="held-events" />);

    expect(await screen.findByText("Blokeli etkinlik geliri yok.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Para çekme talepleri" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Üye hesapları ve doğrulama" })).not.toBeInTheDocument();
    expect(api.listAdminFinancePayouts).not.toHaveBeenCalled();
  });

  it("shows an honest empty state for the package usage report instead of fake data", () => {
    mount(<AdminFinancePanel view="customer-plan-usage" />);

    expect(screen.getByRole("heading", { name: "Kullanıcının paket kullanım raporu" })).toBeInTheDocument();
    expect(screen.getByText("Henüz veri yok")).toBeInTheDocument();
    expect(screen.getByText("Yakında")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("17/10 #1 — CMS sub-categories", () => {
  const categories: CmsCategory[] = [
    { id: "20000000-0000-4000-8000-000000000001", name: "Hesap", type: "faq", status: "active" },
    { id: "20000000-0000-4000-8000-000000000002", name: "Reklam", type: "write_to_us", status: "active" },
  ] as CmsCategory[];
  const announcements = [
    { id: "70000000-0000-4000-8000-000000000001", title: "Bakım duyurusu", body: "Detay", status: "active", target: "all", publishAt: new Date("2026-11-01T00:00:00Z") },
  ] as unknown as Announcement[];

  function cms(view: Parameters<typeof CmsAdminPanel>[0]["view"], onCreateCategory = vi.fn()) {
    const noop = vi.fn();
    mount(
      <CmsAdminPanel
        announcements={announcements}
        categories={categories}
        faqs={[]}
        isPending={false}
        onCreateAnnouncement={noop}
        onCreateCategory={onCreateCategory}
        onCreateFaq={noop}
        onDeleteCategory={noop}
        onDeleteFaq={noop}
        onSavePolicy={noop}
        onUpdateAnnouncement={noop}
        onUpdateCategory={noop}
        onUpdateFaq={noop}
        policies={[]}
        view={view}
      />,
    );
    return onCreateCategory;
  }

  it("shows only Write to Us categories and creates new ones with that type", async () => {
    const onCreateCategory = cms("write-to-us-categories");

    expect(screen.getByRole("heading", { level: 2, name: "Write to Us kategorileri" })).toBeInTheDocument();
    expect(screen.getByText("Reklam")).toBeInTheDocument();
    expect(screen.queryByText("Hesap")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Duyurular" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Sık Sorulan Sorular" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Kategori türü")).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Kategori adı"), "İş birliği");
    await userEvent.click(screen.getByRole("button", { name: "Kategori ekle" }));
    expect(onCreateCategory).toHaveBeenCalledWith({ name: "İş birliği", description: undefined, type: "write_to_us" });
  });

  it("shows FAQ categories together with the FAQ entries", () => {
    cms("faq-categories");

    expect(screen.getByRole("heading", { level: 2, name: "Sık Sorulan Sorular kategorileri" })).toBeInTheDocument();
    expect(screen.getAllByText("Hesap").length).toBeGreaterThan(0);
    expect(screen.queryByText("Reklam")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Sık Sorulan Sorular" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Yasal Politika Sayfaları" })).not.toBeInTheDocument();
  });

  it("shows only announcements or only policy pages in their own sections", () => {
    cms("announcements");
    expect(screen.getByText("Bakım duyurusu")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Yasal Politika Sayfaları" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Kategori adı")).not.toBeInTheDocument();
    cleanup();

    cms("policies");
    expect(screen.getByRole("heading", { level: 3, name: "Yasal Politika Sayfaları" })).toBeInTheDocument();
    expect(screen.queryByText("Bakım duyurusu")).not.toBeInTheDocument();
  });

  it("still renders every CMS block when no view is given", () => {
    cms(undefined);

    for (const name of ["İçerik Kategorileri", "Sık Sorulan Sorular", "Write to us Kategorileri", "Duyurular", "Yasal Politika Sayfaları"]) {
      expect(screen.getByRole("heading", { level: 3, name })).toBeInTheDocument();
    }
  });
});
