import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CheckInPassport,
  EventParticipant,
  PlaceMember,
} from "@konnektora/shared";
import {
  BadgeCheck,
  CheckCircle2,
  Clipboard,
  LogIn,
  Mail,
  QrCode,
  Search,
  Ticket,
  UserPlus,
  Users,
  XCircle,
  X,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import type { TableCell, TDocumentDefinitions } from "pdfmake/interfaces";
import { QrCheckInScanner } from "../components/QrCheckInScanner";
import { GuestListAction, type GuestListContext, type GuestListTarget } from "../components/GuestListAction";
import {
  addGuestListMember,
  createGuestList,
  decideEventCheckInPassport,
  decidePlaceCheckInPassport,
  deleteGuestList,
  getEvent,
  getEventCheckInPassport,
  getPlace,
  getPlaceCheckInPassport,
  getUserSession,
  inviteEventParticipant,
  invitePlaceMember,
  listGuestLists,
  listEventParticipants,
  listEventInviteRecommendations,
  listSentEventInvitations,
  listFollowing,
  listMyEvents,
  listPlaceMembers,
  listSentPlaceInvitations,
  removeGuestListMember,
  renameGuestList,
  previewEventCheckIn,
  previewPlaceCheckIn,
  updateEventParticipantStatus,
  updatePlaceMember,
  resolveMediaUrl,
} from "../lib/api";
import { getServiceErrorMessage } from "../lib/serviceErrors";
import { useLanguage } from "../lib/i18n";
import { useGuestListEntitlement } from "../lib/useGuestListEntitlement";

type InviteMethod =
  | "recommendations"
  | "following"
  | "guest_lists"
  | "old_attendees"
  | "username"
  | "email"
  | "phone"
  | "phonebook"
  | "gmail";
type GuestLists = Awaited<ReturnType<typeof listGuestLists>>;

export function EventInviteManagementPage() {
  const { language } = useLanguage();
  const tr = language === "tr";
  const { slug = "" } = useParams();
  const checkInMode = useLocation().hash === "#check-in";
  const user = getUserSession();
  const [inviteMethod, setInviteMethod] = useState<InviteMethod>("following");
  const [passport, setPassport] = useState<CheckInPassport | null>(null);
  const [passportMethod, setPassportMethod] = useState<"manual" | "qr" | "nfc">(
    "manual",
  );
  const [oldEventId, setOldEventId] = useState("");
  const client = useQueryClient();
  const event = useQuery({
    queryKey: ["event", slug],
    queryFn: () => getEvent(slug),
    enabled: Boolean(slug && user),
  });
  const canManage = Boolean(
    event.data &&
    user &&
    (event.data.createdById === user.id ||
      (event.data.viewerParticipation?.status === "accepted" &&
        ["organizer", "manager"].includes(
          event.data.viewerParticipation.role,
        )) ||
      ["admin", "super_admin", "curator"].includes(user.role)),
  );
  const participants = useQuery({
    queryKey: ["event-participants", event.data?.id],
    queryFn: () => listEventParticipants(event.data!.id, "user"),
    enabled: canManage,
    retry: false,
  });
  const sentInvitations = useQuery({
    queryKey: ["event-invitations-sent", event.data?.id, user?.id],
    queryFn: () => listSentEventInvitations(event.data!.id),
    enabled: Boolean(event.data?.id && user),
  });
  const following = useQuery({
    queryKey: ["following", user?.id],
    queryFn: listFollowing,
    enabled: Boolean(user),
  });
  const managedEvents = useQuery({
    queryKey: ["my-events", user?.id],
    queryFn: listMyEvents,
    enabled: canManage,
  });
  const { canUseGuestLists } = useGuestListEntitlement(canManage);
  const guestLists = useQuery({
    queryKey: ["guest-lists", user?.id],
    queryFn: listGuestLists,
    enabled: Boolean(user && canUseGuestLists),
  });
  const oldEvents = (managedEvents.data ?? [])
    .filter((item) => item.id !== event.data?.id && new Date(item.endsAt ?? item.startsAt).getTime() < Date.now())
    .sort(
      (a, b) =>
        new Date(b.endsAt ?? b.startsAt).getTime() -
        new Date(a.endsAt ?? a.startsAt).getTime(),
    );
  const previousAttendees = useQuery({
    queryKey: ["event-participants", oldEventId, "invite-source"],
    queryFn: () => listEventParticipants(oldEventId, "user"),
    enabled: Boolean(oldEventId),
  });
  const inviteRecommendations = useQuery({
    queryKey: ["event-invite-recommendations", event.data?.id, user?.id],
    queryFn: () => listEventInviteRecommendations(event.data!.id),
    enabled: Boolean(event.data?.id && canManage && inviteMethod === "recommendations"),
    retry: false,
  });
  const invitedUserIds = new Set((sentInvitations.data ?? []).map((item) => item.id));
  const refresh = () => {
    void client.invalidateQueries({
      queryKey: ["event-participants", event.data?.id],
    });
    void client.invalidateQueries({
      queryKey: ["event-invitations-sent", event.data?.id, user?.id],
    });
    void client.invalidateQueries({
      queryKey: ["event-invite-recommendations", event.data?.id, user?.id],
    });
  };
  const invite = useMutation({
    mutationFn: (input: {
      userId?: string;
      username?: string;
      email?: string;
      phone?: string;
      name?: string;
      role?: string;
    }) => inviteEventParticipant(event.data!.id, input, "user"),
    onSuccess: refresh,
  });
  const inviteUsers = useMutation({
    mutationFn: (userIds: string[]) =>
      Promise.all(
        userIds.map((userId) =>
          inviteEventParticipant(
            event.data!.id,
            { userId, role: "attendee" },
            "user",
          ),
        ),
      ),
    onSuccess: refresh,
  });
  const bulkInvite = useMutation({
    mutationFn: async (listId: string) => {
      const source =
        guestLists.data?.find((item) => item.id === listId)?.members ?? [];
      const invited = invitedUserIds;
      await Promise.all(
        source
          .filter((item) => !invited.has(item.userId))
          .map((item) =>
            inviteEventParticipant(
              event.data!.id,
              { userId: item.userId, role: "attendee" },
              "user",
            ),
          ),
      );
    },
    onSuccess: refresh,
  });
  const status = useMutation({
    mutationFn: ({ userId, value }: { userId: string; value: string }) =>
      updateEventParticipantStatus(event.data!.id, userId, value, "user"),
    onSuccess: refresh,
  });
  const passportLoad = useMutation({
    mutationFn: (userId: string) =>
      getEventCheckInPassport(event.data!.id, userId),
    onSuccess: (data) => {
      setPassportMethod("manual");
      setPassport(data);
    },
  });
  const scan = useMutation({
    mutationFn: ({ raw, method }: { raw: string; method: "qr" | "nfc" }) => {
      let token = raw;
      try {
        token = new URL(raw).searchParams.get("token") ?? raw;
      } catch {
        /* Fiziksel okuyucu yalnız token döndürebilir. */
      }
      return previewEventCheckIn(event.data!.id, token, method);
    },
    onSuccess: (data, input) => {
      setPassportMethod(input.method);
      setPassport(data);
    },
  });
  const passportDecision = useMutation({
    mutationFn: ({
      decision,
      method,
    }: {
      decision: "admit" | "decline";
      method: "manual" | "qr" | "nfc";
    }) =>
      decideEventCheckInPassport(
        event.data!.id,
        passport!.user.id,
        decision,
        method,
      ),
    onSuccess: () => {
      setPassport(null);
      refresh();
    },
  });
  const addToGuestList = useMutation({
    mutationFn: ({ listId, userId }: { listId: string; userId: string }) =>
      addGuestListMember(listId, userId),
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ["guest-lists", user?.id] }),
  });
  if (!user) return <LoginState />;
  if (event.isLoading)
    return (
      <section className="page">
        {tr ? "Davet yönetimi yükleniyor…" : "Loading invite management…"}
      </section>
    );
  if (!event.data)
    return (
      <section className="page empty-state">
        <h1>{tr ? "Etkinlik bulunamadı" : "Event not found"}</h1>
      </section>
    );
  return (
    <ManagementShell
      title={event.data.title}
      back={`/events/${event.data.slug}`}
      shareUrl={`${window.location.origin}/events/${event.data.slug}`}
      kind={tr ? "Etkinlik" : "Event"}
    >
      <div hidden={checkInMode}>
        <InviteMethodPicker
          active={inviteMethod}
          includeOldEvents={canManage}
          includeGuestLists={canUseGuestLists}
          includeRecommendations={canManage}
          onChange={(method) => {
            setInviteMethod(method);
            invite.reset();
            inviteUsers.reset();
            bulkInvite.reset();
          }}
        />
        <MutationFeedback
          error={invite.error ?? inviteUsers.error ?? bulkInvite.error}
          success={
            invite.isSuccess || inviteUsers.isSuccess || bulkInvite.isSuccess
          }
        />
        {["username", "email", "phone"].includes(inviteMethod) ? (
          <InviteForm
            method={inviteMethod as "username" | "email" | "phone"}
            pending={invite.isPending}
            canAssignRole={canManage}
            onSubmit={(form) =>
              invite.mutate({
                username: form.username,
                name: form.name,
                email: form.email,
                phone: form.phone,
                role: canManage ? form.role : "attendee",
              })
            }
          />
        ) : null}
        {inviteMethod === "following" ? (
          <InviteUserCards
            title={tr ? "Takip ettiklerim" : "People I follow"}
            users={following.data ?? []}
            invitedUserIds={invitedUserIds}
            pending={invite.isPending || inviteUsers.isPending}
            guestLists={canUseGuestLists ? (guestLists.data ?? []) : []}
            onInvite={(userId) => invite.mutate({ userId, role: "attendee" })}
            onInviteAll={(userIds) => inviteUsers.mutate(userIds)}
            onAddToGuestList={(listId, userId) =>
              addToGuestList.mutate({ listId, userId })
            }
          />
        ) : null}
        {inviteMethod === "recommendations" && canManage ? (
          <InviteSource title={tr ? "AI ile önerilen Top 25" : "AI-recommended Top 25"}>
            <p className="form-help">
              {tr
                ? "Etkinlik ilgi alanları, konum, takip ilişkileri, eski katılımlar, Guest List ve profil sinyallerine göre şeffaf biçimde sıralanır."
                : "Ranked transparently using event interests, location, follows, past attendance, Guest Lists and profile signals."}
            </p>
            {inviteRecommendations.isLoading ? (
              <p className="form-help">{tr ? "Öneriler hazırlanıyor…" : "Preparing recommendations…"}</p>
            ) : inviteRecommendations.isError ? (
              <p className="form-error" role="alert">
                {tr ? "Öneriler yüklenemedi." : "Recommendations could not be loaded."}
              </p>
            ) : (
              <InviteUserCards
                users={(inviteRecommendations.data ?? []).map((member) => ({
                  ...member,
                  recommendationScore: member.score,
                  recommendationReasons: member.reasons,
                }))}
                invitedUserIds={invitedUserIds}
                pending={invite.isPending || inviteUsers.isPending}
                guestLists={canUseGuestLists ? (guestLists.data ?? []) : []}
                onInvite={(userId) => invite.mutate({ userId, role: "attendee" })}
                onInviteAll={(userIds) => inviteUsers.mutate(userIds)}
                onAddToGuestList={(listId, userId) => addToGuestList.mutate({ listId, userId })}
              />
            )}
          </InviteSource>
        ) : null}
        {inviteMethod === "guest_lists" && canUseGuestLists ? (
          <>
            <GuestListInviteSource
              lists={guestLists.data ?? []}
              invitedUserIds={invitedUserIds}
              pending={invite.isPending || inviteUsers.isPending}
              onInvite={(userId) => invite.mutate({ userId, role: "attendee" })}
              onInviteAll={(userIds) => inviteUsers.mutate(userIds)}
              onAddToGuestList={(listId, userId) =>
                addToGuestList.mutate({ listId, userId })
              }
            />
            <details className="guest-list-management">
              <summary>{tr ? "Guest listeleri yönet" : "Manage guest lists"}</summary>
              <GuestListManager
                lists={guestLists.data ?? []}
                pending={bulkInvite.isPending}
                targetLabel={tr ? "Etkinliğe" : "To event"}
                onInvite={(id) => bulkInvite.mutate(id)}
                onChanged={() =>
                  void client.invalidateQueries({
                    queryKey: ["guest-lists", user?.id],
                  })
                }
              />
            </details>
          </>
        ) : null}
        {inviteMethod === "old_attendees" ? (
          <InviteSource title={tr ? "Eski etkinlik katılımcıları" : "Past event attendees"}>
            <label>
              {tr ? "Etkinlik" : "Event"}
              <select
                value={oldEventId}
                onChange={(change) => setOldEventId(change.target.value)}
              >
                <option value="">{tr ? "Etkinlik seç" : "Select an event"}</option>
                {oldEvents.map((item) => (
                  <option key={item.id} value={item.id}>
                    {new Date(item.endsAt ?? item.startsAt).toLocaleDateString(
                      tr ? "tr-TR" : "en-US",
                    )}{" "}
                    - {item.title}
                  </option>
                ))}
              </select>
            </label>
            {oldEventId ? (
              <InviteUserCards
                users={(previousAttendees.data ?? []).flatMap((participant) =>
                  participant.user && ["accepted", "attended"].includes(participant.status) ? [participant.user] : [],
                )}
                invitedUserIds={invitedUserIds}
                pending={invite.isPending || inviteUsers.isPending}
                guestLists={canUseGuestLists ? (guestLists.data ?? []) : []}
                onInvite={(userId) =>
                  invite.mutate({ userId, role: "attendee" })
                }
                onInviteAll={(userIds) => inviteUsers.mutate(userIds)}
                onAddToGuestList={(listId, userId) =>
                  addToGuestList.mutate({ listId, userId })
                }
              />
            ) : null}
            {!oldEvents.length ? (
              <p className="form-help">
                {tr
                  ? "Yöneticisi olduğunuz başka bir etkinlik bulunamadı."
                  : "No other event you manage was found."}
              </p>
            ) : null}
          </InviteSource>
        ) : null}
        {inviteMethod === "phonebook" ? (
          <InviteSource title={tr ? "Telefon rehberi" : "Phone contacts"}>
            <Link
              className="secondary-action"
              to={`/contacts?source=phone&targetType=event&targetId=${event.data.id}`}
            >
              {tr ? "Telefon rehberini tara" : "Scan phone contacts"}
            </Link>
          </InviteSource>
        ) : null}
        {inviteMethod === "gmail" ? (
          <InviteSource title="Gmail">
            <Link
              className="secondary-action"
              to={`/contacts?source=google&targetType=event&targetId=${event.data.id}`}
            >
              {tr ? "Google Contacts ile tara" : "Scan with Google Contacts"}
            </Link>
          </InviteSource>
        ) : null}
      </div>
      {checkInMode && canManage ? (
        <>
          <QrCheckInScanner
            label={tr ? "Etkinlik QR check-in" : "Event QR check-in"}
            pending={scan.isPending}
            onScan={(payload, method) =>
              scan.mutateAsync({ raw: payload, method }).then(() => undefined)
            }
          />
          {participants.isError ? (
            <PermissionState />
          ) : (
            <EventGuestList
              items={(participants.data ?? []).filter((item) =>
                ["accepted", "attended"].includes(item.status) || Boolean(item.tickets?.length),
              )}
              pending={status.isPending || passportLoad.isPending}
              guestLists={canUseGuestLists ? (guestLists.data ?? []) : []}
              onStatus={(userId, value) => status.mutate({ userId, value })}
              onPassport={(userId) => passportLoad.mutate(userId)}
              onAddToGuestList={(listId, userId) =>
                addToGuestList.mutate({ listId, userId })
              }
            />
          )}
          <CheckInHistory
            context={{ id: event.data.id, name: event.data.title, type: "event" }}
            items={(participants.data ?? [])
              .filter((item) => item.checkInDecisionAt || item.checkedInAt)
              .map((item) => ({
                id: item.id,
                user: item.user,
                name: item.user?.name ?? item.userId,
                checkedInAt: item.checkedInAt ?? item.checkInDecisionAt!,
                method: item.checkInMethod ?? "manual",
                decision:
                  item.status === "declined"
                    ? ("declined" as const)
                    : ("attended" as const),
                order: item.checkInOrder ?? null,
                followerCount: item.user?.followerCount ?? 0,
                relatedFollowerCount: item.user?.relatedFollowerCount ?? 0,
              }))}
            guestLists={canUseGuestLists ? (guestLists.data ?? []) : []}
            onAddToGuestList={(listId, userId) =>
              addToGuestList.mutate({ listId, userId })
            }
          />
        </>
      ) : null}
      {checkInMode && !canManage ? <PermissionState /> : null}
      {passport ? (
        <CheckInPassportDialog
          guestLists={canUseGuestLists ? (guestLists.data ?? []) : []}
          passport={passport}
          pending={passportDecision.isPending}
          onAddToGuestList={(listId, userId) => addToGuestList.mutate({ listId, userId })}
          onClose={() => setPassport(null)}
          onDecision={(decision) =>
            passportDecision.mutate({ decision, method: passportMethod })
          }
        />
      ) : null}
    </ManagementShell>
  );
}

