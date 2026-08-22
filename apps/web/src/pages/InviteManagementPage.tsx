import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EventParticipant, PlaceMember } from "@konnektora/shared";
import {
  CheckCircle2,
  Clipboard,
  LogIn,
  Mail,
  QrCode,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QrCheckInScanner } from "../components/QrCheckInScanner";
import {
  checkInEventParticipant,
  checkInPlaceMember,
  createGuestList,
  deleteGuestList,
  getEvent,
  getFinanceDashboard,
  getPlace,
  getUserSession,
  inviteEventParticipant,
  invitePlaceMember,
  listGuestLists,
  listEventParticipants,
  listFollowing,
  listMyEvents,
  listPlaceMembers,
  removeGuestListMember,
  renameGuestList,
  scanEventTicket,
  scanPlaceMemberPass,
  updateEventParticipantStatus,
  updatePlaceMember,
} from "../lib/api";

type InviteMethod = "following" | "guest_lists" | "old_attendees" | "username" | "email" | "phone" | "phonebook" | "gmail";

export function EventInviteManagementPage() {
  const { slug = "" } = useParams();
  const user = getUserSession();
  const [inviteMethod, setInviteMethod] = useState<InviteMethod>("following");
  const client = useQueryClient();
  const event = useQuery({
    queryKey: ["event", slug],
    queryFn: () => getEvent(slug),
    enabled: Boolean(slug && user),
  });
  const canManage = Boolean(event.data && user && (event.data.createdById === user.id || event.data.viewerParticipation?.status === "accepted" && ["organizer", "manager"].includes(event.data.viewerParticipation.role) || ["admin", "super_admin", "curator"].includes(user.role)));
  const participants = useQuery({
    queryKey: ["event-participants", event.data?.id],
    queryFn: () => listEventParticipants(event.data!.id, "user"),
    enabled: canManage,
    retry: false,
  });
  const following = useQuery({ queryKey: ["following", user?.id], queryFn: listFollowing, enabled: Boolean(user) });
  const managedEvents = useQuery({ queryKey: ["my-events", user?.id], queryFn: listMyEvents, enabled: canManage });
  const finance = useQuery({ queryKey: ["finance", user?.id, "invite-entitlement"], queryFn: getFinanceDashboard, enabled: Boolean(user?.accountType === "corporate") });
  const canUseGuestLists = Boolean(canManage && user && (["admin", "super_admin", "curator"].includes(user.role) || user.accountType === "corporate" && finance.data?.business.plan !== "starter"));
  const guestLists = useQuery({ queryKey: ["guest-lists", user?.id], queryFn: listGuestLists, enabled: Boolean(user && canUseGuestLists) });
  const oldEventQueries = useQueries({ queries: (managedEvents.data ?? []).filter((item) => item.id !== event.data?.id).slice(0, 5).map((item) => ({ queryKey: ["event-participants", item.id, "invite-source"], queryFn: () => listEventParticipants(item.id, "user"), enabled: Boolean(event.data) })) });
  const previousAttendees = oldEventQueries.flatMap((query) => query.data ?? []).filter((item, index, all) => item.user && all.findIndex((other) => other.userId === item.userId) === index);
  const refresh = () => {
    void client.invalidateQueries({
      queryKey: ["event-participants", event.data?.id],
    });
  };
  const invite = useMutation({
    mutationFn: (input: { userId?: string; username?: string; email?: string; phone?: string; name?: string; role?: string }) =>
      inviteEventParticipant(event.data!.id, input, "user"),
    onSuccess: refresh,
  });
  const bulkInvite = useMutation({
    mutationFn: async (listId: string) => {
      const source = guestLists.data?.find((item) => item.id === listId)?.members ?? [];
      await Promise.all(source.map((item) => inviteEventParticipant(event.data!.id, { userId: item.userId, role: "attendee" }, "user")));
    },
    onSuccess: refresh,
  });
  const status = useMutation({
    mutationFn: ({ userId, value }: { userId: string; value: string }) =>
      updateEventParticipantStatus(event.data!.id, userId, value, "user"),
    onSuccess: refresh,
  });
  const checkIn = useMutation({
    mutationFn: (userId: string) =>
      checkInEventParticipant(event.data!.id, userId, "user"),
    onSuccess: refresh,
  });
  const scan = useMutation({
    mutationFn: (raw: string) => {
      let token = raw;
      try {
        token = new URL(raw).searchParams.get("token") ?? raw;
      } catch {
        /* Fiziksel okuyucu yalnız token döndürebilir. */
      }
      return scanEventTicket(event.data!.id, token);
    },
    onSuccess: refresh,
  });
  if (!user) return <LoginState />;
  if (event.isLoading)
    return <section className="page">Davet yönetimi yükleniyor…</section>;
  if (!event.data)
    return (
      <section className="page empty-state">
        <h1>Etkinlik bulunamadı</h1>
      </section>
    );
  return (
    <ManagementShell
      title={event.data.title}
      back={`/events/${event.data.slug}`}
      shareUrl={`${window.location.origin}/events/${event.data.slug}`}
      kind="Etkinlik"
    >
      <InviteMethodPicker active={inviteMethod} includeOldEvents={canManage} includeGuestLists={canUseGuestLists} onChange={setInviteMethod}/>
      {["username", "email", "phone"].includes(inviteMethod) ? <InviteForm
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
      /> : null}
      {inviteMethod === "following" ? <InviteSource title="Takip ettiklerim">{following.data?.map((member) => <button disabled={invite.isPending} key={member.id} onClick={() => invite.mutate({ userId: member.id, role: "attendee" })} type="button"><UserPlus size={16}/>{member.name}</button>)}</InviteSource> : null}
      {inviteMethod === "guest_lists" && canUseGuestLists ? <GuestListManager lists={guestLists.data ?? []} pending={bulkInvite.isPending} onInvite={(id) => bulkInvite.mutate(id)} onChanged={() => void client.invalidateQueries({ queryKey: ["guest-lists", user?.id] })}/> : null}
      {inviteMethod === "old_attendees" ? <InviteSource title="Eski etkinlik katılımcıları">{previousAttendees.map((participant) => <button disabled={invite.isPending} key={participant.userId} onClick={() => invite.mutate({ userId: participant.userId, role: "attendee" })} type="button"><Users size={16}/>{participant.user?.name ?? participant.userId}</button>)}</InviteSource> : null}
      {inviteMethod === "phonebook" ? <InviteSource title="Telefon rehberi"><Link className="secondary-action" to="/contacts?source=phone">Telefon rehberini tara</Link></InviteSource> : null}
      {inviteMethod === "gmail" ? <InviteSource title="Gmail"><Link className="secondary-action" to="/contacts?source=google">Google Contacts ile tara</Link></InviteSource> : null}
      {canManage ? <><QrCheckInScanner
        label="Etkinlik QR check-in"
        pending={scan.isPending}
        onScan={(payload) => scan.mutateAsync(payload).then(() => undefined)}
      />
      {participants.isError ? (
        <PermissionState />
      ) : (
        <EventGuestList
          items={participants.data ?? []}
          pending={status.isPending || checkIn.isPending}
          onStatus={(userId, value) => status.mutate({ userId, value })}
          onCheckIn={(userId) => checkIn.mutate(userId)}
        />
      )}
      <CheckInHistory
        items={(participants.data ?? [])
          .filter((item) => item.checkedInAt)
          .map((item) => ({
            id: item.id,
            name: item.user?.name ?? item.userId,
            checkedInAt: item.checkedInAt!,
          }))}
      /></> : null}
    </ManagementShell>
  );
}

