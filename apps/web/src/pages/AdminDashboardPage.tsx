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
  MessageSquare,
  Plus,
  ShieldCheck,
  Tags,
  Users,
  X
} from "lucide-react";
import { type FormEvent, type ReactNode, useRef, useState } from "react";
import {
  type AdminEventInput,
  type AnnouncementInput,
  type ModerationDecisionInput,
  type PolicyInput,
  type ResolveReportActionInput,
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
  deleteAdminCmsCategory,
  deleteAdminFaq,
  getAdminReportGroup,
  getAdminDashboard,
  getAdminMessage,
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
  listAdminMessages,
  listAdminComments,
  listAdminMedia,
  listAdminPlaces,
  listAdminPrivateMessages,
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
  updateAdminMessage,
  updateAdminComment,
  updateAdminMedia,
  updateAdminPlace,
  updateAdminPrivateMessage,
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
  AdminComment,
  AdminManagedUser,
  AdminManagedUserDetail,
  AdminMedia,
  AdminPermission,
  AdminPlace,
  AdminPrivateMessage,
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
  Tag,
  UserMessage,
  UserMessageStatus,
  UserMessageType
} from "@konnektora/shared";

type AdminSection =
  | "dashboard"
  | "users"
  | "roles"
  | "events"
  | "places"
  | "media"
  | "comments"
  | "private-messages"
  | "tags"
  | "reports"
  | "messages"
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
      { id: "places", label: "Mekanlar", Icon: LayoutDashboard },
      { id: "media", label: "Medya", Icon: FileText },
      { id: "comments", label: "Yorumlar", Icon: MessageSquare },
      { id: "tags", label: "İlgi Alanları", Icon: Tags }
    ]
  },
  {
    label: "Moderasyon",
    items: [
      { id: "reports", label: "Şikayetler", Icon: AlertTriangle },
      { id: "private-messages", label: "Özel Mesajlar", Icon: MessageSquare },
      { id: "messages", label: "Kullanıcı Mesajları", Icon: MessageSquare }
    ]
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
  places: "Mekanlar",
  media: "Medya",
  comments: "Yorumlar",
  "private-messages": "Özel Mesajlar",
  tags: "İlgi Alanları",
  reports: "Şikayetler",
  messages: "Kullanıcı Mesajları",
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
  user: ["Spam kullanıcı", "Taciz veya kötüye kullanım", "Sahte profil", "Topluluk kurallarını ihlal"],
  media: ["Uygunsuz medya", "Telif / hak ihlali", "Şiddet veya hassas medya", "Yanıltıcı medya"],
  place: ["Yanıltıcı mekan bilgisi", "Uygunsuz mekan içeriği", "Spam mekan", "Güvenlik riski taşıyan mekan"],
  username: ["Uygunsuz kullanıcı adı", "Taklit kullanıcı adı", "Marka/kişi hakkı ihlali", "Yanıltıcı kullanıcı adı"],
  website_url: ["Zararlı web adresi", "Spam web adresi", "Yanıltıcı web adresi", "Uygunsuz web adresi"],
  tag_comment: ["Uygunsuz tag yorumu", "Spam tag yorumu", "Taciz içeren tag yorumu", "Yanıltıcı tag yorumu"],
  event_comment: ["Uygunsuz etkinlik yorumu", "Spam etkinlik yorumu", "Taciz içeren etkinlik yorumu", "Yanıltıcı etkinlik yorumu"],
  place_comment: ["Uygunsuz mekan yorumu", "Spam mekan yorumu", "Taciz içeren mekan yorumu", "Yanıltıcı mekan yorumu"],
  comment_reply: ["Uygunsuz yorum cevabı", "Spam yorum cevabı", "Taciz içeren yorum cevabı", "Yanıltıcı yorum cevabı"],
  private_message: ["Uygunsuz özel mesaj", "Spam özel mesaj", "Taciz içeren özel mesaj", "Güvenlik riski taşıyan özel mesaj"]
};

const REPORT_TARGET_OPTIONS: Array<{ value: ReportTargetType; label: string }> = [
  { value: "media", label: "Medya" },
  { value: "tag", label: "Etiket" },
  { value: "event", label: "Etkinlik" },
  { value: "place", label: "Mekan" },
  { value: "username", label: "Kullanıcı adı" },
  { value: "website_url", label: "Web sitesi adresi" },
  { value: "tag_comment", label: "Etiket yorumu" },
  { value: "event_comment", label: "Etkinlik yorumu" },
  { value: "place_comment", label: "Mekan yorumu" },
  { value: "comment_reply", label: "Yorum yorumu" },
  { value: "private_message", label: "Özel mesaj" },
  { value: "user", label: "Kullanıcı hesabı" }
];

const USER_MESSAGE_TYPE_META: Record<UserMessageType, { label: string; description: string; categories: string[] }> = {
  faq: {
    label: "FAQ mesajları",
    description: "SSS sayfalarından veya yardım akışından gelen kullanıcı soruları.",
    categories: ["Profile", "Account", "Rules", "Tags", "Events", "Places", "Media Files", "Comments", "Private Messages"]
  },
  account_freeze: {
    label: "Hesap dondurma mesajları",
    description: "Hesabını dondurmak veya hesap erişimiyle ilgili destek isteyen kullanıcı mesajları.",
    categories: []
  },
  write_to_us: {
    label: "Write to us mesajları",
    description: "Hata, öneri, şikayet, reklam, iş birliği ve diğer iletişim talepleri.",
    categories: ["Hata", "Oneriler", "Sikayet", "Reklam", "Is birligi", "Diger"]
  }
};

const CMS_CATEGORY_TYPE_OPTIONS: Array<{ value: CmsCategory["type"]; label: string; description: string }> = [
  {
    value: "faq",
    label: "SSS kategorisi",
    description: "Public yardım/SSS içerikleri için kullanılır."
  },
  {
    value: "write_to_us",
    label: "Write to us kategorisi",
    description: "Kullanıcı mesajlarındaki iletişim konuları için kullanılır."
  }
];

const CMS_CATEGORY_TYPE_LABELS: Record<CmsCategory["type"], string> = {
  faq: "SSS kategorisi",
  write_to_us: "Write to us kategorisi"
};

