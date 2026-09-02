import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LanguageProvider } from "../lib/i18n";
import { mockEvents } from "../lib/mockData";
import { CommunityPage } from "../pages/CommunityPage";
import { RelatedUsersPage } from "../pages/RelatedUsersPage";

const apiMocks = vi.hoisted(() => ({
  getEvent: vi.fn(),
  getFinanceDashboard: vi.fn(),
  getPlace: vi.fn(),
  getUserSession: vi.fn(),
  listEventRelatedUsers: vi.fn(),
  listFollowing: vi.fn(),
  listGuestLists: vi.fn(),
  listMemberSuggestions: vi.fn(),
  listMyEvents: vi.fn(),
  listMyPlaces: vi.fn(),
  listNewMembers: vi.fn(),
  listPlaceRelatedUsers: vi.fn(),
  listTagRelatedUsers: vi.fn(),
  listTags: vi.fn(),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, ...apiMocks };
});

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

const session = {
  id: "viewer-1",
  name: "Kadir Erbakar",
  username: "kadir",
  role: "admin",
  accountType: "individual",
};

const self = {
  id: session.id,
  name: session.name,
  username: session.username,
  city: "İstanbul",
  country: "Türkiye",
  birthDate: "1985-06-01T00:00:00.000Z",
  followerCount: 12,
  commonTagCount: 5,
  following: false,
  relation: "paylaşım yaptı",
  status: "accepted",
  sentiment: "like",
  checkedIn: false,
};

const ada = {
  id: "person-2",
  name: "Ada Yılmaz",
  username: "ada",
  city: "İstanbul",
  country: "Türkiye",
  birthDate: "1992-03-14T00:00:00.000Z",
  followerCount: 88,
  commonTagCount: 2,
  following: false,
  relation: "paylaşım yaptı",
  status: "accepted",
  sentiment: "like",
  checkedIn: false,
};

