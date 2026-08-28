import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LanguageProvider } from "../lib/i18n";
import { AccountPage } from "../pages/AccountPage";
import { CuratorsPage } from "../pages/CuratorsPage";
import { PublicProfilePage } from "../pages/PublicProfilePage";
import { SearchPage } from "../pages/SearchPage";
import { SettingsSectionPage } from "../pages/SettingsCenterPage";

const apiMocks = vi.hoisted(() => ({
  getFinanceDashboard: vi.fn(),
  getMyProfile: vi.fn(),
  getNotificationPreferences: vi.fn(),
  getPrivacySettings: vi.fn(),
  getProfileAffinities: vi.fn(),
  getPublicProfile: vi.fn(),
  getUserSession: vi.fn(),
  listBlocks: vi.fn(),
  listFollowing: vi.fn(),
  listMemberSuggestions: vi.fn(),
  listMyEvents: vi.fn(),
  listMyNotifications: vi.fn(),
  listMyPlaces: vi.fn(),
  listProfileMedia: vi.fn(),
  listProfileTagSuggestions: vi.fn(),
  listSocialAccounts: vi.fn(),
  listTags: vi.fn(),
  recordContentAction: vi.fn(),
  recordContentView: vi.fn(),
  searchDiscovery: vi.fn(),
  submitCuratorApplication: vi.fn(),
  updatePrivacySettings: vi.fn(),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, ...apiMocks };
});

