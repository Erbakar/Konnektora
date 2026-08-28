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
  createBlock: vi.fn(),
  getFinanceDashboard: vi.fn(),
  getContentNotification: vi.fn(),
  getMyProfile: vi.fn(),
  getNotificationPreferences: vi.fn(),
  getPrivacySettings: vi.fn(),
  getProfileAffinities: vi.fn(),
  getPublicProfile: vi.fn(),
  getPublicProfileById: vi.fn(),
  getUserSession: vi.fn(),
  listBlocks: vi.fn(),
  listFollowing: vi.fn(),
  listGuestLists: vi.fn(),
  listMemberSuggestions: vi.fn(),
  listMyEvents: vi.fn(),
  listMyNotifications: vi.fn(),
  listMyPlaces: vi.fn(),
  listProfileMedia: vi.fn(),
  listProfileTagSuggestions: vi.fn(),
  listSocialAccounts: vi.fn(),
  listTags: vi.fn(),
  removeBlock: vi.fn(),
  recordContentAction: vi.fn(),
  recordContentView: vi.fn(),
  searchDiscovery: vi.fn(),
  submitCuratorApplication: vi.fn(),
  updateProfileAffinities: vi.fn(),
  updatePrivacySettings: vi.fn(),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, ...apiMocks };
});

