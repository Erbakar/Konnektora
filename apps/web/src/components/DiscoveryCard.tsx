import { ArrowUpRight, CalendarDays, Hash, MapPin, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import type { DiscoveryItem } from "@konnektora/shared";
import { useLanguage } from "../lib/i18n";

const icons = { user: UserRound, tag: Hash, event: CalendarDays, place: MapPin };

export function DiscoveryCard({ item }: { item: DiscoveryItem }) {
  const { language } = useLanguage();
  const turkishTagCopy: Record<string, string> = {
    "#Startup": "Erken aşama ekipler, ürün lansmanları ve büyüme buluşmaları.",
    "#Networking": "Seçilmiş topluluk buluşmaları ve iş bağlantıları.",
    "#Yatırım": "Yatırımcı erişimi, fon hazırlığı ve sermaye etkinlikleri.",
    "#Founder": "Kurucu çemberleri, eşleşme atölyeleri ve dayanışma."
  };
  const Icon = icons[item.kind];
  const initials = item.title
    .replace(/^#/, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const meta = item.kind === "event" && item.meta?.includes(" · ") ? (() => {
    const [location, date] = item.meta.split(" · ");
    const parsed = new Date(date ?? "");
    return Number.isNaN(parsed.getTime()) ? item.meta : `${location} · ${new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(parsed)}`;
  })() : item.meta;
  const kindLabel = language === "tr"
    ? { user: "Topluluk üyesi", tag: "İlgi alanı", event: "Etkinlik", place: "Mekân" }[item.kind]
    : item.kind === "user" ? "Community member" : item.kind;
  const subtitle = language === "tr" && item.kind === "tag"
    ? turkishTagCopy[item.title] ?? item.subtitle
    : item.subtitle;
  return (
    <Link className={`discovery-card discovery-${item.kind}`} to={item.href}>
      <span className="discovery-card-visual">
        {item.imageUrl ? (
          <img alt="" src={item.imageUrl} />
        ) : item.kind === "user" ? (
          <span className="discovery-card-avatar" aria-hidden="true">{initials}</span>
        ) : (
          <span className="discovery-card-icon"><Icon size={22} /></span>
        )}
      </span>
      <span className="discovery-card-copy">
        <small>{kindLabel}</small>
        <strong>{item.title}</strong>
        {subtitle ? <span className="discovery-card-subtitle">{subtitle}</span> : null}
        <span className="discovery-card-meta">{meta}</span>
      </span>
      <span className="discovery-card-arrow" aria-hidden="true"><ArrowUpRight size={17} /></span>
    </Link>
  );
}
