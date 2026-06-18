import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarCheck,
  Check,
  ClipboardCheck,
  FileText,
  Key,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Plus,
  ShieldCheck,
  Tags,
  Users,
  X
} from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import {
  type AdminEventInput,
  type AnnouncementInput,
  type ModerationDecisionInput,
  type PolicyInput,
  type ReportRuleInput,
  adminLogin,
  adminPermissionOptions,
  archiveAdminEvent,
  archiveAdminTag,
  banAdminTag,
  clearAdminToken,
  createAdminAnnouncement,
  createAdminEvent,
  createAdminCmsCategory,
  createAdminFaq,
  createAdminModerationDecision,
  createAdminReportRule,
  createAdminRoleGroup,
  getAdminReportGroup,
  getAdminDashboard,
  getAdminToken,
  getAdminTag,
  isMockApiMode,
  checkInEventParticipant,
  inviteEventParticipant,
  listEventParticipants,
  getAdminUser,
  listAdminAnnouncements,
  listAdminCmsCategories,
  listAdminEvents,
  listAdminFaqs,
  listAdminPolicies,
  listAdminReportGroups,
  listAdminReportRules,
  listAdminReports,
  listAdminRoleGroups,
  listAdminTags,
  listAdminUsers,
  mergeAdminTag,
  resolveAdminReportAction,
  setAdminToken,
  updateAdminAnnouncement,
  updateAdminEvent,
  updateAdminCmsCategory,
  updateAdminFaq,
  updateAdminRoleGroup,
  updateEventParticipantStatus,
  updateAdminReport,
  updateAdminReportGroupNote,
  updateAdminReportRule,
  updateAdminTag,
  updateAdminUser,
  upsertAdminPolicy
} from "../lib/api";
import type {
  AdminManagedUser,
  AdminManagedUserDetail,
  AdminPermission,
  AdminRoleGroup,
  AdminTagDetail,
  Announcement,
  CmsCategory,
  CmsPolicy,
  ContentReport,
  Event,
  EventParticipant,
  Faq,
  PolicyType,
  ReportGroup,
  ReportGroupDetail,
  ReportRule,
  ReportTargetType,
  Tag
} from "@konnektora/shared";

type AdminSection =
  | "dashboard"
  | "users"
  | "roles"
  | "events"
  | "tags"
  | "reports"
  | "cms"
  | "email-tokens";

const NAV_GROUPS: Array<{
  label: string;
  items: Array<{ id: AdminSection; label: string; Icon: React.ElementType }>;
}> = [
  {
    label: "Genel",
    items: [{ id: "dashboard", label: "Dashboard", Icon: LayoutDashboard }]
  },
  {
    label: "Kullanıcılar",
    items: [
      { id: "users", label: "Üye Yönetimi", Icon: Users },
      { id: "roles", label: "Rol / Yetkiler", Icon: ShieldCheck }
    ]
  },
  {
    label: "İçerik",
    items: [
      { id: "events", label: "Etkinlikler", Icon: CalendarCheck },
      { id: "tags", label: "İlgi Alanları", Icon: Tags }
    ]
  },
  {
    label: "Moderasyon",
    items: [{ id: "reports", label: "Şikayetler", Icon: AlertTriangle }]
  },
  {
    label: "CMS",
    items: [
      { id: "cms", label: "CMS / SSS / Duyurular", Icon: FileText },
      { id: "email-tokens", label: "Email Tokenları", Icon: Key }
    ]
  }
];

const SECTION_TITLES: Record<AdminSection, string> = {
  dashboard: "Dashboard",
  users: "Üye Yönetimi",
  roles: "Rol / Yetkiler",
  events: "Etkinlikler",
  tags: "İlgi Alanları",
  reports: "Şikayetler",
  cms: "CMS / SSS / Duyurular / Politikalar",
  "email-tokens": "Email Tokenları"
};

const REPORT_RULE_TITLE_OPTIONS: Record<ReportTargetType, string[]> = {
  event: [
    "Spam veya yanıltıcı etkinlik",
    "Uygunsuz etkinlik içeriği",
    "Sahte veya hatalı etkinlik bilgisi",
    "Güvenlik riski taşıyan etkinlik"
  ],
  tag: ["Spam tag", "Yanıltıcı tag", "Uygunsuz tag adı", "Tekrarlayan / mükerrer tag"],
  user: ["Spam kullanıcı", "Taciz veya kötüye kullanım", "Sahte profil", "Topluluk kurallarını ihlal"]
};