export function PlaceInviteManagementPage() {
  const { language } = useLanguage();
  const tr = language === "tr";
  const { slug = "" } = useParams();
  const checkInMode = useLocation().hash === "#check-in";
  const user = getUserSession();
  const [inviteMethod, setInviteMethod] = useState<InviteMethod>("following");
  const [passport, setPassport] = useState<CheckInPassport | null>(null);
  const [passportMethod, setPassportMethod] = useState<"manual" | "qr" | "nfc">(
    "manual",
  );
  const client = useQueryClient();
  const place = useQuery({
    queryKey: ["place", slug],
    queryFn: () => getPlace(slug),
    enabled: Boolean(slug && user),
  });
  const canManage = Boolean(
    place.data &&
    user &&
    (place.data.createdById === user.id ||
      (place.data.viewerMembership?.status === "accepted" &&
        ["manager", "organizer"].includes(place.data.viewerMembership.role)) ||
      ["admin", "super_admin", "curator"].includes(user.role)),
  );
  const members = useQuery({
    queryKey: ["place-members", place.data?.id],
    queryFn: () => listPlaceMembers(place.data!.id),
    enabled: Boolean(place.data && user),
    retry: false,
  });
  const sentInvitations = useQuery({
    queryKey: ["place-invitations-sent", place.data?.id, user?.id],
    queryFn: () => listSentPlaceInvitations(place.data!.id),
    enabled: Boolean(place.data?.id && user),
  });
  const following = useQuery({
    queryKey: ["following", user?.id],
    queryFn: listFollowing,
    enabled: Boolean(user),
  });
  const { canUseGuestLists } = useGuestListEntitlement(canManage);
  const guestLists = useQuery({
    queryKey: ["guest-lists", user?.id],
    queryFn: listGuestLists,
    enabled: Boolean(user && canUseGuestLists),
  });
  const invitedUserIds = new Set((sentInvitations.data ?? []).map((item) => item.id));
  const refresh = () => {
    void client.invalidateQueries({
      queryKey: ["place-members", place.data?.id],
    });
    void client.invalidateQueries({
      queryKey: ["place-invitations-sent", place.data?.id, user?.id],
    });
  };
  const invite = useMutation({
    mutationFn: (input: {
      userId?: string;
      username?: string;
      email?: string;
      phone?: string;
      name?: string;
      role?: string;
    }) => invitePlaceMember(place.data!.id, input),
    onSuccess: refresh,
  });
  const invitePlaceUsers = useMutation({
    mutationFn: (userIds: string[]) =>
      Promise.all(
        userIds.map((userId) =>
          invitePlaceMember(place.data!.id, { userId, role: "member" }),
        ),
      ),
    onSuccess: refresh,
  });
  const bulkInvitePlace = useMutation({
    mutationFn: async (listId: string) => {
      const source =
        guestLists.data?.find((item) => item.id === listId)?.members ?? [];
      const invited = invitedUserIds;
      await Promise.all(
        source
          .filter((item) => !invited.has(item.userId))
          .map((item) =>
            invitePlaceMember(place.data!.id, {
              userId: item.userId,
              role: "member",
            }),
          ),
      );
    },
    onSuccess: refresh,
  });
  const update = useMutation({
    mutationFn: ({
      userId,
      input,
    }: {
      userId: string;
      input: { status?: string; role?: string };
    }) => updatePlaceMember(place.data!.id, userId, input),
    onSuccess: refresh,
  });
  const passportLoad = useMutation({
    mutationFn: (userId: string) =>
      getPlaceCheckInPassport(place.data!.id, userId),
    onSuccess: (data) => {
      setPassportMethod("manual");
      setPassport(data);
    },
  });
  const scan = useMutation({
    mutationFn: ({
      payload,
      method,
    }: {
      payload: string;
      method: "qr" | "nfc";
    }) => previewPlaceCheckIn(place.data!.id, payload, method),
    onSuccess: (data, input) => {
      setPassportMethod(input.method);
      setPassport(data);
    },
  });
  const passportDecision = useMutation({
    mutationFn: ({
      decision,
      method,
    }: {
      decision: "admit" | "decline";
      method: "manual" | "qr" | "nfc";
    }) =>
      decidePlaceCheckInPassport(
        place.data!.id,
        passport!.user.id,
        decision,
        method,
      ),
    onSuccess: () => {
      setPassport(null);
      refresh();
    },
  });
  const addToGuestList = useMutation({
    mutationFn: ({ listId, userId }: { listId: string; userId: string }) =>
      addGuestListMember(listId, userId),
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ["guest-lists", user?.id] }),
  });
  if (!user) return <LoginState />;
  if (place.isLoading)
    return (
      <section className="page">
        {tr ? "Davet yönetimi yükleniyor…" : "Loading invite management…"}
      </section>
    );
  if (!place.data)
    return (
      <section className="page empty-state">
        <h1>{tr ? "Mekân bulunamadı" : "Place not found"}</h1>
      </section>
    );
  return (
    <ManagementShell
      title={place.data.name}
      back={`/places/${place.data.slug}`}
      shareUrl={`${window.location.origin}/places/${place.data.slug}`}
      kind={tr ? "Mekân" : "Place"}
    >
      <div hidden={checkInMode}>
        <InviteMethodPicker
          active={inviteMethod}
          includeGuestLists={canUseGuestLists}
          onChange={(method) => {
            setInviteMethod(method);
            invite.reset();
            invitePlaceUsers.reset();
            bulkInvitePlace.reset();
          }}
        />
        <MutationFeedback
          error={
            invite.error ?? invitePlaceUsers.error ?? bulkInvitePlace.error
          }
          success={
            invite.isSuccess ||
            invitePlaceUsers.isSuccess ||
            bulkInvitePlace.isSuccess
          }
        />
        {["username", "email", "phone"].includes(inviteMethod) ? (
          <InviteForm
            method={inviteMethod as "username" | "email" | "phone"}
            pending={invite.isPending}
            canAssignRole={canManage}
            memberTarget
            onSubmit={(form) =>
              invite.mutate({
                username: form.username,
                name: form.name,
                email: form.email,
                phone: form.phone,
                role: form.role,
              })
            }
          />
        ) : null}
        {inviteMethod === "following" ? (
          <InviteUserCards
            title={tr ? "Takip ettiklerim" : "People I follow"}
            users={following.data ?? []}
            invitedUserIds={invitedUserIds}
            pending={invite.isPending || invitePlaceUsers.isPending}
            guestLists={canUseGuestLists ? (guestLists.data ?? []) : []}
            onInvite={(userId) => invite.mutate({ userId, role: "member" })}
            onInviteAll={(userIds) => invitePlaceUsers.mutate(userIds)}
            onAddToGuestList={(listId, userId) =>
              addToGuestList.mutate({ listId, userId })
            }
          />
        ) : null}
        {inviteMethod === "guest_lists" && canUseGuestLists ? (
          <>
            <GuestListInviteSource
              lists={guestLists.data ?? []}
              invitedUserIds={invitedUserIds}
              pending={invite.isPending || invitePlaceUsers.isPending}
              onInvite={(userId) => invite.mutate({ userId, role: "member" })}
              onInviteAll={(userIds) => invitePlaceUsers.mutate(userIds)}
              onAddToGuestList={(listId, userId) =>
                addToGuestList.mutate({ listId, userId })
              }
            />
            <details className="guest-list-management">
              <summary>{tr ? "Guest listeleri yönet" : "Manage guest lists"}</summary>
              <GuestListManager
                lists={guestLists.data ?? []}
                pending={bulkInvitePlace.isPending}
                targetLabel={tr ? "Mekâna" : "To place"}
                onInvite={(listId) => bulkInvitePlace.mutate(listId)}
                onChanged={() =>
                  void client.invalidateQueries({
                    queryKey: ["guest-lists", user?.id],
                  })
                }
              />
            </details>
          </>
        ) : null}
        {inviteMethod === "phonebook" ? (
          <InviteSource title={tr ? "Telefon rehberi" : "Phone contacts"}>
            <Link
              className="secondary-action"
              to={`/contacts?source=phone&targetType=place&targetId=${place.data.id}`}
            >
              {tr ? "Telefon rehberini tara" : "Scan phone contacts"}
            </Link>
          </InviteSource>
        ) : null}
        {inviteMethod === "gmail" ? (
          <InviteSource title="Gmail">
            <Link
              className="secondary-action"
              to={`/contacts?source=google&targetType=place&targetId=${place.data.id}`}
            >
              {tr ? "Google Contacts ile tara" : "Scan with Google Contacts"}
            </Link>
          </InviteSource>
        ) : null}
      </div>
      {checkInMode && canManage ? (
        <>
          <QrCheckInScanner
            label={tr ? "Mekân üye kartı check-in" : "Place member card check-in"}
            pending={scan.isPending}
            onScan={(payload, method) =>
              scan.mutateAsync({ payload, method }).then(() => undefined)
            }
          />
          {members.isError ? (
            <PermissionState />
          ) : (
            <PlaceMemberList
              items={(members.data ?? []).filter((item) =>
                item.status === "accepted" || Boolean(item.checkedInAt),
              )}
              pending={update.isPending || passportLoad.isPending}
              guestLists={canUseGuestLists ? (guestLists.data ?? []) : []}
              onUpdate={(userId, input) => update.mutate({ userId, input })}
              onPassport={(userId) => passportLoad.mutate(userId)}
              onAddToGuestList={(listId, userId) =>
                addToGuestList.mutate({ listId, userId })
              }
            />
          )}
          <CheckInHistory
            context={{ id: place.data.id, name: place.data.name, type: "place" }}
            items={(members.data ?? [])
              .filter((item) => item.checkInDecisionAt || item.checkedInAt)
              .map((item) => ({
                id: `${item.placeId}-${item.userId}`,
                user: item.user,
                name: item.user?.name ?? item.userId,
                checkedInAt: item.checkedInAt ?? item.checkInDecisionAt!,
                method: item.checkInMethod ?? "manual",
                decision:
                  item.status === "declined"
                    ? ("declined" as const)
                    : ("attended" as const),
                order: item.checkInOrder ?? null,
                followerCount: item.user?.followerCount ?? 0,
                relatedFollowerCount: item.user?.relatedFollowerCount ?? 0,
              }))}
            guestLists={canUseGuestLists ? (guestLists.data ?? []) : []}
            onAddToGuestList={(listId, userId) =>
              addToGuestList.mutate({ listId, userId })
            }
          />
        </>
      ) : null}
      {checkInMode && !canManage ? <PermissionState /> : null}
      {passport ? (
        <CheckInPassportDialog
          guestLists={canUseGuestLists ? (guestLists.data ?? []) : []}
          passport={passport}
          pending={passportDecision.isPending}
          onAddToGuestList={(listId, userId) => addToGuestList.mutate({ listId, userId })}
          onClose={() => setPassport(null)}
          onDecision={(decision) =>
            passportDecision.mutate({ decision, method: passportMethod })
          }
        />
      ) : null}
    </ManagementShell>
  );
}

