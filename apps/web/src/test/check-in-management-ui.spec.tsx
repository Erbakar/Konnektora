import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CheckInDecisionDialog } from "../components/CheckInDecisionDialog";
import { QrCheckInScanner } from "../components/QrCheckInScanner";
import { LanguageProvider } from "../lib/i18n";
import {
  EventInviteManagementPage,
  PlaceInviteManagementPage,
} from "../pages/InviteManagementPage";

const apiMocks = vi.hoisted(() => ({
  addGuestListMember: vi.fn(),
  decideEventCheckInPassport: vi.fn(),
  decidePlaceCheckInPassport: vi.fn(),
  getEvent: vi.fn(),
  getEventCheckInPassport: vi.fn(),
  getPlace: vi.fn(),
  getPlaceCheckInPassport: vi.fn(),
  getUserSession: vi.fn(),
  inviteEventParticipant: vi.fn(),
  invitePlaceMember: vi.fn(),
  listEventInviteRecommendations: vi.fn(),
  listEventParticipants: vi.fn(),
  listFollowing: vi.fn(),
  listGuestLists: vi.fn(),
  listMyEvents: vi.fn(),
  listPlaceMembers: vi.fn(),
  listSentEventInvitations: vi.fn(),
  listSentPlaceInvitations: vi.fn(),
  previewEventCheckIn: vi.fn(),
  previewPlaceCheckIn: vi.fn(),
  updateEventParticipantStatus: vi.fn(),
  updatePlaceMember: vi.fn(),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, ...apiMocks };
});

vi.mock("../lib/useGuestListEntitlement", () => ({
  useGuestListEntitlement: () => ({ canUseGuestLists: true }),
}));

const session = {
  id: "viewer-1",
  name: "Kadir Erbakar",
  username: "kadir",
  role: "admin",
  accountType: "individual",
};

const event = {
  id: "event-1",
  title: "Konnektora Check-in Night",
  slug: "konnektora-check-in-night-420099",
  createdById: session.id,
  startsAt: "2026-09-10T18:00:00.000Z",
  endsAt: "2026-09-10T22:00:00.000Z",
};

const place = {
  id: "place-1",
  name: "Konnektora Studio",
  slug: "konnektora-studio-310099",
  createdById: session.id,
  viewerMembership: null,
};

const guestLists = [
  {
    id: "guest-list-1",
    name: "VIP Topluluğu",
    members: [{ userId: "person-1" }],
  },
];

function participant(index: number) {
  const day = String(index + 1).padStart(2, "0");
  return {
    id: `participant-${index}`,
    eventId: event.id,
    userId: `person-${index}`,
    status: index === 0 ? "attended" : "accepted",
    role: "attendee",
    checkedInAt: `2026-08-${day}T20:00:00.000Z`,
    checkInDecisionAt: `2026-08-${day}T20:00:00.000Z`,
    checkInMethod: index % 2 ? "nfc" : "qr",
    checkInOrder: index + 1,
    joinOrder: index + 1,
    createdAt: `2026-08-${day}T18:00:00.000Z`,
    user: {
      id: `person-${index}`,
      name: `Katılımcı ${index}`,
      username: `katilimci${index}`,
      avatarUrl: null,
      followerCount: 100 + index,
      relatedFollowerCount: 10 + index,
    },
    tickets: index === 11
      ? [{
          id: "ticket-11",
          name: "VIP Bilet",
          description: "Sahne arkası erişimi",
          quantity: 2,
          unitPrice: 750,
          currency: "TRY",
          gateOpensAt: "2026-09-10T17:30:00.000Z",
          gateClosesAt: "2026-09-10T19:00:00.000Z",
        }]
      : [],
  };
}

function member(index: number) {
  const day = String(index + 1).padStart(2, "0");
  return {
    placeId: place.id,
    userId: `member-${index}`,
    status: "accepted",
    role: "member",
    checkedInAt: `2026-08-${day}T19:00:00.000Z`,
    checkInDecisionAt: `2026-08-${day}T19:00:00.000Z`,
    checkInMethod: index % 2 ? "nfc" : "qr",
    checkInOrder: index + 1,
    joinOrder: index + 1,
    createdAt: `2026-08-${day}T17:00:00.000Z`,
    updatedAt: `2026-08-${day}T19:00:00.000Z`,
    user: {
      id: `member-${index}`,
      name: `Mekân Üyesi ${index}`,
      username: `mekanuye${index}`,
      avatarUrl: null,
      followerCount: 50 + index,
      relatedFollowerCount: 5 + index,
    },
  };
}

