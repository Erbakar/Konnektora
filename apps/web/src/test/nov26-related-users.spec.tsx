import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LanguageProvider } from "../lib/i18n";
import { RelatedUsersPage } from "../pages/RelatedUsersPage";
import { EventInviteManagementPage, PlaceInviteManagementPage } from "../pages/InviteManagementPage";

const apiMocks = vi.hoisted(() => ({
  getEvent: vi.fn(),
  getMembership: vi.fn(),
  getPlace: vi.fn(),
  getUserSession: vi.fn(),
  getInviteAssessment: vi.fn(async () => []),
  listEventRelatedUsers: vi.fn(),
  listPlaceRelatedUsers: vi.fn(),
  listFollowing: vi.fn(),
  listGuestLists: vi.fn(),
  listMyEvents: vi.fn(),
  listMyPlaces: vi.fn(),
  listEventParticipants: vi.fn(),
  listPlaceMembers: vi.fn(),
  listSentEventInvitations: vi.fn(),
  listSentPlaceInvitations: vi.fn(),
  listEventInviteRecommendations: vi.fn(),
  updatePlaceMember: vi.fn(),
  updateEventParticipant: vi.fn(),
  pardonPlaceMember: vi.fn(),
  pardonEventParticipant: vi.fn(),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, ...apiMocks };
});

vi.mock("../lib/useGuestListEntitlement", () => ({
  useGuestListEntitlement: () => ({ canUseGuestLists: false }),
}));