function ManagementShell({
  title,
  back,
  shareUrl,
  kind,
  children,
}: {
  title: string;
  back: string;
  shareUrl: string;
  kind: string;
  children: React.ReactNode;
}) {
  const { language } = useLanguage();
  const tr = language === "tr";
  const [copied, setCopied] = useState(false);
  return (
    <div className="page invite-management">
      <Link className="back-link" to={back}>
        ← {tr ? "Detaya dön" : "Back to details"}
      </Link>
      <header className="section-header invite-management-header">
        <div>
          <p className="eyebrow">
            {kind} {tr ? "yönetimi" : "management"}
          </p>
          <h1>{title}</h1>
          <p>
            {tr
              ? "Davetleri, katılım durumlarını ve check-in işlemlerini tek yerden yönet."
              : "Manage invitations, participation statuses and check-ins in one place."}
          </p>
        </div>
        <button
          className="secondary-action"
          onClick={() => {
            void navigator.clipboard.writeText(shareUrl).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1800);
            });
          }}
          type="button"
        >
          <Clipboard size={17} />
          {copied
            ? tr
              ? "Bağlantı kopyalandı"
              : "Link copied"
            : tr
              ? "Davet bağlantısını kopyala"
              : "Copy invite link"}
        </button>
      </header>
      {children}
    </div>
  );
}