function passport(targetType: "event" | "place") {
  return {
    targetType,
    targetId: targetType === "event" ? event.id : place.id,
    targetName: targetType === "event" ? event.title : place.name,
    user: {
      id: targetType === "event" ? "person-11" : "member-11",
      name: "Ada Yılmaz",
      username: "ada",
      email: "ada@example.com",
      role: "user",
      status: "active",
      accountType: "individual",
      avatarUrl: null,
      followerCount: 248,
      plan: "Standart",
      profileVerifiedAt: "2026-08-20T12:00:00.000Z",
      media: [
        { id: "media-1", url: "/uploads/ada-1.jpg", type: "image/jpeg" },
        { id: "media-2", url: "/uploads/ada-2.jpg", type: "image/jpeg" },
      ],
    },
    status: "accepted",
    role: targetType === "event" ? "attendee" : "member",
    alreadyInside: false,
    checkedInAt: null,
    checkInOrder: null,
    checkInMethod: "manual",
    invitedBy: ["@kadir", "@deniz"],
    relatedFollowerCount: 34,
    guestLists: [
      { id: "guest-list-z", name: "Zirve" },
      { id: "guest-list-a", name: "Alfa" },
    ],
    relatedPlace: targetType === "event"
      ? {
          id: place.id,
          name: place.name,
          status: "accepted",
          role: "member",
          checkedInAt: "2026-08-20T18:00:00.000Z",
          order: 7,
          invitedBy: ["@kadir"],
        }
      : null,
    tickets: targetType === "event"
      ? [{
          id: "passport-ticket",
          name: "VIP Bilet",
          description: "Sahne arkası erişimi",
          quantity: 2,
          unitPrice: 750,
          currency: "TRY",
          gateOpensAt: "2026-09-10T17:30:00.000Z",
          gateClosesAt: "2026-09-10T19:00:00.000Z",
        }]
      : [],
  };
}

