import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LanguageProvider } from "../lib/i18n";
import { mockEvents } from "../lib/mockData";
import { PlaceDetailPage } from "../pages/PlaceDetailPage";

const apiMocks = vi.hoisted(() => ({
  createContentComment: vi.fn(),
  followPlace: vi.fn(),
  getContentNotification: vi.fn(),
  getPlace: vi.fn(),
  getUserSession: vi.fn(),
  listContentComments: vi.fn(),
  listFollowing: vi.fn(),
  listPlaceMembers: vi.fn(),
  listPlaceRelatedUsers: vi.fn(),
  listPlaces: vi.fn(),
  recordContentView: vi.fn(),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, ...apiMocks };
});
vi.mock("../lib/useGuestListEntitlement", () => ({
  useGuestListEntitlement: () => ({ canUseGuestLists: false }),
}));
vi.mock("../components/ContentMediaGallery", () => ({ ContentMediaGallery: () => <div aria-label="Mekân medyaları" /> }));
vi.mock("../components/ContentRating", () => ({ ContentRating: () => <div aria-label="Mekân değerlendirmesi" /> }));
vi.mock("../components/LocationMap", () => ({ LocationMap: () => <div aria-label="Mekân ve kullanıcı konumu haritası" /> }));

const tags = Array.from({ length: 7 }, (_, index) => ({
  id: `tag-${index + 1}`, name: `Etiket ${index + 1}`, slug: `etiket-${index + 1}`,
}));
const futureEvent = { ...mockEvents[0]!, id: "future-event", slug: "gelecek-etkinlik", title: "Gelecek Etkinlik", startsAt: "2030-01-01T18:00:00.000Z", endsAt: "2030-01-01T20:00:00.000Z" };
const pastEvent = { ...mockEvents[1]!, id: "past-event", slug: "gecmis-etkinlik", title: "Geçmiş Etkinlik", startsAt: "2020-01-01T18:00:00.000Z", endsAt: "2020-01-01T20:00:00.000Z" };