function InviteMethodPicker({
  active,
  includeOldEvents = false,
  includeGuestLists = false,
  includeRecommendations = false,
  onChange,
}: {
  active: InviteMethod;
  includeOldEvents?: boolean;
  includeGuestLists?: boolean;
  includeRecommendations?: boolean;
  onChange: (method: InviteMethod) => void;
}) {
  const { language } = useLanguage();
  const tr = language === "tr";
  const methods: Array<[InviteMethod, string]> = [
    ...(includeRecommendations
      ? [["recommendations", tr ? "AI ile önerilen Top 25" : "AI-recommended Top 25"] as [InviteMethod, string]]
      : []),
    ["following", tr ? "Takip ettiklerimden seç" : "Choose from people I follow"],
    ...(includeGuestLists
      ? [["guest_lists", tr ? "Guest listeden seç" : "Choose from a guest list"] as [InviteMethod, string]]
      : []),
    ...(includeOldEvents
      ? [
          ["old_attendees", tr ? "Eski etkinlik katılımcıları" : "Past event attendees"] as [
            InviteMethod,
            string,
          ],
        ]
      : []),
    ["username", tr ? "Kullanıcı adı" : "Username"],
    ["email", tr ? "E-posta adresi" : "Email address"],
    ["phone", tr ? "Telefon numarası" : "Phone number"],
    ["phonebook", tr ? "Telefon rehberini tara" : "Scan phone contacts"],
    ["gmail", tr ? "Gmail'i tara" : "Scan Gmail"],
  ];
  return (
    <section className="admin-form invite-method-picker">
      <h2>{tr ? "Davet yöntemini seç" : "Choose an invite method"}</h2>
      <div>
        {methods.map(([value, label]) => (
          <button
            className={active === value ? "active" : ""}
            key={value}
            onClick={() => onChange(value)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}

function MutationFeedback({
  success,
  error,
}: {
  success: boolean;
  error: unknown;
}) {
  const { language } = useLanguage();
  const tr = language === "tr";
  if (error)
    return (
      <p className="form-error" role="alert">
        {getServiceErrorMessage(
          error,
          tr
            ? "Davet gönderilemedi. Bilgileri kontrol edip yeniden deneyin."
            : "The invitation could not be sent. Check the details and try again.",
        )}
      </p>
    );
  if (success)
    return (
      <p className="form-success" role="status">
        <CheckCircle2 size={17} />
        {tr ? "Davet başarıyla gönderildi." : "Invitation sent successfully."}
      </p>
    );
  return null;
}

function InviteSource({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="admin-form invite-source-section">
      <h2>{title}</h2>
      <div className="invite-source-list">{children}</div>
    </section>
  );
}

function recommendationReasonLabel(reason: string, tr: boolean, sharedInterestCount = 0) {
  const labels: Record<string, [string, string]> = {
    shared_interests: [
      `${sharedInterestCount} ortak ilgi alanı`,
      `${sharedInterestCount} shared interest${sharedInterestCount === 1 ? "" : "s"}`,
    ],
    same_city: ["aynı şehir", "same city"],
    same_country: ["aynı ülke", "same country"],
    following: ["takip ediyorsunuz", "you follow"],
    past_attendee: ["eski etkinlik katılımcısı", "past event attendee"],
    guest_list: ["Guest List'inizde", "in your Guest List"],
    verified: ["doğrulanmış profil", "verified profile"],
    active_recently: ["yakın zamanda aktif", "recently active"],
    popular: ["toplulukta popüler", "popular in the community"],
  };
  return labels[reason]?.[tr ? 0 : 1] ?? reason;
}

function InviteUserCards({
  title,
  users,
  invitedUserIds,
  pending,
  guestLists,
  onInvite,
  onInviteAll,
  onAddToGuestList,
}: {
  title?: string;
  users: Array<{
    id: string;
    name: string;
    username?: string | null;
    avatarUrl?: string | null;
    recommendationScore?: number;
    recommendationReasons?: string[];
    sharedInterestCount?: number;
  }>;
  invitedUserIds: Set<string>;
  pending: boolean;
  guestLists: GuestLists;
  onInvite: (userId: string) => void;
  onInviteAll: (userIds: string[]) => void;
  onAddToGuestList: (listId: string, userId: string) => void;
}) {
  const { language } = useLanguage();
  const tr = language === "tr";
  const unique = users.filter(
    (item, index, all) =>
      Boolean(item.username) && all.findIndex((other) => other.id === item.id) === index,
  );
  const available = unique.filter((item) => !invitedUserIds.has(item.id));
  const invited = unique.filter((item) => invitedUserIds.has(item.id));
  const cards = (source: typeof unique, alreadyInvited: boolean) =>
    source.map((member) => (
      <article className="invite-user-card" key={member.id}>
        <Link className="management-avatar" to={`/users/id/${member.id}`}>
          {member.avatarUrl ? (
            <img alt="" src={resolveMediaUrl(member.avatarUrl)} />
          ) : (
            <span>{member.name.slice(0, 1).toUpperCase()}</span>
          )}
        </Link>
        <div>
          <strong>
            <Link to={`/users/id/${member.id}`}>
              {member.username ? `@${member.username}` : member.name}
            </Link>
          </strong>
          {member.recommendationScore !== undefined ? (
            <small className="invite-recommendation-reasons">
              {tr ? `Eşleşme puanı ${member.recommendationScore}` : `Match score ${member.recommendationScore}`}
              {member.recommendationReasons?.length
                ? ` · ${member.recommendationReasons.map((reason) => recommendationReasonLabel(reason, tr, member.sharedInterestCount)).join(" · ")}`
                : ""}
            </small>
          ) : null}
        </div>
        <div className="row-actions">
          <button
            className="secondary-action"
            disabled={pending || alreadyInvited}
            onClick={() => onInvite(member.id)}
            type="button"
          >
            <UserPlus size={16} />
            {alreadyInvited
              ? tr
                ? "Davet edildi"
                : "Invited"
              : tr
                ? "Davet et"
                : "Invite"}
          </button>
          <GuestListPicker
            lists={guestLists}
            onAdd={(listId) => onAddToGuestList(listId, member.id)}
            target={{ id: member.id, name: member.name, username: member.username, avatarUrl: member.avatarUrl }}
          />
        </div>
      </article>
    ));
  return (
    <div className="invite-user-cards">
      {title ? <h2>{title}</h2> : null}
      {available.length ? (
        <button
          className="create-inline-link invite-all-link"
          disabled={pending}
          onClick={() => onInviteAll(available.map((item) => item.id))}
          type="button"
        >
          {tr ? "Tümünü davet et" : "Invite all"}
        </button>
      ) : null}
      {cards(available, false)}
      {invited.length ? (
        <>
          <h3>{tr ? "Zaten davet ettikleriniz" : "Already invited"}</h3>
          {cards(invited, true)}
        </>
      ) : null}
      {!unique.length ? (
        <p className="form-help">
          {tr ? "Listelenecek kullanıcı bulunamadı." : "No users to display."}
        </p>
      ) : null}
    </div>
  );
}

function GuestListInviteSource({
  lists,
  invitedUserIds,
  pending,
  onInvite,
  onInviteAll,
  onAddToGuestList,
}: {
  lists: GuestLists;
  invitedUserIds: Set<string>;
  pending: boolean;
  onInvite: (userId: string) => void;
  onInviteAll: (userIds: string[]) => void;
  onAddToGuestList: (listId: string, userId: string) => void;
}) {
  const { language } = useLanguage();
  const tr = language === "tr";
  const ordered = [...lists].sort((a, b) =>
    a.name.localeCompare(b.name, tr ? "tr" : "en"),
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(ordered[0] ? [ordered[0].id] : []));
  const firstListId = ordered[0]?.id;
  useEffect(() => {
    if (firstListId) setSelectedIds((current) => current.size ? current : new Set([firstListId]));
  }, [firstListId]);
  const users = ordered
    .filter((list) => selectedIds.has(list.id))
    .flatMap((list) => list.members)
    .filter((member, index, all) => all.findIndex((item) => item.userId === member.userId) === index)
    .map((member) => ({ id: member.user.id, name: member.user.name, username: member.user.username, avatarUrl: member.user.uploadedMedia?.[0]?.url ?? null }));
  return (
    <InviteSource title={tr ? "Guest listeden seç" : "Choose from a guest list"}>
      <fieldset className="guest-list-source-options"><legend>{tr ? "Bir veya daha fazla Guest List seç" : "Choose one or more Guest Lists"}</legend>{ordered.map((list) => <label key={list.id}><input checked={selectedIds.has(list.id)} onChange={(event) => setSelectedIds((current) => { const next = new Set(current); if (event.target.checked) next.add(list.id); else next.delete(list.id); return next; })} type="checkbox"/>{list.name} ({list.members.length}){list.access === "read" ? ` · ${tr ? "salt okunur" : "read only"}` : ""}</label>)}</fieldset>
      {selectedIds.size ? (
        <InviteUserCards
          users={users}
          invitedUserIds={invitedUserIds}
          pending={pending}
          guestLists={lists}
          onInvite={onInvite}
          onInviteAll={onInviteAll}
          onAddToGuestList={onAddToGuestList}
        />
      ) : (
        <p className="form-help">
          {tr ? "Henüz bir guest list oluşturmadın." : "You have not created a guest list yet."}
        </p>
      )}
    </InviteSource>
  );
}

function GuestListManager({
  lists,
  pending,
  targetLabel,
  onInvite,
  onChanged,
}: {
  lists: Awaited<ReturnType<typeof listGuestLists>>;
  pending: boolean;
  targetLabel: string;
  onInvite: (id: string) => void;
  onChanged: () => void;
}) {
  const { language } = useLanguage();
  const tr = language === "tr";
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const create = useMutation({
    mutationFn: createGuestList,
    onSuccess: onChanged,
  });
  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      renameGuestList(id, name),
    onSuccess: () => {
      setEditingId(null);
      onChanged();
    },
  });
  const remove = useMutation({
    mutationFn: deleteGuestList,
    onSuccess: () => {
      setDeletingId(null);
      onChanged();
    },
  });
  const removeMember = useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      removeGuestListMember(id, userId),
    onSuccess: onChanged,
  });
  return (
    <section className="admin-form guest-list-manager">
      <div className="section-header compact">
        <h2>{tr ? "Guest listeler" : "Guest lists"}</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const input = event.currentTarget.elements.namedItem(
              "name",
            ) as HTMLInputElement;
            if (input.value.trim()) {
              create.mutate(input.value.trim());
              input.value = "";
            }
          }}
        >
          <input
            aria-label={tr ? "Yeni guest list adı" : "New guest list name"}
            name="name"
            placeholder={tr ? "Yeni liste adı" : "New list name"}
          />
          <button className="secondary-action" disabled={create.isPending}>
            {tr ? "Oluştur" : "Create"}
          </button>
        </form>
      </div>
      {lists.map((list) => (
        <article key={list.id}>
          <header>
            <div>
              {editingId === list.id && list.access !== "read" ? (
                <form
                  className="guest-list-rename"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (editingName.trim())
                      rename.mutate({ id: list.id, name: editingName.trim() });
                  }}
                >
                  <input
                    aria-label={tr ? "Guest list adı" : "Guest list name"}
                    autoFocus
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                  />
                  <button disabled={rename.isPending}>
                    {tr ? "Kaydet" : "Save"}
                  </button>
                  <button onClick={() => setEditingId(null)} type="button">
                    {tr ? "Vazgeç" : "Cancel"}
                  </button>
                </form>
              ) : (
                <strong>{list.name}</strong>
              )}
              <span>
                {list.members.length} {tr ? "kişi" : list.members.length === 1 ? "person" : "people"}
                {list.access === "read" ? ` · ${tr ? "salt okunur" : "read only"}` : ""}
              </span>
            </div>
            <div className="row-actions">
              <button
                disabled={pending || !list.members.length}
                onClick={() => onInvite(list.id)}
                type="button"
              >
                {tr ? `${targetLabel} davet et` : `Invite ${targetLabel.toLowerCase()}`}
              </button>
              {list.access !== "read" ? <button
                onClick={() => {
                  setEditingId(list.id);
                  setEditingName(list.name);
                  setDeletingId(null);
                }}
                type="button"
              >
                {tr ? "Düzenle" : "Edit"}
              </button> : null}
              {list.access !== "read" && deletingId === list.id ? (
                <>
                  <button
                    className="danger"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(list.id)}
                    type="button"
                  >
                    {tr ? "Silmeyi onayla" : "Confirm delete"}
                  </button>
                  <button onClick={() => setDeletingId(null)} type="button">
                    {tr ? "Vazgeç" : "Cancel"}
                  </button>
                </>
              ) : list.access !== "read" ? (
                <button
                  className="danger"
                  onClick={() => {
                    setDeletingId(list.id);
                    setEditingId(null);
                  }}
                  type="button"
                >
                  {tr ? "Sil" : "Delete"}
                </button>
              ) : null}
            </div>
          </header>
          <div className="guest-list-member-chips">
            {list.members.map((member) => (
              <span key={member.id}>
                {member.user.name}
                {list.access !== "read" ? <button
                  aria-label={
                    tr
                      ? `${member.user.name} kişisini listeden çıkar`
                      : `Remove ${member.user.name} from the list`
                  }
                  onClick={() =>
                    removeMember.mutate({ id: list.id, userId: member.userId })
                  }
                  type="button"
                >
                  ×
                </button> : null}
              </span>
            ))}
          </div>
        </article>
      ))}
      {!lists.length ? (
        <p className="form-help">
          {tr ? "Henüz bir guest list oluşturmadın." : "You have not created a guest list yet."}
        </p>
      ) : null}
    </section>
  );
}