const ADMIN_PERMISSION_GROUPS: Array<{ label: string; description: string; permissions: AdminPermission[] }> = [
  {
    label: "CMS",
    description: "Kategori, SSS, duyuru ve politika içerikleri.",
    permissions: ["cms.categories.manage", "cms.faq.manage", "cms.announcements.manage", "cms.policies.manage"]
  },
  {
    label: "Moderasyon",
    description: "Şikayetler, müdahale akışları ve kullanıcı mesajları.",
    permissions: ["reports.manage", "messages.faq.manage", "messages.account_freeze.manage", "messages.write_to_us.manage"]
  },
  {
    label: "Üyeler",
    description: "Üye listesi, detayları ve rol grubu atamaları.",
    permissions: ["users.manage", "roles.manage"]
  },
  {
    label: "İçerik",
    description: "İlgi alanları, etkinlikler ve sonraki faz içerik modülleri.",
    permissions: ["tags.manage", "events.manage", "places.manage", "comments.manage", "media.manage"]
  }
];

const ADMIN_PERMISSION_LABELS = new Map<string, string>([
  ...adminPermissionOptions.map((permission) => [permission.value, permission.label] as const),
  ["cms.manage", "CMS (legacy tüm CMS yetkileri)"],
  ["messages.manage", "Kullanıcı mesajları (legacy tüm mesaj yetkileri)"]
]);

const USER_STATUS_OPTIONS: Array<{ value: AdminManagedUser["status"]; label: string }> = [
  { value: "active", label: "Aktif" },
  { value: "frozen", label: "Dondurulmuş" },
  { value: "deleted", label: "Silinmiş" },
  { value: "suspended", label: "Hesabı askıda" },
  { value: "banned", label: "Yasaklı" },
  { value: "invited", label: "Davet edildi" },
  { value: "pending", label: "Beklemede" },
  { value: "disabled", label: "Pasif" }
];

