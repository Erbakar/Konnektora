import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarCheck, Check, ClipboardCheck, LogOut, Plus, Tags, Users, X } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import {
  type AdminEventInput,
  adminLogin,
  adminPermissionOptions,
  archiveAdminEvent,
  archiveAdminTag,
  clearAdminToken,
  createAdminEvent,
  createAdminRoleGroup,
  createAdminTag,
  getAdminDashboard,
  getAdminToken,
  isMockApiMode,
  checkInEventParticipant,
  inviteEventParticipant,
  getAdminUser,
  listAdminEvents,
  listAdminReports,
  listAdminRoleGroups,
  listAdminTags,
  listAdminUsers,
  listEventParticipants,
  resolveAdminReportAction,
  setAdminToken,
  updateAdminEvent,
  updateAdminRoleGroup,
  updateEventParticipantStatus,
  updateAdminReport,
  updateAdminTag,
  updateAdminUser
} from "../lib/api";
import type {
  AdminManagedUser,
  AdminManagedUserDetail,
  AdminPermission,
  AdminRoleGroup,
  ContentReport,
  Event,
  EventParticipant,
  Tag
} from "@konnektora/shared";

export function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(() => getAdminToken());
  const [loginError, setLoginError] = useState<string | null>(null);
  const [eventNotice, setEventNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);

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
  const reportsQuery = useQuery({
    queryKey: ["admin-reports"],
    queryFn: listAdminReports,
    enabled: Boolean(token)
  });
  const roleGroupsQuery = useQuery({
    queryKey: ["admin-role-groups"],
    queryFn: listAdminRoleGroups,
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
      void queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-role-groups"] });
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
      setEventNotice({ tone: "success", message: "Etkinlik arşivlendi." });
      void queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: () => setEventNotice({ tone: "error", message: "Etkinlik arşivlenemedi. Lütfen tekrar dene." })
  });

  const updateEventMutation = useMutation({
    mutationFn: (input: { id: string; status: string }) => updateAdminEvent(input.id, { status: input.status }),
    onSuccess: () => {
      setEventNotice({ tone: "success", message: "Etkinlik durumu güncellendi." });
      void queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: () => setEventNotice({ tone: "error", message: "Etkinlik durumu güncellenemedi. Lütfen tekrar dene." })
  });

  const saveEventMutation = useMutation({
    mutationFn: (input: { id?: string; data: AdminEventInput }) =>
      input.id ? updateAdminEvent(input.id, input.data) : createAdminEvent(input.data),
    onSuccess: () => {
      setEventNotice({
        tone: "success",
        message: "Etkinlik kaydedildi. Durumu Published ise public etkinlik listesinde görünür."
      });
      void queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: () => setEventNotice({ tone: "error", message: "Etkinlik kaydedilemedi. Zorunlu alanları kontrol edip tekrar dene." })
  });
  const updateReportMutation = useMutation({
    mutationFn: (input: { id: string; status: "open" | "reviewing" | "resolved" | "dismissed"; resolutionNote?: string }) =>
      updateAdminReport(input.id, { status: input.status, resolutionNote: input.resolutionNote }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    }
  });
  const resolveReportActionMutation = useMutation({
    mutationFn: (input: {
      id: string;
      action: "archive_event" | "archive_tag" | "disable_user";
      resolutionNote?: string;
    }) => resolveAdminReportAction(input.id, { action: input.action, resolutionNote: input.resolutionNote }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-tags"] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    }
  });
  const createRoleGroupMutation = useMutation({
    mutationFn: createAdminRoleGroup,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-role-groups"] });
    }
  });
  const updateRoleGroupMutation = useMutation({
    mutationFn: (input: { id: string; data: Partial<{ name: string; description?: string; permissions: AdminPermission[]; status: string }> }) =>
      updateAdminRoleGroup(input.id, input.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-role-groups"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
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
  const reports = reportsQuery.data ?? [];
  const roleGroups = roleGroupsQuery.data ?? [];

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
        <MetricCard icon={<AlertTriangle size={24} />} label="Açık raporlar" value={reports.filter((report) => report.status === "open").length} />
      </div>

      <div className="admin-grid">
        <RoleGroupAdminPanel
          isPending={createRoleGroupMutation.isPending || updateRoleGroupMutation.isPending}
          onCreate={(input) => createRoleGroupMutation.mutate(input)}
          onUpdate={(id, data) => updateRoleGroupMutation.mutate({ id, data })}
          roleGroups={roleGroups}
        />
        <UserAdminPanel roleGroups={roleGroups} />
        <ReportAdminPanel
          isPending={updateReportMutation.isPending || resolveReportActionMutation.isPending}
          onResolve={(input) => resolveReportActionMutation.mutate(input)}
          onUpdate={(input) => updateReportMutation.mutate(input)}
          reports={reports}
        />
        <TagAdminPanel
          isPending={createTagMutation.isPending}
          onArchive={(id) => archiveTagMutation.mutate(id)}
          onCreate={(input) => createTagMutation.mutate(input)}
          onUpdate={(input) => updateTagMutation.mutate(input)}
          tags={tags}
        />
        <EventAdminPanel
          events={events}
          isDemoMode={isMockApiMode}
          isPending={saveEventMutation.isPending}
          notice={eventNotice}
          onArchive={(id) => archiveEventMutation.mutate(id)}
          onSave={(id, data) => saveEventMutation.mutate({ id, data })}
          onStatusChange={(id, status) => updateEventMutation.mutate({ id, status })}
          tags={tags.filter((tag) => tag.status === "active")}
        />
      </div>
    </section>
  );
}

function RoleGroupAdminPanel({
  isPending,
  onCreate,
  onUpdate,
  roleGroups
}: {
  isPending: boolean;
  onCreate: (input: { name: string; description?: string; permissions: AdminPermission[] }) => void;
  onUpdate: (id: string, input: Partial<{ name: string; description?: string; permissions: AdminPermission[]; status: string }>) => void;
  roleGroups: AdminRoleGroup[];
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    onCreate({
      name: String(form.get("name")),
      description: String(form.get("description") || "") || undefined,
      permissions: form.getAll("permissions").map(String) as AdminPermission[]
    });
    event.currentTarget.reset();
  }

  return (
    <section className="admin-panel">
      <div className="section-header compact">
        <h2>Rol / yetki grupları</h2>
        <span>{roleGroups.length} grup</span>
      </div>
      <form className="admin-form" onSubmit={handleSubmit}>
        <label>
          Rol grubu adı
          <input name="name" placeholder="Moderasyon ekibi" required minLength={2} />
        </label>
        <label>
          Açıklama
          <textarea name="description" rows={2} />
        </label>
        <fieldset className="tag-fieldset">
          <legend>Yetkiler</legend>
          {adminPermissionOptions.map((permission) => (
            <label key={permission.value}>
              <input name="permissions" type="checkbox" value={permission.value} />
              {permission.label}
            </label>
          ))}
        </fieldset>
        <button className="secondary-action" disabled={isPending} type="submit">
          <Plus size={18} />
          Rol grubu ekle
        </button>
      </form>
      <div className="admin-list">
        {roleGroups.map((roleGroup) => (
          <div className="admin-list-item" key={roleGroup.id}>
            <div className="admin-list-row">
              <div>
                <strong>{roleGroup.name}</strong>
                <span>
                  {roleGroup.status} · {roleGroup._count?.users ?? 0} üye
                </span>
              </div>
              <span className="muted">{roleGroup.permissions.length} yetki</span>
              <button
                className={roleGroup.status === "active" ? "ghost-action" : "secondary-action"}
                disabled={isPending}
                onClick={() => onUpdate(roleGroup.id, { status: roleGroup.status === "active" ? "passive" : "active" })}
                type="button"
              >
                {roleGroup.status === "active" ? "Pasif yap" : "Aktif yap"}
              </button>
            </div>
            <div className="profile-tag-row">
              {roleGroup.permissions.map((permission) => (
                <span key={permission}>{adminPermissionOptions.find((item) => item.value === permission)?.label ?? permission}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function UserAdminPanel({ roleGroups }: { roleGroups: AdminRoleGroup[] }) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ q: "", status: "", role: "", page: 1 });
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const usersQuery = useQuery({
    queryKey: ["admin-users", filters],
    queryFn: () => {
      const params = new URLSearchParams();

      if (filters.q) {
        params.set("q", filters.q);
      }

      if (filters.status) {
        params.set("status", filters.status);
      }

      if (filters.role) {
        params.set("role", filters.role);
      }

      params.set("page", String(filters.page));
      params.set("pageSize", "25");
      return listAdminUsers(params);
    }
  });
  const detailQuery = useQuery({
    queryKey: ["admin-user-detail", selectedUserId],
    queryFn: () => getAdminUser(selectedUserId ?? ""),
    enabled: Boolean(selectedUserId)
  });
  const updateMutation = useMutation({
    mutationFn: (input: {
      id: string;
      status?: "active" | "invited" | "pending" | "disabled";
      role?: "user" | "admin" | "super_admin";
      adminRoleGroupId?: string | null;
    }) => updateAdminUser(input.id, { status: input.status, role: input.role, adminRoleGroupId: input.adminRoleGroupId }),
    onSuccess: (_, input) => {
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-user-detail", input.id] });
    }
  });
  const userList = usersQuery.data;

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setFilters({
      q: String(form.get("q") || ""),
      status: String(form.get("status") || ""),
      role: String(form.get("role") || ""),
      page: 1
    });
  }

  return (
    <section className="admin-panel">
      <div className="section-header compact">
        <h2>Üye yönetimi</h2>
        <span>{usersQuery.isLoading ? "Yükleniyor" : `${userList?.total ?? 0} üye`}</span>
      </div>
      <form className="guest-invite-form" onSubmit={handleFilterSubmit}>
        <label>
          Arama
          <input name="q" placeholder="Ad veya email" defaultValue={filters.q} />
        </label>
        <label>
          Statü
          <select name="status" defaultValue={filters.status}>
            <option value="">Tümü</option>
            <option value="active">Active</option>
            <option value="invited">Invited</option>
            <option value="pending">Pending</option>
            <option value="disabled">Disabled</option>
          </select>
        </label>
        <label>
          Rol
          <select name="role" defaultValue={filters.role}>
            <option value="">Tümü</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super admin</option>
          </select>
        </label>
        <button className="secondary-action" type="submit">
          Filtrele
        </button>
      </form>
      <div className="admin-list">
        {(userList?.items ?? []).map((user) => (
          <UserAdminRow
            isPending={updateMutation.isPending}
            key={user.id}
            onSelect={() => setSelectedUserId(user.id)}
            onUpdate={(input) => updateMutation.mutate({ id: user.id, ...input })}
            roleGroups={roleGroups}
            user={user}
          />
        ))}
      </div>
      {userList ? (
        <div className="pagination-row">
          <button
            className="secondary-action"
            disabled={filters.page <= 1}
            onClick={() => setFilters((current) => ({ ...current, page: Math.max(current.page - 1, 1) }))}
            type="button"
          >
            Önceki
          </button>
          <span>Sayfa {userList.page}</span>
          <button
            className="secondary-action"
            disabled={!userList.hasNextPage}
            onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}
            type="button"
          >
            Sonraki
          </button>
        </div>
      ) : null}
      {detailQuery.data ? <UserDetailCard user={detailQuery.data} /> : null}
    </section>
  );
}

function UserAdminRow({
  isPending,
  onSelect,
  onUpdate,
  roleGroups,
  user
}: {
  isPending: boolean;
  onSelect: () => void;
  onUpdate: (input: {
    status?: "active" | "invited" | "pending" | "disabled";
    role?: "user" | "admin" | "super_admin";
    adminRoleGroupId?: string | null;
  }) => void;
  roleGroups: AdminRoleGroup[];
  user: AdminManagedUser;
}) {
  return (
    <div className="admin-list-item">
      <div className="admin-list-row">
        <div>
          <strong>{user.name}</strong>
          <span>{user.email}</span>
        </div>
        <span className={`status-pill status-${user.status}`}>{user.status}</span>
        <span className="muted">{user.role}</span>
        <select
          disabled={isPending || user.role === "user"}
          onChange={(event) => onUpdate({ adminRoleGroupId: event.target.value || null })}
          value={user.adminRoleGroupId ?? ""}
        >
          <option value="">Rol grubu yok</option>
          {roleGroups
            .filter((roleGroup) => roleGroup.status === "active")
            .map((roleGroup) => (
              <option key={roleGroup.id} value={roleGroup.id}>
                {roleGroup.name}
              </option>
            ))}
        </select>
        <span className="muted">{user._count?.createdEvents ?? 0} event</span>
        <div className="row-actions">
          <button className="secondary-action" onClick={onSelect} type="button">
            Detay
          </button>
          {user.status === "active" ? (
            <button className="ghost-action" disabled={isPending} onClick={() => onUpdate({ status: "disabled" })} type="button">
              Disable
            </button>
          ) : (
            <button className="secondary-action" disabled={isPending} onClick={() => onUpdate({ status: "active" })} type="button">
              Aktif yap
            </button>
          )}
          {user.role === "user" ? (
            <button className="secondary-action" disabled={isPending} onClick={() => onUpdate({ role: "admin" })} type="button">
              Admin yap
            </button>
          ) : null}
          {user.role === "admin" ? (
            <button className="ghost-action" disabled={isPending} onClick={() => onUpdate({ role: "user" })} type="button">
              User yap
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function UserDetailCard({ user }: { user: AdminManagedUserDetail }) {
  return (
    <div className="admin-list-item">
      <div className="section-header compact">
        <h3>{user.name}</h3>
        <span>{user.email}</span>
      </div>
      <div className="metric-grid compact-metrics">
        <MetricCard icon={<CalendarCheck size={20} />} label="Oluşturduğu event" value={user.stats.createdEvents} />
        <MetricCard icon={<Users size={20} />} label="Katılım" value={user.stats.eventParticipations} />
        <MetricCard icon={<AlertTriangle size={20} />} label="Bildirdiği şikayet" value={user.stats.submittedReports} />
        <MetricCard icon={<Check size={20} />} label="Çözdüğü rapor" value={user.stats.resolvedReports} />
      </div>
      <div className="profile-tag-row">
        {user.interestTags.length > 0 ? user.interestTags.map((tag) => <span key={tag.id}>{tag.name}</span>) : <span>İlgi alanı yok</span>}
      </div>
    </div>
  );
}

function ReportAdminPanel({
  isPending,
  onResolve,
  onUpdate,
  reports
}: {
  isPending: boolean;
  onResolve: (input: {
    id: string;
    action: "archive_event" | "archive_tag" | "disable_user";
    resolutionNote?: string;
  }) => void;
  onUpdate: (input: { id: string; status: "open" | "reviewing" | "resolved" | "dismissed"; resolutionNote?: string }) => void;
  reports: ContentReport[];
}) {
  function handleSubmit(reportId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    onUpdate({
      id: reportId,
      status: String(form.get("status")) as "open" | "reviewing" | "resolved" | "dismissed",
      resolutionNote: String(form.get("resolutionNote") || "") || undefined
    });
  }

  function getModerationAction(report: ContentReport) {
    if (report.targetType === "event") {
      return { action: "archive_event" as const, label: "Etkinliği arşivle" };
    }

    if (report.targetType === "tag") {
      return { action: "archive_tag" as const, label: "Tag'i arşivle" };
    }

    return { action: "disable_user" as const, label: "Kullanıcıyı disable et" };
  }

  return (
    <section className="admin-panel">
      <div className="section-header compact">
        <h2>Rapor kuyruğu</h2>
      </div>
      {reports.length === 0 ? <p className="muted">Henüz raporlanmış içerik yok.</p> : null}
      <div className="admin-list">
        {reports.map((report) => (
          <div className="admin-list-item" key={report.id}>
            <div className="admin-list-row">
              <div>
                <strong>
                  {report.targetType} · {report.reason}
                </strong>
                <span>
                  {report.status} · {report.reporter?.email ?? report.reporterId}
                </span>
              </div>
              <span className={`status-pill status-${report.status}`}>{report.status}</span>
            </div>
            {report.details ? <p className="form-help">{report.details}</p> : null}
            <form className="guest-invite-form" onSubmit={(event) => handleSubmit(report.id, event)}>
              <label>
                Durum
                <select name="status" defaultValue={report.status}>
                  <option value="open">Open</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </label>
              <label>
                Admin notu
                <input name="resolutionNote" defaultValue={report.resolutionNote ?? ""} />
              </label>
              <button className="secondary-action" disabled={isPending} type="submit">
                Güncelle
              </button>
            </form>
            {report.status !== "resolved" ? (
              <button
                className="danger-action"
                disabled={isPending}
                onClick={() => {
                  const action = getModerationAction(report);
                  onResolve({
                    id: report.id,
                    action: action.action,
                    resolutionNote: `${action.label} aksiyonu uygulandı.`
                  });
                }}
                type="button"
              >
                {getModerationAction(report).label}
              </button>
            ) : null}
          </div>
        ))}
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
  isDemoMode,
  isPending,
  notice,
  onArchive,
  onSave,
  onStatusChange,
  tags
}: {
  events: Event[];
  isDemoMode: boolean;
  isPending: boolean;
  notice: { tone: "success" | "error"; message: string } | null;
  onArchive: (id: string) => void;
  onSave: (id: string | undefined, input: AdminEventInput) => void;
  onStatusChange: (id: string, status: string) => void;
  tags: Tag[];
}) {
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [guestListEventId, setGuestListEventId] = useState<string | null>(null);
  const editingEvent = events.find((event) => event.id === editingEventId);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const tagIds = form.getAll("tagIds").map(String);
    const startsAt = String(form.get("startsAt"));
    const endsAt = String(form.get("endsAt") || "");
    const registrationUrl = String(form.get("externalRegistrationUrl") || "");
    const coverImageUrl = String(form.get("coverImageUrl") || "");

    const input: AdminEventInput = {
      title: String(form.get("title")),
      description: String(form.get("description")),
      startsAt: new Date(startsAt).toISOString(),
      format: String(form.get("format") || "online"),
      visibility: String(form.get("visibility") || "open"),
      status: String(form.get("status") || "published"),
      city: String(form.get("city") || ""),
      country: String(form.get("country") || ""),
      organizerName: String(form.get("organizerName") || "Konnektora Admin"),
      tagIds
    };

    if (endsAt) {
      input.endsAt = new Date(endsAt).toISOString();
    }

    if (registrationUrl) {
      input.externalRegistrationUrl = registrationUrl;
    }

    if (coverImageUrl) {
      input.coverImageUrl = coverImageUrl;
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
      {isDemoMode ? (
        <p className="form-help">
          Demo modunda kayıtlar bu tarayıcıya kaydedilir. Canlı database için backend deploy edip Netlify'da
          VITE_API_URL tanımlanmalı.
        </p>
      ) : null}
      {notice ? <p className={notice.tone === "success" ? "form-success" : "form-error"}>{notice.message}</p> : null}
      <form className="admin-form" onSubmit={handleSubmit}>
        <label>
          Başlık
          <input key={`${editingEvent?.id ?? "new"}-title`} name="title" required minLength={3} placeholder="Etkinlik başlığı" defaultValue={editingEvent?.title ?? ""} />
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
            Bitiş
            <input key={`${editingEvent?.id ?? "new"}-ends-at`} name="endsAt" type="datetime-local" defaultValue={editingEvent?.endsAt ? toDateTimeLocalValue(editingEvent.endsAt) : ""} />
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
            <select key={`${editingEvent?.id ?? "new"}-status`} name="status" defaultValue={editingEvent?.status ?? "published"}>
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
            Organizatör
            <input key={`${editingEvent?.id ?? "new"}-organizer`} name="organizerName" defaultValue={editingEvent?.organizerName ?? "Konnektora Admin"} />
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
        <label>
          Kapak görseli URL'si
          <input key={`${editingEvent?.id ?? "new"}-cover`} name="coverImageUrl" placeholder="https://images.unsplash.com/..." type="url" defaultValue={editingEvent?.coverImageUrl ?? ""} />
        </label>
        <p className="form-help">Public listede görünmesi için etkinlik durumu Published olmalı.</p>
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
          <div className="admin-list-item" key={event.id}>
            <div className="admin-list-row">
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
                <button
                  className="secondary-action"
                  onClick={() => setGuestListEventId((currentId) => (currentId === event.id ? null : event.id))}
                  type="button"
                >
                  <Users size={16} />
                  Guest list
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
            {guestListEventId === event.id ? <GuestListPanel eventId={event.id} /> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function GuestListPanel({ eventId }: { eventId: string }) {
  const queryClient = useQueryClient();
  const [inviteNotice, setInviteNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const participantsQuery = useQuery({
    queryKey: ["event-participants", eventId],
    queryFn: () => listEventParticipants(eventId)
  });
  const statusMutation = useMutation({
    mutationFn: (input: { userId: string; status: string }) =>
      updateEventParticipantStatus(eventId, input.userId, input.status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["event-participants", eventId] });
    }
  });
  const checkInMutation = useMutation({
    mutationFn: (userId: string) => checkInEventParticipant(eventId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["event-participants", eventId] });
    }
  });
  const inviteMutation = useMutation({
    mutationFn: (input: { email: string; name?: string; role?: string }) => inviteEventParticipant(eventId, input),
    onSuccess: () => {
      setInviteNotice({ tone: "success", message: "Davet guest list'e eklendi." });
      void queryClient.invalidateQueries({ queryKey: ["event-participants", eventId] });
    },
    onError: () => setInviteNotice({ tone: "error", message: "Davet gönderilemedi. Email adresini kontrol et." })
  });
  const participants = participantsQuery.data ?? [];

  function handleInviteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const name = String(form.get("name") || "");
    const role = String(form.get("role") || "attendee");

    inviteMutation.mutate({ email, name, role });
    event.currentTarget.reset();
  }

  return (
    <div className="guest-list-panel">
      <div className="guest-list-header">
        <strong>Guest list</strong>
        <span>{participantsQuery.isLoading ? "Yükleniyor" : `${participants.length} kişi`}</span>
      </div>
      <form className="guest-invite-form" onSubmit={handleInviteSubmit}>
        <label>
          Email
          <input name="email" placeholder="member@example.com" required type="email" />
        </label>
        <label>
          Ad
          <input name="name" placeholder="Opsiyonel" />
        </label>
        <label>
          Rol
          <select name="role" defaultValue="attendee">
            <option value="attendee">Attendee</option>
            <option value="manager">Manager</option>
            <option value="organizer">Organizer</option>
          </select>
        </label>
        <button className="secondary-action" disabled={inviteMutation.isPending} type="submit">
          <Plus size={16} />
          Davet et
        </button>
      </form>
      {inviteNotice ? (
        <p className={inviteNotice.tone === "success" ? "form-success" : "form-error"}>{inviteNotice.message}</p>
      ) : null}
      {participants.length === 0 && !participantsQuery.isLoading ? (
        <p className="muted">Henüz katılım talebi yok.</p>
      ) : null}
      <div className="guest-list">
        {participants.map((participant) => (
          <GuestListRow
            isPending={statusMutation.isPending || checkInMutation.isPending}
            key={participant.id}
            onCheckIn={() => checkInMutation.mutate(participant.userId)}
            onStatusChange={(status) => statusMutation.mutate({ userId: participant.userId, status })}
            participant={participant}
          />
        ))}
      </div>
    </div>
  );
}

function GuestListRow({
  isPending,
  onCheckIn,
  onStatusChange,
  participant
}: {
  isPending: boolean;
  onCheckIn: () => void;
  onStatusChange: (status: string) => void;
  participant: EventParticipant;
}) {
  return (
    <div className="guest-list-row">
      <div>
        <strong>{participant.user?.name ?? "Community member"}</strong>
        <span>{participant.user?.email ?? participant.userId}</span>
      </div>
      <span className={`status-pill status-${participant.status}`}>{participant.status}</span>
      <span className="muted">{participant.role}</span>
      <div className="row-actions">
        {participant.status === "requested" ? (
          <>
            <button className="secondary-action" disabled={isPending} onClick={() => onStatusChange("accepted")} type="button">
              <Check size={16} />
              Kabul
            </button>
            <button className="danger-action" disabled={isPending} onClick={() => onStatusChange("declined")} type="button">
              <X size={16} />
              Ret
            </button>
          </>
        ) : null}
        {(participant.status === "accepted" || participant.status === "invited") && !participant.checkedInAt ? (
          <button className="secondary-action" disabled={isPending} onClick={onCheckIn} type="button">
            <ClipboardCheck size={16} />
            Check-in
          </button>
        ) : null}
        {participant.status !== "banned" && participant.status !== "attended" ? (
          <button className="ghost-action" disabled={isPending} onClick={() => onStatusChange("banned")} type="button">
            Ban
          </button>
        ) : null}
      </div>
    </div>
  );
}

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}