function InviteForm({
  method,
  pending,
  canAssignRole = true,
  memberTarget = false,
  onSubmit,
}: {
  method: "username" | "email" | "phone";
  pending: boolean;
  canAssignRole?: boolean;
  memberTarget?: boolean;
  onSubmit: (input: {
    username?: string;
    email?: string;
    phone?: string;
    name?: string;
    role: string;
  }) => void;
}) {
  const { language } = useLanguage();
  const tr = language === "tr";
  return (
    <form
      className="admin-form invite-management-form"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const username = String(form.get("username") || "")
          .trim()
          .replace(/^@/, "");
        const email = String(form.get("email") || "").trim();
        const phone = String(form.get("phone") || "")
          .trim()
          .replace(/[\s()-]/g, "");
        if (username || email || phone)
          onSubmit({
            username: username || undefined,
            email: email || undefined,
            phone: phone || undefined,
            role: String(
              form.get("role") || (memberTarget ? "member" : "attendee"),
            ),
          });
      }}
    >
      <h2>
        <UserPlus size={20} />
        {tr ? "Yeni davet" : "New invitation"}
      </h2>
      <div className="form-grid">
        {method === "username" ? (
          <label>
            {tr ? "Kullanıcı adı" : "Username"}
            <input name="username" placeholder="@username" />
          </label>
        ) : null}
        {method === "email" ? (
          <label>
            {tr ? "E-posta" : "Email"}
            <input name="email" type="email" placeholder="uye@example.com" />
          </label>
        ) : null}
        {method === "phone" ? (
          <label>
            {tr ? "Telefon" : "Phone"}
            <input
              name="phone"
              inputMode="tel"
              pattern="\+?[1-9][0-9]{7,14}"
              placeholder="+905551234567"
            />
          </label>
        ) : null}
        {canAssignRole ? (
          <label>
            {tr ? "Rol" : "Role"}
            <select name="role">
              <option value={memberTarget ? "member" : "attendee"}>
                {memberTarget
                  ? tr
                    ? "Üye"
                    : "Member"
                  : tr
                    ? "Katılımcı"
                    : "Attendee"}
              </option>
              <option value="manager">{tr ? "Sahip" : "Owner"}</option>
              <option value="organizer">{tr ? "Organizatör" : "Organizer"}</option>
            </select>
          </label>
        ) : null}
      </div>
      <button className="primary-action" disabled={pending}>
        <Mail size={17} />
        {pending
          ? tr
            ? "Gönderiliyor…"
            : "Sending…"
          : tr
            ? "Davet gönder"
            : "Send invitation"}
      </button>
    </form>
  );
}

