import type { AdminBackofficeSummary } from "@konnektora/shared";

/**
 * 17/10 #1 — Backoffice bilgi mimarisi.
 * Başlıktaki ana navigasyon ve seçili ana öğenin sol yan menüsü bu ağaçtan üretilir.
 * Her yaprak `/admin?section=<id>` adresiyle doğrudan açılabilir.
 */
export type BackofficeSection =
  | "dashboard"
  // 4.1 Moderasyon
  | "reports"
  | "private-messages"
  | "report-rules"
  // 4.2 İletişim
  | "messages-faq"
  | "messages-write-to-us"
  | "messages-account-freeze"
  | "messages-data-deletion"
  // 4.3 Kullanıcılar
  | "users"
  | "roles"
  | "activity-logs"
  // 4.4 İçerikler
  | "events"
  | "places"
  | "media"
  | "posts"
  | "comments"
  | "tags"
  // 4.5 CMS
  | "cms-faq-categories"
  | "cms-write-to-us-categories"
  | "cms-announcements"
  | "cms-policies"
  | "email-tokens"
  | "notification-deliveries"
  // 4.6 Muhasebe & Finans
  | "kyc"
  | "held-events"
  | "curator-agreements"
  | "curator-revenue"
  | "curator-payouts"
  | "curator-ledger"
  | "customer-accounts"
  | "customer-transactions"
  | "customer-plan-usage"
  | "customer-payouts"
  | "invoices"
  | "plans"
  | "plan-gifts"
  | "platform-income";

export type BackofficeMainId = "moderation" | "contact" | "users" | "content" | "cms" | "finance";

export type BackofficeBadge =
  | "openReports"
  | "openMessages"
  | "messagesFaq"
  | "messagesWriteToUs"
  | "messagesAccountFreeze"
  | "messagesDataDeletion"
  | "pendingFinanceRequests"
  | "pendingKyc"
  | "heldEvents"
  | "curatorPayoutRequests"
  | "customerPayoutRequests";

export interface BackofficeEntry {
  id: BackofficeSection;
  label: string;
  badge?: BackofficeBadge;
}

export interface BackofficeEntryGroup {
  label: string;
  items: BackofficeEntry[];
}

export type BackofficeSidebarNode = BackofficeEntry | BackofficeEntryGroup;

export interface BackofficeMainItem {
  id: BackofficeMainId;
  label: string;
  badge?: BackofficeBadge;
  children: BackofficeSidebarNode[];
}

export const BACKOFFICE_NAV: BackofficeMainItem[] = [
  {
    id: "moderation",
    label: "Moderasyon",
    badge: "openReports",
    children: [
      { id: "reports", label: "Şikayetler", badge: "openReports" },
      { id: "private-messages", label: "Özel Mesajlar" },
      { id: "report-rules", label: "Kural Yönetimi" },
    ],
  },
  {
    id: "contact",
    label: "İletişim",
    badge: "openMessages",
    children: [
      { id: "messages-faq", label: "SSS mesajları", badge: "messagesFaq" },
      { id: "messages-write-to-us", label: "Write to us mesajları", badge: "messagesWriteToUs" },
      { id: "messages-account-freeze", label: "Hesap dondurma mesajları", badge: "messagesAccountFreeze" },
      { id: "messages-data-deletion", label: "Veri silme talepleri", badge: "messagesDataDeletion" },
    ],
  },
  {
    id: "users",
    label: "Kullanıcılar",
    children: [
      { id: "users", label: "Üye yönetimi" },
      { id: "roles", label: "Rol / Yetki yönetimi" },
      { id: "activity-logs", label: "User activity log" },
    ],
  },
  {
    id: "content",
    label: "İçerikler",
    children: [
      { id: "events", label: "Etkinlikler" },
      { id: "places", label: "Mekanlar" },
      { id: "media", label: "Medya" },
      { id: "posts", label: "Post'lar" },
      { id: "comments", label: "Yorumlar" },
      { id: "tags", label: "İlgi Alanları" },
    ],
  },
  {
    id: "cms",
    label: "CMS",
    children: [
      {
        label: "Kategoriler",
        items: [
          { id: "cms-faq-categories", label: "Sık Sorulan Sorular kategorileri" },
          { id: "cms-write-to-us-categories", label: "Write to Us kategorileri" },
        ],
      },
      { id: "cms-announcements", label: "Duyuru yönetimi" },
      { id: "cms-policies", label: "Yasal Politika Sayfaları" },
      { id: "email-tokens", label: "Email Tokenları" },
      // Listede yok; eski "Bildirim Operasyonu" ekranı erişilebilir kalsın diye burada tutulur.
      { id: "notification-deliveries", label: "Bildirim teslimatları" },
    ],
  },
  {
    id: "finance",
    label: "Muhasebe & Finans",
    badge: "pendingFinanceRequests",
    children: [
      { id: "kyc", label: "KYB / KYC başvuruları", badge: "pendingKyc" },
      { id: "held-events", label: "Blokeli etkinlikler", badge: "heldEvents" },
      {
        label: "Küratörler",
        items: [
          { id: "curator-agreements", label: "Küratör anlaşmaları ve gelir oranları" },
          { id: "curator-revenue", label: "Resmi etkinlik ve sponsorluk geliri girme" },
          { id: "curator-payouts", label: "Küratör para çekme talebi", badge: "curatorPayoutRequests" },
          { id: "curator-ledger", label: "Küratör hesap ekstresi" },
        ],
      },
      {
        label: "Müşteriler",
        items: [
          { id: "customer-accounts", label: "Müşteri hakkında" },
          { id: "customer-transactions", label: "Kullanıcının hesap hareketleri ekstresi" },
          { id: "customer-plan-usage", label: "Kullanıcının paket kullanım raporu" },
          { id: "customer-payouts", label: "Müşteri para çekme talebi", badge: "customerPayoutRequests" },
        ],
      },
      { id: "invoices", label: "Faturalar / İade belgeleri" },
      {
        label: "Paket ve hizmetlerin yönetimi",
        items: [
          { id: "plans", label: "Paket ve hizmet fiyatları ve haklarını ayarlama" },
          { id: "plan-gifts", label: "Hediye denemeler" },
        ],
      },
      { id: "platform-income", label: "Konnektora gelirleri raporu" },
    ],
  },
];

