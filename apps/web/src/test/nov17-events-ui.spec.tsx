import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { EventCard } from "../components/EventCard";
import { eventCopyPrefill } from "../lib/eventCopy";
import { LanguageProvider } from "../lib/i18n";
import { mockEvents } from "../lib/mockData";
import { AccountPage } from "../pages/AccountPage";
import { EventDetailPage } from "../pages/EventDetailPage";

const apiMocks = vi.hoisted(() => ({
  claimPendingEventMedia: vi.fn(),
  copyMyEvent: vi.fn(),
  createUserEvent: vi.fn(),
  getContentNotification: vi.fn(),
  getEvent: vi.fn(),
  getMyProfile: vi.fn(),
  getProfileAffinities: vi.fn(),
  getTicketSalesEligibility: vi.fn(),
  getUserSession: vi.fn(),
  inviteEventParticipant: vi.fn(),
  listContentMedia: vi.fn(),
  listEventParticipants: vi.fn(),
  listEventRelatedUsers: vi.fn(),
  listEventTicketTypes: vi.fn(),
  listEvents: vi.fn(),
  listFollowing: vi.fn(),
  listMyEvents: vi.fn(),
  listMyPlaces: vi.fn(),
  listTags: vi.fn(),
  recordContentImpression: vi.fn(),
  recordContentView: vi.fn(),
  updateMyEvent: vi.fn(),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, ...apiMocks };
});
vi.mock("../components/ContentComments", () => ({ ContentComments: () => <section aria-label="İlgili postlar" /> }));
vi.mock("../components/ContentMediaGallery", () => ({ ContentMediaGallery: () => <section aria-label="Medya galerisi" /> }));
vi.mock("../components/ContentRating", () => ({ ContentRating: () => <section aria-label="Değerlendirme" /> }));
vi.mock("../components/LocationMap", () => ({ LocationMap: () => <section aria-label="Etkinlik haritası" /> }));
vi.mock("../components/LocationPicker", () => ({ LocationPicker: () => <input name="locationAddress" defaultValue="Beyoğlu" aria-label="Adres" /> }));

function providers(children: ReactNode, initialEntry: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}><LanguageProvider><MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter></LanguageProvider></QueryClientProvider>;
}

const sourceEvent = {
  id: "11111111-1111-4111-8111-111111111111",
  createdById: "owner-1",
  title: "Haftalık Caz Gecesi",
  slug: "haftalik-caz-gecesi-310001",
  summary: "Caz",
  description: "Her hafta tekrarlanan caz gecesi açıklaması",
  status: "published",
  startsAt: "2026-09-15T18:00:00.000Z",
  endsAt: "2026-09-15T21:00:00.000Z",
  format: "offline",
  timezone: "Europe/Istanbul",
  visibility: "approval_required",
  city: "Beyoğlu",
  region: "İstanbul",
  country: "Türkiye",
  locationName: "Konnektora Studio",
  locationAddress: "Beyoğlu",
  latitude: 41.03,
  longitude: 28.98,
  language: "tr",
  organizerName: "Etkinlik Sahibi",
  externalRegistrationUrl: null,
  coverImageUrl: "/uploads/cover.webp",
  capacity: 50,
  price: 100,
  currency: "TRY",
  tags: [],
  lineup: [
    { type: "session", title: "Ada Quartet", startsAt: "2026-09-15T18:30:00.000Z" },
    { type: "session", title: "Bora Trio", startsAt: "2026-09-15T20:00:00.000Z" },
  ],
  ticketTypes: [{ name: "Genel", price: 100, currency: "TRY", salesPlatform: "konnektora", capacity: 50, saleStartsAt: "2026-09-01T09:00:00.000Z", saleEndsAt: "2026-09-15T17:00:00.000Z", gateOpensAt: "2026-09-15T17:30:00.000Z", gateClosesAt: "2026-09-15T22:00:00.000Z", status: "inactive" }],
};

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  apiMocks.getUserSession.mockReturnValue({ id: "owner-1", name: "Etkinlik Sahibi", username: "owner", role: "user", accountType: "individual", status: "active" });
  apiMocks.getContentNotification.mockResolvedValue({ enabled: false });
  apiMocks.getMyProfile.mockResolvedValue({ city: "İstanbul", country: "Türkiye", accountType: "individual" });
  apiMocks.getProfileAffinities.mockResolvedValue([]);
  apiMocks.getTicketSalesEligibility.mockResolvedValue({ eligible: true });
  apiMocks.listContentMedia.mockResolvedValue([{ id: "m1", url: "/uploads/cover.webp", type: "image" }]);
  apiMocks.listEventParticipants.mockResolvedValue([]);
  apiMocks.listEventRelatedUsers.mockResolvedValue([]);
  apiMocks.listEventTicketTypes.mockResolvedValue([]);
  apiMocks.listEvents.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 24, hasNextPage: false });
  apiMocks.listFollowing.mockResolvedValue([]);
  apiMocks.listMyEvents.mockResolvedValue([sourceEvent]);
  apiMocks.listMyPlaces.mockResolvedValue([]);
  apiMocks.listTags.mockResolvedValue([]);
  apiMocks.recordContentImpression.mockResolvedValue(undefined);
  apiMocks.recordContentView.mockResolvedValue(undefined);
  apiMocks.copyMyEvent.mockResolvedValue({ id: "copy-1", slug: "haftalik-caz-gecesi-310002" });
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => [] })));
});

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