function EventGuestList({
  items,
  pending,
  onStatus,
  onPassport,
  guestLists,
  onAddToGuestList,
}: {
  items: EventParticipant[];
  pending: boolean;
  onStatus: (id: string, status: string) => void;
  onPassport: (id: string) => void;
  guestLists: GuestLists;
  onAddToGuestList: (listId: string, userId: string) => void;
}) {
  const { language } = useLanguage();
  const tr = language === "tr";
  const locale = tr ? "tr-TR" : "en-US";
  const [visibleCount, setVisibleCount] = useState(10);
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("tr-TR");
  const ordered = [...items]
    .filter(
      (item) =>
        !normalized ||
        `${item.user?.username ?? ""} ${item.user?.name ?? ""}`
          .toLocaleLowerCase("tr-TR")
          .includes(normalized),
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt ?? 0).getTime() -
        new Date(a.createdAt ?? 0).getTime(),
    );
  const exportRows = [...items].sort((a, b) =>
    surname(a.user?.name).localeCompare(surname(b.user?.name), tr ? "tr" : "en"),
  );
  const exportData = exportRows.map((item) => ({
    name: item.user?.name ?? item.userId,
    username: item.user?.username ?? "",
    status: translateStatus(item.status, language),
    role: translateRole(item.role, language),
    joinedAt: item.createdAt || item.checkedInAt
      ? new Date(item.createdAt ?? item.checkedInAt!).toLocaleString(locale)
      : "",
    order: item.joinOrder || item.checkInOrder
      ? String(item.joinOrder ?? item.checkInOrder)
      : "",
    details: (item.tickets ?? [])
      .map(
        (ticket) =>
          `${ticket.name}${ticket.description ? ` — ${ticket.description}` : ""}; ${ticket.quantity} ${tr ? "adet" : "qty"} × ${ticket.unitPrice} ${ticket.currency}${ticket.gateOpensAt || ticket.gateClosesAt ? `; gate ${formatGate(ticket.gateOpensAt, ticket.gateClosesAt, locale)}` : ""}`,
      )
      .join(" | "),
  }));
  return (
    <section className="admin-form checkin-list-panel">
      <div className="section-header compact checkin-list-header">
        <h2>
          <Users size={20} />
          {tr ? "Misafir listesi" : "Guest list"} <small>{items.length}</small>
        </h2>
        <label className="checkin-search">
          <Search size={16} />
          <input
            aria-label={tr ? "Misafirlerde ara" : "Search guests"}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisibleCount(10);
            }}
            placeholder={tr ? "Kullanıcı adı veya ad soyad" : "Username or full name"}
            value={query}
          />
        </label>
        <button
          className="create-inline-link"
          onClick={() => {
            void exportGuestList(
              tr ? "Etkinlik misafir listesi" : "Event guest list",
              exportData,
              language,
            );
          }}
          type="button"
        >
          {tr ? "Dışa aktar" : "Export"}
        </button>
      </div>
      <div className="management-list">
        {ordered.slice(0, visibleCount).map((item) => (
          <article key={item.userId}>
            <div className="management-person">
              <Link
                className="management-avatar"
                to={`/users/id/${item.userId}`}
              >
                {item.user?.avatarUrl ? (
                  <img alt="" src={resolveMediaUrl(item.user.avatarUrl)} />
                ) : (
                  <span>
                    {(item.user?.name ?? "?").slice(0, 1).toUpperCase()}
                  </span>
                )}
              </Link>
              <div>
                <strong>
                  <Link to={`/users/id/${item.userId}`}>
                    {item.user?.username
                      ? `@${item.user.username}`
                      : (item.user?.name ?? item.userId)}
                  </Link>
                </strong>
                <span>
                  <Link to={`/users/id/${item.userId}`}>{item.user?.name}</Link>
                </span>
                <small>
                  {translateRole(item.role, language)} · {translateStatus(item.status, language)}
                  {item.checkedInAt
                    ? ` · ${new Date(item.checkedInAt).toLocaleString(locale)}`
                    : ""}
                </small>
                {(item.tickets ?? []).map((ticket) => (
                  <div className="checkin-ticket-summary" key={ticket.id}>
                    <Ticket size={15} />
                    <span>
                      <b>{ticket.name}</b>
                      {ticket.description ? ` · ${ticket.description}` : ""}
                      <small>
                        {ticket.quantity} {tr ? "adet" : "qty"} · {ticket.unitPrice}{" "}
                        {ticket.currency}
                        {ticket.gateOpensAt || ticket.gateClosesAt
                          ? ` · Gate: ${formatGate(ticket.gateOpensAt, ticket.gateClosesAt, locale)}`
                          : ""}
                      </small>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="row-actions">
              {item.status === "requested" || item.status === "invited" ? (
                <>
                  <button
                    className="management-action management-action-approve"
                    disabled={pending}
                    onClick={() => onStatus(item.userId, "accepted")}
                    type="button"
                  >
                    <CheckCircle2 size={16} />
                    {tr ? "Onayla" : "Approve"}
                  </button>
                  <button
                    className="management-action management-action-reject"
                    disabled={pending}
                    onClick={() => onStatus(item.userId, "declined")}
                    type="button"
                  >
                    <XCircle size={16} />
                    {tr ? "Reddet" : "Reject"}
                  </button>
                </>
              ) : null}
              {["accepted", "invited", "attended"].includes(item.status) ? (
                <button
                  className="management-action management-action-checkin"
                  disabled={pending}
                  onClick={() => onPassport(item.userId)}
                  type="button"
                >
                  <QrCode size={16} />
                  {tr ? "Pasaport kontrol" : "Check passport"}
                </button>
              ) : null}
              <GuestListPicker
                context={{ id: item.eventId, type: "event" }}
                lists={guestLists}
                onAdd={(listId) => onAddToGuestList(listId, item.userId)}
                target={{ id: item.userId, name: item.user?.name ?? item.userId, username: item.user?.username, avatarUrl: item.user?.avatarUrl, status: item.status, role: item.role, checkedIn: Boolean(item.checkedInAt) }}
              />
            </div>
          </article>
        ))}
      </div>
      {visibleCount < ordered.length ? (
        <button
          className="secondary-action"
          onClick={() => setVisibleCount((count) => count + 10)}
          type="button"
        >
          {tr ? "Daha fazla" : "More"}
        </button>
      ) : null}
      {!ordered.length ? (
        <p className="form-help">
          {tr ? "Aramanızla eşleşen misafir bulunamadı." : "No guests matched your search."}
        </p>
      ) : null}
    </section>
  );
}

function PlaceMemberList({
  items,
  pending,
  onUpdate,
  onPassport,
  guestLists,
  onAddToGuestList,
}: {
  items: PlaceMember[];
  pending: boolean;
  onUpdate: (id: string, input: { status?: string; role?: string }) => void;
  onPassport: (id: string) => void;
  guestLists: GuestLists;
  onAddToGuestList: (listId: string, userId: string) => void;
}) {
  const { language } = useLanguage();
  const tr = language === "tr";
  const locale = tr ? "tr-TR" : "en-US";
  const [visibleCount, setVisibleCount] = useState(10);
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("tr-TR");
  const ordered = [...items]
    .filter(
      (item) =>
        !normalized ||
        `${item.user?.username ?? ""} ${item.user?.name ?? ""}`
          .toLocaleLowerCase("tr-TR")
          .includes(normalized),
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  const exportRows = [...items].sort((a, b) =>
    surname(a.user?.name).localeCompare(surname(b.user?.name), tr ? "tr" : "en"),
  );
  const exportData = exportRows.map((item) => ({
    name: item.user?.name ?? item.userId,
    username: item.user?.username ?? "",
    status: translateStatus(item.status, language),
    role: translateRole(item.role, language),
    joinedAt: new Date(item.createdAt).toLocaleString(locale),
    order: item.joinOrder ? String(item.joinOrder) : "",
    details: `${item.user?.followerCount ?? 0} ${tr ? "takipçi" : "followers"} · ${item.user?.relatedFollowerCount ?? 0} ${tr ? "mekân üyesi" : "place members"}`,
  }));
  return (
    <section className="admin-form checkin-list-panel">
      <div className="section-header compact checkin-list-header">
        <h2>
          <Users size={20} />
          {tr ? "Üye listesi" : "Member list"} <small>{items.length}</small>
        </h2>
        <label className="checkin-search">
          <Search size={16} />
          <input
            aria-label={tr ? "Üyelerde ara" : "Search members"}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisibleCount(10);
            }}
            placeholder={tr ? "Kullanıcı adı veya ad soyad" : "Username or full name"}
            value={query}
          />
        </label>
        <button
          className="create-inline-link"
          onClick={() => {
            void exportGuestList(
              tr ? "Mekân üye listesi" : "Place member list",
              exportData,
              language,
            );
          }}
          type="button"
        >
          {tr ? "Dışa aktar" : "Export"}
        </button>
      </div>
      <div className="management-list">
        {ordered.slice(0, visibleCount).map((item) => (
          <article key={item.userId}>
            <div className="management-person">
              <Link
                className="management-avatar"
                to={`/users/id/${item.userId}`}
              >
                {item.user?.avatarUrl ? (
                  <img alt="" src={resolveMediaUrl(item.user.avatarUrl)} />
                ) : (
                  <span>
                    {(item.user?.name ?? "?").slice(0, 1).toUpperCase()}
                  </span>
                )}
              </Link>
              <div>
                <strong>
                  <Link to={`/users/id/${item.userId}`}>
                    {item.user?.username
                      ? `@${item.user.username}`
                      : (item.user?.name ?? item.userId)}
                  </Link>
                </strong>
                <span>
                  <Link to={`/users/id/${item.userId}`}>{item.user?.name}</Link>
                </span>
                <small>
                  {translateRole(item.role, language)} · {translateStatus(item.status, language)}
                  {item.checkedInAt
                    ? ` · ${new Date(item.checkedInAt).toLocaleString(locale)}`
                    : ""}
                </small>
              </div>
            </div>
            <div className="row-actions">
              {item.status === "invited" ? (
                <>
                  <button
                    className="management-action management-action-approve"
                    disabled={pending}
                    onClick={() =>
                      onUpdate(item.userId, { status: "accepted" })
                    }
                    type="button"
                  >
                    <CheckCircle2 size={16} />
                    {tr ? "Onayla" : "Approve"}
                  </button>
                  <button
                    className="management-action management-action-reject"
                    disabled={pending}
                    onClick={() =>
                      onUpdate(item.userId, { status: "declined" })
                    }
                    type="button"
                  >
                    <XCircle size={16} />
                    {tr ? "Reddet" : "Reject"}
                  </button>
                </>
              ) : null}
              {item.status === "accepted" ? (
                <>
                  <select
                    aria-label={tr ? "Üye rolü" : "Member role"}
                    disabled={pending}
                    value={item.role}
                    onChange={(event) =>
                      onUpdate(item.userId, { role: event.target.value })
                    }
                  >
                    <option value="member">{tr ? "Üye" : "Member"}</option>
                    <option value="manager">{tr ? "Sahip" : "Owner"}</option>
                    <option value="organizer">{tr ? "Organizatör" : "Organizer"}</option>
                  </select>
                  <button
                    className="management-action management-action-checkin"
                    disabled={pending}
                    onClick={() => onPassport(item.userId)}
                    type="button"
                  >
                    <QrCode size={16} />
                    {tr ? "Pasaport kontrol" : "Check passport"}
                  </button>
                </>
              ) : null}
              <GuestListPicker
                context={{ id: item.placeId, type: "place" }}
                lists={guestLists}
                onAdd={(listId) => onAddToGuestList(listId, item.userId)}
                target={{ id: item.userId, name: item.user?.name ?? item.userId, username: item.user?.username, avatarUrl: item.user?.avatarUrl, status: item.status, role: item.role, checkedIn: Boolean(item.checkedInAt) }}
              />
            </div>
          </article>
        ))}
      </div>
      {visibleCount < ordered.length ? (
        <button
          className="secondary-action"
          onClick={() => setVisibleCount((count) => count + 10)}
          type="button"
        >
          {tr ? "Daha fazla" : "More"}
        </button>
      ) : null}
      {!ordered.length ? (
        <p className="form-help">
          {tr ? "Aramanızla eşleşen üye bulunamadı." : "No members matched your search."}
        </p>
      ) : null}
    </section>
  );
}