export function PlaceInviteManagementPage() {
  const { slug = "" } = useParams();
  const user = getUserSession();
  const [inviteMethod, setInviteMethod] = useState<InviteMethod>("following");
  const client = useQueryClient();
  const place = useQuery({
    queryKey: ["place", slug],
    queryFn: () => getPlace(slug),
    enabled: Boolean(slug && user),
  });
  const members = useQuery({
    queryKey: ["place-members", place.data?.id],
    queryFn: () => listPlaceMembers(place.data!.id),
    enabled: Boolean(place.data && user),
    retry: false,
  });
  const following = useQuery({ queryKey: ["following", user?.id], queryFn: listFollowing, enabled: Boolean(user) });
  const refresh = () => {
    void client.invalidateQueries({
      queryKey: ["place-members", place.data?.id],
    });
  };
  const invite = useMutation({
    mutationFn: (input: { userId?: string; username?: string; email?: string; phone?: string; name?: string; role?: string }) =>
      invitePlaceMember(place.data!.id, input),
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
  const checkIn = useMutation({
    mutationFn: (userId: string) => checkInPlaceMember(place.data!.id, userId),
    onSuccess: refresh,
  });
  const scan = useMutation({
    mutationFn: (payload: string) =>
      scanPlaceMemberPass(place.data!.id, payload),
    onSuccess: refresh,
  });
  if (!user) return <LoginState />;
  if (place.isLoading)
    return <section className="page">Davet yönetimi yükleniyor…</section>;
  if (!place.data)
    return (
      <section className="page empty-state">
        <h1>Mekân bulunamadı</h1>
      </section>
    );
  return (
    <ManagementShell
      title={place.data.name}
      back={`/places/${place.data.slug}`}
      shareUrl={`${window.location.origin}/places/${place.data.slug}`}
      kind="Mekân"
    >
      <InviteMethodPicker active={inviteMethod} includeGuestLists onChange={setInviteMethod}/>
      {["username", "email", "phone"].includes(inviteMethod) ? <InviteForm
        method={inviteMethod as "username" | "email" | "phone"}
        pending={invite.isPending}
        onSubmit={(form) =>
          invite.mutate({
            username: form.username,
            name: form.name,
            email: form.email,
            phone: form.phone,
            role: form.role,
          })
        }
      /> : null}
      {inviteMethod === "following" ? <InviteSource title="Takip ettiklerim">{following.data?.map((member) => <button disabled={invite.isPending} key={member.id} onClick={() => invite.mutate({ userId: member.id, role: "member" })} type="button"><UserPlus size={16}/>{member.name}</button>)}</InviteSource> : null}
      {inviteMethod === "guest_lists" ? <InviteSource title="Guest listeler"><Link className="secondary-action" to="/community">Topluluk ve guest listelerden seç</Link></InviteSource> : null}
      {inviteMethod === "phonebook" ? <InviteSource title="Telefon rehberi"><Link className="secondary-action" to="/contacts?source=phone">Telefon rehberini tara</Link></InviteSource> : null}
      {inviteMethod === "gmail" ? <InviteSource title="Gmail"><Link className="secondary-action" to="/contacts?source=google">Google Contacts ile tara</Link></InviteSource> : null}
      <QrCheckInScanner
        label="Mekân üye kartı check-in"
        pending={scan.isPending}
        onScan={(payload) => scan.mutateAsync(payload).then(() => undefined)}
      />
      {members.isError ? (
        <PermissionState />
      ) : (
        <PlaceMemberList
          items={members.data ?? []}
          pending={update.isPending || checkIn.isPending}
          onUpdate={(userId, input) => update.mutate({ userId, input })}
          onCheckIn={(userId) => checkIn.mutate(userId)}
        />
      )}
      <CheckInHistory
        items={(members.data ?? [])
          .filter((item) => item.checkedInAt)
          .map((item) => ({
            id: `${item.placeId}-${item.userId}`,
            name: item.user?.name ?? item.userId,
            checkedInAt: item.checkedInAt!,
          }))}
      />
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
  return (
    <main className="page invite-management">
      <Link className="back-link" to={back}>
        ← Detaya dön
      </Link>
      <header className="section-header">
        <div>
          <p className="eyebrow">{kind} yönetimi</p>
          <h1>{title}</h1>
          <p>
            Davetleri, katılım durumlarını ve check-in işlemlerini tek yerden
            yönet.
          </p>
        </div>
        <button
          className="secondary-action"
          onClick={() => void navigator.clipboard.writeText(shareUrl)}
        >
          <Clipboard size={17} />
          Davet bağlantısını kopyala
        </button>
      </header>
      {children}
    </main>
  );
}

function InviteMethodPicker({ active, includeOldEvents = false, includeGuestLists = false, onChange }: { active: InviteMethod; includeOldEvents?: boolean; includeGuestLists?: boolean; onChange: (method: InviteMethod) => void }) {
  const methods: Array<[InviteMethod, string]> = [
    ["following", "Takip ettiklerimden seç"],
    ...(includeGuestLists ? [["guest_lists", "Guest listeden seç"] as [InviteMethod, string]] : []),
    ...(includeOldEvents ? [["old_attendees", "Eski etkinlik katılımcıları"] as [InviteMethod, string]] : []),
    ["username", "Kullanıcı adı veya ad soyad"],
    ["email", "E-posta adresi"],
    ["phone", "Telefon numarası"],
    ["phonebook", "Telefon rehberini tara"],
    ["gmail", "Gmail'i tara"],
  ];
  return <section className="admin-form invite-method-picker"><h2>Davet yöntemini seç</h2><div>{methods.map(([value, label]) => <button className={active === value ? "active" : ""} key={value} onClick={() => onChange(value)} type="button">{label}</button>)}</div></section>;
}

function InviteSource({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="admin-form invite-source-section"><h2>{title}</h2><div className="invite-source-list">{children}</div></section>;
}

function GuestListManager({ lists, pending, onInvite, onChanged }: { lists: Awaited<ReturnType<typeof listGuestLists>>; pending: boolean; onInvite: (id: string) => void; onChanged: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const create = useMutation({ mutationFn: createGuestList, onSuccess: onChanged });
  const rename = useMutation({ mutationFn: ({ id, name }: { id: string; name: string }) => renameGuestList(id, name), onSuccess: () => { setEditingId(null); onChanged(); } });
  const remove = useMutation({ mutationFn: deleteGuestList, onSuccess: () => { setDeletingId(null); onChanged(); } });
  const removeMember = useMutation({ mutationFn: ({ id, userId }: { id: string; userId: string }) => removeGuestListMember(id, userId), onSuccess: onChanged });
  return <section className="admin-form guest-list-manager"><div className="section-header compact"><h2>Guest listeler</h2><form onSubmit={(event) => { event.preventDefault(); const input = event.currentTarget.elements.namedItem("name") as HTMLInputElement; if (input.value.trim()) { create.mutate(input.value.trim()); input.value = ""; } }}><input name="name" placeholder="Yeni liste adı"/><button className="secondary-action" disabled={create.isPending}>Oluştur</button></form></div>{lists.map((list) => <article key={list.id}><header><div>{editingId === list.id ? <form className="guest-list-rename" onSubmit={(event) => { event.preventDefault(); if (editingName.trim()) rename.mutate({ id: list.id, name: editingName.trim() }); }}><input aria-label="Guest list adı" autoFocus value={editingName} onChange={(event) => setEditingName(event.target.value)}/><button disabled={rename.isPending}>Kaydet</button><button onClick={() => setEditingId(null)} type="button">Vazgeç</button></form> : <strong>{list.name}</strong>}<span>{list.members.length} kişi</span></div><div className="row-actions"><button disabled={pending || !list.members.length} onClick={() => onInvite(list.id)} type="button">Etkinliğe davet et</button><button onClick={() => { setEditingId(list.id); setEditingName(list.name); setDeletingId(null); }} type="button">Düzenle</button>{deletingId === list.id ? <><button className="danger" disabled={remove.isPending} onClick={() => remove.mutate(list.id)} type="button">Silmeyi onayla</button><button onClick={() => setDeletingId(null)} type="button">Vazgeç</button></> : <button className="danger" onClick={() => { setDeletingId(list.id); setEditingId(null); }} type="button">Sil</button>}</div></header><div className="guest-list-member-chips">{list.members.map((member) => <span key={member.id}>{member.user.name}<button aria-label={`${member.user.name} kişisini listeden çıkar`} onClick={() => removeMember.mutate({ id: list.id, userId: member.userId })} type="button">×</button></span>)}</div></article>)}{!lists.length ? <p className="form-help">Henüz bir guest list oluşturmadın.</p> : null}</section>;
}

function InviteForm({
  method,
  pending,
  canAssignRole = true,
  onSubmit,
}: {
  method: "username" | "email" | "phone";
  pending: boolean;
  canAssignRole?: boolean;
  onSubmit: (input: {
    username?: string;
    email?: string;
    phone?: string;
    name?: string;
    role: string;
  }) => void;
}) {
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
        const phone = String(form.get("phone") || "").trim().replace(/[\s()-]/g, "");
        const name = String(form.get("name") || "").trim();
        if (username || email || phone || name)
          onSubmit({
            username: username || undefined,
            email: email || undefined,
            phone: phone || undefined,
            name: name || undefined,
            role: String(form.get("role") || "attendee"),
          });
      }}
    >
      <h2>
        <UserPlus size={20} />
        Yeni davet
      </h2>
      <div className="form-grid">
        {method === "username" ? <><label>
          Kullanıcı adı
          <input name="username" placeholder="@kullanici" />
        </label>
        <label>
          Ad soyad
          <input name="name" placeholder="Ad Soyad" />
        </label></> : null}
        {method === "email" ? <label>
          E-posta
          <input name="email" type="email" placeholder="uye@example.com" />
        </label> : null}
        {method === "phone" ? <label>
          Telefon
          <input name="phone" inputMode="tel" pattern="\+?[1-9][0-9]{7,14}" placeholder="+905551234567" />
        </label> : null}
        {canAssignRole ? <label>
          Rol
          <select name="role">
            <option value="attendee">Katılımcı / üye</option>
            <option value="manager">Yönetici</option>
            <option value="organizer">Organizatör</option>
          </select>
        </label> : null}
      </div>
      <button className="primary-action" disabled={pending}>
        <Mail size={17} />
        {pending ? "Gönderiliyor…" : "Davet gönder"}
      </button>
    </form>
  );
}

function EventGuestList({
  items,
  pending,
  onStatus,
  onCheckIn,
}: {
  items: EventParticipant[];
  pending: boolean;
  onStatus: (id: string, status: string) => void;
  onCheckIn: (id: string) => void;
}) {
  return (
    <section className="admin-form">
      <h2>
        <Users size={20} />
        Misafir listesi <small>{items.length}</small>
      </h2>
      <div className="management-list">
        {items.map((item) => (
          <article key={item.userId}>
            <div>
              <strong>{item.user?.name ?? item.userId}</strong>
              <span>{item.user?.email}</span>
              <small>
                {item.role} · {item.status}
                {item.checkedInAt
                  ? ` · ${new Date(item.checkedInAt).toLocaleString("tr-TR")}`
                  : ""}
              </small>
            </div>
            <div className="row-actions">
              {item.status === "requested" || item.status === "invited" ? (
                <>
                  <button
                    disabled={pending}
                    onClick={() => onStatus(item.userId, "accepted")}
                  >
                    <CheckCircle2 size={16} />
                    Onayla
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => onStatus(item.userId, "declined")}
                  >
                    <XCircle size={16} />
                    Reddet
                  </button>
                </>
              ) : null}
              {item.status === "accepted" ? (
                <button
                  disabled={pending}
                  onClick={() => onCheckIn(item.userId)}
                >
                  <QrCode size={16} />
                  Check-in
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PlaceMemberList({
  items,
  pending,
  onUpdate,
  onCheckIn,
}: {
  items: PlaceMember[];
  pending: boolean;
  onUpdate: (id: string, input: { status?: string; role?: string }) => void;
  onCheckIn: (id: string) => void;
}) {
  return (
    <section className="admin-form">
      <h2>
        <Users size={20} />
        Üye listesi <small>{items.length}</small>
      </h2>
      <div className="management-list">
        {items.map((item) => (
          <article key={item.userId}>
            <div>
              <strong>{item.user?.name ?? item.userId}</strong>
              <span>{item.user?.email}</span>
              <small>
                {item.role} · {item.status}
                {item.checkedInAt
                  ? ` · ${new Date(item.checkedInAt).toLocaleString("tr-TR")}`
                  : ""}
              </small>
            </div>
            <div className="row-actions">
              {item.status === "invited" ? (
                <>
                  <button
                    disabled={pending}
                    onClick={() =>
                      onUpdate(item.userId, { status: "accepted" })
                    }
                  >
                    <CheckCircle2 size={16} />
                    Onayla
                  </button>
                  <button
                    disabled={pending}
                    onClick={() =>
                      onUpdate(item.userId, { status: "declined" })
                    }
                  >
                    <XCircle size={16} />
                    Reddet
                  </button>
                </>
              ) : null}
              {item.status === "accepted" ? (
                <>
                  <select
                    aria-label="Üye rolü"
                    disabled={pending}
                    value={item.role}
                    onChange={(event) =>
                      onUpdate(item.userId, { role: event.target.value })
                    }
                  >
                    <option value="member">Üye</option>
                    <option value="manager">Yönetici</option>
                    <option value="organizer">Organizatör</option>
                  </select>
                  <button
                    disabled={pending}
                    onClick={() => onCheckIn(item.userId)}
                  >
                    <QrCode size={16} />
                    Check-in
                  </button>
                </>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CheckInHistory({
  items,
}: {
  items: Array<{ id: string; name: string; checkedInAt: string | Date }>;
}) {
  return (
    <section className="admin-form">
      <h2>
        <CheckCircle2 size={20} />
        Check-in geçmişi <small>{items.length}</small>
      </h2>
      <div className="management-list">
        {items
          .sort(
            (a, b) =>
              new Date(b.checkedInAt).getTime() -
              new Date(a.checkedInAt).getTime(),
          )
          .map((item) => (
            <article key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <small>
                  {new Date(item.checkedInAt).toLocaleString("tr-TR")}
                </small>
              </div>
              <span className="status-pill status-attended">Giriş yaptı</span>
            </article>
          ))}
      </div>
      {!items.length ? (
        <p className="form-help">Henüz check-in kaydı yok.</p>
      ) : null}
    </section>
  );
}

function LoginState() {
  return (
    <section className="page empty-state">
      <LogIn size={38} />
      <h1>Davet yönetimi</h1>
      <p>Bu alanı kullanmak için giriş yap.</p>
      <Link className="primary-action" to="/login">
        Giriş yap
      </Link>
    </section>
  );
}
function PermissionState() {
  return (
    <div className="empty-state">
      <Users size={36} />
      <h2>Yönetim yetkisi gerekiyor</h2>
      <p>Bu listeyi yalnız organizatörler ve yöneticiler görebilir.</p>
    </div>
  );
}
