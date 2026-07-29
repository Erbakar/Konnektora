import { ArrowUpRight, CalendarDays, Hash, MapPin, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import type { DiscoveryItem } from "@konnektora/shared";

const icons = { user: UserRound, tag: Hash, event: CalendarDays, place: MapPin };

export function DiscoveryCard({ item }: { item: DiscoveryItem }) {
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
    return Number.isNaN(parsed.getTime()) ? item.meta : `${location} · ${new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(parsed)}`;
  })() : item.meta;
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
        <small>{item.kind === "user" ? "Community member" : item.kind}</small>
        <strong>{item.title}</strong>
        {item.subtitle ? <span className="discovery-card-subtitle">{item.subtitle}</span> : null}
        <span className="discovery-card-meta">{meta}</span>
      </span>
      <span className="discovery-card-arrow" aria-hidden="true"><ArrowUpRight size={17} /></span>
    </Link>
  );
}
