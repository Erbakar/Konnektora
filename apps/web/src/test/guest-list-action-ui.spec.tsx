import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { GuestListAction } from "../components/GuestListAction";
import { LanguageProvider } from "../lib/i18n";

const apiMocks = vi.hoisted(() => ({
  addGuestListMember: vi.fn(),
  checkInEventParticipant: vi.fn(),
  checkInPlaceMember: vi.fn(),
  createGuestList: vi.fn(),
  followUser: vi.fn(),
  getPublicProfileById: vi.fn(),
  getUserSession: vi.fn(),
  inviteEventParticipant: vi.fn(),
  invitePlaceMember: vi.fn(),
  listEventParticipants: vi.fn(),
  listFollowing: vi.fn(),
  listGuestLists: vi.fn(),
  listPlaceMembers: vi.fn(),
  removeGuestListMember: vi.fn(),
  unfollowUser: vi.fn(),
  updateEventParticipant: vi.fn(),
  updatePlaceMember: vi.fn(),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, ...apiMocks };
});

function providers(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}><LanguageProvider><MemoryRouter>{children}</MemoryRouter></LanguageProvider></QueryClientProvider>;
}

beforeEach(() => {
  apiMocks.getUserSession.mockReturnValue({ id: "viewer-1", role: "admin" });
  apiMocks.listFollowing.mockResolvedValue([]);
  apiMocks.listGuestLists.mockResolvedValue([]);
  apiMocks.listEventParticipants.mockResolvedValue([]);
  apiMocks.listPlaceMembers.mockResolvedValue([]);
  apiMocks.invitePlaceMember.mockResolvedValue({});
  apiMocks.updatePlaceMember.mockResolvedValue({});
  apiMocks.checkInPlaceMember.mockResolvedValue({});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Guest List ortak aksiyonu", () => {
  it("üyelik sayısını düğmede gösterir ve kullanıcının kendisinde aksiyonu gizler", async () => {
    apiMocks.listGuestLists.mockResolvedValue([{ id: "list-1", name: "VIP", access: "owner", members: [{ id: "member-1", userId: "person-1", user: { id: "person-1", name: "Ada" } }] }]);
    const view = render(providers(<GuestListAction canUse target={{ id: "person-1", name: "Ada" }}/>));
    expect(await screen.findByRole("button", { name: "1 Guest List'te" })).toBeVisible();

    view.unmount();
    render(providers(<GuestListAction canUse target={{ id: "viewer-1", name: "Yönetici" }}/>));
    expect(screen.queryByRole("button", { name: /Guest List/ })).not.toBeInTheDocument();
  });

  it("özel listeleri A-Z sıralar ve paylaşılan listeyi salt okunur tutar", async () => {
    apiMocks.listGuestLists.mockResolvedValue([
      { id: "list-z", name: "Ziyaretçiler", access: "read", members: [] },
      { id: "list-a", name: "Arkadaşlar", access: "owner", members: [] },
    ]);
    render(providers(<GuestListAction canUse target={{ id: "person-1", name: "Ada" }}/>));
    await userEvent.click(await screen.findByRole("button", { name: "Guest List'e ekle" }));
    const dialog = await screen.findByRole("dialog", { name: "Misafir listesine ekle" });
    expect(Array.from(dialog.querySelectorAll(".guest-list-checkboxes strong")).map((item) => item.textContent)).toEqual(["Arkadaşlar", "Ziyaretçiler"]);
    expect(within(dialog).getByRole("checkbox", { name: /Ziyaretçiler/ })).toBeDisabled();
    expect(within(dialog).getByText(/salt okunur/)).toBeVisible();
  });

  it("mekânda Katıldı seçildiğinde üyeyi önce onaylar, sonra check-in yapar", async () => {
    render(providers(<GuestListAction canUse context={{ id: "place-1", name: "Konnektora Studio", type: "place" }} target={{ id: "person-1", name: "Ada" }}/>));
    await userEvent.click(await screen.findByRole("button", { name: "Guest List'e ekle" }));
    const dialog = await screen.findByRole("dialog", { name: "Misafir listesine ekle" });
    await userEvent.selectOptions(within(dialog).getByRole("combobox", { name: "Varsayılan liste" }), "attended");
    await userEvent.click(within(dialog).getByRole("button", { name: "Değişiklikleri kaydet" }));

    await waitFor(() => expect(apiMocks.checkInPlaceMember).toHaveBeenCalledWith("place-1", "person-1"));
    expect(apiMocks.invitePlaceMember).toHaveBeenCalledWith("place-1", { userId: "person-1", role: "member" });
    expect(apiMocks.updatePlaceMember).toHaveBeenCalledWith("place-1", "person-1", { status: "accepted", role: "member" });
    expect(apiMocks.updatePlaceMember.mock.invocationCallOrder[0]!).toBeLessThan(apiMocks.checkInPlaceMember.mock.invocationCallOrder[0]!);
  });
});