function providers(children: ReactNode, initialEntry = "/") {
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

function renderEventManagement(hash = "#check-in") {
  return render(providers(
    <Routes>
      <Route path="/events/:slug/invites" element={<EventInviteManagementPage />} />
    </Routes>,
    `/events/${event.slug}/invites${hash}`,
  ));
}

function renderPlaceManagement(hash = "#check-in") {
  return render(providers(
    <Routes>
      <Route path="/places/:slug/invites" element={<PlaceInviteManagementPage />} />
    </Routes>,
    `/places/${place.slug}/invites${hash}`,
  ));
}

beforeEach(() => {
  window.localStorage.clear();
  Object.defineProperty(navigator, "vibrate", { configurable: true, value: vi.fn() });
  apiMocks.getUserSession.mockReturnValue(session);
  apiMocks.getEvent.mockResolvedValue(event);
  apiMocks.getPlace.mockResolvedValue(place);
  apiMocks.listEventParticipants.mockResolvedValue(Array.from({ length: 12 }, (_, index) => participant(index)));
  apiMocks.listEventInviteRecommendations.mockResolvedValue([
    {
      id: "recommended-1",
      name: "Ada Öneri",
      username: "ada-oneri",
      avatarUrl: null,
      score: 43,
      sharedInterestCount: 2,
      reasons: ["shared_interests", "same_city", "following", "verified"],
    },
    {
      id: "recommended-2",
      name: "Deniz Öneri",
      username: "deniz-oneri",
      avatarUrl: null,
      score: 21,
      sharedInterestCount: 1,
      reasons: ["shared_interests", "past_attendee"],
    },
  ]);
  apiMocks.listPlaceMembers.mockResolvedValue(Array.from({ length: 12 }, (_, index) => member(index)));
  apiMocks.listSentEventInvitations.mockResolvedValue([]);
  apiMocks.listSentPlaceInvitations.mockResolvedValue([]);
  apiMocks.listFollowing.mockResolvedValue([]);
  apiMocks.listMyEvents.mockResolvedValue([]);
  apiMocks.listGuestLists.mockResolvedValue(guestLists);
  apiMocks.getEventCheckInPassport.mockResolvedValue(passport("event"));
  apiMocks.getPlaceCheckInPassport.mockResolvedValue(passport("place"));
  apiMocks.decideEventCheckInPassport.mockResolvedValue(participant(11));
  apiMocks.decidePlaceCheckInPassport.mockResolvedValue(member(11));
  apiMocks.addGuestListMember.mockResolvedValue({});
  apiMocks.inviteEventParticipant.mockResolvedValue({});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("check-in yönetimi gereksinimleri", () => {
  it("etkinlik yöneticisine şeffaf sinyalli AI Top 25 önerilerini ve toplu daveti sunar", async () => {
    renderEventManagement("");

    await userEvent.click(await screen.findByRole("button", { name: "AI ile önerilen Top 25" }));
    expect(apiMocks.listEventInviteRecommendations).toHaveBeenCalledWith(event.id);
    expect(await screen.findByRole("link", { name: "@ada-oneri" })).toHaveAttribute("href", "/users/id/recommended-1");
    expect(screen.getByText(/Eşleşme puanı 43 · 2 ortak ilgi alanı · aynı şehir · takip ediyorsunuz · doğrulanmış profil/)).toBeVisible();
    expect(screen.getByText(/Eşleşme puanı 21 · 1 ortak ilgi alanı · eski etkinlik katılımcısı/)).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Tümünü davet et" }));
    await waitFor(() => expect(apiMocks.inviteEventParticipant).toHaveBeenCalledTimes(2));
    expect(apiMocks.inviteEventParticipant).toHaveBeenCalledWith(event.id, { userId: "recommended-1", role: "attendee" }, "user");
  });

  it("QR/NFC tarayıcıyı manuel içerik alanı olmadan sunar", async () => {
    render(providers(<QrCheckInScanner pending={false} onScan={vi.fn()} />));

    expect(screen.getByRole("button", { name: "Kamerayı aç" })).toBeVisible();
    expect(screen.getByRole("button", { name: "NFC tara" })).toBeVisible();
    expect(screen.queryByText(/QR içeriğini manuel gir/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "NFC tara" }));
    expect(screen.getByText("Bu cihaz veya tarayıcı NFC okumayı desteklemiyor.")).toBeVisible();
  });

  it("etkinlik check-in ekranında 10'ar kayıt, arama, bilet/gate, geçmiş ve pasaport kararını çalıştırır", async () => {
    renderEventManagement();

    expect(await screen.findByRole("heading", { name: "Etkinlik QR check-in" })).toBeVisible();
    expect(screen.queryByText(/QR içeriğini manuel gir/i)).not.toBeInTheDocument();

    const guestHeading = await screen.findByRole("heading", { name: /Misafir listesi/ });
    const guestPanel = guestHeading.closest("section")!;
    expect(guestPanel.querySelectorAll(".management-list > article")).toHaveLength(10);
    await userEvent.click(within(guestPanel).getByRole("button", { name: "Daha fazla" }));
    expect(guestPanel.querySelectorAll(".management-list > article")).toHaveLength(12);

    fireEvent.change(within(guestPanel).getByRole("textbox", { name: "Misafirlerde ara" }), {
      target: { value: "katilimci11" },
    });
    expect(within(guestPanel).getByRole("link", { name: "@katilimci11" })).toHaveAttribute("href", "/users/id/person-11");
    expect(within(guestPanel).getByText("VIP Bilet")).toBeVisible();
    expect(within(guestPanel).getByText(/2 adet · 750 TRY · Gate:/)).toBeVisible();
    expect(within(guestPanel).getByRole("combobox", { name: "Guest liste ekle" })).toBeVisible();

    await userEvent.click(within(guestPanel).getByRole("button", { name: "Pasaport kontrol" }));
    expect(apiMocks.getEventCheckInPassport).toHaveBeenCalledWith(event.id, "person-11");
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Pasaport Kontrol" })).toBeVisible();
    expect(within(dialog).getByText("@ada")).toBeVisible();
    expect(within(dialog).getByLabelText("Doğrulanmış profil")).toBeVisible();
    expect(within(dialog).getByText("@kadir, @deniz")).toBeVisible();
    expect(within(dialog).getByText("Alfa, Zirve")).toBeVisible();
    expect(within(dialog).getByText("Sahne arkası erişimi")).toBeVisible();
    expect(within(dialog).getByText("Konnektora Studio")).toBeVisible();
    await userEvent.click(within(dialog).getByRole("button", { name: "İçeri al" }));
    expect(apiMocks.decideEventCheckInPassport).toHaveBeenCalledWith(event.id, "person-11", "admit", "manual");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const historyPanel = screen.getByRole("heading", { name: /Check-in geçmişi/ }).closest("section")!;
    expect(historyPanel.querySelectorAll(".management-list > article")).toHaveLength(10);
    expect(within(historyPanel).getAllByText(/QR|NFC/).length).toBeGreaterThan(0);
    expect(within(historyPanel).getAllByText("Giriş yaptı").length).toBeGreaterThan(0);
    await userEvent.click(within(historyPanel).getByRole("button", { name: "Daha fazla" }));
    expect(historyPanel.querySelectorAll(".management-list > article")).toHaveLength(12);
  });

  it("mekân davet ekranında check-in widgetlarını gizler, check-in rotasında üye listesini ve pasaportu açar", async () => {
    const invitationView = renderPlaceManagement("");
    expect(await screen.findByRole("heading", { name: place.name })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Mekân üye kartı check-in" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Üye listesi/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Check-in geçmişi/ })).not.toBeInTheDocument();
    invitationView.unmount();

    renderPlaceManagement();
    expect(await screen.findByRole("heading", { name: "Mekân üye kartı check-in" })).toBeVisible();
    const memberPanel = (await screen.findByRole("heading", { name: /Üye listesi/ })).closest("section")!;
    await waitFor(() => expect(memberPanel.querySelectorAll(".management-list > article")).toHaveLength(10));
    await userEvent.click(within(memberPanel).getByRole("button", { name: "Daha fazla" }));
    expect(memberPanel.querySelectorAll(".management-list > article")).toHaveLength(12);
    fireEvent.change(within(memberPanel).getByRole("textbox", { name: "Üyelerde ara" }), {
      target: { value: "mekanuye11" },
    });
    expect(within(memberPanel).getByRole("link", { name: "@mekanuye11" })).toHaveAttribute("href", "/users/id/member-11");
    await userEvent.click(within(memberPanel).getByRole("button", { name: "Pasaport kontrol" }));
    expect(apiMocks.getPlaceCheckInPassport).toHaveBeenCalledWith(place.id, "member-11");
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(place.name)).toBeVisible();
    await userEvent.click(within(dialog).getByRole("button", { name: "Girişi reddet" }));
    expect(apiMocks.decidePlaceCheckInPassport).toHaveBeenCalledWith(place.id, "member-11", "decline", "manual");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("zaten içeride olan kullanıcıyı belirgin uyarıyla gösterir ve ikinci kararı engeller", async () => {
    apiMocks.getEventCheckInPassport.mockResolvedValue({
      ...passport("event"),
      alreadyInside: true,
      checkedInAt: "2026-09-10T18:45:00.000Z",
      checkInOrder: 7,
      checkInMethod: "qr",
    });
    renderEventManagement();

    const guestPanel = (await screen.findByRole("heading", { name: /Misafir listesi/ })).closest("section")!;
    const passportButtons = await within(guestPanel).findAllByRole("button", { name: "Pasaport kontrol" });
    await userEvent.click(passportButtons[0]!);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Kullanıcı zaten check-in içeride/)).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "İçeri al" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Girişi reddet" })).toBeDisabled();
  });

  it("taranan kullanıcıya kabul ve ret sonuçlarını, yakın öneri aksiyonunu ve kapatmayı gösterir", async () => {
    const onClose = vi.fn();
    const { rerender } = render(providers(
      <CheckInDecisionDialog
        notification={{
          id: "notification-1",
          userId: "person-11",
          type: "event_checkin_admitted",
          title: "Check-in",
          body: "Hoş geldin, iyi eğlenceler.",
          targetType: "event",
          targetId: event.id,
          readAt: null,
        }}
        onClose={onClose}
      />,
    ));

    expect(screen.getByRole("heading", { name: "Hoş geldin, iyi eğlenceler." })).toBeVisible();
    expect(screen.getByText(/Diğer üyelerin QR kodunu kameranla veya NFC ile okutarak/)).toBeVisible();
    expect(navigator.vibrate).toHaveBeenCalled();
    await userEvent.click(screen.getAllByRole("button", { name: "Kapat" }).at(-1)!);
    expect(onClose).toHaveBeenCalled();

    rerender(providers(
      <CheckInDecisionDialog
        notification={{
          id: "notification-2",
          userId: "person-11",
          type: "event_checkin_declined",
          title: "Check-in",
          body: "Üzgünüz, etkinliğe kabul edilmediniz. 750 TRY bilet ücretiniz iade edildi.",
          targetType: "event",
          targetId: event.id,
          readAt: null,
        }}
        onClose={onClose}
      />,
    ));
    expect(screen.getByRole("heading", { name: "Üzgünüz, etkinliğe kabul edilmediniz." })).toBeVisible();
    expect(screen.getByText(/750 TRY bilet ücretiniz iade edildi/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Yakındaki benzer etkinlikleri göster" })).toBeVisible();

    rerender(providers(
      <CheckInDecisionDialog
        notification={{
          id: "notification-3",
          userId: "member-11",
          type: "place_checkin_declined",
          title: "Check-in",
          body: "Üzgünüz, mekâna kabul edilmediniz.",
          targetType: "place",
          targetId: place.id,
          readAt: null,
        }}
        onClose={onClose}
      />,
    ));
    expect(screen.getByRole("heading", { name: "Üzgünüz, mekâna kabul edilmediniz." })).toBeVisible();
    expect(screen.getByRole("button", { name: "Yakındaki benzer mekânları göster" })).toBeVisible();
  });
});