beforeEach(() => {
  apiMocks.getUserSession.mockReturnValue({ id: "owner-1", name: "Ada", username: "ada", role: "user", status: "active" });
  apiMocks.getPlace.mockResolvedValue({
    id: "place-1", name: "Konnektora Studio", slug: "konnektora-studio-310001", description: "Topluluk mekânı",
    createdById: "owner-1", placeType: "community", visibility: "approval_required", status: "active",
    city: "İstanbul", country: "Türkiye", address: "Beyoğlu", latitude: 41.034, longitude: 28.977,
    memberCount: 2, followerCount: 2, inviteCount: 1, followingMemberCount: 1, isFollowing: false,
    viewerMembership: { status: "accepted", role: "manager" }, coverImageUrl: null,
    tags, events: [futureEvent, pastEvent], managers: [],
  });
  apiMocks.getContentNotification.mockResolvedValue({ enabled: false });
  apiMocks.listPlaceMembers.mockResolvedValue([]);
  apiMocks.listPlaceRelatedUsers.mockResolvedValue([
    { id: "member-1", name: "Üye Bir", username: "uye1", status: "accepted" },
    { id: "member-2", name: "Üye İki", username: "uye2", status: "accepted" },
    { id: "pending-1", name: "Bekleyen", username: "bekleyen", status: "pending" },
  ]);
  apiMocks.listPlaces.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0, hasNextPage: false });
  apiMocks.listContentComments.mockResolvedValue([]);
  apiMocks.listFollowing.mockResolvedValue([]);
  apiMocks.createContentComment.mockResolvedValue({ id: "comment-1", targetId: "place-1", body: "Harika mekân", likeCount: 0, createdAt: "2026-08-28T00:00:00.000Z" });
  apiMocks.followPlace.mockResolvedValue({ following: true });
  apiMocks.recordContentView.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("mekân detay gereksinimleri", () => {
  it("takipçi özetini, haritayı, sıralı/katlanır etiketleri ve gelecek-geçmiş etkinlik sekmelerini gösterir", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <LanguageProvider>
          <MemoryRouter initialEntries={["/places/konnektora-studio-310001"]}>
            <Routes><Route path="/places/:slug" element={<PlaceDetailPage />} /></Routes>
          </MemoryRouter>
        </LanguageProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Konnektora Studio" })).toBeVisible();
    const followers = screen.getByRole("heading", { name: "Takipçiler" }).closest("section")!;
    await waitFor(() => expect(within(followers).getByRole("link", { name: /2 üye · 1 davetli/ })).toHaveTextContent("2 üye · 1 davetli · 1 bekleyen · 1 takip ettiğiniz"));
    expect(screen.getByLabelText("Mekân ve kullanıcı konumu haritası")).toBeVisible();

    const visibleTags = screen.getByRole("heading", { name: "Etiketler" }).closest("section")!;
    expect(within(visibleTags).getAllByRole("link").map((link) => link.textContent)).toEqual(tags.slice(0, 6).map((tag) => `#${tag.name}`));
    expect(within(visibleTags).queryByRole("link", { name: "#Etiket 7" })).not.toBeInTheDocument();
    await userEvent.click(within(visibleTags).getByRole("button", { name: "Tümünü göster (7)" }));
    expect(within(visibleTags).getByRole("link", { name: "#Etiket 7" })).toHaveAttribute("href", "/tags/etiket-7");

    const events = screen.getByRole("heading", { name: "Mekândaki etkinlikler" }).closest("section")!;
    expect(within(events).getByRole("link", { name: "Gelecek Etkinlik" })).toBeVisible();
    expect(within(events).queryByRole("link", { name: "Geçmiş Etkinlik" })).not.toBeInTheDocument();
    await userEvent.click(within(events).getByRole("button", { name: "Geçmiş etkinlikler" }));
    expect(within(events).getByRole("link", { name: "Geçmiş Etkinlik" })).toBeVisible();
  });

  it("Takip et ve Yorum yaz işlemlerini gerçek mutation çağrılarına bağlar", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <LanguageProvider>
          <MemoryRouter initialEntries={["/places/konnektora-studio-310001"]}>
            <Routes><Route path="/places/:slug" element={<PlaceDetailPage />} /></Routes>
          </MemoryRouter>
        </LanguageProvider>
      </QueryClientProvider>,
    );

    await userEvent.click(await screen.findByRole("button", { name: "Takip et" }));
    await waitFor(() => expect(apiMocks.followPlace).toHaveBeenCalledWith("place-1"));

    await userEvent.type(screen.getByPlaceholderText("Yorum yaz…"), "Harika mekân");
    await userEvent.click(screen.getByRole("button", { name: "Gönder" }));
    await waitFor(() => expect(apiMocks.createContentComment).toHaveBeenCalledWith("place", "place-1", "Harika mekân"));
  });

  it("diğer mekân önerilerini aşağı taşırmadan yatay alanda en fazla sekiz kartla sınırlar", async () => {
    const relatedPlaces = Array.from({ length: 10 }, (_, index) => ({
      id: `related-${index + 1}`,
      name: `Önerilen Mekân ${index + 1}`,
      slug: `onerilen-mekan-${index + 1}`,
      description: "Topluluk mekânı",
      placeType: "community",
      visibility: "open",
      status: "active",
      coverImageUrl: null,
      country: "Türkiye",
      city: "İstanbul",
      address: "Beyoğlu",
      latitude: 41.03,
      longitude: 28.98,
      followerCount: 10 - index,
      inviteCount: 0,
      memberCount: 10 - index,
      followingMemberCount: 0,
      upcomingEventCount: 0,
      tags: [],
    }));
    apiMocks.listPlaces.mockResolvedValue({ items: relatedPlaces, page: 1, pageSize: 20, total: 10, hasNextPage: false });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <LanguageProvider>
          <MemoryRouter initialEntries={["/places/konnektora-studio-310001"]}>
            <Routes><Route path="/places/:slug" element={<PlaceDetailPage />} /></Routes>
          </MemoryRouter>
        </LanguageProvider>
      </QueryClientProvider>,
    );

    const recommendations = (await screen.findByRole("heading", { name: "İlginizi çekebilecek diğer mekânlar" })).closest("section")!;
    const carousel = recommendations.querySelector(".recommendation-carousel")!;
    expect(carousel).toHaveClass("event-grid", "place-grid", "recommendation-carousel");
    expect(carousel.children).toHaveLength(8);
    expect(within(carousel as HTMLElement).getByRole("link", { name: "Önerilen Mekân 8" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Önerilen Mekân 9" })).not.toBeInTheDocument();
  });
});
