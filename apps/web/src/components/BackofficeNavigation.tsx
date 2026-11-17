import type { AdminBackofficeSummary } from "@konnektora/shared";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  BACKOFFICE_NAV,
  type BackofficeBadge,
  type BackofficeEntry,
  type BackofficeMainItem,
  type BackofficeSection,
  backofficeBadgeCount,
  backofficeHref,
  backofficeMainHref,
  isBackofficeEntryGroup,
} from "../lib/backofficeNav";
import { ServiceFeedback } from "./ServiceFeedback";

function PendingBadge({ badge, summary }: { badge?: BackofficeBadge; summary?: AdminBackofficeSummary }) {
  const count = backofficeBadgeCount(summary, badge);
  if (count <= 0) return null;
  return (
    <span aria-label={`${count} bekleyen`} className="backoffice-badge">
      {count}
    </span>
  );
}

/**
 * 17/10 #1 — Backoffice başlığı: logonun altında "BACKOFFICE", ana navigasyon ve çıkış.
 * `onLogout` verilmediğinde (admin girişi yapılmamışken) yalnız logo gösterilir.
 */
export function BackofficeHeader({
  activeMain,
  onLogout,
  summary,
}: {
  activeMain?: BackofficeMainItem | null;
  onLogout?: () => void;
  summary?: AdminBackofficeSummary;
}) {
  return (
    <header className="backoffice-header">
      <Link aria-label="Backoffice Dashboard" className="backoffice-brand" to={backofficeHref("dashboard")}>
        <img alt="Konnektora" src="/brand/konnektora-logo.svg" />
        <span>BACKOFFICE</span>
      </Link>
      {onLogout ? (
        <nav aria-label="Backoffice ana navigasyon" className="backoffice-main-nav">
          {BACKOFFICE_NAV.map((main) => {
            const active = activeMain?.id === main.id;
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`backoffice-main-link${active ? " active" : ""}`}
                key={main.id}
                to={backofficeMainHref(main)}
              >
                {main.label}
                <PendingBadge badge={main.badge} summary={summary} />
              </Link>
            );
          })}
          <button className="backoffice-main-link backoffice-logout" onClick={onLogout} type="button">
            <LogOut aria-hidden="true" size={16} />
            Çıkış
          </button>
        </nav>
      ) : null}
    </header>
  );
}

function SidebarLink({
  activeSection,
  entry,
  nested,
  summary,
}: {
  activeSection: BackofficeSection;
  entry: BackofficeEntry;
  nested?: boolean;
  summary?: AdminBackofficeSummary;
}) {
  const active = activeSection === entry.id;
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`admin-nav-btn backoffice-sidebar-link${nested ? " nested" : ""}${active ? " active" : ""}`}
      to={backofficeHref(entry.id)}
    >
      <span>{entry.label}</span>
      <PendingBadge badge={entry.badge} summary={summary} />
    </Link>
  );
}

/** 17/10 #1 madde 4 — seçili ana navigasyon öğesinin alt kategorileri. */
export function BackofficeSidebar({
  activeSection,
  main,
  summary,
}: {
  activeSection: BackofficeSection;
  main: BackofficeMainItem;
  summary?: AdminBackofficeSummary;
}) {
  return (
    <aside className="admin-sidebar backoffice-sidebar">
      <nav aria-label={`${main.label} alt kategorileri`} className="admin-nav">
        <span className="admin-nav-group-label">{main.label}</span>
        {main.children.map((node) =>
          isBackofficeEntryGroup(node) ? (
            <div aria-label={node.label} className="backoffice-sidebar-group" key={node.label} role="group">
              <span className="backoffice-sidebar-group-label">{node.label}</span>
              {node.items.map((entry) => (
                <SidebarLink activeSection={activeSection} entry={entry} key={entry.id} nested summary={summary} />
              ))}
            </div>
          ) : (
            <SidebarLink activeSection={activeSection} entry={node} key={node.id} summary={summary} />
          ),
        )}
      </nav>
    </aside>
  );
}

function CounterLink({ label, section, value }: { label: string; section: BackofficeSection; value: number | undefined }) {
  return (
    <Link className="backoffice-counter-row" to={backofficeHref(section)}>
      <span>{label}</span>
      <strong className={value ? "pending" : ""}>{value ?? "—"}</strong>
    </Link>
  );
}

function CounterCard({ children, title, total }: { children: ReactNode; title: string; total?: number }) {
  return (
    <section aria-label={title} className="backoffice-counter-card">
      <header>
        <h2>{title}</h2>
        {total !== undefined ? <strong className={total ? "pending" : ""}>{total}</strong> : null}
      </header>
      {children}
    </section>
  );
}

/** 17/10 #2 — Backoffice Dashboard yalnız bekleyen iş sayaçlarını gösterir; her sayaç kendi bölümüne gider. */
export function BackofficeDashboard({
  error,
  onRetry,
  summary,
}: {
  error?: unknown;
  onRetry?: () => void;
  summary?: AdminBackofficeSummary;
}) {
  return (
    <div className="backoffice-dashboard">
      {error ? <ServiceFeedback error={error} onRetry={onRetry} title="Sayaçlar yüklenemedi" /> : null}
      {!summary && !error ? <p role="status">Sayaçlar yükleniyor…</p> : null}
      <div className="backoffice-counter-grid">
        <CounterCard title="Şikayetler">
          <CounterLink label="Açık şikayet grupları" section="reports" value={summary?.openReportGroups} />
        </CounterCard>
        <CounterCard title="Açık iletişim mesajları" total={summary?.openMessages}>
          <CounterLink label="Açık SSS mesajları" section="messages-faq" value={summary?.messages.faq} />
          <CounterLink label="Açık Write to us mesajları" section="messages-write-to-us" value={summary?.messages.writeToUs} />
          <CounterLink label="Açık hesap dondurma mesajları" section="messages-account-freeze" value={summary?.messages.accountFreeze} />
          <CounterLink label="Açık veri silme talepleri" section="messages-data-deletion" value={summary?.messages.dataDeletion} />
        </CounterCard>
        <CounterCard title="KYB / KYC">
          <CounterLink label="Bekleyen KYB / KYC başvuruları" section="kyc" value={summary?.pendingKyc} />
        </CounterCard>
        <CounterCard title="Blokeli etkinlikler">
          <CounterLink label="Süresi dolan" section="held-events" value={summary?.heldEvents.expired} />
          <CounterLink label="Süresi dolmamış" section="held-events" value={summary?.heldEvents.notExpired} />
        </CounterCard>
        <CounterCard title="Duyurular">
          <CounterLink label="Aktif duyurular" section="cms-announcements" value={summary?.activeAnnouncements} />
        </CounterCard>
        <CounterCard title="Para çekme talepleri">
          <CounterLink label="Müşteri para çekme talebi" section="customer-payouts" value={summary?.customerPayoutRequests} />
          <CounterLink label="Küratör para çekme talebi" section="curator-payouts" value={summary?.curatorPayoutRequests} />
        </CounterCard>
      </div>
    </div>
  );
}

/** Arkasında henüz işlev olmayan menü girişleri için dürüst boş durum. */
export function BackofficePlaceholder({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="admin-panel">
      <div className="section-header compact">
        <h2>{title}</h2>
        <span className="status-pill status-requested">Yakında</span>
      </div>
      <div className="admin-empty-state">
        <strong>Henüz veri yok</strong>
        <p>{children}</p>
      </div>
    </section>
  );
}