export function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(() => getAdminToken());
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const [eventNotice, setEventNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [reportGroupScope, setReportGroupScope] = useState<"active" | "old">("active");
  const [selectedReportGroup, setSelectedReportGroup] = useState<{ targetType: ReportTargetType; targetId: string } | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

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
  const tagDetailQuery = useQuery({
    queryKey: ["admin-tag", selectedTagId],
    queryFn: () => getAdminTag(selectedTagId!),
    enabled: Boolean(token && selectedTagId)
  });
  const reportsQuery = useQuery({
    queryKey: ["admin-reports"],
    queryFn: listAdminReports,
    enabled: Boolean(token)
  });
  const reportRulesQuery = useQuery({
    queryKey: ["admin-report-rules"],
    queryFn: listAdminReportRules,
    enabled: Boolean(token)
  });
  const reportGroupsQuery = useQuery({
    queryKey: ["admin-report-groups", reportGroupScope],
    queryFn: () => listAdminReportGroups(reportGroupScope),
    enabled: Boolean(token)
  });
  const reportGroupDetailQuery = useQuery({
    queryKey: ["admin-report-group", selectedReportGroup?.targetType, selectedReportGroup?.targetId],
    queryFn: () => getAdminReportGroup(selectedReportGroup!.targetType, selectedReportGroup!.targetId),
    enabled: Boolean(token && selectedReportGroup)
  });
  const roleGroupsQuery = useQuery({
    queryKey: ["admin-role-groups"],
    queryFn: listAdminRoleGroups,
    enabled: Boolean(token)
  });
  const cmsCategoriesQuery = useQuery({
    queryKey: ["admin-cms-categories"],
    queryFn: listAdminCmsCategories,
    enabled: Boolean(token)
  });
  const faqsQuery = useQuery({
    queryKey: ["admin-faqs"],
    queryFn: listAdminFaqs,
    enabled: Boolean(token)
  });
  const announcementsQuery = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: listAdminAnnouncements,
    enabled: Boolean(token)
  });
  const policiesQuery = useQuery({
    queryKey: ["admin-policies"],
    queryFn: listAdminPolicies,
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
      void queryClient.invalidateQueries({ queryKey: ["admin-report-rules"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-report-groups"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-role-groups"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-cms-categories"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-policies"] });
    },
    onError: () => setLoginError("Email veya şifre hatalı.")
  });

  const archiveTagMutation = useMutation({
    mutationFn: archiveAdminTag,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-tags"] });
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    }
  });
  const banTagMutation = useMutation({
    mutationFn: banAdminTag,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-tags"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-tag"] });
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
    }
  });
  const mergeTagMutation = useMutation({
    mutationFn: (input: { id: string; targetTagId: string }) => mergeAdminTag(input.id, input.targetTagId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-tags"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-tag"] });
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
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
      void queryClient.invalidateQueries({ queryKey: ["admin-report-groups"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-report-group"] });
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
      void queryClient.invalidateQueries({ queryKey: ["admin-report-groups"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-report-group"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-tags"] });
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    }
  });
  const createReportRuleMutation = useMutation({
    mutationFn: createAdminReportRule,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-report-rules"] });
      void queryClient.invalidateQueries({ queryKey: ["report-rules"] });
    }
  });
  const updateReportRuleMutation = useMutation({
    mutationFn: (input: { id: string; data: Partial<ReportRuleInput> & { status?: string } }) =>
      updateAdminReportRule(input.id, input.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-report-rules"] });
      void queryClient.invalidateQueries({ queryKey: ["report-rules"] });
    }
  });
  const updateReportGroupNoteMutation = useMutation({
    mutationFn: (input: { targetType: ReportTargetType; targetId: string; note: string }) =>
      updateAdminReportGroupNote(input.targetType, input.targetId, input.note),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-report-groups"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-report-group"] });
    }
  });
  const createModerationDecisionMutation = useMutation({
    mutationFn: (input: { targetType: ReportTargetType; targetId: string; data: ModerationDecisionInput }) =>
      createAdminModerationDecision(input.targetType, input.targetId, input.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-report-groups"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-report-group"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-tags"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
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
  const createCmsCategoryMutation = useMutation({
    mutationFn: createAdminCmsCategory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-cms-categories"] });
    }
  });
  const updateCmsCategoryMutation = useMutation({
    mutationFn: (input: { id: string; data: Partial<CmsCategory> }) => updateAdminCmsCategory(input.id, input.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-cms-categories"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
    }
  });
  const createFaqMutation = useMutation({
    mutationFn: createAdminFaq,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-cms-categories"] });
    }
  });
  const updateFaqMutation = useMutation({
    mutationFn: (input: { id: string; data: Partial<{ categoryId: string; title: string; body: string; status: string }> }) =>
      updateAdminFaq(input.id, input.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-cms-categories"] });
    }
  });
  const createAnnouncementMutation = useMutation({
    mutationFn: createAdminAnnouncement,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      void queryClient.invalidateQueries({ queryKey: ["announcements"] });
    }
  });
  const updateAnnouncementMutation = useMutation({
    mutationFn: (input: { id: string; data: Partial<AnnouncementInput> & { status?: string } }) =>
      updateAdminAnnouncement(input.id, input.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      void queryClient.invalidateQueries({ queryKey: ["announcements"] });
    }
  });
  const upsertPolicyMutation = useMutation({
    mutationFn: upsertAdminPolicy,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-policies"] });
      void queryClient.invalidateQueries({ queryKey: ["policy"] });
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
  const tagDetail = tagDetailQuery.data ?? null;
  const events = eventsQuery.data ?? [];
  const reports = reportsQuery.data ?? [];
  const reportGroups = reportGroupsQuery.data ?? [];
  const reportGroupDetail = reportGroupDetailQuery.data ?? null;
  const reportRules = reportRulesQuery.data ?? [];
  const roleGroups = roleGroupsQuery.data ?? [];
  const cmsCategories = cmsCategoriesQuery.data ?? [];
  const faqs = faqsQuery.data ?? [];
  const announcements = announcementsQuery.data ?? [];
  const policies = policiesQuery.data ?? [];

  const openReports = reports.filter((r) => r.status === "open").length;

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <span className="admin-sidebar-title">
            <LayoutDashboard size={16} />
            Admin Paneli
          </span>
          <button className="admin-logout-btn" onClick={handleLogout} title="Çıkış yap" type="button">
            <LogOut size={16} />
          </button>
        </div>
        <nav className="admin-nav">
          {NAV_GROUPS.map((group) => (
            <div className="admin-nav-group" key={group.label}>
              <span className="admin-nav-group-label">{group.label}</span>
              {group.items.map(({ id, label, Icon }) => (
                <button
                  className={`admin-nav-btn${activeSection === id ? " active" : ""}`}
                  key={id}
                  onClick={() => setActiveSection(id)}
                  type="button"
                >
                  <Icon size={15} />
                  {label}
                  {id === "reports" && openReports > 0 ? (
                    <span className="admin-nav-badge">{openReports}</span>
                  ) : null}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="admin-content">
        <div className="admin-content-header">
          <h1>{SECTION_TITLES[activeSection]}</h1>
          {isMockApiMode ? <span className="status-pill status-requested">Demo modu</span> : null}
        </div>

        {activeSection === "dashboard" && (
          <div className="dashboard-sections">
            {(dashboard?.publishedEvents ?? 0) === 0 && tags.length === 0 && events.length === 0 ? (
              <div className="admin-getting-started">
                <p className="admin-getting-started-title">Başlangıç kılavuzu — ilk 3 adım</p>
                <div className="admin-getting-started-steps">
                  <button className="admin-getting-started-step" onClick={() => setActiveSection("tags")} type="button">
                    <span className="step-num">1</span>
                    <div>
                      <strong>İlgi alanı tag'leri oluştur</strong>
                      <p>Etkinliklerde kullanmak için önce tag'leri tanımla.</p>
                    </div>
                  </button>
                  <button className="admin-getting-started-step" onClick={() => setActiveSection("events")} type="button">
                    <span className="step-num">2</span>
                    <div>
                      <strong>İlk etkinliği ekle</strong>
                      <p>Etkinliği oluştur ve Published olarak kaydet.</p>
                    </div>
                  </button>
                  <button className="admin-getting-started-step" onClick={() => setActiveSection("cms")} type="button">
                    <span className="step-num">3</span>
                    <div>
                      <strong>CMS içeriklerini doldur</strong>
                      <p>SSS, duyurular ve politika sayfalarını ekle.</p>
                    </div>
                  </button>
                </div>
              </div>
            ) : null}

            <div className="metric-grid">
              <MetricCard icon={<CalendarCheck size={24} />} label="Yayınlanan etkinlikler" value={dashboard?.publishedEvents ?? 0} />
              <MetricCard icon={<CalendarCheck size={24} />} label="Yaklaşan etkinlikler" value={dashboard?.upcomingEvents ?? 0} />
              <MetricCard icon={<Tags size={24} />} label="Aktif tag'ler" value={dashboard?.activeTags ?? 0} />
              <MetricCard icon={<CalendarCheck size={24} />} label="Taslak etkinlikler" value={dashboard?.draftEvents ?? 0} />
              <MetricCard icon={<AlertTriangle size={24} />} label="Açık şikayetler" value={openReports} />
              <MetricCard icon={<Megaphone size={24} />} label="Aktif duyurular" value={announcements.filter((a) => a.status === "active").length} />
            </div>

            <p className="admin-dashboard-subtitle">Modüller</p>
            <div className="dashboard-module-grid">
              <DashboardModuleCard
                Icon={Users}
                label="Üye Yönetimi"
                onClick={() => setActiveSection("users")}
                stats={[
                  { label: "Rol grupları", value: roleGroups.length }
                ]}
              />
              <DashboardModuleCard
                Icon={ShieldCheck}
                label="Rol / Yetkiler"
                onClick={() => setActiveSection("roles")}
                stats={[
                  { label: "Gruplar", value: roleGroups.length },
                  { label: "Aktif", value: roleGroups.filter((rg) => rg.status === "active").length }
                ]}
              />
              <DashboardModuleCard
                Icon={CalendarCheck}
                label="Etkinlikler"
                onClick={() => setActiveSection("events")}
                stats={[
                  { label: "Yayınlanan", value: dashboard?.publishedEvents ?? 0 },
                  { label: "Taslak", value: dashboard?.draftEvents ?? 0 },
                  { label: "Yaklaşan", value: dashboard?.upcomingEvents ?? 0 }
                ]}
              />
              <DashboardModuleCard
                Icon={Tags}
                label="İlgi Alanları"
                onClick={() => setActiveSection("tags")}
                stats={[
                  { label: "Toplam tag", value: tags.length },
                  { label: "Aktif", value: tags.filter((t) => t.status === "active").length },
                  { label: "Arşiv", value: tags.filter((t) => t.status === "archived").length }
                ]}
              />
              <DashboardModuleCard
                danger={openReports > 0}
                Icon={AlertTriangle}
                label="Şikayetler"
                onClick={() => setActiveSection("reports")}
                stats={[
                  { label: "Açık", value: openReports, danger: openReports > 0 },
                  { label: "İnceleniyor", value: reports.filter((r) => r.status === "reviewing").length },
                  { label: "Kurallar", value: reportRules.length }
                ]}
              />
              <DashboardModuleCard
                Icon={FileText}
                label="CMS / SSS / Duyurular"
                onClick={() => setActiveSection("cms")}
                stats={[
                  { label: "Kategoriler", value: cmsCategories.length },
                  { label: "SSS", value: faqs.length },
                  { label: "Duyurular", value: announcements.length },
                  { label: "Politikalar", value: policies.length }
                ]}
              />
              <DashboardModuleCard
                Icon={Key}
                label="Email Tokenları"
                onClick={() => setActiveSection("email-tokens")}
                stats={[
                  { label: "Akış tipi", value: 3 },
                  { label: "Durum", value: "Aktif" }
                ]}
              />
            </div>
          </div>
        )}

        {activeSection === "users" && (
          <UserAdminPanel roleGroups={roleGroups} />
        )}

        {activeSection === "roles" && (
          <RoleGroupAdminPanel
            isPending={createRoleGroupMutation.isPending || updateRoleGroupMutation.isPending}
            onCreate={(input) => createRoleGroupMutation.mutate(input)}
            onUpdate={(id, data) => updateRoleGroupMutation.mutate({ id, data })}
            roleGroups={roleGroups}
          />
        )}

        {activeSection === "events" && (
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
        )}

        {activeSection === "tags" && (
          <TagAdminPanel
            detail={tagDetail}
            isPending={banTagMutation.isPending || mergeTagMutation.isPending || updateTagMutation.isPending}
            onArchive={(id) => archiveTagMutation.mutate(id)}
            onBan={(id) => banTagMutation.mutate(id)}
            onMerge={(id, targetTagId) => mergeTagMutation.mutate({ id, targetTagId })}
            onSelect={(id) => setSelectedTagId(id)}
            onUpdate={(input) => updateTagMutation.mutate(input)}
            tags={tags}
          />
        )}

        {activeSection === "reports" && (
          <ReportAdminPanel
            isPending={
              updateReportMutation.isPending ||
              resolveReportActionMutation.isPending ||
              createReportRuleMutation.isPending ||
              updateReportRuleMutation.isPending ||
              updateReportGroupNoteMutation.isPending ||
              createModerationDecisionMutation.isPending
            }
            groupDetail={reportGroupDetail}
            groupScope={reportGroupScope}
            groups={reportGroups}
            onCreateRule={(input) => createReportRuleMutation.mutate(input)}
            onResolve={(input) => resolveReportActionMutation.mutate(input)}
            onSaveGroupNote={(input) => updateReportGroupNoteMutation.mutate(input)}
            onCreateDecision={(input) => createModerationDecisionMutation.mutate(input)}
            onSelectGroup={(group) => setSelectedReportGroup({ targetType: group.targetType, targetId: group.targetId })}
            onSetGroupScope={setReportGroupScope}
            onUpdateRule={(id, data) => updateReportRuleMutation.mutate({ id, data })}
            onUpdate={(input) => updateReportMutation.mutate(input)}
            rules={reportRules}
            reports={reports}
          />
        )}

        {activeSection === "cms" && (
          <CmsAdminPanel
            announcements={announcements}
            categories={cmsCategories}
            faqs={faqs}
            isPending={
              createCmsCategoryMutation.isPending ||
              updateCmsCategoryMutation.isPending ||
              createFaqMutation.isPending ||
              updateFaqMutation.isPending ||
              createAnnouncementMutation.isPending ||
              updateAnnouncementMutation.isPending ||
              upsertPolicyMutation.isPending
            }
            onCreateAnnouncement={(input) => createAnnouncementMutation.mutate(input)}
            onCreateCategory={(input) => createCmsCategoryMutation.mutate(input)}
            onCreateFaq={(input) => createFaqMutation.mutate(input)}
            onSavePolicy={(input) => upsertPolicyMutation.mutate(input)}
            onUpdateAnnouncement={(id, data) => updateAnnouncementMutation.mutate({ id, data })}
            onUpdateCategory={(id, data) => updateCmsCategoryMutation.mutate({ id, data })}
            onUpdateFaq={(id, data) => updateFaqMutation.mutate({ id, data })}
            policies={policies}
          />
        )}

        {activeSection === "email-tokens" && <EmailTokenInfoPanel />}
      </div>
    </div>
  );
}

function DashboardModuleCard({
  danger,
  Icon,
  label,
  onClick,
  stats
}: {
  danger?: boolean;
  Icon: React.ElementType;
  label: string;
  onClick: () => void;
  stats: Array<{ label: string; value: number | string; danger?: boolean }>;
}) {
  return (
    <button className={`dashboard-module-card${danger ? " dashboard-module-card--alert" : ""}`} onClick={onClick} type="button">
      <div className="dashboard-module-header">
        <span className="dashboard-module-icon">
          <Icon size={18} />
        </span>
        <h3>{label}</h3>
      </div>
      <div className="dashboard-module-stats">
        {stats.map((stat) => (
          <div className="dashboard-stat" key={stat.label}>
            <span className={`dashboard-stat-value${stat.danger ? " danger" : ""}`}>{stat.value}</span>
            <span className="dashboard-stat-label">{stat.label}</span>
          </div>
        ))}
      </div>
    </button>
  );
}

function formatDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function defaultModerationAction(targetType: ReportTargetType): ModerationDecisionInput["action"] {
  if (targetType === "event") {
    return "archive_event";
  }

  if (targetType === "tag") {
    return "archive_tag";
  }

  return "warn_user";
}

const policyTypes: Array<{ value: PolicyType; label: string; defaultTitle: string; defaultBody: string }> = [
  {
    value: "privacy",
    label: "Gizlilik Politikası",
    defaultTitle: "Privacy Policy",
    defaultBody: "Konnektora gizlilik politikası içeriği admin panelinden yönetilir."
  },
  {
    value: "terms",
    label: "Kullanım Şartları",
    defaultTitle: "Terms of Use",
    defaultBody: "Konnektora kullanım şartları içeriği admin panelinden yönetilir."
  },
  {
    value: "cookies",
    label: "Çerez Politikası",
    defaultTitle: "Cookie Policy",
    defaultBody: "Konnektora çerez politikası içeriği admin panelinden yönetilir."
  }
];

function CmsAdminPanel({
  announcements,
  categories,
  faqs,
  isPending,
  onCreateAnnouncement,
  onCreateCategory,
  onCreateFaq,
  onSavePolicy,
  onUpdateAnnouncement,
  onUpdateCategory,
  onUpdateFaq,
  policies
}: {
  announcements: Announcement[];
  categories: CmsCategory[];
  faqs: Faq[];
  isPending: boolean;
  onCreateAnnouncement: (input: AnnouncementInput) => void;
  onCreateCategory: (input: { name: string; description?: string }) => void;
  onCreateFaq: (input: { categoryId: string; title: string; body: string }) => void;
  onSavePolicy: (input: PolicyInput) => void;
  onUpdateAnnouncement: (id: string, input: Partial<AnnouncementInput> & { status?: string }) => void;
  onUpdateCategory: (id: string, input: Partial<CmsCategory>) => void;
  onUpdateFaq: (id: string, input: Partial<{ categoryId: string; title: string; body: string; status: string }>) => void;
  policies: CmsPolicy[];
}) {
  function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    onCreateCategory({
      name: String(form.get("name")),
      description: String(form.get("description") || "") || undefined
    });
    event.currentTarget.reset();
  }

  function handleFaqSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    onCreateFaq({
      categoryId: String(form.get("categoryId")),
      title: String(form.get("title")),
      body: String(form.get("body"))
    });
    event.currentTarget.reset();
  }

  function handleAnnouncementSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const publishAt = String(form.get("publishAt") || "");
    const expiresAt = String(form.get("expiresAt") || "");

    onCreateAnnouncement({
      title: String(form.get("title")),
      body: String(form.get("body")),
      target: String(form.get("target") || "all"),
      publishAt: publishAt ? new Date(publishAt).toISOString() : undefined,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined
    });
    event.currentTarget.reset();
  }

  function handlePolicySubmit(event: FormEvent<HTMLFormElement>, type: PolicyType) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    onSavePolicy({
      type,
      title: String(form.get("title")),
      body: String(form.get("body")),
      status: String(form.get("status") || "active")
    });
  }

  return (
    <section className="admin-panel">
      <div className="section-header compact">
        <h2>CMS / SSS</h2>
        <span>
          {categories.length} kategori · {faqs.length} SSS · {announcements.length} duyuru · {policies.length} politika
        </span>
      </div>
      <p className="admin-section-desc">
        SSS kategorilerini ve sorularını ekle, site duyurularını yönet, yasal politika sayfalarını düzenle. Önce kategori oluştur, ardından o kategoriye SSS ekle.
      </p>

      {/* ── 1. Kategoriler ── */}
      <div className="admin-subsection">
        <div className="admin-subsection-header">
          <h3>İçerik Kategorileri</h3>
          <span>{categories.length} kategori</span>
        </div>
        <div className="admin-create-section">
          <span className="admin-create-section-label"><Plus size={11} /> Yeni kategori</span>
          <form className="admin-form" onSubmit={handleCategorySubmit}>
            <label>
              Kategori adı
              <input name="name" placeholder="Örn. Hesap & Gizlilik, Etkinlikler, Ödeme..." required minLength={2} />
            </label>
            <label>
              Açıklama
              <textarea name="description" placeholder="Bu kategori hangi konuları kapsar? (opsiyonel)" rows={2} />
            </label>
            <button className="secondary-action" disabled={isPending} type="submit">
              <Plus size={18} />
              Kategori ekle
            </button>
          </form>
        </div>
        <div className="admin-manage-section-label">
          <span>Mevcut kategoriler</span>
          <span>{categories.length} kayıt</span>
        </div>
        {categories.length === 0 ? (
          <div className="admin-empty-state">
            <strong>Henüz kategori yok</strong>
            <p>SSS eklemeden önce en az bir kategori oluşturman gerekiyor.</p>
          </div>
        ) : (
          <div className="admin-list">
            {categories.map((category) => (
              <div className="admin-list-row" key={category.id}>
                <div>
                  <strong>{category.name}</strong>
                  <span>
                    {category.status} · {category._count?.faqs ?? 0} SSS
                  </span>
                </div>
                <button
                  className={category.status === "active" ? "ghost-action" : "secondary-action"}
                  disabled={isPending}
                  onClick={() => onUpdateCategory(category.id, { status: category.status === "active" ? "passive" : "active" })}
                  type="button"
                >
                  {category.status === "active" ? "Pasif yap" : "Aktif yap"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 2. SSS ── */}
      <div className="admin-subsection">
        <div className="admin-subsection-header">
          <h3>Sık Sorulan Sorular</h3>
          <span>{faqs.length} soru</span>
        </div>
        {categories.filter((c) => c.status === "active").length === 0 ? (
          <div className="admin-empty-state">
            <strong>Önce bir kategori oluşturman gerekiyor</strong>
            <p>Aktif kategori olmadan SSS ekleyemezsin. Yukarıdaki Kategoriler bölümünden başla.</p>
          </div>
        ) : (
          <>
            <div className="admin-create-section">
              <span className="admin-create-section-label"><Plus size={11} /> Yeni SSS sorusu</span>
              <form className="admin-form" onSubmit={handleFaqSubmit}>
                <label>
                  Kategori
                  <select name="categoryId" required>
                    <option value="">Kategori seç</option>
                    {categories
                      .filter((category) => category.status === "active")
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Soru başlığı
                  <input name="title" placeholder="Örn. Şifremi nasıl değiştirebilirim?" required minLength={3} />
                </label>
                <label>
                  Cevap
                  <textarea name="body" placeholder="Kullanıcının bu sorusuna net ve kısa bir cevap yaz..." required minLength={3} rows={4} />
                </label>
                <button className="secondary-action" disabled={isPending} type="submit">
                  <Plus size={18} />
                  SSS ekle
                </button>
              </form>
            </div>
            <div className="admin-manage-section-label">
              <span>Mevcut SSS'ler</span>
              <span>{faqs.length} kayıt</span>
            </div>
            {faqs.length === 0 ? (
              <div className="admin-empty-state">
                <strong>Henüz SSS yok</strong>
                <p>Yukarıdaki formu doldurarak ilk soruyu ekle.</p>
              </div>
            ) : (
              <div className="admin-list">
                {faqs.map((faq) => (
                  <div className="admin-list-item" key={faq.id}>
                    <div className="admin-list-row">
                      <div>
                        <strong>{faq.title}</strong>
                        <span>
                          {faq.category?.name ?? "Kategori yok"} · {faq.status}
                        </span>
                      </div>
                      <button
                        className={faq.status === "active" ? "ghost-action" : "secondary-action"}
                        disabled={isPending}
                        onClick={() => onUpdateFaq(faq.id, { status: faq.status === "active" ? "passive" : "active" })}
                        type="button"
                      >
                        {faq.status === "active" ? "Pasif yap" : "Aktif yap"}
                      </button>
                    </div>
                    <p className="form-help">{faq.body}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 3. Duyurular ── */}
      <div className="admin-subsection">
        <div className="admin-subsection-header">
          <h3>Duyurular</h3>
          <span>{announcements.length} duyuru</span>
        </div>
        <div className="admin-create-section">
          <span className="admin-create-section-label"><Plus size={11} /> Yeni duyuru</span>
          <form className="admin-form" onSubmit={handleAnnouncementSubmit}>
            <label>
              Başlık
              <input name="title" placeholder="Örn. Yeni özellik: Etkinlik daveti" required minLength={3} maxLength={160} />
            </label>
            <label>
              İçerik
              <textarea name="body" placeholder="Duyurunun detaylarını buraya yaz..." required minLength={3} rows={4} />
            </label>
            <div className="admin-form-grid">
              <label>
                Hedef
                <select name="target" defaultValue="all">
                  <option value="all">Herkes</option>
                  <option value="members">Üyeler</option>
                  <option value="admins">Adminler</option>
                </select>
              </label>
              <label>
                Yayın zamanı
                <input name="publishAt" type="datetime-local" />
              </label>
              <label>
                Bitiş zamanı
                <input name="expiresAt" type="datetime-local" />
              </label>
            </div>
            <button className="secondary-action" disabled={isPending} type="submit">
              <Megaphone size={18} />
              Duyuru ekle
            </button>
          </form>
        </div>
        <div className="admin-manage-section-label">
          <span>Mevcut duyurular</span>
          <span>{announcements.length} kayıt</span>
        </div>
        {announcements.length === 0 ? (
          <div className="admin-empty-state">
            <strong>Henüz duyuru yok</strong>
            <p>Yukarıdaki formu doldurarak ilk duyuruyu oluştur.</p>
          </div>
        ) : (
          <div className="admin-list">
            {announcements.map((announcement) => (
              <div className="admin-list-item" key={announcement.id}>
                <div className="admin-list-row">
                  <div>
                    <strong>{announcement.title}</strong>
                    <span>
                      {announcement.status} · {announcement.target} · {formatDateTime(announcement.publishAt)}
                    </span>
                  </div>
                  <button
                    className={announcement.status === "active" ? "ghost-action" : "secondary-action"}
                    disabled={isPending}
                    onClick={() =>
                      onUpdateAnnouncement(announcement.id, { status: announcement.status === "active" ? "passive" : "active" })
                    }
                    type="button"
                  >
                    {announcement.status === "active" ? "Pasif yap" : "Aktif yap"}
                  </button>
                </div>
                <p className="form-help">{announcement.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 4. Politika sayfaları ── */}
      <div className="admin-subsection">
        <div className="admin-subsection-header">
          <h3>Yasal Politika Sayfaları</h3>
          <span>{policies.length} / {policyTypes.length} dolduruldu</span>
        </div>
        <p className="admin-section-desc" style={{ margin: "0 0 14px" }}>
          Her politika türü için başlık ve içerik gir, ardından Kaydet'e bas. Aktif politikalar kullanıcılara gösterilir.
        </p>
        <div className="policy-editor-grid">
          {policyTypes.map((policyType) => {
            const policy = policies.find((item) => item.type === policyType.value);
            return (
              <form className="admin-form" key={policyType.value} onSubmit={(event) => handlePolicySubmit(event, policyType.value)}>
                <div className="admin-list-row">
                  <div>
                    <strong>{policyType.label}</strong>
                    <span>{policy?.status ?? "henüz oluşturulmadı"}</span>
                  </div>
                  <select name="status" defaultValue={policy?.status ?? "active"} disabled={isPending}>
                    <option value="active">Aktif</option>
                    <option value="passive">Pasif</option>
                  </select>
                </div>
                <label>
                  Başlık
                  <input name="title" defaultValue={policy?.title ?? policyType.defaultTitle} required minLength={3} maxLength={160} />
                </label>
                <label>
                  İçerik
                  <textarea name="body" defaultValue={policy?.body ?? policyType.defaultBody} required minLength={10} rows={8} />
                </label>
                <button className="secondary-action" disabled={isPending} type="submit">
                  <Check size={18} />
                  Kaydet
                </button>
              </form>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function EmailTokenInfoPanel() {
  return (
    <section className="admin-panel">
      <div className="section-header compact">
        <h2>Email Token Akışları</h2>
        <span>3 akış · sistem yönetimli</span>
      </div>

      <div className="metric-grid compact-metrics">
        <div className="metric-card">
          <Key size={20} />
          <span>Token türü</span>
          <strong>Kriptografik UUID</strong>
        </div>
        <div className="metric-card">
          <Check size={20} />
          <span>Tek kullanımlık</span>
          <strong>Evet</strong>
        </div>
        <div className="metric-card">
          <AlertTriangle size={20} />
          <span>Geçerlilik süresi</span>
          <strong>24 saat</strong>
        </div>
      </div>

      <div className="admin-list" style={{ marginTop: "18px" }}>
        <div className="admin-list-item">
          <div className="admin-list-row">
            <div>
              <strong>Email doğrulama</strong>
              <span>verify_email · Kayıt sonrası gönderilir</span>
            </div>
            <span className="status-pill status-accepted">Aktif</span>
          </div>
          <p className="form-help" style={{ padding: "0 12px 12px" }}>
            Kullanıcı kayıt olduğunda sistem otomatik olarak bir doğrulama tokeni oluşturur.
            <code>/auth/token</code> endpoint'i üzerinden tüketilir. Token tüketilince kullanıcı
            statüsü <code>pending → active</code> geçişi yapar.
          </p>
        </div>

        <div className="admin-list-item">
          <div className="admin-list-row">
            <div>
              <strong>Şifre sıfırlama</strong>
              <span>password_reset · Şifre sıfırlama talebinde gönderilir</span>
            </div>
            <span className="status-pill status-accepted">Aktif</span>
          </div>
          <p className="form-help" style={{ padding: "0 12px 12px" }}>
            <code>/auth/forgot-password</code> endpoint'i ile token oluşturulur.
            Kullanıcı linke tıkladığında <code>/auth/reset-password</code> endpoint'i ile tüketilir.
          </p>
        </div>

        <div className="admin-list-item">
          <div className="admin-list-row">
            <div>
              <strong>Davet kabulü</strong>
              <span>invite_accept · Admin etkinliğe katılımcı davet ettiğinde</span>
            </div>
            <span className="status-pill status-accepted">Aktif</span>
          </div>
          <p className="form-help" style={{ padding: "0 12px 12px" }}>
            Etkinlik Yönetimi → Guest List bölümündeki "Davet et" aksiyonu ile oluşturulur.
            Davet edilen kişi linke tıkladığında token tüketilir ve katılımı onaylanır.
          </p>
        </div>
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
        <h2>Rol / Yetki Grupları</h2>
        <span>{roleGroups.length} grup</span>
      </div>
      <p className="admin-section-desc">
        Admin yetki grupları oluştur ve her gruba farklı yetkiler ata. Admin kullanıcılara yetki grubu atamak için <strong>Üye Yönetimi</strong> bölümüne git.
      </p>
      <div className="admin-create-section">
        <span className="admin-create-section-label"><Plus size={11} /> Yeni rol grubu</span>
        <form className="admin-form" onSubmit={handleSubmit}>
          <label>
            Rol grubu adı
            <input name="name" placeholder="Örn. Moderasyon Ekibi, İçerik Editörü..." required minLength={2} />
          </label>
          <label>
            Açıklama
            <textarea name="description" placeholder="Bu grubun sorumluluğu nedir? (opsiyonel)" rows={2} />
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
      </div>
      <div className="admin-manage-section-label">
        <span>Mevcut rol grupları</span>
        <span>{roleGroups.length} kayıt</span>
      </div>
      {roleGroups.length === 0 ? (
        <div className="admin-empty-state">
          <strong>Henüz rol grubu yok</strong>
          <p>Yukarıdaki formu doldurarak ilk yetki grubunu oluştur.</p>
        </div>
      ) : (
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
      )}
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
      void queryClient.invalidateQueries({ queryKey: ["admin-users-total"] });
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
        <h2>Üye Yönetimi</h2>
        <span>{usersQuery.isLoading ? "Yükleniyor" : `${userList?.total ?? 0} üye`}</span>
      </div>
      <p className="admin-section-desc">
        Tüm üyeleri ara, filtrele ve yönet. Statü değiştirebilir, rol atayabilir, admin rol grubu belirleyebilirsin.
      </p>
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
      {usersQuery.isSuccess && (userList?.items ?? []).length === 0 ? (
        <div className="admin-empty-state">
          <strong>Sonuç bulunamadı</strong>
          <p>Farklı filtreler deneyebilir veya arama terimini değiştirebilirsin.</p>
        </div>
      ) : null}
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
      {detailQuery.data ? (
        <UserDetailCard
          isPending={updateMutation.isPending}
          onUpdate={(input) => updateMutation.mutate({ id: detailQuery.data.id, ...input })}
          roleGroups={roleGroups}
          user={detailQuery.data}
        />
      ) : null}
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
          disabled={isPending}
          onChange={(event) =>
            onUpdate({
              adminRoleGroupId: event.target.value || null,
              role: event.target.value && user.role === "user" ? "admin" : undefined
            })
          }
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

function UserDetailCard({
  isPending,
  onUpdate,
  roleGroups,
  user
}: {
  isPending: boolean;
  onUpdate: (input: {
    status?: "active" | "invited" | "pending" | "disabled";
    role?: "user" | "admin" | "super_admin";
    adminRoleGroupId?: string | null;
  }) => void;
  roleGroups: AdminRoleGroup[];
  user: AdminManagedUserDetail;
}) {
  return (
    <div className="admin-list-item">
      <div className="section-header compact">
        <div>
          <h3>{user.name}</h3>
          <span>{user.email}</span>
        </div>
        <span className={`status-pill status-${user.status}`}>{user.status}</span>
      </div>
      <div className="admin-list-row">
        <div>
          <strong>Hesap bilgileri</strong>
          <span>
            Rol: {user.role} · Rol grubu: {user.adminRoleGroup?.name ?? "Yok"}
          </span>
          <span>
            Oluşturulma: {user.createdAt ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(user.createdAt)) : "Bilinmiyor"}
          </span>
        </div>
        <label className="inline-select-label">
          Rol grubu
          <select
            disabled={isPending}
            onChange={(event) =>
              onUpdate({
                adminRoleGroupId: event.target.value || null,
                role: event.target.value && user.role === "user" ? "admin" : undefined
              })
            }
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
        </label>
        <div className="row-actions">
          {user.role === "user" ? (
            <button className="secondary-action" disabled={isPending} onClick={() => onUpdate({ role: "admin" })} type="button">
              Admin yap
            </button>
          ) : null}
          {user.role === "admin" ? (
            <button className="ghost-action" disabled={isPending} onClick={() => onUpdate({ role: "user", adminRoleGroupId: null })} type="button">
              User yap
            </button>
          ) : null}
          {user.status === "active" ? (
            <button className="ghost-action" disabled={isPending} onClick={() => onUpdate({ status: "disabled" })} type="button">
              Disable
            </button>
          ) : (
            <button className="secondary-action" disabled={isPending} onClick={() => onUpdate({ status: "active" })} type="button">
              Aktif yap
            </button>
          )}
        </div>
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
  groupDetail,
  groupScope,
  groups,
  isPending,
  onCreateDecision,
  onCreateRule,
  onResolve,
  onSaveGroupNote,
  onSelectGroup,
  onSetGroupScope,
  onUpdateRule,
  onUpdate,
  rules,
  reports
}: {
  groupDetail: ReportGroupDetail | null;
  groupScope: "active" | "old";
  groups: ReportGroup[];
  isPending: boolean;
  onCreateDecision: (input: { targetType: ReportTargetType; targetId: string; data: ModerationDecisionInput }) => void;
  onCreateRule: (input: ReportRuleInput) => void;
  onResolve: (input: {
    id: string;
    action: "archive_event" | "archive_tag" | "disable_user";
    resolutionNote?: string;
  }) => void;
  onSaveGroupNote: (input: { targetType: ReportTargetType; targetId: string; note: string }) => void;
  onSelectGroup: (group: ReportGroup) => void;
  onSetGroupScope: (scope: "active" | "old") => void;
  onUpdateRule: (id: string, input: Partial<ReportRuleInput> & { status?: string }) => void;
  onUpdate: (input: { id: string; status: "open" | "reviewing" | "resolved" | "dismissed"; resolutionNote?: string }) => void;
  rules: ReportRule[];
  reports: ContentReport[];
}) {
  const [ruleTargetType, setRuleTargetType] = useState<ReportTargetType>("event");

  function handleRuleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    onCreateRule({
      targetType: String(form.get("targetType")) as ReportTargetType,
      title: String(form.get("title")),
      description: String(form.get("description") || "") || undefined,
      violationScore: Number(form.get("violationScore") || 1)
    });
    event.currentTarget.reset();
  }

  function handleSubmit(reportId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    onUpdate({
      id: reportId,
      status: String(form.get("status")) as "open" | "reviewing" | "resolved" | "dismissed",
      resolutionNote: String(form.get("resolutionNote") || "") || undefined
    });
  }

  function handleGroupNoteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!groupDetail) {
      return;
    }

    const form = new FormData(event.currentTarget);
    onSaveGroupNote({
      targetType: groupDetail.targetType,
      targetId: groupDetail.targetId,
      note: String(form.get("note") || "")
    });
  }

  function handleDecisionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!groupDetail) {
      return;
    }

    const form = new FormData(event.currentTarget);
    const suspensionEndsAt = String(form.get("suspensionEndsAt") || "");

    onCreateDecision({
      targetType: groupDetail.targetType,
      targetId: groupDetail.targetId,
      data: {
        decision: String(form.get("decision")) as "violation" | "no_violation",
        action: String(form.get("action")) as ModerationDecisionInput["action"],
        penaltyScore: Number(form.get("penaltyScore") || 0),
        note: String(form.get("note") || "") || undefined,
        suspensionEndsAt: suspensionEndsAt ? new Date(suspensionEndsAt).toISOString() : undefined
      }
    });
    event.currentTarget.reset();
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
        <h2>Şikayetler & Moderasyon</h2>
        <span>
          {rules.length} kural · {groups.length} grup · {reports.length} rapor
        </span>
      </div>
      <p className="admin-section-desc">
        Şikayet kuralları tanımla, bildirilen içerikleri incele ve moderasyon kararları uygula. Açık şikayetler acil dikkat gerektirir.
      </p>
      <form className="admin-form" onSubmit={handleRuleSubmit}>
        <h3>Şikayet kuralı oluştur</h3>
        <div className="admin-form-grid">
          <label>
            Kategori
            <select name="targetType" value={ruleTargetType} onChange={(event) => setRuleTargetType(event.target.value as ReportTargetType)}>
              <option value="event">Etkinlik</option>
              <option value="tag">Tag</option>
              <option value="user">Kullanıcı</option>
            </select>
          </label>
          <label>
            İhlal puanı
            <input name="violationScore" defaultValue={1} min={1} max={100} required type="number" />
          </label>
        </div>
        <label>
          Kural başlığı
          <select name="title" required>
            {REPORT_RULE_TITLE_OPTIONS[ruleTargetType].map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Açıklama
          <textarea name="description" rows={2} />
        </label>
        <button className="secondary-action" disabled={isPending} type="submit">
          <Plus size={18} />
          Kural ekle
        </button>
      </form>
      <div className="admin-list">
        {rules.map((rule) => (
          <div className="admin-list-row" key={rule.id}>
            <div>
              <strong>{rule.title}</strong>
              <span>
                {rule.targetType} · {rule.violationScore} puan · {rule.status}
              </span>
            </div>
            <button
              className={rule.status === "active" ? "ghost-action" : "secondary-action"}
              disabled={isPending}
              onClick={() => onUpdateRule(rule.id, { status: rule.status === "active" ? "passive" : "active" })}
              type="button"
            >
              {rule.status === "active" ? "Pasif yap" : "Aktif yap"}
            </button>
          </div>
        ))}
      </div>
      <div className="section-header compact">
        <h3>Şikayet grupları</h3>
        <div className="segmented-control">
          <button className={groupScope === "active" ? "active" : ""} onClick={() => onSetGroupScope("active")} type="button">
            Aktif
          </button>
          <button className={groupScope === "old" ? "active" : ""} onClick={() => onSetGroupScope("old")} type="button">
            Eski
          </button>
        </div>
      </div>
      {groups.length === 0 ? <p className="muted">Bu sekmede şikayet grubu yok.</p> : null}
      <div className="admin-list">
        {groups.map((group) => (
          <button className="admin-list-row admin-list-button" key={`${group.targetType}-${group.targetId}`} onClick={() => onSelectGroup(group)} type="button">
            <div>
              <strong>
                {group.targetType} · {group.targetId.slice(0, 8)}
              </strong>
              <span>
                {group.activeReports} aktif · {group.oldReports} eski · {group.violationScore} puan
              </span>
            </div>
            <span className="status-pill status-reviewing">{group.totalReports} rapor</span>
          </button>
        ))}
      </div>
      {groupDetail ? (
        <div className="admin-list-item">
          <div className="admin-list-row">
            <div>
              <strong>
                Detay · {groupDetail.targetType} · {groupDetail.targetId.slice(0, 8)}
              </strong>
              <span>
                {groupDetail.totalReports} rapor · {groupDetail.violationScore} ihlal puanı
              </span>
            </div>
          </div>
          <form className="admin-form compact-form" onSubmit={handleGroupNoteSubmit}>
            <label>
              Grup admin notu
              <textarea name="note" defaultValue={groupDetail.note?.note ?? ""} rows={3} maxLength={2000} />
            </label>
            <button className="secondary-action" disabled={isPending} type="submit">
              Notu kaydet
            </button>
          </form>
          <form className="admin-form compact-form" onSubmit={handleDecisionSubmit}>
            <h3>Ceza / Müdahale Kararı</h3>
            <div className="admin-form-grid">
              <label>
                Karar
                <select name="decision" defaultValue="violation">
                  <option value="violation">İhlal var</option>
                  <option value="no_violation">İhlal yok</option>
                </select>
              </label>
              <label>
                Aksiyon
                <select name="action" defaultValue={defaultModerationAction(groupDetail.targetType)}>
                  <option value="none">Aksiyon yok</option>
                  <option value="warn_user">Kullanıcıyı uyar</option>
                  <option value="suspend_user">Kullanıcıyı askıya al</option>
                  <option value="ban_user">Kullanıcıyı yasakla</option>
                  <option value="archive_event">Etkinliği arşivle</option>
                  <option value="archive_tag">Tag'i arşivle</option>
                </select>
              </label>
              <label>
                Ceza puanı
                <input name="penaltyScore" defaultValue={groupDetail.violationScore} min={0} max={1000} type="number" />
              </label>
              <label>
                Askı bitişi
                <input name="suspensionEndsAt" type="datetime-local" />
              </label>
            </div>
            <label>
              Karar notu
              <textarea name="note" rows={3} maxLength={2000} />
            </label>
            <button className="danger-action" disabled={isPending} type="submit">
              Kararı uygula
            </button>
          </form>
          {groupDetail.decisions?.length ? (
            <div className="admin-list">
              {groupDetail.decisions.map((decision) => (
                <div className="admin-list-row" key={decision.id}>
                  <div>
                    <strong>
                      {decision.decision} · {decision.action}
                    </strong>
                    <span>
                      {decision.penaltyScore} puan · {decision.issuedBy?.email ?? "admin"}
                    </span>
                  </div>
                  <span className="status-pill status-resolved">{decision.createdAt ? formatDateTime(decision.createdAt) : "karar"}</span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="admin-list">
            {groupDetail.reports.map((report) => (
              <div className="admin-list-row" key={report.id}>
                <div>
                  <strong>{report.reason}</strong>
                  <span>
                    {report.status} · {report.rule?.title ?? "Serbest rapor"} · {report.reporter?.email ?? report.reporterId}
                  </span>
                </div>
                <span className={`status-pill status-${report.status}`}>{report.status}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="section-header compact">
        <h3>Tekil rapor kuyruğu</h3>
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
                  {report.status} · {report.rule?.title ?? "Serbest rapor"} · {report.reporter?.email ?? report.reporterId}
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
  detail,
  isPending,
  onArchive,
  onBan,
  onMerge,
  onSelect,
  onUpdate,
  tags
}: {
  detail: AdminTagDetail | null;
  isPending: boolean;
  onArchive: (id: string) => void;
  onBan: (id: string) => void;
  onMerge: (id: string, targetTagId: string) => void;
  onSelect: (id: string) => void;
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

    if (!editingTag) {
      return;
    }

    onUpdate({ id: editingTag.id, ...input });
    setEditingTagId(null);

    event.currentTarget.reset();
  }

  function handleMergeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!detail) {
      return;
    }

    const form = new FormData(event.currentTarget);
    onMerge(detail.id, String(form.get("targetTagId")));
  }

  return (
    <section className="admin-panel">
      <div className="section-header compact">
        <h2>İlgi Alanı / Tag Yönetimi</h2>
        <span>{tags.length} tag</span>
      </div>
      <p className="admin-section-desc">
        İlgi alanı tag'lerini incele, yeniden adlandır, birleştir ve arşivle. Yeni tag oluşturma kullanıcı/etkinlik akışından yapılır.
      </p>
      {editingTag ? (
        <div className="admin-create-section">
          <span className="admin-create-section-label">Tag'i güncelle</span>
          <form className="admin-form" onSubmit={handleSubmit}>
            <label>
              Tag adı
              <input key={`${editingTag.id}-name`} name="name" required minLength={2} defaultValue={editingTag.name} />
            </label>
            <label>
              Açıklama
              <textarea key={`${editingTag.id}-description`} name="description" rows={3} defaultValue={editingTag.description ?? ""} />
            </label>
            <button className="secondary-action" disabled={isPending} type="submit">
              Tag güncelle
            </button>
            <button className="ghost-action" onClick={() => setEditingTagId(null)} type="button">
              Vazgeç
            </button>
          </form>
        </div>
      ) : null}
      <div className="admin-manage-section-label">
        <span>Mevcut tag'ler</span>
        <span>{tags.length} kayıt</span>
      </div>
      {tags.length === 0 ? (
        <div className="admin-empty-state">
          <strong>Henüz tag yok</strong>
          <p>Yeni tag'ler kullanıcıların tag ekleme veya etkinlik oluşturma akışından gelir.</p>
        </div>
      ) : (
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
            <button className="ghost-action" onClick={() => onSelect(tag.id)} type="button">
              Detay
            </button>
            {tag.status !== "archived" ? (
              <button className="danger-action" onClick={() => onArchive(tag.id)} type="button">
                Arşivle
              </button>
            ) : null}
          </div>
        ))}
      </div>
      )}
      {detail ? (
        <div className="admin-list-item">
          <div className="section-header compact">
            <div>
              <h3>{detail.name}</h3>
              <span>{detail.slug}</span>
            </div>
            <span className={`status-pill status-${detail.status}`}>{detail.status}</span>
          </div>
          <div className="metric-grid compact-metrics">
            <MetricCard icon={<CalendarCheck size={20} />} label="Event" value={detail._count?.events ?? 0} />
            <MetricCard icon={<Users size={20} />} label="İlgilenen üye" value={detail._count?.interestedUsers ?? 0} />
            <MetricCard icon={<AlertTriangle size={20} />} label="Şikayet" value={detail.reportCount} />
          </div>
          <div className="admin-list-row">
            <div>
              <strong>Creator</strong>
              <span>{detail.createdBy?.email ?? "Bilinmiyor"}</span>
            </div>
            <div>
              <strong>Son güncelleyen</strong>
              <span>{detail.updatedBy?.email ?? "Bilinmiyor"}</span>
            </div>
          </div>
          <form className="admin-form compact-form" onSubmit={handleMergeSubmit}>
            <label>
              Merge hedefi
              <select name="targetTagId" required>
                <option value="">Tag seç</option>
                {tags
                  .filter((tag) => tag.id !== detail.id && tag.status === "active")
                  .map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
              </select>
            </label>
            <button className="danger-action" disabled={isPending} type="submit">
              Merge et
            </button>
          </form>
          <div className="row-actions">
            <button className="danger-action" disabled={isPending || detail.status === "hidden"} onClick={() => onBan(detail.id)} type="button">
              Banla / gizle
            </button>
            <button className="danger-action" disabled={isPending || detail.status === "archived"} onClick={() => onArchive(detail.id)} type="button">
              Arşivle
            </button>
          </div>
        </div>
      ) : null}
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
        <h2>Etkinlik Yönetimi</h2>
        <span>{events.length} etkinlik</span>
      </div>
      <p className="admin-section-desc">
        Etkinlik ekle veya düzenle. <strong>Published</strong> durumundaki etkinlikler herkese açık listede görünür; <strong>Draft</strong> olanlar sadece burada listelenir.
      </p>
      {isDemoMode ? (
        <p className="form-help">
          Demo modunda kayıtlar bu tarayıcıya kaydedilir. Canlı database için backend deploy edip Netlify'da
          VITE_API_URL tanımlanmalı.
        </p>
      ) : null}
      {notice ? <p className={notice.tone === "success" ? "form-success" : "form-error"}>{notice.message}</p> : null}
      <div className="admin-create-section">
        <span className="admin-create-section-label">
          <Plus size={11} />
          {editingEvent ? "Etkinliği güncelle" : "Yeni etkinlik"}
        </span>
      <form className="admin-form" onSubmit={handleSubmit}>
        <label>
          Başlık
          <input key={`${editingEvent?.id ?? "new"}-title`} name="title" required minLength={3} placeholder="Etkinlik başlığı" defaultValue={editingEvent?.title ?? ""} />
        </label>
        <label>
          Açıklama
          <textarea key={`${editingEvent?.id ?? "new"}-description`} name="description" required minLength={10} rows={4} placeholder="Etkinliği kısaca tanımla: konu, hedef kitle, neler öğrenilecek..." defaultValue={editingEvent?.description ?? ""} />
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
      </div>
      <div className="admin-manage-section-label">
        <span>Mevcut etkinlikler</span>
        <span>{events.length} kayıt</span>
      </div>
      {events.length === 0 ? (
        <div className="admin-empty-state">
          <strong>Henüz etkinlik yok</strong>
          <p>Yukarıdaki formu doldurarak ilk etkinliği oluşturabilirsin.</p>
        </div>
      ) : (
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
      )}
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
  const participants: EventParticipant[] = participantsQuery.data ?? [];

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