/** Eski tek parça bölümlerin adresleri, yeni ağaçtaki ilk karşılıklarına yönlenir. */
const LEGACY_SECTIONS: Record<string, BackofficeSection> = {
  messages: "messages-faq",
  cms: "cms-faq-categories",
  finance: "kyc",
};

export function isBackofficeEntryGroup(node: BackofficeSidebarNode): node is BackofficeEntryGroup {
  return "items" in node;
}

export function backofficeEntries(main: BackofficeMainItem): BackofficeEntry[] {
  return main.children.flatMap((node) => (isBackofficeEntryGroup(node) ? node.items : [node]));
}

const SECTION_INDEX = new Map<BackofficeSection, { main: BackofficeMainItem; entry: BackofficeEntry }>(
  BACKOFFICE_NAV.flatMap((main) => backofficeEntries(main).map((entry) => [entry.id, { main, entry }] as const)),
);

export function resolveBackofficeSection(value: string | null | undefined): BackofficeSection {
  if (!value) return "dashboard";
  const section = LEGACY_SECTIONS[value] ?? value;
  return SECTION_INDEX.has(section as BackofficeSection) ? (section as BackofficeSection) : "dashboard";
}

export function backofficeMainFor(section: BackofficeSection): BackofficeMainItem | null {
  return SECTION_INDEX.get(section)?.main ?? null;
}

export function backofficeSectionTitle(section: BackofficeSection): string {
  return SECTION_INDEX.get(section)?.entry.label ?? "Backoffice Dashboard";
}

export function backofficeHref(section: BackofficeSection): string {
  return section === "dashboard" ? "/admin" : `/admin?section=${section}`;
}

/** Ana navigasyon öğesi seçildiğinde açılan ilk alt kategori. */
export function backofficeMainHref(main: BackofficeMainItem): string {
  return backofficeHref(backofficeEntries(main)[0]!.id);
}

export function backofficeBadgeCount(summary: AdminBackofficeSummary | undefined, badge: BackofficeBadge | undefined): number {
  if (!summary || !badge) return 0;

  switch (badge) {
    case "openReports":
      return summary.openReports;
    case "openMessages":
      return summary.openMessages;
    case "messagesFaq":
      return summary.messages.faq;
    case "messagesWriteToUs":
      return summary.messages.writeToUs;
    case "messagesAccountFreeze":
      return summary.messages.accountFreeze;
    case "messagesDataDeletion":
      return summary.messages.dataDeletion;
    case "pendingFinanceRequests":
      return summary.pendingFinanceRequests;
    case "pendingKyc":
      return summary.pendingKyc;
    case "heldEvents":
      return summary.heldEvents.expired + summary.heldEvents.notExpired;
    case "curatorPayoutRequests":
      return summary.curatorPayoutRequests;
    case "customerPayoutRequests":
      return summary.customerPayoutRequests;
  }
}