const GENDER_OPTIONS = ["Erkek", "Kadin", "Belirtilmemis"];

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
  const placesQuery = useQuery({
    queryKey: ["admin-places"],
    queryFn: () => listAdminPlaces(),
    enabled: Boolean(token)
  });
  const mediaQuery = useQuery({
    queryKey: ["admin-media"],
    queryFn: () => listAdminMedia(),
    enabled: Boolean(token)
  });
  const commentsQuery = useQuery({
    queryKey: ["admin-comments"],
    queryFn: () => listAdminComments(),
    enabled: Boolean(token)
  });
  const privateMessagesQuery = useQuery({
    queryKey: ["admin-private-messages"],
    queryFn: () => listAdminPrivateMessages(),
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
  const updatePlaceMutation = useMutation({
    mutationFn: (input: { id: string; status: string }) => updateAdminPlace(input.id, input.status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-places"] })
  });
  const updateMediaMutation = useMutation({
    mutationFn: (input: { id: string; status: string }) => updateAdminMedia(input.id, input.status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-media"] })
  });
  const updateCommentMutation = useMutation({
    mutationFn: (input: { id: string; status: string }) => updateAdminComment(input.id, input.status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-comments"] })
  });
  const updatePrivateMessageMutation = useMutation({
    mutationFn: (input: { id: string; status: string }) => updateAdminPrivateMessage(input.id, input.status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-private-messages"] })
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
      action: ResolveReportActionInput["action"];
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
  const deleteCmsCategoryMutation = useMutation({
    mutationFn: deleteAdminCmsCategory,
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
  const deleteFaqMutation = useMutation({
    mutationFn: deleteAdminFaq,
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
              <MetricCard icon={<LayoutDashboard size={24} />} label="Mekanlar" value={placesQuery.data?.length ?? 0} />
              <MetricCard icon={<FileText size={24} />} label="Medya" value={mediaQuery.data?.length ?? 0} />
              <MetricCard icon={<MessageSquare size={24} />} label="Yorumlar" value={commentsQuery.data?.length ?? 0} />
              <MetricCard icon={<MessageSquare size={24} />} label="Özel mesajlar" value={privateMessagesQuery.data?.length ?? 0} />
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
                Icon={LayoutDashboard}
                label="Mekanlar"
                onClick={() => setActiveSection("places")}
                stats={[{ label: "Toplam", value: placesQuery.data?.length ?? 0 }]}
              />
              <DashboardModuleCard
                Icon={FileText}
                label="Medya"
                onClick={() => setActiveSection("media")}
                stats={[{ label: "Toplam", value: mediaQuery.data?.length ?? 0 }]}
              />
              <DashboardModuleCard
                Icon={MessageSquare}
                label="Yorumlar"
                onClick={() => setActiveSection("comments")}
                stats={[{ label: "Toplam", value: commentsQuery.data?.length ?? 0 }]}
              />
              <DashboardModuleCard
                Icon={MessageSquare}
                label="Özel Mesajlar"
                onClick={() => setActiveSection("private-messages")}
                stats={[
                  { label: "Toplam", value: privateMessagesQuery.data?.length ?? 0 },
                  { label: "Aktif", value: privateMessagesQuery.data?.filter((message) => message.status === "active").length ?? 0 }
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

        {activeSection === "places" && (
          <AdminContentPanel
            title="Mekan Yönetimi"
            description="Mekanları listele, detaylarını incele ve yayından kaldırma/arşivleme müdahalelerini uygula."
            items={placesQuery.data ?? []}
            isPending={updatePlaceMutation.isPending}
            onStatusChange={(id, status) => updatePlaceMutation.mutate({ id, status })}
            renderPrimary={(item: AdminPlace) => item.name}
            renderSecondary={(item: AdminPlace) => [item.city, item.country].filter(Boolean).join(" - ") || item.address || "Konum yok"}
            renderMeta={(item: AdminPlace) => `${item.followerCount} takipçi · ${item.inviteCount} davet · ${item.reportCount ?? 0} şikayet`}
          />
        )}

        {activeSection === "media" && (
          <AdminContentPanel
            title="Medya Yönetimi"
            description="Profil, etkinlik, mekan ve yorumlarda kullanılan medya dosyalarını yönet."
            items={mediaQuery.data ?? []}
            isPending={updateMediaMutation.isPending}
            onStatusChange={(id, status) => updateMediaMutation.mutate({ id, status })}
            renderPrimary={(item: AdminMedia) => item.url}
            renderSecondary={(item: AdminMedia) => `${item.contentType} · ${item.contentId}`}
            renderMeta={(item: AdminMedia) => `${item.type} · ${item.reportCount ?? 0} şikayet`}
          />
        )}

        {activeSection === "comments" && (
          <AdminContentPanel
            title="Yorum Yönetimi"
            description="Etiket, etkinlik, mekan ve yorum cevabı içeriklerini yönet."
            items={commentsQuery.data ?? []}
            isPending={updateCommentMutation.isPending}
            onStatusChange={(id, status) => updateCommentMutation.mutate({ id, status })}
            renderPrimary={(item: AdminComment) => item.body}
            renderSecondary={(item: AdminComment) => `${item.targetType} · ${item.author?.email ?? "Anonim"}`}
            renderMeta={(item: AdminComment) => `${item.likeCount} beğeni · ${item._count?.replies ?? 0} cevap · ${item.reportCount ?? 0} şikayet`}
          />
        )}

        {activeSection === "private-messages" && (
          <AdminContentPanel
            title="Özel Mesaj Yönetimi"
            description="Kullanıcılar arasındaki raporlanabilir özel mesaj içeriklerini yönet."
            items={privateMessagesQuery.data ?? []}
            isPending={updatePrivateMessageMutation.isPending}
            onStatusChange={(id, status) => updatePrivateMessageMutation.mutate({ id, status })}
            renderPrimary={(item: AdminPrivateMessage) => item.body}
            renderSecondary={(item: AdminPrivateMessage) => `${item.sender?.email ?? "Bilinmiyor"} → ${item.recipient?.email ?? "Bilinmiyor"}`}
            renderMeta={(item: AdminPrivateMessage) => `${item.reportCount ?? 0} şikayet · ${formatDateTime(item.createdAt)}`}
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

        {activeSection === "messages" && <UserMessagesAdminPanel />}

        {activeSection === "cms" && (
          <CmsAdminPanel
            announcements={announcements}
            categories={cmsCategories}
            faqs={faqs}
            isPending={
              createCmsCategoryMutation.isPending ||
              updateCmsCategoryMutation.isPending ||
              deleteCmsCategoryMutation.isPending ||
              createFaqMutation.isPending ||
              updateFaqMutation.isPending ||
              deleteFaqMutation.isPending ||
              createAnnouncementMutation.isPending ||
              updateAnnouncementMutation.isPending ||
              upsertPolicyMutation.isPending
            }
            onCreateAnnouncement={(input) => createAnnouncementMutation.mutate(input)}
            onCreateCategory={(input) => createCmsCategoryMutation.mutate(input)}
            onCreateFaq={(input) => createFaqMutation.mutate(input)}
            onDeleteCategory={(id) => deleteCmsCategoryMutation.mutate(id)}
            onDeleteFaq={(id) => deleteFaqMutation.mutate(id)}
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

  if (targetType === "media") {
    return "remove_media";
  }

  if (targetType === "place") {
    return "archive_place";
  }

  if (["tag_comment", "event_comment", "place_comment", "comment_reply"].includes(targetType)) {
    return "remove_comment";
  }

  if (targetType === "username") {
    return "reset_username";
  }

  if (targetType === "website_url") {
    return "remove_website";
  }

  if (targetType === "private_message") {
    return "remove_private_messages";
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
  onDeleteCategory,
  onDeleteFaq,
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
  onCreateCategory: (input: { name: string; description?: string; type?: CmsCategory["type"] }) => void;
  onCreateFaq: (input: { categoryId: string; title: string; body: string }) => void;
  onDeleteCategory: (id: string) => void;
  onDeleteFaq: (id: string) => void;
  onSavePolicy: (input: PolicyInput) => void;
  onUpdateAnnouncement: (id: string, input: Partial<AnnouncementInput> & { status?: string }) => void;
  onUpdateCategory: (id: string, input: Partial<CmsCategory>) => void;
  onUpdateFaq: (id: string, input: Partial<{ categoryId: string; title: string; body: string; status: string }>) => void;
  policies: CmsPolicy[];
}) {
  const [categoryFilters, setCategoryFilters] = useState({ q: "", type: "" });
  const [faqQuery, setFaqQuery] = useState("");

  function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    onCreateCategory({
      name: String(form.get("name")),
      description: String(form.get("description") || "") || undefined,
      type: String(form.get("type") || "faq") as CmsCategory["type"]
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

  const faqCategories = categories.filter((category) => category.type === "faq");
  const activeFaqCategories = faqCategories.filter((category) => category.status === "active");
  const writeToUsCategories = categories.filter((category) => category.type === "write_to_us");
  const visibleCategories = categories.filter(
    (category) =>
      (!categoryFilters.type || category.type === categoryFilters.type) &&
      (!categoryFilters.q ||
        [category.name, category.description, category.status, CMS_CATEGORY_TYPE_LABELS[category.type]]
          .join(" ")
          .toLowerCase()
          .includes(categoryFilters.q.toLowerCase()))
  );
  const visibleFaqs = faqs.filter(
    (faq) =>
      !faqQuery ||
      [faq.title, faq.body, faq.category?.name, faq.status].join(" ").toLowerCase().includes(faqQuery.toLowerCase())
  );

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
            <div className="admin-form-grid">
              <label>
                Kategori türü
                <select name="type" defaultValue="faq" required>
                  {CMS_CATEGORY_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Kategori adı
                <input name="name" placeholder="Örn. Account, Events, Hata, Reklam..." required minLength={2} />
              </label>
            </div>
            <label>
              Açıklama
              <textarea name="description" placeholder="Bu kategori hangi konuları kapsar? (opsiyonel)" rows={2} />
            </label>
            <div className="profile-tag-row">
              {CMS_CATEGORY_TYPE_OPTIONS.map((option) => (
                <span key={option.value}>
                  {option.label}: {option.description}
                </span>
              ))}
            </div>
            <button className="secondary-action" disabled={isPending} type="submit">
              <Plus size={18} />
              Kategori ekle
            </button>
          </form>
        </div>
        <div className="admin-manage-section-label">
          <span>Mevcut kategoriler</span>
          <span>{visibleCategories.length} / {categories.length} kayıt</span>
        </div>
        <div className="guest-invite-form">
          <label>
            Kategori arama
            <input value={categoryFilters.q} onChange={(event) => setCategoryFilters((current) => ({ ...current, q: event.target.value }))} placeholder="Kategori adı veya açıklama" />
          </label>
          <label>
            Tür filtresi
            <select value={categoryFilters.type} onChange={(event) => setCategoryFilters((current) => ({ ...current, type: event.target.value }))}>
              <option value="">Tümü</option>
              {CMS_CATEGORY_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {categories.length === 0 ? (
          <div className="admin-empty-state">
            <strong>Henüz kategori yok</strong>
            <p>SSS eklemeden önce en az bir kategori oluşturman gerekiyor.</p>
          </div>
        ) : (
          <div className="admin-list">
            {visibleCategories.map((category) => (
              <div className="admin-list-row" key={category.id}>
                <div>
                  <strong>{category.name}</strong>
                  <span>
                    {CMS_CATEGORY_TYPE_LABELS[category.type]} · {category.status} · {category._count?.faqs ?? 0} SSS
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
                <button
                  className="danger-action"
                  disabled={isPending}
                  onClick={() => {
                    if (window.confirm("Bu kategori ve bağlı SSS kayıtları kaldırılacak. Devam edilsin mi?")) {
                      onDeleteCategory(category.id);
                    }
                  }}
                  type="button"
                >
                  Kaldır
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
        {activeFaqCategories.length === 0 ? (
          <div className="admin-empty-state">
            <strong>Önce aktif bir SSS kategorisi oluşturman gerekiyor</strong>
            <p>Write to us kategorileri kullanıcı mesajları içindir; SSS eklemek için kategori türünü SSS seç.</p>
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
                    {activeFaqCategories.map((category) => (
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
                  <RichTextTextarea name="body" placeholder="Kullanıcının bu sorusuna net ve kısa bir cevap yaz..." required minLength={3} rows={4} />
                </label>
                <button className="secondary-action" disabled={isPending} type="submit">
                  <Plus size={18} />
                  SSS ekle
                </button>
              </form>
            </div>
            <div className="admin-manage-section-label">
              <span>Mevcut SSS'ler</span>
              <span>{visibleFaqs.length} / {faqs.length} kayıt</span>
            </div>
            <div className="guest-invite-form">
              <label>
                SSS arama
                <input value={faqQuery} onChange={(event) => setFaqQuery(event.target.value)} placeholder="Başlık, açıklama veya kategori" />
              </label>
            </div>
            {faqs.length === 0 ? (
              <div className="admin-empty-state">
                <strong>Henüz SSS yok</strong>
                <p>Yukarıdaki formu doldurarak ilk soruyu ekle.</p>
              </div>
            ) : (
              <div className="admin-list">
                {visibleFaqs.map((faq) => (
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
                      <button
                        className="danger-action"
                        disabled={isPending}
                        onClick={() => {
                          if (window.confirm("Bu SSS kaydı kaldırılacak. Devam edilsin mi?")) {
                            onDeleteFaq(faq.id);
                          }
                        }}
                        type="button"
                      >
                        Kaldır
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

      <div className="admin-subsection">
        <div className="admin-subsection-header">
          <h3>Write to us Kategorileri</h3>
          <span>{writeToUsCategories.length} kategori</span>
        </div>
        <p className="admin-section-desc" style={{ margin: "0 0 14px" }}>
          Dokümandaki Hata, Oneriler, Sikayet, Reklam, Is birligi ve Diger başlıkları kullanıcı mesajları filtrelerinde kullanılır.
        </p>
        <div className="profile-tag-row">
          {USER_MESSAGE_TYPE_META.write_to_us.categories.map((category) => (
            <span key={category}>{category}</span>
          ))}
        </div>
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
              <RichTextTextarea name="body" placeholder="Duyurunun detaylarını buraya yaz..." required minLength={3} rows={4} />
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
                  <RichTextTextarea name="body" defaultValue={policy?.body ?? policyType.defaultBody} required minLength={10} rows={8} />
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

function RichTextTextarea({
  defaultValue,
  maxLength,
  minLength,
  name,
  placeholder,
  required,
  rows = 4
}: {
  defaultValue?: string;
  maxLength?: number;
  minLength?: number;
  name: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function syncInput() {
    if (inputRef.current && editorRef.current) {
      inputRef.current.value = editorRef.current.innerHTML;
    }
  }

  function command(name: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(name, false, value);
    syncInput();
  }

  return (
    <div className="rich-text-editor">
      <div className="rich-text-toolbar">
        <button onClick={() => command("bold")} type="button">B</button>
        <button onClick={() => command("insertUnorderedList")} type="button">•</button>
        <button onClick={() => command("createLink", window.prompt("Link URL") || "")} type="button">Link</button>
        <button onClick={() => command("insertImage", window.prompt("Medya URL") || "")} type="button">Medya</button>
      </div>
      <input name={name} ref={inputRef} required={required} type="hidden" defaultValue={defaultValue ?? ""} />
      <div
        className="rich-text-surface"
        contentEditable
        data-placeholder={placeholder}
        onInput={syncInput}
        ref={editorRef}
        role="textbox"
        style={{ minHeight: `${rows * 24}px` }}
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: defaultValue ?? "" }}
      />
      <span className="sr-only">{maxLength ?? minLength ?? ""}</span>
    </div>
  );
}

function UserMessagesAdminPanel() {
  const queryClient = useQueryClient();
  const [type, setType] = useState<UserMessageType>("faq");
  const [filters, setFilters] = useState({ q: "", status: "", category: "", page: 1 });
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const meta = USER_MESSAGE_TYPE_META[type];
  const messagesQuery = useQuery({
    queryKey: ["admin-user-messages", type, filters],
    queryFn: () => {
      const params = new URLSearchParams();

      if (filters.q) {
        params.set("q", filters.q);
      }

      if (filters.status) {
        params.set("status", filters.status);
      }

      if (filters.category) {
        params.set("category", filters.category);
      }

      params.set("page", String(filters.page));
      params.set("pageSize", "25");
      return listAdminMessages(type, params);
    }
  });
  const detailQuery = useQuery({
    queryKey: ["admin-user-message", selectedMessageId],
    queryFn: () => getAdminMessage(selectedMessageId!),
    enabled: Boolean(selectedMessageId)
  });
  const updateMutation = useMutation({
    mutationFn: (input: { id: string; status: UserMessageStatus }) => updateAdminMessage(input.id, input.status),
    onSuccess: (_, input) => {
      void queryClient.invalidateQueries({ queryKey: ["admin-user-messages"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-user-message", input.id] });
    }
  });
  const messageList = messagesQuery.data;

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setFilters({
      q: String(form.get("q") || ""),
      status: String(form.get("status") || ""),
      category: String(form.get("category") || ""),
      page: 1
    });
  }

  function selectType(nextType: UserMessageType) {
    setType(nextType);
    setSelectedMessageId(null);
    setFilters({ q: "", status: "", category: "", page: 1 });
  }

  return (
    <section className="admin-panel">
      <div className="section-header compact">
        <h2>Kullanıcılardan Mesajlar</h2>
        <span>{messagesQuery.isLoading ? "Yükleniyor" : `${messageList?.total ?? 0} mesaj`}</span>
      </div>
      <p className="admin-section-desc">{meta.description}</p>
      <div className="segmented-control">
        {(Object.keys(USER_MESSAGE_TYPE_META) as UserMessageType[]).map((item) => (
          <button className={type === item ? "active" : ""} key={item} onClick={() => selectType(item)} type="button">
            {USER_MESSAGE_TYPE_META[item].label}
          </button>
        ))}
      </div>
      <form className="guest-invite-form" onSubmit={handleFilterSubmit}>
        <label>
          Arama
          <input name="q" placeholder="Kullanıcı, email, telefon veya mesaj" defaultValue={filters.q} />
        </label>
        <label>
          Okunma durumu
          <select name="status" defaultValue={filters.status}>
            <option value="">Tümü</option>
            <option value="unread">Okunmadı</option>
            <option value="read">Okundu</option>
          </select>
        </label>
        {meta.categories.length > 0 ? (
          <label>
            Kategori
            <select name="category" defaultValue={filters.category}>
              <option value="">Tümü</option>
              {meta.categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button className="secondary-action" type="submit">
          Filtrele
        </button>
      </form>
      <div className="admin-list">
        {(messageList?.items ?? []).map((message) => (
          <UserMessageRow
            isPending={updateMutation.isPending}
            key={message.id}
            message={message}
            onSelect={() => setSelectedMessageId(message.id)}
            onStatusChange={(status) => updateMutation.mutate({ id: message.id, status })}
          />
        ))}
      </div>
      {messageList && messageList.items.length === 0 ? (
        <div className="admin-empty-state">
          <strong>Mesaj bulunamadı</strong>
          <p>Bu filtrelerle listelenecek kullanıcı mesajı yok.</p>
        </div>
      ) : null}
      {messageList ? (
        <div className="pagination-row">
          <button
            className="secondary-action"
            disabled={filters.page <= 1}
            onClick={() => setFilters((current) => ({ ...current, page: Math.max(current.page - 1, 1) }))}
            type="button"
          >
            Önceki
          </button>
          <span>Sayfa {messageList.page}</span>
          <button
            className="secondary-action"
            disabled={!messageList.hasNextPage}
            onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}
            type="button"
          >
            Sonraki
          </button>
        </div>
      ) : null}
      {detailQuery.data ? (
        <UserMessageDetail
          isPending={updateMutation.isPending}
          message={detailQuery.data}
          onStatusChange={(status) => updateMutation.mutate({ id: detailQuery.data.id, status })}
        />
      ) : null}
    </section>
  );
}

function UserMessageRow({
  isPending,
  message,
  onSelect,
  onStatusChange
}: {
  isPending: boolean;
  message: UserMessage;
  onSelect: () => void;
  onStatusChange: (status: UserMessageStatus) => void;
}) {
  return (
    <div className="admin-list-row">
      <div>
        <strong>{message.category ?? USER_MESSAGE_TYPE_META[message.type].label}</strong>
        <span>
          {message.name} · {message.email} · {message.createdAt ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(message.createdAt)) : "Tarih yok"}
        </span>
      </div>
      <span className={`status-pill status-${message.status === "unread" ? "open" : "resolved"}`}>
        {message.status === "unread" ? "Okunmadı" : "Okundu"}
      </span>
      <button className="secondary-action" onClick={onSelect} type="button">
        Detay
      </button>
      <button
        className={message.status === "unread" ? "secondary-action" : "ghost-action"}
        disabled={isPending}
        onClick={() => onStatusChange(message.status === "unread" ? "read" : "unread")}
        type="button"
      >
        {message.status === "unread" ? "Okundu yap" : "Okunmadı yap"}
      </button>
    </div>
  );
}

function UserMessageDetail({
  isPending,
  message,
  onStatusChange
}: {
  isPending: boolean;
  message: UserMessage;
  onStatusChange: (status: UserMessageStatus) => void;
}) {
  return (
    <div className="admin-list-item">
      <div className="section-header compact">
        <div>
          <h3>{message.category ?? USER_MESSAGE_TYPE_META[message.type].label}</h3>
          <span>{message.name}</span>
        </div>
        <span className={`status-pill status-${message.status === "unread" ? "open" : "resolved"}`}>
          {message.status === "unread" ? "Okunmadı" : "Okundu"}
        </span>
      </div>
      <div className="admin-list-row">
        <div>
          <strong>Kullanıcı bilgileri</strong>
          <span>Email: {message.email}</span>
          <span>Telefon: {message.phone ?? "Yok"}</span>
        </div>
        <div>
          <strong>Sistem bilgileri</strong>
          <span>App: {message.appVersion ?? "Bilinmiyor"}</span>
          <span>Sistem: {message.systemInfo ?? "Bilinmiyor"}</span>
        </div>
        <div>
          <strong>Zaman</strong>
          <span>
            Gönderim: {message.createdAt ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(message.createdAt)) : "Bilinmiyor"}
          </span>
          <span>
            Okunma: {message.readAt ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(message.readAt)) : "Okunmadı"}
          </span>
        </div>
      </div>
      <div className="admin-list-item">
        <strong>Kullanıcı mesajı</strong>
        <p className="form-help">{message.body}</p>
      </div>
      <button
        className={message.status === "unread" ? "secondary-action" : "ghost-action"}
        disabled={isPending}
        onClick={() => onStatusChange(message.status === "unread" ? "read" : "unread")}
        type="button"
      >
        {message.status === "unread" ? "Okundu olarak işaretle" : "Okunmadı olarak işaretle"}
      </button>
    </div>
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
            <div className="permission-group-grid">
              {ADMIN_PERMISSION_GROUPS.map((group) => (
                <div className="permission-group" key={group.label}>
                  <strong>{group.label}</strong>
                  <span>{group.description}</span>
                  {group.permissions.map((permission) => (
                    <label key={permission}>
                      <input name="permissions" type="checkbox" value={permission} />
                      {ADMIN_PERMISSION_LABELS.get(permission) ?? permission}
                    </label>
                  ))}
                </div>
              ))}
            </div>
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
                <span key={permission}>{ADMIN_PERMISSION_LABELS.get(permission) ?? permission}</span>
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
  const [filters, setFilters] = useState({
    q: "",
    status: "",
    role: "",
    accountType: "individual",
    country: "",
    city: "",
    gender: "",
    email: "",
    phone: "",
    joinedFrom: "",
    joinedTo: "",
    lastOnlineFrom: "",
    lastOnlineTo: "",
    page: 1
  });
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

      if (filters.accountType) {
        params.set("accountType", filters.accountType);
      }

      ["country", "city", "gender", "email", "phone", "joinedFrom", "joinedTo", "lastOnlineFrom", "lastOnlineTo"].forEach((key) => {
        const value = filters[key as keyof typeof filters];
        if (value) {
          params.set(key, String(value));
        }
      });

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
      status?: AdminManagedUser["status"];
      role?: "user" | "admin" | "super_admin";
      adminRoleGroupId?: string | null;
    } & Partial<AdminManagedUser>) => {
      const { id, ...data } = input;
      return updateAdminUser(id, data);
    },
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
      accountType: String(form.get("accountType") || "individual"),
      country: String(form.get("country") || ""),
      city: String(form.get("city") || ""),
      gender: String(form.get("gender") || ""),
      email: String(form.get("email") || ""),
      phone: String(form.get("phone") || ""),
      joinedFrom: String(form.get("joinedFrom") || ""),
      joinedTo: String(form.get("joinedTo") || ""),
      lastOnlineFrom: String(form.get("lastOnlineFrom") || ""),
      lastOnlineTo: String(form.get("lastOnlineTo") || ""),
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
      <div className="segmented-control">
        <button className={filters.accountType === "individual" ? "active" : ""} onClick={() => setFilters((current) => ({ ...current, accountType: "individual", page: 1 }))} type="button">
          Bireysel Üyeler
        </button>
        <button className={filters.accountType === "corporate" ? "active" : ""} onClick={() => setFilters((current) => ({ ...current, accountType: "corporate", page: 1 }))} type="button">
          Kurumsal Üyeler
        </button>
      </div>
      <form className="guest-invite-form" onSubmit={handleFilterSubmit}>
        <input name="accountType" type="hidden" value={filters.accountType} />
        <label>
          Arama
          <input name="q" placeholder="Kullanıcı adı, ad, email, telefon, şirket" defaultValue={filters.q} />
        </label>
        <label>
          Statü
          <select name="status" defaultValue={filters.status}>
            <option value="">Tümü</option>
            {USER_STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
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
        <label>
          Ülke
          <input name="country" placeholder="Ülke" defaultValue={filters.country} />
        </label>
        <label>
          Şehir
          <input name="city" placeholder="Şehir" defaultValue={filters.city} />
        </label>
        <label>
          Cinsiyet
          <select name="gender" defaultValue={filters.gender}>
            <option value="">Tümü</option>
            {GENDER_OPTIONS.map((gender) => (
              <option key={gender} value={gender}>
                {gender}
              </option>
            ))}
          </select>
        </label>
        <label>
          Eposta
          <input name="email" placeholder="email@..." defaultValue={filters.email} />
        </label>
        <label>
          Telefon
          <input name="phone" placeholder="+90..." defaultValue={filters.phone} />
        </label>
        <label>
          Üyelik başlangıç
          <input name="joinedFrom" type="date" defaultValue={filters.joinedFrom} />
        </label>
        <label>
          Üyelik bitiş
          <input name="joinedTo" type="date" defaultValue={filters.joinedTo} />
        </label>
        <label>
          Son online başlangıç
          <input name="lastOnlineFrom" type="date" defaultValue={filters.lastOnlineFrom} />
        </label>
        <label>
          Son online bitiş
          <input name="lastOnlineTo" type="date" defaultValue={filters.lastOnlineTo} />
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
    status?: AdminManagedUser["status"];
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
          <strong>{user.username ? `@${user.username}` : user.name}</strong>
          <span>
            {user.accountType === "corporate" ? user.companyName || user.tradeName || user.name : user.name} · {user.email}
          </span>
        </div>
        <span className="muted">{[user.city, user.country].filter(Boolean).join(" - ") || "Konum yok"}</span>
        <span className="muted">{user.followerCount ?? 0} takipçi</span>
        <span className="muted">{user.followingCount ?? 0} takip</span>
        <span className="muted">{user.lastOnlineAt ? formatDateTime(user.lastOnlineAt) : "Son online yok"}</span>
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
        <span className="muted">{user.createdAt ? formatDateTime(user.createdAt) : "Üyelik tarihi yok"}</span>
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
    status?: AdminManagedUser["status"];
    role?: "user" | "admin" | "super_admin";
    adminRoleGroupId?: string | null;
  } & Partial<AdminManagedUser>) => void;
  roleGroups: AdminRoleGroup[];
  user: AdminManagedUserDetail;
}) {
  function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    onUpdate({
      username: String(form.get("username") || "") || null,
      name: String(form.get("name") || user.name),
      email: String(form.get("email") || user.email),
      phone: String(form.get("phone") || "") || null,
      country: String(form.get("country") || "") || null,
      city: String(form.get("city") || "") || null,
      district: String(form.get("district") || "") || null,
      address: String(form.get("address") || "") || null,
      gender: String(form.get("gender") || "") || null,
      birthDate: String(form.get("birthDate") || "") || null,
      website: String(form.get("website") || "") || null,
      accountType: String(form.get("accountType") || "individual"),
      companyName: String(form.get("companyName") || "") || null,
      tradeName: String(form.get("tradeName") || "") || null,
      companyType: String(form.get("companyType") || "") || null,
      businessCategory: String(form.get("businessCategory") || "") || null,
      followerCount: Number(form.get("followerCount") || 0),
      followingCount: Number(form.get("followingCount") || 0),
      penaltyScoreLastYear: Number(form.get("penaltyScoreLastYear") || 0),
      penaltyScoreAllTime: Number(form.get("penaltyScoreAllTime") || 0)
    });
  }

  function handleInterventionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onUpdate({ status: String(form.get("status") || user.status) as AdminManagedUser["status"] });
  }

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
          <strong>Temel Bilgiler</strong>
          <span>
            Rol: {user.role} · Rol grubu: {user.adminRoleGroup?.name ?? "Yok"}
          </span>
          <span>
            Üyelik: {user.createdAt ? formatDateTime(user.createdAt) : "Bilinmiyor"} · Son online:{" "}
            {user.lastOnlineAt ? formatDateTime(user.lastOnlineAt) : "Bilinmiyor"}
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
      <form className="admin-form" onSubmit={handleProfileSubmit}>
        <div className="admin-form-grid">
          <label>
            Üye tipi
            <select name="accountType" defaultValue={user.accountType ?? "individual"}>
              <option value="individual">Bireysel</option>
              <option value="corporate">Kurumsal</option>
            </select>
          </label>
          <label>
            Kullanıcı adı
            <input name="username" defaultValue={user.username ?? ""} placeholder="username" />
          </label>
          <label>
            Adı Soyadı
            <input name="name" defaultValue={user.name} required />
          </label>
          <label>
            Eposta
            <input name="email" defaultValue={user.email} required type="email" />
          </label>
          <label>
            GSM No
            <input name="phone" defaultValue={user.phone ?? ""} />
          </label>
          <label>
            Ülke
            <input name="country" defaultValue={user.country ?? ""} />
          </label>
          <label>
            Şehir
            <input name="city" defaultValue={user.city ?? ""} />
          </label>
          <label>
            İlçe
            <input name="district" defaultValue={user.district ?? ""} />
          </label>
          <label>
            Adres
            <input name="address" defaultValue={user.address ?? ""} />
          </label>
          <label>
            Cinsiyet
            <select name="gender" defaultValue={user.gender ?? ""}>
              <option value="">Tümü / Belirtilmemiş</option>
              {GENDER_OPTIONS.map((gender) => (
                <option key={gender} value={gender}>
                  {gender}
                </option>
              ))}
            </select>
          </label>
          <label>
            Doğum tarihi
            <input name="birthDate" defaultValue={user.birthDate ? new Date(user.birthDate).toISOString().slice(0, 10) : ""} type="date" />
          </label>
          <label>
            Web sitesi
            <input name="website" defaultValue={user.website ?? ""} />
          </label>
          <label>
            İşletme adı
            <input name="companyName" defaultValue={user.companyName ?? ""} />
          </label>
          <label>
            Ticari unvan
            <input name="tradeName" defaultValue={user.tradeName ?? ""} />
          </label>
          <label>
            Şirket türü
            <input name="companyType" defaultValue={user.companyType ?? ""} />
          </label>
          <label>
            İşletme kategorisi
            <input name="businessCategory" defaultValue={user.businessCategory ?? ""} />
          </label>
          <label>
            Takip eden
            <input name="followerCount" defaultValue={user.followerCount ?? 0} min={0} type="number" />
          </label>
          <label>
            Takip ettiği
            <input name="followingCount" defaultValue={user.followingCount ?? 0} min={0} type="number" />
          </label>
          <label>
            Ceza puanı son 1 yıl
            <input name="penaltyScoreLastYear" defaultValue={user.penaltyScoreLastYear ?? 0} min={0} type="number" />
          </label>
          <label>
            Ceza puanı tüm zamanlar
            <input name="penaltyScoreAllTime" defaultValue={user.penaltyScoreAllTime ?? 0} min={0} type="number" />
          </label>
        </div>
        <div className="row-actions">
          <button className="secondary-action" disabled={isPending} type="submit">
            <Check size={18} />
            Temel bilgileri kaydet
          </button>
          <button className="ghost-action" disabled={isPending} onClick={() => onUpdate({ username: `User${Date.now().toString().slice(-6)}` })} type="button">
            Kullanıcı adını resetle
          </button>
          <button className="ghost-action" disabled={isPending} onClick={() => onUpdate({ website: null })} type="button">
            Web sitesini sil
          </button>
        </div>
      </form>
      <div className="metric-grid compact-metrics">
        <MetricCard icon={<CalendarCheck size={20} />} label="Oluşturduğu event" value={user.stats.createdEvents} />
        <MetricCard icon={<Users size={20} />} label="Katılım" value={user.stats.eventParticipations} />
        <MetricCard icon={<AlertTriangle size={20} />} label="Bildirdiği şikayet" value={user.stats.submittedReports} />
        <MetricCard icon={<Check size={20} />} label="Çözdüğü rapor" value={user.stats.resolvedReports} />
        <MetricCard icon={<Users size={20} />} label="Takip eden" value={user.followerCount ?? 0} />
        <MetricCard icon={<Users size={20} />} label="Takip ettiği" value={user.followingCount ?? 0} />
        <MetricCard icon={<AlertTriangle size={20} />} label="Ceza son 1 yıl" value={user.penaltyScoreLastYear ?? 0} />
        <MetricCard icon={<AlertTriangle size={20} />} label="Ceza tüm zamanlar" value={user.penaltyScoreAllTime ?? 0} />
      </div>
      <div className="admin-list-row">
        <div>
          <strong>Davet ilişkileri</strong>
          <span>Davet eden: {user.invitedBy?.name ?? "Yok"}</span>
          <span>Davet ettiği kullanıcılar: {(user.invitedUsers ?? []).map((item) => item.name).join(", ") || "Yok"}</span>
        </div>
      </div>
      <div className="profile-tag-row">
        {user.interestTags.length > 0 ? user.interestTags.map((tag) => <span key={tag.id}>{tag.name}</span>) : <span>İlgi alanı yok</span>}
      </div>
      <form className="admin-form" onSubmit={handleInterventionSubmit}>
        <h3>Müdahale</h3>
        <div className="admin-form-grid">
          <label>
            Müdahale / Statü
            <select name="status" defaultValue={user.status}>
              {USER_STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Mesaj
            <textarea name="message" placeholder="Kullanıcıya gönderilecek bildirim/e-posta metni için hazırlık alanı" rows={2} />
          </label>
        </div>
        <button className="secondary-action" disabled={isPending} type="submit">
          Uygula
        </button>
      </form>
    </div>
  );
}

function AdminContentPanel<T extends { id: string; status: string; createdAt?: string | Date }>({
  description,
  isPending,
  items,
  onStatusChange,
  renderMeta,
  renderPrimary,
  renderSecondary,
  title
}: {
  description: string;
  isPending: boolean;
  items: T[];
  onStatusChange: (id: string, status: string) => void;
  renderMeta: (item: T) => string;
  renderPrimary: (item: T) => string;
  renderSecondary: (item: T) => string;
  title: string;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const statusOptions = Array.from(new Set(items.map((item) => item.status))).sort();
  const visibleItems = items.filter((item) => {
    const matchesQuery = !query || JSON.stringify(item).toLowerCase().includes(query.toLowerCase());
    const matchesStatus = !statusFilter || item.status === statusFilter;

    return matchesQuery && matchesStatus;
  });

  return (
    <section className="admin-panel">
      <div className="section-header compact">
        <h2>{title}</h2>
        <span>{visibleItems.length} / {items.length} kayıt</span>
      </div>
      <p className="admin-section-desc">{description}</p>
      <div className="admin-toolbar">
        <label className="admin-search-field">
          Arama
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ad, içerik, kullanıcı veya durum" />
        </label>
        {statusOptions.length > 0 ? (
          <div className="segmented-control compact">
            <button className={!statusFilter ? "active" : ""} onClick={() => setStatusFilter("")} type="button">
              Tümü
            </button>
            {statusOptions.map((status) => (
              <button className={statusFilter === status ? "active" : ""} key={status} onClick={() => setStatusFilter(status)} type="button">
                {status}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {visibleItems.length === 0 ? (
        <div className="admin-empty-state">
          <strong>Kayıt bulunamadı</strong>
          <p>Filtreyi temizleyebilir veya ürün akışından yeni içerik oluşmasını bekleyebilirsin.</p>
        </div>
      ) : (
        <div className="admin-list admin-record-list">
          {visibleItems.map((item) => (
            <div className="admin-list-item" key={item.id}>
              <div className="admin-list-row admin-record-row">
                <div className="admin-record-main">
                  <strong>{renderPrimary(item)}</strong>
                  <span>{renderSecondary(item)}</span>
                  <span>{renderMeta(item)}</span>
                </div>
                <span className={`status-pill status-${item.status}`}>{item.status}</span>
                <span className="muted admin-record-date">{item.createdAt ? formatDateTime(item.createdAt) : ""}</span>
                <div className="row-actions admin-record-actions">
                  <button className="secondary-action" disabled={isPending || item.status === "active"} onClick={() => onStatusChange(item.id, "active")} type="button">
                    Aktif yap
                  </button>
                  <button className="ghost-action" disabled={isPending || item.status === "hidden"} onClick={() => onStatusChange(item.id, "hidden")} type="button">
                    Yayından kaldır
                  </button>
                  <button className="danger-action" disabled={isPending || item.status === "banned"} onClick={() => onStatusChange(item.id, "banned")} type="button">
                    Yasakla
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
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
    action: ResolveReportActionInput["action"];
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

    if (report.targetType === "media") {
      return { action: "remove_media" as const, label: "Medyayı yayından kaldır" };
    }

    if (report.targetType === "place") {
      return { action: "archive_place" as const, label: "Mekanı yayından kaldır" };
    }

    if (["tag_comment", "event_comment", "place_comment", "comment_reply"].includes(report.targetType)) {
      return { action: "remove_comment" as const, label: "Yorumu yayından kaldır" };
    }

    if (report.targetType === "username") {
      return { action: "reset_username" as const, label: "Kullanıcı adını değiştir" };
    }

    if (report.targetType === "website_url") {
      return { action: "remove_website" as const, label: "Web sitesini sil" };
    }

    if (report.targetType === "private_message") {
      return { action: "remove_private_messages" as const, label: "Özel mesajları yayından kaldır" };
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
      <div className="form-help">
        Kural ve rapor hedefleri: {REPORT_TARGET_OPTIONS.map((option) => option.label).join(", ")}.
      </div>
      <form className="admin-form" onSubmit={handleRuleSubmit}>
        <h3>Şikayet kuralı oluştur</h3>
        <div className="admin-form-grid">
          <label>
            Kategori
            <select name="targetType" value={ruleTargetType} onChange={(event) => setRuleTargetType(event.target.value as ReportTargetType)}>
              {REPORT_TARGET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
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
                  <option value="remove_media">Medyayı yayından kaldır</option>
                  <option value="archive_place">Mekanı yayından kaldır</option>
                  <option value="remove_comment">Yorumu yayından kaldır</option>
                  <option value="reset_username">Kullanıcı adını değiştir</option>
                  <option value="remove_website">Web sitesini sil</option>
                  <option value="remove_private_messages">Özel mesajları yayından kaldır</option>
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
            <MetricCard icon={<Check size={20} />} label="Like" value={detail.likeCount} />
            <MetricCard icon={<Check size={20} />} label="OK" value={detail.okCount} />
            <MetricCard icon={<X size={20} />} label="Dislike" value={detail.dislikeCount} />
            <MetricCard icon={<MessageSquare size={20} />} label="Yorum" value={detail.commentCount} />
            <MetricCard icon={<Users size={20} />} label="Görüntülenme" value={detail.viewCount} />
            <MetricCard icon={<Users size={20} />} label="Görüntüleyen" value={detail.viewerCount} />
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
            <div>
              <strong>İlk yorum yazan</strong>
              <span>{detail.firstCommenter?.email ?? "Henüz yok"}</span>
            </div>
            <div>
              <strong>İlk profiline ekleyen</strong>
              <span>{detail.firstProfileUser?.email ?? "Henüz yok"}</span>
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