vi.mock("../components/PushNotificationControl", () => ({
  PushNotificationControl: () => <div aria-label="Push bildirim kontrolü" />,
}));
vi.mock("../components/ProfileVerificationPanel", () => ({
  ProfileVerificationPanel: () => <div aria-label="Profil doğrulama paneli" />,
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
  apiMocks.createBlock.mockResolvedValue({ ok: true });
  apiMocks.getFinanceDashboard.mockResolvedValue({ business: { plan: "starter" } });
  apiMocks.getContentNotification.mockResolvedValue({ enabled: false });
  apiMocks.getMyProfile.mockResolvedValue({ city: "İstanbul", country: "Türkiye" });
  apiMocks.getNotificationPreferences.mockResolvedValue([]);
  apiMocks.getPrivacySettings.mockResolvedValue({});
  apiMocks.getProfileAffinities.mockResolvedValue([]);
  apiMocks.listBlocks.mockResolvedValue([]);
  apiMocks.listFollowing.mockResolvedValue([]);
  apiMocks.listGuestLists.mockResolvedValue([]);
  apiMocks.listMemberSuggestions.mockResolvedValue([]);
  apiMocks.listMyNotifications.mockResolvedValue([]);
  apiMocks.listMyEvents.mockResolvedValue([]);
  apiMocks.listMyPlaces.mockResolvedValue([]);
  apiMocks.listProfileMedia.mockResolvedValue([]);
  apiMocks.listProfileTagSuggestions.mockResolvedValue([]);
  apiMocks.listSocialAccounts.mockResolvedValue([]);
  apiMocks.listTags.mockResolvedValue([]);
  apiMocks.recordContentAction.mockResolvedValue(undefined);
  apiMocks.recordContentView.mockResolvedValue(undefined);
  apiMocks.removeBlock.mockResolvedValue({ ok: true });
  apiMocks.submitCuratorApplication.mockResolvedValue({ id: "application-1" });
  apiMocks.updatePrivacySettings.mockResolvedValue({});
  apiMocks.updateProfileAffinities.mockResolvedValue([]);
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

    await userEvent.click(screen.getByRole("button", { name: "Adım 2" }));
    const location = document.querySelector<HTMLElement>('[data-event-step="2"]')!;
    expect(within(location).queryByLabelText("Enlem")).not.toBeInTheDocument();
    expect(within(location).queryByLabelText("Boylam")).not.toBeInTheDocument();
    expect(location.querySelector<HTMLInputElement>('input[name="latitude"]')).toHaveAttribute("type", "hidden");
    expect(location.querySelector<HTMLInputElement>('input[name="longitude"]')).toHaveAttribute("type", "hidden");

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

  it("profil ilgi alanlarını yeşil ortak kart olmadan ve etiket detayıyla aynı duygu ikonlarıyla gösterir", async () => {
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
      interests: [
        { tag: { id: "tag-like", name: "Caz", slug: "caz" }, sentiment: "like", common: true, commentCount: 2 },
        { tag: { id: "tag-neutral", name: "Seramik", slug: "seramik" }, sentiment: "ok", common: false, commentCount: 0 },
        { tag: { id: "tag-dislike", name: "Gürültü", slug: "gurultu" }, sentiment: "dislike", common: false, commentCount: 0 },
      ],
      events: [],
      places: [],
      relationship: { isSelf: false, following: false, canMessage: true },
    });

    render(providers(
      <Routes><Route path="/users/:username" element={<PublicProfilePage />} /></Routes>,
      "/users/ada",
    ));

    const interests = (await screen.findByRole("heading", { name: "İlgi alanları" })).closest("section")!;
    expect(interests.querySelector(".profile-interest.is-common")).not.toBeInTheDocument();
    expect(within(interests).queryByText(/ortak ilgi/i)).not.toBeInTheDocument();
    expect(within(interests).getByRole("link", { name: /Caz/ })).toHaveAttribute("href", "/tags/caz?authorId=person-1");
    expect(within(interests).getByRole("link", { name: /Caz/ })).toHaveTextContent("2 gönderi");
    expect(interests.querySelector('[data-sentiment-icon="like"]')).toBeInTheDocument();
    expect(interests.querySelector('[data-sentiment-icon="ok"]')).toBeInTheDocument();
    expect(interests.querySelector('[data-sentiment-icon="dislike"]')).toBeInTheDocument();
    expect(within(interests).queryByText("#Caz")).not.toBeInTheDocument();
  });

  it("profil fotoğrafından doğru medya öğesini açar, kalan medya sayısını gösterir ve kurumsal konumu tekrarlamaz", async () => {
    apiMocks.getPublicProfile.mockResolvedValue({
      id: "business-1",
      name: "Konnektora Studio",
      username: "konnektora-studio",
      accountType: "corporate",
      verified: true,
      followerCount: 42,
      followingCount: 17,
      city: "İstanbul",
      country: "Türkiye",
      district: "Sarıyer",
      address: "Maslak",
      companyName: "Konnektora Teknoloji",
      media: [
        { id: "media-1", url: "/uploads/one.webp", type: "image", isProfilePicture: false },
        { id: "media-2", url: "/uploads/two.webp", type: "image", isProfilePicture: false },
        { id: "profile-photo", url: "/uploads/profile.webp", type: "image", isProfilePicture: true },
        { id: "media-3", url: "/uploads/three.webp", type: "image", isProfilePicture: false },
        { id: "media-4", url: "/uploads/four.webp", type: "image", isProfilePicture: false },
      ],
      interests: [],
      events: [],
      places: [],
      relationship: { isSelf: false, following: false, canMessage: false },
    });

    render(providers(
      <Routes><Route path="/users/:username" element={<PublicProfilePage />} /></Routes>,
      "/users/konnektora-studio",
    ));

    const facts = await screen.findByLabelText("Profil bilgileri");
    expect(within(facts).getByText("Maslak, Sarıyer, İstanbul, Türkiye")).toBeVisible();
    expect(within(facts).queryByText("İstanbul, Türkiye")).not.toBeInTheDocument();
    expect(document.querySelector(".profile-media-thumbnails span")).toHaveTextContent("+1");

    await userEvent.click(screen.getByRole("button", { name: "Medya galerisini aç" }));
    const gallery = await screen.findByRole("dialog");
    expect(within(gallery).getByText("3 / 5")).toBeVisible();
    expect(within(gallery).getByRole("img", { name: "Konnektora Studio profil medyası" }).getAttribute("src")?.endsWith("/uploads/profile.webp")).toBe(true);
  });

  it("profilin birincil düğmelerini menüden ayırır ve aksiyonları istenen sırada gösterir", async () => {
    apiMocks.getUserSession.mockReturnValue({
      id: "admin-1", name: "Yönetici", username: "yonetici", role: "admin", status: "active", accountType: "individual",
    });
    apiMocks.getPublicProfile.mockResolvedValue({
      id: "person-1", name: "Ada Yılmaz", username: "ada", accountType: "individual", verified: false,
      followerCount: 42, followingCount: 17, city: "İstanbul", country: "Türkiye", media: [], interests: [], events: [], places: [],
      relationship: { isSelf: false, following: false, canMessage: true, blockedByViewer: false },
    });
    apiMocks.listGuestLists.mockResolvedValue([
      { id: "list-z", name: "Ziyaretçiler", members: [] },
      { id: "list-a", name: "Arkadaşlar", members: [] },
    ]);

    render(providers(<Routes><Route path="/users/:username" element={<PublicProfilePage />} /></Routes>, "/users/ada"));

    expect(await screen.findByRole("button", { name: "Takip et" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Mesaj" })).toHaveAttribute("href", "/messages?peer=person-1");
    await userEvent.click(screen.getByRole("button", { name: "Profil aksiyonları" }));
    const menu = document.querySelector<HTMLElement>(".profile-actions-menu > div")!;
    expect(Array.from(menu.children).map((item) => item.textContent?.trim())).toEqual([
      "Paylaş",
      "Bildirim ayarla",
      "Etkileşim istatistikleri",
      "Misafir listesine ekle",
      "Kullanıcıyı raporla",
      "Kullanıcıyı engelle",
    ]);
    expect(within(menu).queryByText("Mesaj gönder")).not.toBeInTheDocument();

    await userEvent.click(within(menu).getByRole("button", { name: "Misafir listesine ekle" }));
    const guestDialog = await screen.findByRole("dialog", { name: "Misafir listesine ekle" });
    expect(Array.from(guestDialog.querySelectorAll(".admin-list-row strong")).map((item) => item.textContent)).toEqual([
      "Arkadaşlar",
      "Ziyaretçiler",
    ]);
  });

  it("profil aksiyon menüsünde engelleme ve engeli kaldırmayı aynı yerden tamamlar", async () => {
    const session = { id: "viewer-1", name: "Deniz", username: "deniz", role: "user", status: "active", accountType: "individual" };
    const baseProfile = {
      id: "person-1", name: "Ada Yılmaz", username: "ada", accountType: "individual", verified: false,
      followerCount: 42, followingCount: 17, city: "İstanbul", country: "Türkiye", media: [], interests: [], events: [], places: [],
      relationship: { isSelf: false, following: false, canMessage: true, blockedByViewer: false },
    };
    apiMocks.getUserSession.mockReturnValue(session);
    apiMocks.getPublicProfile
      .mockResolvedValueOnce(baseProfile)
      .mockResolvedValue({ ...baseProfile, relationship: { ...baseProfile.relationship, canMessage: false, blockedByViewer: true } });

    render(providers(<Routes><Route path="/users/:username" element={<PublicProfilePage />} /></Routes>, "/users/ada"));
    await userEvent.click(await screen.findByRole("button", { name: "Profil aksiyonları" }));
    await userEvent.click(screen.getByRole("button", { name: "Kullanıcıyı engelle" }));
    await waitFor(() => expect(apiMocks.createBlock).toHaveBeenCalledWith("user", "person-1"));
    expect(await screen.findByRole("button", { name: "Engeli kaldır" })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Engeli kaldır" }));
    await waitFor(() => expect(apiMocks.removeBlock).toHaveBeenCalledWith("user", "person-1"));
  });

  it("üçüncü etiket eklemesinden sonra profil sinyallerine göre seçilebilir akıllı öneriler gösterir", async () => {
    const session = { id: "person-1", name: "Ada Yılmaz", username: "ada", role: "user", status: "active", accountType: "individual" };
    apiMocks.getUserSession.mockReturnValue(session);
    apiMocks.getPublicProfile.mockResolvedValue({
      id: session.id, name: session.name, username: session.username, accountType: "individual", verified: false,
      followerCount: 42, followingCount: 17, city: "İstanbul", country: "Türkiye", media: [], interests: [], events: [], places: [],
      relationship: { isSelf: true, following: false, canMessage: false, blockedByViewer: false },
    });
    apiMocks.listTags.mockResolvedValue([
      { id: "tag-1", name: "Caz", slug: "caz", usageCount: 30, status: "active" },
      { id: "tag-2", name: "Seramik", slug: "seramik", usageCount: 20, status: "active" },
      { id: "tag-3", name: "Kahve", slug: "kahve", usageCount: 10, status: "active" },
      { id: "tag-4", name: "Fotoğraf", slug: "fotograf", usageCount: 40, status: "active" },
    ]);

    render(providers(<Routes><Route path="/users/:username" element={<PublicProfilePage />} /></Routes>, "/users/ada"));
    await userEvent.click(await screen.findByRole("button", { name: /Kendine etiket ekle/ }));
    const tagDialog = await screen.findByRole("dialog", { name: "Profile etiket ekle" });
    expect(within(tagDialog).getByText("Adım 1: Bir etiket seç veya yaz")).toBeVisible();
    const input = await screen.findByRole("combobox", { name: "Etiket" });
    for (const tagName of ["Caz", "Seramik", "Kahve"]) {
      await userEvent.clear(input);
      await userEvent.type(input, tagName);
      await userEvent.click(screen.getByRole("button", { name: "Profile ekle" }));
      await waitFor(() => expect(apiMocks.updateProfileAffinities).toHaveBeenCalledTimes(["Caz", "Seramik", "Kahve"].indexOf(tagName) + 1));
    }
    const suggestions = await screen.findByRole("region", { name: "Akıllı etiket önerileri" });
    expect(within(suggestions).getByText("Profil sinyallerine göre önerilen kategoriler")).toBeVisible();
    await userEvent.click(within(suggestions).getByRole("button", { name: "Fotoğraf" }));
    expect(input).toHaveValue("Fotoğraf");
    await userEvent.click(within(tagDialog).getByRole("button", { name: "Kapat" }));
    await userEvent.click(screen.getByRole("button", { name: /Kendine etiket ekle/ }));
    const reopened = await screen.findByRole("dialog", { name: "Profile etiket ekle" });
    expect(within(reopened).getByText(/Sevdiğiniz kahve, müzik grubu, film/)).toBeVisible();
    expect(within(reopened).queryByRole("region", { name: "Akıllı etiket önerileri" })).not.toBeInTheDocument();
  });

  it("kullanıcının kendi kimlik rotasında profilini kayıp saymadan açar", async () => {
    const session = {
      id: "member-self",
      name: "Ada Yılmaz",
      username: "ada",
      role: "user",
      status: "active",
      accountType: "individual",
      onboardingCompleted: true,
    };
    apiMocks.getUserSession.mockReturnValue(session);
    apiMocks.getPublicProfileById.mockResolvedValue({
      id: session.id,
      name: session.name,
      username: session.username,
      accountType: "individual",
      verified: false,
      followerCount: 42,
      followingCount: 17,
      city: "İstanbul",
      country: "Türkiye",
      media: [],
      interests: [],
      events: [],
      places: [],
      relationship: { isSelf: true, following: false, canMessage: false },
    });

    render(providers(
      <Routes><Route path="/users/id/:userId" element={<PublicProfilePage />} /></Routes>,
      `/users/id/${session.id}`,
    ));

    expect(await screen.findByRole("heading", { name: session.name })).toBeVisible();
    expect(apiMocks.getPublicProfileById).toHaveBeenCalledWith(session.id);
    expect(screen.queryByRole("heading", { name: "Profil bulunamadı" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "İlgi alanları" }).closest("section")).toHaveAttribute("id", "interests");
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

  it("telefon ve e-postayı profil düzenlemeden kaldırıp yalnız hesap ayarlarında gösterir", async () => {
    apiMocks.getUserSession.mockReturnValue({
      id: "person-1",
      name: "Ada Yılmaz",
      email: "ada@example.com",
      accountType: "individual",
      role: "user",
    });
    apiMocks.getMyProfile.mockResolvedValue({
      id: "person-1",
      name: "Ada Yılmaz",
      email: "ada@example.com",
      phone: "+905551234567",
      username: "ada",
      accountType: "individual",
      city: "İstanbul",
      country: "Türkiye",
      interests: [],
    });

    const profile = render(providers(<SettingsSectionPage section="profile" />, "/settings/profile"));
    expect(await screen.findByRole("heading", { name: "Profili düzenle" })).toBeVisible();
    expect(screen.queryByRole("textbox", { name: "Telefon" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "E-posta" })).not.toBeInTheDocument();
    profile.unmount();

    render(providers(<SettingsSectionPage section="account" />, "/settings/account"));
    expect(await screen.findByRole("heading", { name: "E-posta adresi" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "E-posta" })).toHaveValue("ada@example.com");
    expect(screen.getByRole("heading", { name: "Telefon numarası" })).toBeVisible();
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Telefon" })).toHaveValue("+905551234567"));
  });
});