beforeEach(() => {
  window.localStorage.clear();
  apiMocks.getUserSession.mockReturnValue(session);
  apiMocks.getFinanceDashboard.mockResolvedValue({ business: { plan: "starter" } });
  apiMocks.listFollowing.mockResolvedValue([]);
  apiMocks.listGuestLists.mockResolvedValue([]);
  apiMocks.listMemberSuggestions.mockResolvedValue([]);
  apiMocks.listMyEvents.mockResolvedValue([]);
  apiMocks.listMyPlaces.mockResolvedValue([]);
  apiMocks.listNewMembers.mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("topluluk ve ilgili kullanıcı gereksinimleri", () => {
  it("Yeni üyeleri Popüler'den önce açar ve kartlarda kullanıcı adı odaklı aksiyonları gösterir", async () => {
    apiMocks.listNewMembers.mockResolvedValue([
      { ...ada, accountType: "individual", createdAt: "2026-08-28T02:00:00.000Z" },
      { ...self, accountType: "individual", createdAt: "2026-08-27T02:00:00.000Z" },
    ]);
    render(providers(<CommunityPage />, "/community"));

    const tabs = await screen.findByRole("tablist");
    const tabLabels = within(tabs).getAllByRole("button").map((button) => button.textContent?.trim());
    expect(tabLabels.slice(0, 2)).toEqual(["Yeni üyeler", "Popüler"]);
    expect(await screen.findByRole("link", { name: "@ada" })).toHaveAttribute("href", "/users/ada");
    expect(screen.queryByText("Profili gör")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Takip et" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Guest List'e ekle" }).length).toBeGreaterThan(0);
  });

  it("etiket kullanıcılarında filtreleri gizler, yönetici/check-in sekmelerini kaldırır ve kişinin kendi ortak sayısını saklar", async () => {
    apiMocks.listTags.mockResolvedValue([{ id: "tag-1", name: "Girişimcilik", slug: "girisimcilik" }]);
    apiMocks.listTagRelatedUsers.mockResolvedValue([self, ada]);
    render(providers(
      <Routes><Route path="/tags/:slug/people" element={<RelatedUsersPage kind="tag" />} /></Routes>,
      "/tags/girisimcilik/people",
    ));

    expect(await screen.findByRole("heading", { name: "#Girişimcilik" })).toBeVisible();
    expect(screen.getByText("Kimlerin bu etiketi profiline yapıştırdığını keşfet.")).toBeVisible();
    expect(screen.getByText("Filtrele").closest("details")).not.toHaveAttribute("open");
    expect(screen.queryByRole("button", { name: /Yöneticiler/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Check-in/ })).not.toBeInTheDocument();
    expect(await screen.findAllByText("Beğeniyorum dedi · paylaşım yaptı")).toHaveLength(2);
    expect(screen.queryByText("5 ortak ilgi alanı")).not.toBeInTheDocument();
    expect(await screen.findByText("2 ortak ilgi alanı")).toBeVisible();
    expect(screen.queryByText("Profili gör")).not.toBeInTheDocument();

    const tagActions = document.querySelector('summary[aria-label="Kullanıcı aksiyonları"]');
    expect(tagActions).toBeInTheDocument();
    fireEvent.click(tagActions!);
    expect(screen.getByRole("link", { name: "Mesaj gönder" })).toHaveAttribute("href", "/messages?peer=person-2");
  });

  it("etkinlik yöneticisine kullanıcı kartında sahiplik, organizatörlük ve yasaklama aksiyonlarını verir", async () => {
    const event = { ...mockEvents[0]!, createdById: session.id };
    apiMocks.getEvent.mockResolvedValue(event);
    apiMocks.listEventRelatedUsers.mockResolvedValue([{ ...ada, relation: "attendee" }]);
    render(providers(
      <Routes><Route path="/events/:slug/people" element={<RelatedUsersPage kind="event" />} /></Routes>,
      `/events/${event.slug}/people`,
    ));

    expect(await screen.findByRole("heading", { name: event.title })).toBeVisible();
    expect(await screen.findByText("2 ortak ilgi alanı")).toBeVisible();
    const eventActions = document.querySelector('summary[aria-label="Kullanıcı aksiyonları"]');
    expect(eventActions).toBeInTheDocument();
    fireEvent.click(eventActions!);
    expect(screen.getByRole("button", { name: "Etkinlik sahibi yap" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Organizatör yap" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Etkinliğe yasakla" })).toBeVisible();
  });

  it("mekân kullanıcılarında filtreleri disclosure altında tutar ve yönetim aksiyonlarını yetkiliye gösterir", async () => {
    const place = {
      id: "place-1",
      name: "Konnektora Studio",
      slug: "konnektora-studio-310001",
      createdById: session.id,
      viewerMembership: null,
    };
    apiMocks.getPlace.mockResolvedValue(place);
    apiMocks.listPlaceRelatedUsers.mockResolvedValue([{ ...ada, relation: "member" }]);
    render(providers(
      <Routes><Route path="/places/:slug/people" element={<RelatedUsersPage kind="place" />} /></Routes>,
      `/places/${place.slug}/people`,
    ));

    expect(await screen.findByRole("heading", { name: place.name })).toBeVisible();
    await screen.findByText("2 ortak ilgi alanı");
    expect(screen.getByText("Filtrele").closest("details")).not.toHaveAttribute("open");
    expect(screen.getByRole("button", { name: /Üyeler/ })).toBeVisible();
    const placeTabs = screen.getByRole("tablist");
    const placeTabLabels = within(placeTabs).getAllByRole("button").map((button) => button.textContent?.replace(/\s+/g, " ").trim());
    expect(placeTabLabels).toEqual([
      "Üyeler (1)", "Bekleyenler (0)", "Davetliler (0)", "Takip ettiklerim (0)",
      "Yöneticiler", "Reddedilenler", "Yasaklananlar",
    ]);
    expect(within(placeTabs).queryByRole("button", { name: /Tümü/ })).not.toBeInTheDocument();
    expect(within(placeTabs).queryByRole("button", { name: /Check-in/ })).not.toBeInTheDocument();
    const placeActions = document.querySelector('summary[aria-label="Kullanıcı aksiyonları"]');
    expect(placeActions).toBeInTheDocument();
    fireEvent.click(placeActions!);
    expect(screen.getByRole("button", { name: "Mekân sahibi yap" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Organizatör yap" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Mekâna yasakla" })).toBeVisible();
  });
});