function CheckInHistory({
  context,
  items,
  guestLists,
  onAddToGuestList,
}: {
  context: GuestListContext;
  items: Array<{
    id: string;
    name: string;
    checkedInAt: string | Date;
    user?: EventParticipant["user"] | PlaceMember["user"];
    method: string;
    decision: "attended" | "declined";
    order: number | null;
    followerCount: number;
    relatedFollowerCount: number;
  }>;
  guestLists: GuestLists;
  onAddToGuestList: (listId: string, userId: string) => void;
}) {
  const { language } = useLanguage();
  const tr = language === "tr";
  const locale = tr ? "tr-TR" : "en-US";
  const [visibleCount, setVisibleCount] = useState(10);
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("tr-TR");
  const ordered = [...items]
    .filter(
      (item) =>
        !normalized ||
        `${item.user?.username ?? ""} ${item.name}`
          .toLocaleLowerCase("tr-TR")
          .includes(normalized),
    )
    .sort(
      (a, b) =>
        new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime(),
    );
  return (
    <section className="admin-form checkin-list-panel">
      <div className="section-header compact checkin-list-header">
        <h2>
          <CheckCircle2 size={20} />
          {tr ? "Check-in geçmişi" : "Check-in history"} <small>{items.length}</small>
        </h2>
        <label className="checkin-search">
          <Search size={16} />
          <input
            aria-label={tr ? "Check-in geçmişinde ara" : "Search check-in history"}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisibleCount(10);
            }}
            placeholder={tr ? "Kullanıcı adı veya ad soyad" : "Username or full name"}
            value={query}
          />
        </label>
      </div>
      <div className="management-list">
        {ordered.slice(0, visibleCount).map((item) => (
          <article key={item.id}>
            <div className="management-person">
              <Link
                className="management-avatar"
                to={`/users/id/${item.user?.id ?? ""}`}
              >
                {item.user?.avatarUrl ? (
                  <img alt="" src={resolveMediaUrl(item.user.avatarUrl)} />
                ) : (
                  <span>{item.name.slice(0, 1).toUpperCase()}</span>
                )}
              </Link>
              <div>
                <strong>
                  <Link to={`/users/id/${item.user?.id ?? ""}`}>
                    {item.user?.username ? `@${item.user.username}` : item.name}
                  </Link>
                </strong>
                <span>{item.name}</span>
                <small>
                  {new Date(item.checkedInAt).toLocaleString(locale)} ·{" "}
                  {item.method.toUpperCase()}
                  {item.order ? ` · #${item.order}` : ""}
                </small>
                <small>
                  {item.followerCount} {tr ? "takipçi" : "followers"} ·{" "}
                  {item.relatedFollowerCount} {tr ? "tanesi burada" : "are here"}
                </small>
              </div>
            </div>
            <div className="row-actions">
              <span className={`status-pill status-${item.decision}`}>
                {item.decision === "attended"
                  ? tr
                    ? "Giriş yaptı"
                    : "Checked in"
                  : tr
                    ? "Giriş reddedildi"
                    : "Entry declined"}
              </span>
              {item.user?.id ? (
                <GuestListPicker
                  context={context}
                  lists={guestLists}
                  onAdd={(listId) => onAddToGuestList(listId, item.user!.id)}
                  target={{ id: item.user.id, name: item.user.name ?? item.name, username: item.user.username, avatarUrl: item.user.avatarUrl, status: item.decision, checkedIn: item.decision === "attended" }}
                />
              ) : null}
            </div>
          </article>
        ))}
      </div>
      {visibleCount < ordered.length ? (
        <button
          className="secondary-action"
          onClick={() => setVisibleCount((count) => count + 10)}
          type="button"
        >
          {tr ? "Daha fazla" : "More"}
        </button>
      ) : null}
      {!ordered.length ? (
        <p className="form-help">
          {tr ? "Henüz check-in kaydı yok." : "There are no check-in records yet."}
        </p>
      ) : null}
    </section>
  );
}

function GuestListPicker({
  context,
  lists,
  onAdd,
  target,
}: {
  context?: GuestListContext;
  lists: GuestLists;
  onAdd: (listId: string) => void;
  target?: GuestListTarget;
}) {
  const { language } = useLanguage();
  const tr = language === "tr";
  const { canUseGuestLists } = useGuestListEntitlement();
  if (target) return <GuestListAction canUse={canUseGuestLists} context={context} target={target}/>;
  if (!lists.length) return null;
  return (
    <select
      aria-label={tr ? "Guest liste ekle" : "Add to guest list"}
      className="guest-list-picker"
      defaultValue=""
      onChange={(event) => {
        if (event.target.value) onAdd(event.target.value);
        event.target.value = "";
      }}
    >
      <option disabled value="">
        {tr ? "Guest liste ekle" : "Add to guest list"}
      </option>
      {[...lists]
        .filter((list) => list.access !== "read")
        .sort((a, b) => a.name.localeCompare(b.name, tr ? "tr" : "en"))
        .map((list) => (
          <option key={list.id} value={list.id}>
            {list.name} ({list.members.length})
          </option>
        ))}
    </select>
  );
}