function providers(children: ReactNode, initialEntry: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <LanguageProvider>
        <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

const session = { id: "viewer-1", name: "Kadir", username: "kadir", role: "user", accountType: "individual" };
const person = (id: string, status: string, relation = "member") => ({
  id, name: id, username: id, city: null, country: null, birthDate: null, commonTagCount: 0, relation, status, checkedIn: false,
});
const place = { id: "place-1", name: "Studio", slug: "studio", createdById: session.id, viewerMembership: null };
const event = { id: "event-1", title: "Gece", slug: "gece", createdById: session.id, viewerParticipation: null, startsAt: "2026-12-10T18:00:00.000Z", endsAt: "2026-12-10T22:00:00.000Z" };

function renderPlace(filter: string) {
  return render(providers(
    <Routes><Route path="/places/:slug/people" element={<RelatedUsersPage kind="place" />} /></Routes>,
    `/places/${place.slug}/people?filter=${filter}`,
  ));
}
function renderEvent(filter: string) {
  return render(providers(
    <Routes><Route path="/events/:slug/people" element={<RelatedUsersPage kind="event" />} /></Routes>,
    `/events/${event.slug}/people?filter=${filter}`,
  ));
}

beforeEach(() => {
  apiMocks.getUserSession.mockReturnValue(session);
  apiMocks.getMembership.mockResolvedValue({ capabilities: { advanced: false } });
  apiMocks.getPlace.mockResolvedValue(place);
  apiMocks.getEvent.mockResolvedValue(event);
  apiMocks.listFollowing.mockResolvedValue([]);
  apiMocks.listGuestLists.mockResolvedValue([]);
  apiMocks.listMyEvents.mockResolvedValue([]);
  apiMocks.listMyPlaces.mockResolvedValue([]);
  apiMocks.listEventParticipants.mockResolvedValue([]);
  apiMocks.listPlaceMembers.mockResolvedValue([]);
  apiMocks.listSentEventInvitations.mockResolvedValue([]);
  apiMocks.listSentPlaceInvitations.mockResolvedValue([]);
  apiMocks.listEventInviteRecommendations.mockResolvedValue([]);
  apiMocks.updatePlaceMember.mockResolvedValue({});
  apiMocks.updateEventParticipant.mockResolvedValue({});
  apiMocks.pardonPlaceMember.mockResolvedValue({ pardoned: true });
  apiMocks.pardonEventParticipant.mockResolvedValue({ pardoned: true });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("26/11 ilgili kullanıcılar", () => {
  it("#86 bekleyen mekân başvurusunu kart üzerinden kabul eder veya reddeder; #89 kartta 'Üye' yazmaz", async () => {
    apiMocks.listPlaceRelatedUsers.mockResolvedValue([person("ada", "pending"), person("can", "pending")]);
    renderPlace("pending");
    const cards = await screen.findAllByRole("article");
    expect(within(cards[0]!).getByText("Onay bekliyor")).toBeVisible();
    expect(within(cards[0]!).queryByText("Üye")).toBeNull();
    fireEvent.click(within(cards[0]!).getByRole("button", { name: "Kabul et" }));
    await waitFor(() => expect(apiMocks.updatePlaceMember).toHaveBeenCalledWith("place-1", "ada", { status: "accepted" }));
    fireEvent.click(within(cards[1]!).getByRole("button", { name: "Reddet" }));
    await waitFor(() => expect(apiMocks.updatePlaceMember).toHaveBeenCalledWith("place-1", "can", { status: "declined" }));
  });

  it("#95 bekleyen etkinlik başvurusunu kabul eder; #94 kartta 'Katılımcı' yazmaz", async () => {
    apiMocks.listEventRelatedUsers.mockResolvedValue([person("ada", "requested", "attendee")]);
    renderEvent("pending");
    const card = await screen.findByRole("article");
    expect(within(card).queryByText("Katılımcı")).toBeNull();
    fireEvent.click(within(card).getByRole("button", { name: "Kabul et" }));
    await waitFor(() => expect(apiMocks.updateEventParticipant).toHaveBeenCalledWith("event-1", "ada", { status: "accepted" }, "user"));
  });

  it("#87 Mekâna affet kaydı siler (üye yapmaz)", async () => {
    apiMocks.listPlaceRelatedUsers.mockResolvedValue([person("ada", "banned")]);
    renderPlace("banned");
    const card = await screen.findByRole("article");
    expect(within(card).getByText("Yasaklı")).toBeVisible();
    fireEvent.click(within(card).getByRole("button", { name: /Mekâna affet/ }));
    await waitFor(() => expect(apiMocks.pardonPlaceMember).toHaveBeenCalledWith("place-1", "ada"));
    expect(apiMocks.updatePlaceMember).not.toHaveBeenCalled();
  });

  it("#93 Etkinliğe affet kaydı siler (katılımcı yapmaz)", async () => {
    apiMocks.listEventRelatedUsers.mockResolvedValue([person("ada", "banned", "attendee")]);
    renderEvent("banned");
    const card = await screen.findByRole("article");
    fireEvent.click(within(card).getByRole("button", { name: /Etkinliğe affet/ }));
    await waitFor(() => expect(apiMocks.pardonEventParticipant).toHaveBeenCalledWith("event-1", "ada"));
    expect(apiMocks.updateEventParticipant).not.toHaveBeenCalled();
  });

  it("#88, #92 Takip ettiklerim yalnız üye/katılımcı olan takip edilenleri gösterir", async () => {
    apiMocks.listFollowing.mockResolvedValue([{ id: "ada" }, { id: "can" }]);
    apiMocks.listPlaceRelatedUsers.mockResolvedValue([person("ada", "accepted"), person("can", "invited")]);
    renderPlace("following");
    expect(await screen.findByRole("button", { name: /Takip ettiklerim \(1\)/ })).toBeVisible();
    expect(screen.getByRole("link", { name: "@ada" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "@can" })).toBeNull();
    cleanup();
    apiMocks.listEventRelatedUsers.mockResolvedValue([person("ada", "attended", "attendee"), person("can", "banned", "attendee")]);
    renderEvent("following");
    expect(await screen.findByRole("button", { name: /Takip ettiklerim \(1\)/ })).toBeVisible();
    expect(screen.queryByRole("link", { name: "@can" })).toBeNull();
  });

  it("#90, #91 Davetliler boşken yalnız kısa metin gösterilir", async () => {
    apiMocks.listPlaceRelatedUsers.mockResolvedValue([]);
    renderPlace("invited");
    expect(await screen.findByRole("heading", { name: "Henüz gösterilecek kullanıcı yok" })).toBeVisible();
    expect(screen.queryByText(/Onaylanan katılımcılar/)).toBeNull();
    cleanup();
    apiMocks.listEventRelatedUsers.mockResolvedValue([]);
    renderEvent("invited");
    expect(await screen.findByRole("heading", { name: "Henüz gösterilecek kullanıcı yok" })).toBeVisible();
    expect(screen.queryByText(/Onaylanan katılımcılar/)).toBeNull();
  });
});

describe("26/11 #116, #117 davet rol seçeneği", () => {
  async function openUsernameForm() {
    fireEvent.click(await screen.findByRole("button", { name: "Kullanıcı adı" }));
  }
  const roleOptions = () => {
    const select = document.querySelector<HTMLSelectElement>('select[name="role"]');
    return select ? [...select.options].map((option) => option.textContent) : null;
  };

  it("mekân ekibinde olmayan admin rol seçeneği görmez; yönetici Kurucu'yu görmez; kurucu hepsini görür", async () => {
    apiMocks.getUserSession.mockReturnValue({ ...session, role: "admin" });
    apiMocks.getPlace.mockResolvedValue({ ...place, createdById: "owner-1", viewerMembership: null });
    render(providers(<Routes><Route path="/places/:slug/invites" element={<PlaceInviteManagementPage />} /></Routes>, "/places/studio/invites"));
    await openUsernameForm();
    expect(roleOptions()).toBeNull();
    cleanup();

    apiMocks.getUserSession.mockReturnValue(session);
    apiMocks.getPlace.mockResolvedValue({ ...place, createdById: "owner-1", viewerMembership: { status: "accepted", role: "organizer" } });
    render(providers(<Routes><Route path="/places/:slug/invites" element={<PlaceInviteManagementPage />} /></Routes>, "/places/studio/invites"));
    await openUsernameForm();
    await waitFor(() => expect(roleOptions()).toEqual(["Üye", "Yönetici"]));
    cleanup();

    apiMocks.getPlace.mockResolvedValue(place);
    render(providers(<Routes><Route path="/places/:slug/invites" element={<PlaceInviteManagementPage />} /></Routes>, "/places/studio/invites"));
    await openUsernameForm();
    await waitFor(() => expect(roleOptions()).toEqual(["Üye", "Kurucu", "Yönetici"]));
  });

  it("etkinlikte yetkisiz katılımcı rol seçeneği görmez; yönetici Kurucu'yu görmez", async () => {
    apiMocks.getEvent.mockResolvedValue({ ...event, createdById: "owner-1", viewerParticipation: { status: "accepted", role: "attendee" } });
    render(providers(<Routes><Route path="/events/:slug/invites" element={<EventInviteManagementPage />} /></Routes>, "/events/gece/invites"));
    await openUsernameForm();
    expect(roleOptions()).toBeNull();
    cleanup();

    apiMocks.getEvent.mockResolvedValue({ ...event, createdById: "owner-1", viewerParticipation: { status: "accepted", role: "organizer" } });
    render(providers(<Routes><Route path="/events/:slug/invites" element={<EventInviteManagementPage />} /></Routes>, "/events/gece/invites"));
    await openUsernameForm();
    await waitFor(() => expect(roleOptions()).toEqual(["Katılımcı", "Yönetici"]));
  });
});
