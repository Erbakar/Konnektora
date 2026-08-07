import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import type { FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { QrCheckInScanner } from "../components/QrCheckInScanner";
import {
  checkInEventParticipant,
  checkInPlaceMember,
  getEvent,
  getPlace,
  getUserSession,
  inviteEventParticipant,
  invitePlaceMember,
  listEventParticipants,
  listPlaceMembers,
  scanEventTicket,
  scanPlaceMemberPass,
  updateEventParticipantStatus,
  updatePlaceMember,
} from "../lib/api";

export function EventInviteManagementPage() {
  const { slug = "" } = useParams();
  const user = getUserSession();
  const client = useQueryClient();
  const event = useQuery({
    queryKey: ["event", slug],
    queryFn: () => getEvent(slug),
    enabled: Boolean(slug && user),
  });
  const participants = useQuery({
    queryKey: ["event-participants", event.data?.id],
    queryFn: () => listEventParticipants(event.data!.id, "user"),
    enabled: Boolean(event.data && user),
    retry: false,
  });
  const refresh = () => {
    void client.invalidateQueries({
      queryKey: ["event-participants", event.data?.id],
    });
  };
  const invite = useMutation({
    mutationFn: (input: { username?: string; email?: string; role?: string }) =>
      inviteEventParticipant(event.data!.id, input, "user"),
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
      <InviteForm
        pending={invite.isPending}
        onSubmit={(form) =>
          invite.mutate({
            username: form.username,
            email: form.email,
            role: form.role,
          })
        }
      />
      <QrCheckInScanner
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
      />
    </ManagementShell>
  );
}

export function PlaceInviteManagementPage() {
  const { slug = "" } = useParams();
  const user = getUserSession();
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
  const refresh = () => {
    void client.invalidateQueries({
      queryKey: ["place-members", place.data?.id],
    });
  };
  const invite = useMutation({
    mutationFn: (input: { username?: string; email?: string; role?: string }) =>
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
      <InviteForm
        pending={invite.isPending}
        onSubmit={(form) =>
          invite.mutate({
            username: form.username,
            email: form.email,
            role: form.role,
          })
        }
      />
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

function InviteForm({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (input: {
    username?: string;
    email?: string;
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
        if (username || email)
          onSubmit({
            username: username || undefined,
            email: email || undefined,
            role: String(form.get("role") || "attendee"),
          });
      }}
    >
      <h2>
        <UserPlus size={20} />
        Yeni davet
      </h2>
      <div className="form-grid">
        <label>
          Kullanıcı adı
          <input name="username" placeholder="@kullanici" />
        </label>
        <label>
          E-posta
          <input name="email" type="email" placeholder="uye@example.com" />
        </label>
        <label>
          Rol
          <select name="role">
            <option value="attendee">Katılımcı / üye</option>
            <option value="manager">Yönetici</option>
            <option value="organizer">Organizatör</option>
          </select>
        </label>
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
      <Link className="primary-action" to="/account">
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