function CheckInPassportDialog({
  guestLists,
  passport,
  pending,
  onAddToGuestList,
  onClose,
  onDecision,
}: {
  guestLists: GuestLists;
  passport: CheckInPassport;
  pending: boolean;
  onAddToGuestList: (listId: string, userId: string) => void;
  onClose: () => void;
  onDecision: (decision: "admit" | "decline") => void;
}) {
  const { language } = useLanguage();
  const tr = language === "tr";
  const { canUseGuestLists } = useGuestListEntitlement();
  const locale = tr ? "tr-TR" : "en-US";
  const media = passport.user.media ?? [];
  return (
    <div aria-modal="true" className="passport-backdrop" role="dialog">
      <section className="checkin-passport">
        <header>
          <div>
            <p className="eyebrow">
              {passport.targetType === "event"
                ? tr
                  ? "Etkinlik pasaportu"
                  : "Event passport"
                : tr
                  ? "Mekân pasaportu"
                  : "Place passport"}
            </p>
            <h2>{tr ? "Pasaport Kontrol" : "Passport Check"}</h2>
            <small>{passport.targetName}</small>
          </div>
          <button
            aria-label={tr ? "Pasaportu kapat" : "Close passport"}
            className="passport-close"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </header>
        {media.length ? (
          <div className="passport-media">
            {media.map((item) =>
              item.type.startsWith("video") ? (
                <video controls key={item.id} src={resolveMediaUrl(item.url)} />
              ) : (
                <img
                  alt={
                    tr
                      ? `${passport.user.name} profil medyası`
                      : `${passport.user.name} profile media`
                  }
                  key={item.id}
                  src={resolveMediaUrl(item.url)}
                />
              ),
            )}
          </div>
        ) : (
          <div className="passport-avatar">
            {passport.user.avatarUrl ? (
              <img alt="" src={resolveMediaUrl(passport.user.avatarUrl)} />
            ) : (
              passport.user.name.slice(0, 1).toUpperCase()
            )}
          </div>
        )}
        <div className="passport-identity">
          <div>
            <h3>
              {passport.user.username
                ? `@${passport.user.username}`
                : passport.user.name}
              {passport.user.profileVerifiedAt ? (
                <BadgeCheck
                  aria-label={tr ? "Doğrulanmış profil" : "Verified profile"}
                  size={20}
                />
              ) : null}
            </h3>
            <p>{passport.user.name}</p>
          </div>
          <span
            className={`status-pill status-${passport.alreadyInside ? "attended" : passport.status}`}
          >
            {passport.alreadyInside
              ? tr
                ? "İçeride"
                : "Inside"
              : translateStatus(passport.status, language)}
          </span>
        </div>
        {passport.alreadyInside ? (
          <div className="passport-warning">
            {tr ? "Kullanıcı zaten check-in içeride" : "The user is already checked in"}
            {passport.checkedInAt
              ? `: ${new Date(passport.checkedInAt).toLocaleString(locale)}`
              : "."}
          </div>
        ) : null}
        <dl className="passport-facts">
          <div>
            <dt>{tr ? "Rol" : "Role"}</dt>
            <dd>{translateRole(passport.role, language)}</dd>
          </div>
          <div>
            <dt>{tr ? "Paket" : "Plan"}</dt>
            <dd>
              {passport.user.plan
                ? translatePlan(passport.user.plan, language)
                :
                (passport.user.accountType === "corporate"
                  ? tr
                    ? "Kurumsal Başlangıç"
                    : "Corporate Starter"
                  : tr
                    ? "Standart"
                    : "Standard")}
            </dd>
          </div>
          <div>
            <dt>{tr ? "Takipçi" : "Followers"}</dt>
            <dd>{passport.user.followerCount}</dd>
          </div>
          <div>
            <dt>{tr ? "İlgili takipçi" : "Relevant followers"}</dt>
            <dd>{passport.relatedFollowerCount}</dd>
          </div>
          <div>
            <dt>{tr ? "Davet eden" : "Invited by"}</dt>
            <dd>{passport.invitedBy.join(", ") || "—"}</dd>
          </div>
          <div>
            <dt>Guest list</dt>
            <dd>
              {[...passport.guestLists]
                .sort((a, b) => a.name.localeCompare(b.name, tr ? "tr" : "en"))
                .map((list) => list.name)
                .join(", ") || "—"}
            </dd>
          </div>
        </dl>
        {canUseGuestLists ? <div className="passport-guest-list-action"><div><strong>Guest List</strong><span>{tr ? "Bu kişiyi tekrar kullanılabilir listelerine ekle." : "Add this person to your reusable lists."}</span></div><GuestListPicker context={{ id: passport.targetId, name: passport.targetName, type: passport.targetType }} lists={guestLists} onAdd={(listId) => onAddToGuestList(listId, passport.user.id)} target={{ id: passport.user.id, name: passport.user.name, username: passport.user.username, avatarUrl: passport.user.avatarUrl, accountType: passport.user.accountType, plan: passport.user.plan, status: passport.status, role: passport.role, checkedIn: passport.alreadyInside }}/></div> : null}
        {passport.relatedPlace ? (
          <div className="passport-related-place">
            <h3>{tr ? "Mekân durumu" : "Place status"}</h3>
            <p>
              <strong>{passport.relatedPlace.name}</strong> ·{" "}
              {translateStatus(passport.relatedPlace.status, language)} ·{" "}
              {translateRole(passport.relatedPlace.role, language)}
              {passport.relatedPlace.order
                ? ` · #${passport.relatedPlace.order}`
                : ""}
            </p>
            {passport.relatedPlace.invitedBy.length ? (
              <small>
                {tr ? "Davet eden" : "Invited by"}: {passport.relatedPlace.invitedBy.join(", ")}
              </small>
            ) : null}
          </div>
        ) : null}
        {passport.tickets.length ? (
          <div className="passport-tickets">
            <h3>
              <Ticket size={18} />
              {tr ? "Biletler" : "Tickets"}
            </h3>
            {passport.tickets.map((ticket) => (
              <div key={ticket.id}>
                <strong>{ticket.name}</strong>
                <span>
                  {ticket.quantity} {tr ? "adet" : "qty"} · {ticket.unitPrice}{" "}
                  {ticket.currency}
                </span>
                {ticket.description ? (
                  <small>{ticket.description}</small>
                ) : null}
                {ticket.gateOpensAt || ticket.gateClosesAt ? (
                  <small>
                    Gate: {formatGate(ticket.gateOpensAt, ticket.gateClosesAt, locale)}
                  </small>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        <footer>
          <button
            className="management-action management-action-reject"
            disabled={pending || passport.alreadyInside}
            onClick={() => onDecision("decline")}
            type="button"
          >
            <XCircle size={17} />
            {tr ? "Girişi reddet" : "Decline entry"}
          </button>
          <button
            className="management-action management-action-checkin"
            disabled={pending || passport.alreadyInside}
            onClick={() => onDecision("admit")}
            type="button"
          >
            <CheckCircle2 size={17} />
            {pending
              ? tr
                ? "Kaydediliyor…"
                : "Saving…"
              : tr
                ? "İçeri al"
                : "Come in"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function surname(name?: string) {
  return name?.trim().split(/\s+/).at(-1) ?? "";
}

function formatGate(
  open: string | Date | null,
  close: string | Date | null,
  locale = "tr-TR",
) {
  const value = (date: string | Date | null) =>
    date ? new Date(date).toLocaleString(locale) : "—";
  return `${value(open)} – ${value(close)}`;
}

function translateStatus(status: string, language: "tr" | "en") {
  const labels: Record<string, [string, string]> = {
    requested: ["Talep etti", "Requested"],
    invited: ["Davet edildi", "Invited"],
    accepted: ["Kabul edildi", "Accepted"],
    declined: ["Reddedildi", "Declined"],
    attended: ["Giriş yaptı", "Checked in"],
    active: ["Aktif", "Active"],
    pending: ["Bekliyor", "Pending"],
  };
  const label = labels[status];
  return label ? label[language === "tr" ? 0 : 1] : status;
}

function translateRole(role: string, language: "tr" | "en") {
  const labels: Record<string, [string, string]> = {
    attendee: ["Katılımcı", "Attendee"],
    member: ["Üye", "Member"],
    manager: ["Sahip", "Owner"],
    organizer: ["Organizatör", "Organizer"],
    owner: ["Sahip", "Owner"],
  };
  const label = labels[role];
  return label ? label[language === "tr" ? 0 : 1] : role;
}

function translatePlan(plan: string, language: "tr" | "en") {
  if (language === "tr") return plan;
  if (plan === "Küratör") return "Curator";
  if (plan === "Standart") return "Standard";
  if (plan === "Kurumsal Başlangıç") return "Corporate Starter";
  return plan.replace(/^Kurumsal\s+/i, "Corporate ");
}

async function exportGuestList(
  title: string,
  rows: Array<{
    name: string;
    username: string;
    status: string;
    role: string;
    joinedAt: string;
    order: string;
    details: string;
  }>,
  language: "tr" | "en",
) {
  const [pdfMake, fontModule] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);
  const virtualFonts = fontModule.default as unknown as Record<string, string>;
  const headings =
    language === "tr"
      ? [
          "Soyad / Ad",
          "Kullanıcı adı",
          "Rol",
          "Durum",
          "Katılım tarihi",
          "Sıra",
          "Bilet / Kapı",
        ]
      : [
          "Surname / Name",
          "Username",
          "Role",
          "Status",
          "Participation date",
          "Order",
          "Ticket / Gate",
        ];
  const body: TableCell[][] = [
    headings.map((heading) => ({
      text: heading,
      bold: true,
      color: "#174d36",
      fillColor: "#edf6f0",
      margin: [3, 4, 3, 4],
    })),
    ...rows.map((row) =>
      [
        row.name,
        row.username ? `@${row.username}` : "",
        row.role,
        row.status,
        row.joinedAt,
        row.order,
        row.details,
      ].map((value) => ({ text: value, margin: [3, 3, 3, 3] }) as TableCell),
    ),
  ];
  const document: TDocumentDefinitions = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [28, 32, 28, 32],
    defaultStyle: {
      font: "Roboto",
      fontSize: 7.5,
      color: "#17231d",
    },
    content: [
      { text: title, style: "title" },
      {
        text:
          language === "tr"
            ? `${rows.length} kayıt · ${new Date().toLocaleString("tr-TR")}`
            : `${rows.length} records · ${new Date().toLocaleString("en-GB")}`,
        color: "#5c6d64",
        margin: [0, 2, 0, 14],
      },
      {
        table: {
          headerRows: 1,
          widths: ["auto", "auto", "auto", "auto", "auto", "auto", "*"],
          body,
        },
        layout: "lightHorizontalLines",
      },
    ],
    styles: {
      title: {
        fontSize: 17,
        bold: true,
        color: "#174d36",
      },
    },
  };
  const filename = `${title
    .toLocaleLowerCase(language === "tr" ? "tr-TR" : "en-GB")
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-") || "guest-list"}.pdf`;
  pdfMake.createPdf(document, undefined, undefined, virtualFonts).download(filename);
}

function LoginState() {
  const { language } = useLanguage();
  const tr = language === "tr";
  return (
    <section className="page empty-state">
      <LogIn size={38} />
      <h1>{tr ? "Davet yönetimi" : "Invite management"}</h1>
      <p>
        {tr
          ? "Bu alanı kullanmak için giriş yap."
          : "Sign in to use this area."}
      </p>
      <Link className="primary-action" to="/login">
        {tr ? "Giriş yap" : "Sign in"}
      </Link>
    </section>
  );
}
function PermissionState() {
  const { language } = useLanguage();
  const tr = language === "tr";
  return (
    <div className="empty-state">
      <Users size={36} />
      <h2>{tr ? "Yönetim yetkisi gerekiyor" : "Management permission required"}</h2>
      <p>
        {tr
          ? "Bu listeyi yalnız organizatörler ve yöneticiler görebilir."
          : "Only organizers and managers can view this list."}
      </p>
    </div>
  );
}
