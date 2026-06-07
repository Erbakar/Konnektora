import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, LogOut, Plus, Tags } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import {
  type AdminEventInput,
  adminLogin,
  archiveAdminEvent,
  archiveAdminTag,
  clearAdminToken,
  createAdminEvent,
  createAdminTag,
  getAdminDashboard,
  getAdminToken,
  listAdminEvents,
  listAdminTags,
  setAdminToken,
  updateAdminEvent,
  updateAdminTag
} from "../lib/api";
import type { Event, Tag } from "@konnektora/shared";

export function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(() => getAdminToken());
  const [loginError, setLoginError] = useState<string | null>(null);

  const dashboardQuery = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: getAdminDashboard,
    enabled: Boolean(token)
  });
  const eventsQuery = useQuery({
    queryKey: ["admin-events"],
    queryFn: listAdminEvents,
    enabled: Boolean(token)
  });
  const tagsQuery = useQuery({
    queryKey: ["admin-tags"],
    queryFn: listAdminTags,
    enabled: Boolean(token)
  });

  const loginMutation = useMutation({
    mutationFn: (input: { email: string; password: string }) => adminLogin(input.email, input.password),
    onSuccess: (response) => {
      setAdminToken(response.accessToken);
      setToken(response.accessToken);
      setLoginError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-tags"] });
    },
    onError: () => setLoginError("Email veya şifre hatalı.")
  });

  const createTagMutation = useMutation({
    mutationFn: createAdminTag,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-tags"] });
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    }
  });

  const archiveTagMutation = useMutation({
    mutationFn: archiveAdminTag,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-tags"] });
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    }
  });

  const updateTagMutation = useMutation({
    mutationFn: (input: { id: string; name: string; description?: string }) =>
      updateAdminTag(input.id, { name: input.name, description: input.description }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-tags"] });
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    }
  });

  const archiveEventMutation = useMutation({
    mutationFn: archiveAdminEvent,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    }
  });

  const updateEventMutation = useMutation({
    mutationFn: (input: { id: string; status: string }) => updateAdminEvent(input.id, { status: input.status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    }
  });

  const saveEventMutation = useMutation({
    mutationFn: (input: { id?: string; data: AdminEventInput }) =>
      input.id ? updateAdminEvent(input.id, input.data) : createAdminEvent(input.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    }
  });

  function handleLogout() {
    clearAdminToken();
    setToken(null);
    queryClient.clear();
  }

  if (!token) {
    return (
      <section className="page admin-login-page">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Giriş</h1>
          <p className="lead">Etkinlik ve tag yönetimi için admin hesabıyla giriş yap.</p>
        </div>
        <form
          className="admin-form compact-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            loginMutation.mutate({
              email: String(form.get("email")),
              password: String(form.get("password"))
            });
          }}
        >
          <label>
            Email
            <input autoComplete="email" name="email" placeholder="admin@konnektora.local" required type="email" />
          </label>
          <label>
            Şifre
            <input autoComplete="current-password" minLength={8} name="password" placeholder="ChangeMe123!" required type="password" />
          </label>
          {loginError ? <p className="form-error">{loginError}</p> : null}
          <button className="primary-action" disabled={loginMutation.isPending} type="submit">
            Giriş yap
          </button>
        </form>
      </section>
    );
  }

  const dashboard = dashboardQuery.data;
  const tags = tagsQuery.data ?? [];
  const events = eventsQuery.data ?? [];

  return (
    <section className="page">
      <div className="section-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Dashboard</h1>
        </div>
        <button className="secondary-action" onClick={handleLogout} type="button">
          <LogOut size={18} />
          Çıkış
        </button>
      </div>

      <div className="metric-grid">
        <MetricCard icon={<CalendarCheck size={24} />} label="Yayınlanan etkinlikler" value={dashboard?.publishedEvents ?? 0} />
        <MetricCard icon={<CalendarCheck size={24} />} label="Taslak etkinlikler" value={dashboard?.draftEvents ?? 0} />
        <MetricCard icon={<Tags size={24} />} label="Aktif tag'ler" value={dashboard?.activeTags ?? 0} />
        <MetricCard icon={<CalendarCheck size={24} />} label="Yaklaşan etkinlikler" value={dashboard?.upcomingEvents ?? 0} />
      </div>

      <div className="admin-grid">
        <TagAdminPanel
          isPending={createTagMutation.isPending}
          onArchive={(id) => archiveTagMutation.mutate(id)}
          onCreate={(input) => createTagMutation.mutate(input)}
          onUpdate={(input) => updateTagMutation.mutate(input)}
          tags={tags}
        />
        <EventAdminPanel
          events={events}
          isPending={saveEventMutation.isPending}
          onArchive={(id) => archiveEventMutation.mutate(id)}
          onSave={(id, data) => saveEventMutation.mutate({ id, data })}
          onStatusChange={(id, status) => updateEventMutation.mutate({ id, status })}
          tags={tags.filter((tag) => tag.status === "active")}
        />
      </div>
    </section>
  );
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="metric-card">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TagAdminPanel({
  isPending,
  onArchive,
  onCreate,
  onUpdate,
  tags
}: {
  isPending: boolean;
  onArchive: (id: string) => void;
  onCreate: (input: { name: string; description?: string }) => void;
  onUpdate: (input: { id: string; name: string; description?: string }) => void;
  tags: Tag[];
}) {
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const editingTag = tags.find((tag) => tag.id === editingTagId);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      name: String(form.get("name")),
      description: String(form.get("description") || "")
    };

    if (editingTag) {
      onUpdate({ id: editingTag.id, ...input });
      setEditingTagId(null);
    } else {
      onCreate(input);
    }

    event.currentTarget.reset();
  }

  return (
    <section className="admin-panel">
      <div className="section-header compact">
        <h2>Tag yönetimi</h2>
      </div>
      <form className="admin-form" onSubmit={handleSubmit}>
        <label>
          Tag adı
          <input key={editingTag?.id ?? "new-tag-name"} name="name" placeholder="Örn. Startup" required minLength={2} defaultValue={editingTag?.name ?? ""} />
        </label>
        <label>
          Açıklama
          <textarea key={editingTag?.id ?? "new-tag-description"} name="description" placeholder="Opsiyonel açıklama" rows={3} defaultValue={editingTag?.description ?? ""} />
        </label>
        <button className="secondary-action" disabled={isPending} type="submit">
          <Plus size={18} />
          {editingTag ? "Tag güncelle" : "Tag ekle"}
        </button>
        {editingTag ? (
          <button className="ghost-action" onClick={() => setEditingTagId(null)} type="button">
            Vazgeç
          </button>
        ) : null}
      </form>
      <div className="admin-list">
        {tags.map((tag) => (
          <div className="admin-list-row" key={tag.id}>
            <div>
              <strong>{tag.name}</strong>
              <span>
                {tag.status} · {tag.usageCount} kullanım
              </span>
            </div>
            <button className="secondary-action" onClick={() => setEditingTagId(tag.id)} type="button">
              Düzenle
            </button>
            {tag.status !== "archived" ? (
              <button className="danger-action" onClick={() => onArchive(tag.id)} type="button">
                Arşivle
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function EventAdminPanel({
  events,
  isPending,
  onArchive,
  onSave,
  onStatusChange,
  tags
}: {
  events: Event[];
  isPending: boolean;
  onArchive: (id: string) => void;
  onSave: (id: string | undefined, input: AdminEventInput) => void;
  onStatusChange: (id: string, status: string) => void;
  tags: Tag[];
}) {
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const editingEvent = events.find((event) => event.id === editingEventId);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const tagIds = form.getAll("tagIds").map(String);
    const startsAt = String(form.get("startsAt"));
    const registrationUrl = String(form.get("externalRegistrationUrl") || "");

    const input: AdminEventInput = {
      title: String(form.get("title")),
      summary: String(form.get("summary")),
      description: String(form.get("description")),
      startsAt: new Date(startsAt).toISOString(),
      timezone: String(form.get("timezone") || "Europe/Istanbul"),
      format: String(form.get("format") || "online"),
      visibility: String(form.get("visibility") || "open"),
      status: String(form.get("status") || "draft"),
      city: String(form.get("city") || ""),
      country: String(form.get("country") || ""),
      language: String(form.get("language") || "tr"),
      tagIds
    };

    if (registrationUrl) {
      input.externalRegistrationUrl = registrationUrl;
    }

    onSave(editingEvent?.id, input);
    setEditingEventId(null);
    event.currentTarget.reset();
  }

  return (
    <section className="admin-panel">
      <div className="section-header compact">
        <h2>Etkinlik yönetimi</h2>
      </div>
      <form className="admin-form" onSubmit={handleSubmit}>
        <label>
          Başlık
          <input key={`${editingEvent?.id ?? "new"}-title`} name="title" required minLength={3} placeholder="Etkinlik başlığı" defaultValue={editingEvent?.title ?? ""} />
        </label>
        <label>
          Özet
          <textarea key={`${editingEvent?.id ?? "new"}-summary`} name="summary" required minLength={10} rows={2} defaultValue={editingEvent?.summary ?? ""} />
        </label>
        <label>
          Açıklama
          <textarea key={`${editingEvent?.id ?? "new"}-description`} name="description" required minLength={10} rows={4} defaultValue={editingEvent?.description ?? ""} />
        </label>
        <div className="form-grid">
          <label>
            Başlangıç
            <input key={`${editingEvent?.id ?? "new"}-starts-at`} name="startsAt" required type="datetime-local" defaultValue={editingEvent ? toDateTimeLocalValue(editingEvent.startsAt) : ""} />
          </label>
          <label>
            Zaman dilimi
            <input key={`${editingEvent?.id ?? "new"}-timezone`} name="timezone" defaultValue={editingEvent?.timezone ?? "Europe/Istanbul"} />
          </label>
          <label>
            Format
            <select key={`${editingEvent?.id ?? "new"}-format`} name="format" defaultValue={editingEvent?.format ?? "online"}>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </label>
          <label>
            Durum
            <select key={`${editingEvent?.id ?? "new"}-status`} name="status" defaultValue={editingEvent?.status ?? "draft"}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label>
            Katılım tipi
            <select key={`${editingEvent?.id ?? "new"}-visibility`} name="visibility" defaultValue={editingEvent?.visibility ?? "open"}>
              <option value="open">Open</option>
              <option value="approval_required">Approval required</option>
              <option value="invite_only">Invite only</option>
            </select>
          </label>
          <label>
            Dil
            <input key={`${editingEvent?.id ?? "new"}-language`} name="language" defaultValue={editingEvent?.language ?? "tr"} />
          </label>
          <label>
            Şehir
            <input key={`${editingEvent?.id ?? "new"}-city`} name="city" defaultValue={editingEvent?.city ?? ""} />
          </label>
          <label>
            Ülke
            <input key={`${editingEvent?.id ?? "new"}-country`} name="country" defaultValue={editingEvent?.country ?? ""} />
          </label>
        </div>
        <label>
          Kayıt URL'si
          <input key={`${editingEvent?.id ?? "new"}-url`} name="externalRegistrationUrl" placeholder="https://..." type="url" defaultValue={editingEvent?.externalRegistrationUrl ?? ""} />
        </label>
        <fieldset className="tag-fieldset">
          <legend>Tag'ler</legend>
          {tags.map((tag) => (
            <label key={tag.id}>
              <input
                key={`${editingEvent?.id ?? "new"}-${tag.id}`}
                defaultChecked={Boolean(editingEvent?.tags.some((eventTag) => eventTag.id === tag.id))}
                name="tagIds"
                type="checkbox"
                value={tag.id}
              />
              {tag.name}
            </label>
          ))}
        </fieldset>
        <button className="secondary-action" disabled={isPending} type="submit">
          <Plus size={18} />
          {editingEvent ? "Etkinlik güncelle" : "Etkinlik ekle"}
        </button>
        {editingEvent ? (
          <button className="ghost-action" onClick={() => setEditingEventId(null)} type="button">
            Vazgeç
          </button>
        ) : null}
      </form>
      <div className="admin-list">
        {events.map((event) => (
          <div className="admin-list-row" key={event.id}>
            <div>
              <strong>{event.title}</strong>
              <span>
                {event.status} · {new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(event.startsAt))}
              </span>
            </div>
            <span className="muted">{event.tags.map((tag) => tag.name).join(", ")}</span>
            <div className="row-actions">
              <button className="secondary-action" onClick={() => setEditingEventId(event.id)} type="button">
                Düzenle
              </button>
              {event.status !== "published" && event.status !== "archived" ? (
                <button className="secondary-action" onClick={() => onStatusChange(event.id, "published")} type="button">
                  Yayınla
                </button>
              ) : null}
              {event.status !== "draft" && event.status !== "archived" ? (
                <button className="secondary-action" onClick={() => onStatusChange(event.id, "draft")} type="button">
                  Taslak
                </button>
              ) : null}
              {event.status !== "cancelled" && event.status !== "archived" ? (
                <button className="secondary-action" onClick={() => onStatusChange(event.id, "cancelled")} type="button">
                  İptal
                </button>
              ) : null}
            </div>
            {event.status !== "archived" ? (
              <button className="danger-action" onClick={() => onArchive(event.id)} type="button">
                Arşivle
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}