vi.mock("../components/PushNotificationControl", () => ({
  PushNotificationControl: () => <div aria-label="Push bildirim kontrolü" />,
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

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  apiMocks.getUserSession.mockReturnValue(null);
  apiMocks.getFinanceDashboard.mockResolvedValue({ business: { plan: "starter" } });
  apiMocks.getMyProfile.mockResolvedValue({ city: "İstanbul", country: "Türkiye" });
  apiMocks.getNotificationPreferences.mockResolvedValue([]);
  apiMocks.getPrivacySettings.mockResolvedValue({});
  apiMocks.getProfileAffinities.mockResolvedValue([]);
  apiMocks.listBlocks.mockResolvedValue([]);
  apiMocks.listFollowing.mockResolvedValue([]);
  apiMocks.listMemberSuggestions.mockResolvedValue([]);
  apiMocks.listMyNotifications.mockResolvedValue([]);
  apiMocks.listMyPlaces.mockResolvedValue([]);
  apiMocks.listProfileMedia.mockResolvedValue([]);
  apiMocks.listProfileTagSuggestions.mockResolvedValue([]);
  apiMocks.listSocialAccounts.mockResolvedValue([]);
  apiMocks.listTags.mockResolvedValue([]);
  apiMocks.recordContentAction.mockResolvedValue(undefined);
  apiMocks.recordContentView.mockResolvedValue(undefined);
  apiMocks.submitCuratorApplication.mockResolvedValue({ id: "application-1" });
  apiMocks.updatePrivacySettings.mockResolvedValue({});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("157 maddelik listenin 55-66 arası web davranışları", () => {
  it("etkinliği düzenlerken mevcut alanları doldurur; program zamanını boş bırakır ve satır sırasını düğmelerle değiştirir", async () => {
    const event = {
      id: "event-1",
      title: "Düzenlenecek Etkinlik",
      description: "Mevcut etkinlik açıklaması",
      startsAt: "2026-09-15T18:00:00.000Z",
      endsAt: "2026-09-15T21:00:00.000Z",
      format: "offline",
      visibility: "open",
      city: "İstanbul",
      country: "Türkiye",
      locationName: "Konnektora Studio",
      locationAddress: "Beyoğlu",
      latitude: 41.03,
      longitude: 28.98,
      tags: [],
      lineup: [
        { type: "session", title: "Ada Quartet" },
        { type: "session", title: "Bora Trio" },
      ],
      ticketTypes: [],
    };
    apiMocks.getUserSession.mockReturnValue({
      id: "owner-1",
      name: "Etkinlik Sahibi",
      username: "owner",
      role: "user",
      accountType: "individual",
      status: "active",
    });
    apiMocks.listMyEvents.mockResolvedValue([event]);

    render(providers(
      <Routes><Route path="/events/create" element={<AccountPage eventCreator />} /></Routes>,
      "/events/create?edit=event-1",
    ));

    expect(await screen.findByRole("heading", { name: "Etkinliği düzenle" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Başlık" })).toHaveValue(event.title);
    expect(screen.getByRole("textbox", { name: "Açıklama" })).toHaveValue(event.description);

    await userEvent.click(screen.getByRole("button", { name: "Adım 5" }));
    const programme = document.querySelector<HTMLElement>('[data-event-step="5"]')!;
    const startInputs = programme.querySelectorAll<HTMLInputElement>('input[name="lineupStartsAt"]');
    expect(startInputs).toHaveLength(2);
    expect(startInputs[0]).toHaveValue("");
    expect(startInputs[0]).not.toBeRequired();

    const addActions = programme.querySelector<HTMLElement>(".lineup-add-actions")!;
    expect(within(addActions).getAllByRole("button").map((button) => button.textContent?.trim())).toEqual([
      "Ana Başlık Ekle (Örn: Gün bilgisi)",
      "Alt Başlık Ekle (Örn: Sahne bilgisi)",
      "Madde ekle (Sanatçı & Performans adı)",
    ]);

    const rowsBefore = within(programme).getAllByRole("group");
    expect(within(rowsBefore[0]!).getByRole("textbox", { name: "Başlık" })).toHaveValue("Ada Quartet");
    await userEvent.click(within(rowsBefore[0]!).getByRole("button", { name: "Aşağı" }));
    const rowsAfter = within(programme).getAllByRole("group");
    expect(within(rowsAfter[0]!).getByRole("textbox", { name: "Başlık" })).toHaveValue("Bora Trio");

    await userEvent.click(screen.getByRole("button", { name: "Adım 6" }));
    const tickets = document.querySelector<HTMLElement>('[data-event-step="6"]')!;
    const platform = within(tickets).getByRole("combobox", { name: "Satış platformu" });
    expect(within(tickets).getByRole("spinbutton", { name: "Kişi başına maksimum bilet" })).not.toBeRequired();
    await userEvent.selectOptions(platform, "konnektora");
    expect(within(tickets).getByRole("alert")).toHaveTextContent('Sadece kurumsal üyeler "Konnektora online satış" ayarını tercih edebilir.');
    expect(platform).toHaveValue("door");
    await userEvent.selectOptions(platform, "external");
    expect(within(tickets).getByRole("textbox", { name: "Dış satış URL'si" })).toHaveAttribute("type", "url");
  });

  it("takipçi gizlilik açıklamasını sayfa içi bildirim yerine düğmeye bağlı tooltip olarak açar", async () => {
    apiMocks.getPublicProfile.mockResolvedValue({
      id: "person-1",
      name: "Ada Yılmaz",
      username: "ada",
      accountType: "individual",
      verified: false,
      followerCount: 42,
      followingCount: 17,
      city: "İstanbul",
      country: "Türkiye",
      media: [],
      interests: [],
      tags: [],
      events: [],
      places: [],
      relationship: { isSelf: false, following: false, canMessage: true },
    });

    render(providers(
      <Routes><Route path="/users/:username" element={<PublicProfilePage />} /></Routes>,
      "/users/ada",
    ));

    const followers = await screen.findByRole("button", { name: /42 takipçi/ });
    expect(followers).toHaveAttribute("data-tooltip", "Kimin kimi takip ettiğini kimse göremez.");
    expect(followers).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(followers);
    expect(followers).toHaveClass("tooltip-open");
    expect(followers).toHaveAttribute("aria-expanded", "true");
    expect(document.querySelector(".profile-privacy-toast")).not.toBeInTheDocument();
  });

  it("sonuç bulunamadığında etiket oluşturma açıklamasını ve doğrudan oluşturma bağlantısını gösterir", async () => {
    apiMocks.searchDiscovery.mockResolvedValue({ items: [], total: 0 });
    render(providers(<SearchPage />, "/search?q=Seramik"));

    expect(await screen.findByText("Eşleşen bir sonuç bulunamadı; ama dilerseniz böyle bir etiket oluşturabilirsiniz.")).toBeVisible();
    expect(screen.getByRole("link", { name: "“Seramik” etiketini oluştur" })).toHaveAttribute("href", "/tags?create=Seramik");
  });

  it("küratör başvurusunda LinkedIn dışındaki geçerli bir URL'yi kabul edip gönderir", async () => {
    render(providers(<CuratorsPage />, "/curators?city=İstanbul"));

    await userEvent.type(screen.getByRole("textbox", { name: "Ad soyad" }), "Ada Yılmaz");
    await userEvent.type(screen.getByRole("textbox", { name: "E-posta" }), "ada@example.com");
    expect(screen.getByRole("textbox", { name: "Şehir" })).toHaveValue("İstanbul");
    await userEvent.type(screen.getByRole("textbox", { name: "Motivasyon mektubu" }), "Şehrimde nitelikli topluluk etkinlikleri düzenlemek ve yerel ağı büyütmek istiyorum.");
    const cvUrl = screen.getByRole("textbox", { name: "Özgeçmiş bağlantısı (LinkedIn, Instagram profiliniz vb. linki)" });
    expect(cvUrl).toHaveAttribute("type", "url");
    await userEvent.type(cvUrl, "https://portfolio.example.com/ada");
    await userEvent.click(screen.getByRole("button", { name: "Başvuruyu gönder" }));

    await waitFor(() => expect(apiMocks.submitCuratorApplication).toHaveBeenCalled());
    expect(apiMocks.submitCuratorApplication.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      cvUrl: "https://portfolio.example.com/ada",
    }));
  });

  it("gizlilik alanlarını bireysel ve kurumsal hesaba göre ayırır; yalnız iletişim/davet alanlarından Hiç kimse seçeneğini kaldırır", async () => {
    const privacy = {
      directoryDiscoverable: true,
      messageAudience: "everybody",
      eventAudience: "everybody",
      eventInviteAudience: "everybody",
      placeAudience: "everybody",
      placeInviteAudience: "everybody",
      profileNameAudience: "everybody",
      demographicsAudience: "everybody",
      locationAudience: "everybody",
      websiteAudience: "everybody",
      businessAudience: "everybody",
      addressAudience: "everybody",
      tradeNameAudience: "everybody",
    };
    apiMocks.getPrivacySettings.mockResolvedValue(privacy);
    apiMocks.getUserSession.mockReturnValue({ id: "person-1", accountType: "individual", role: "user" });
    const individual = render(providers(<SettingsSectionPage section="privacy" />, "/settings/privacy"));

    expect(await screen.findByRole("checkbox", { name: "Arkadaşlarım beni aramada bulabilsin" })).toBeChecked();
    expect(screen.getByRole("combobox", { name: "Profil ayarlarımda kayıtlı şehri kim görebilir?" })).toBeVisible();
    expect(screen.queryByRole("combobox", { name: "Profil ayarlarımda kayıtlı adresimi kim görebilir?" })).not.toBeInTheDocument();
    expect(screen.queryByText("Kurumsal bilgi görünürlüğü")).not.toBeInTheDocument();
    expect(within(screen.getByRole("combobox", { name: "Etkinliklerimi kim görebilir?" })).getByRole("option", { name: "Hiç kimse" })).toBeInTheDocument();
    expect(within(screen.getByRole("combobox", { name: "Kimler mesaj gönderebilir?" })).queryByRole("option", { name: "Hiç kimse" })).not.toBeInTheDocument();
    expect(within(screen.getByRole("combobox", { name: "Kimler etkinliğe davet edebilir?" })).queryByRole("option", { name: "Hiç kimse" })).not.toBeInTheDocument();
    expect(within(screen.getByRole("combobox", { name: "Kimler mekâna davet edebilir?" })).queryByRole("option", { name: "Hiç kimse" })).not.toBeInTheDocument();

    individual.unmount();
    apiMocks.getUserSession.mockReturnValue({ id: "business-1", accountType: "corporate", role: "user" });
    render(providers(<SettingsSectionPage section="privacy" />, "/settings/privacy"));
    expect(await screen.findByRole("combobox", { name: "Profil ayarlarımda kayıtlı adresimi kim görebilir?" })).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Ticari unvanımı kim görebilir?" })).toBeVisible();
    expect(screen.queryByRole("combobox", { name: "Profil ayarlarımda kayıtlı şehri kim görebilir?" })).not.toBeInTheDocument();
  });
});