describe("17/10 #29 Etkinliği kopyala", () => {
  it("prefill keeps the content but empties every date and never mutates the source", () => {
    const snapshot = JSON.stringify(sourceEvent);
    const prefill = eventCopyPrefill(sourceEvent as never) as typeof sourceEvent;
    expect(prefill.title).toBe(sourceEvent.title);
    expect(prefill.startsAt).toBe("");
    expect(prefill.endsAt).toBeNull();
    expect(prefill.lineup).toEqual([{ type: "session", title: "Ada Quartet" }, { type: "session", title: "Bora Trio" }]);
    expect(prefill.ticketTypes).toEqual([{ name: "Genel", price: 100, currency: "TRY", salesPlatform: "konnektora", capacity: 50, status: "active" }]);
    expect(JSON.stringify(sourceEvent)).toBe(snapshot);
  });

  it("shows 'Etkinliği kopyala' above 'Etkinliği düzenle' only to people who manage the event", async () => {
    const event = { ...mockEvents[0]!, createdById: "owner-1" };
    apiMocks.getEvent.mockResolvedValue(event);
    const view = render(providers(<Routes><Route path="/events/:slug" element={<EventDetailPage />} /></Routes>, `/events/${event.slug}`));
    const copy = await screen.findByRole("link", { name: "Etkinliği kopyala" });
    const edit = screen.getByRole("link", { name: "Etkinliği düzenle" });
    expect(copy).toHaveAttribute("href", `/events/create?copy=${event.id}`);
    expect(copy.compareDocumentPosition(edit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    view.unmount();

    for (const role of ["admin", "curator"]) {
      apiMocks.getUserSession.mockReturnValue({ id: `${role}-1`, username: role, role, status: "active" });
      const staff = render(providers(<Routes><Route path="/events/:slug" element={<EventDetailPage />} /></Routes>, `/events/${event.slug}`));
      expect(await screen.findByRole("link", { name: "Etkinliği kopyala" })).toBeInTheDocument();
      staff.unmount();
    }

    apiMocks.getUserSession.mockReturnValue({ id: "someone-else", username: "guest", role: "user", status: "active" });
    render(providers(<Routes><Route path="/events/:slug" element={<EventDetailPage />} /></Routes>, `/events/${event.slug}`));
    expect(await screen.findByRole("heading", { name: event.title })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Etkinliği kopyala" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Etkinliği düzenle" })).toBeNull();
  });

  it("opens a prefilled copy screen with empty dates and creates a NEW event on submit", async () => {
    render(providers(<Routes><Route path="/events/create" element={<AccountPage eventCreator />} /><Route path="/events/:slug" element={<p>Yeni etkinlik sayfası</p>} /></Routes>, `/events/create?copy=${sourceEvent.id}`));

    expect(await screen.findByRole("heading", { name: "Etkinliği kopyala" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Başlık" })).toHaveValue(sourceEvent.title);
    expect(screen.getByRole("textbox", { name: "Açıklama" })).toHaveValue(sourceEvent.description);
    const form = document.querySelector<HTMLFormElement>("form.event-create-form")!;
    const field = (name: string) => form.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
    expect(field("startsAt")).toHaveValue("");
    expect(field("endsAt")).toHaveValue("");
    expect(field("visibility")).toHaveValue("approval_required");
    expect(Array.from(form.querySelectorAll<HTMLInputElement>('[name="lineupTitle"]')).map((input) => input.value)).toEqual(["Ada Quartet", "Bora Trio"]);
    for (const input of form.querySelectorAll<HTMLInputElement>('[name="lineupStartsAt"]')) expect(input).toHaveValue("");
    expect(field("ticketName")).toHaveValue("Genel");
    for (const name of ["ticketGateOpensAt", "ticketGateClosesAt", "ticketSaleStartsAt", "ticketSaleEndsAt"]) expect(field(name)).toHaveValue("");
    expect(screen.getByText(/Kaynak etkinliğin görselleri yeni etkinliğe kopyalanır/)).toBeInTheDocument();
    const submit = within(form).getByRole("button", { name: "Etkinliği kopyala", hidden: true });
    expect(submit).toHaveAttribute("type", "submit");
    expect(within(form).queryByRole("button", { name: "Etkinliği güncelle", hidden: true })).toBeNull();

    fireEvent.change(field("startsAt"), { target: { value: "2030-05-01T20:00" } });
    fireEvent.submit(form);

    await waitFor(() => expect(apiMocks.copyMyEvent).toHaveBeenCalledTimes(1));
    const [sourceId, input] = apiMocks.copyMyEvent.mock.calls[0]!;
    expect(sourceId).toBe(sourceEvent.id);
    expect(input).toMatchObject({ title: sourceEvent.title, startsAt: new Date("2030-05-01T20:00").toISOString(), visibility: "approval_required", locationName: "Konnektora Studio" });
    expect(input.endsAt).toBeUndefined();
    expect(input.lineup).toEqual([{ type: "session", title: "Ada Quartet", startsAt: undefined }, { type: "session", title: "Bora Trio", startsAt: undefined }]);
    expect(input.ticketTypes[0]).toMatchObject({ name: "Genel", saleStartsAt: undefined, saleEndsAt: undefined, gateClosesAt: undefined, status: "active" });
    // Kaynak etkinlik güncellenmez, sıradan "oluştur" çağrısı da yapılmaz.
    expect(apiMocks.updateMyEvent).not.toHaveBeenCalled();
    expect(apiMocks.createUserEvent).not.toHaveBeenCalled();
    expect(await screen.findByText("Yeni etkinlik sayfası")).toBeVisible();
  });
});

describe("17/10 #14 Gizli etkinlik katılım tipi", () => {
  it("offers 'Gizli - sadece davetliler görebilir' in Etkinlik Oluştur and Etkinlik Düzenle", async () => {
    apiMocks.listMyEvents.mockResolvedValue([{ ...sourceEvent, visibility: "hidden" }]);
    const create = render(providers(<Routes><Route path="/events/create" element={<AccountPage eventCreator />} /></Routes>, "/events/create"));
    const createSelect = await screen.findByRole("combobox", { name: "Katılım tipi", hidden: true });
    expect(within(createSelect).getAllByRole("option", { hidden: true }).map((option) => option.textContent)).toEqual(["Herkese açık", "Onay gerekli", "Sadece davetli", "Gizli - sadece davetliler görebilir"]);
    expect(within(createSelect).getByRole("option", { name: "Gizli - sadece davetliler görebilir", hidden: true })).toHaveValue("hidden");
    create.unmount();

    render(providers(<Routes><Route path="/events/create" element={<AccountPage eventCreator />} /></Routes>, `/events/create?edit=${sourceEvent.id}`));
    expect(await screen.findByRole("heading", { name: "Etkinliği düzenle" })).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Katılım tipi", hidden: true })).toHaveValue("hidden");
  });

  it("labels hidden events on cards", () => {
    render(providers(<EventCard event={{ ...mockEvents[0]!, visibility: "hidden" }} />, "/"));
    expect(screen.getByText("Gizli")).toBeInTheDocument();
  });
});
