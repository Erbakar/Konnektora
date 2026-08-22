import { ArrowUpRight, CalendarDays, Hash, MapPin, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import type { DiscoveryItem } from "@konnektora/shared";
import { useLanguage } from "../lib/i18n";
import { DistanceLabel } from "./DistanceLabel";
import { resolveMediaUrl } from "../lib/api";

const icons = { user: UserRound, tag: Hash, event: CalendarDays, place: MapPin };

export function DiscoveryCard({ item, hideSubtitle = false }: { item: DiscoveryItem; hideSubtitle?: boolean }) {
  const { language } = useLanguage();
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
  const subtitle = item.kind === "tag" ? null : item.subtitle;
  return (
    <Link className={`discovery-card discovery-${item.kind}`} to={item.href}>
      <span className="discovery-card-visual">
        {item.imageUrl ? (
          <img alt="" src={resolveMediaUrl(item.imageUrl)} />
        ) : item.kind === "user" ? (
          <span className="discovery-card-avatar" aria-hidden="true">{initials}</span>
        ) : (
          <span className="discovery-card-icon"><Icon size={22} /></span>
        )}
      </span>
      <span className="discovery-card-copy">
        <small>{kindLabel}</small>
        <strong>{item.title}</strong>
        {!hideSubtitle && subtitle ? <span className="discovery-card-subtitle">{subtitle}</span> : null}
        <span className="discovery-card-meta">{meta}</span>
        {item.kind === "event" && item.attendeeCount != null ? <span className="discovery-card-meta">{item.attendeeCount} attendees</span> : null}
        {(item.kind === "event" || item.kind === "place") ? <DistanceLabel latitude={item.latitude} longitude={item.longitude}/> : null}
      </span>
      <span className="discovery-card-arrow" aria-hidden="true"><ArrowUpRight size={17} /></span>
    </Link>
  );
}
