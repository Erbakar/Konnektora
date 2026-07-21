import { CalendarDays, Hash, MapPin, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import type { DiscoveryItem } from "@konnektora/shared";

const icons = { user: UserRound, tag: Hash, event: CalendarDays, place: MapPin };

export function DiscoveryCard({ item }: { item: DiscoveryItem }) {
  const Icon = icons[item.kind];
  const meta = item.kind === "event" && item.meta?.includes(" · ") ? (() => {
    const [location, date] = item.meta.split(" · ");
    const parsed = new Date(date ?? "");
    return Number.isNaN(parsed.getTime()) ? item.meta : `${location} · ${new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(parsed)}`;
  })() : item.meta;
  return <Link className={`discovery-card discovery-${item.kind}`} to={item.href}>
    {item.imageUrl ? <img alt="" src={item.imageUrl} /> : <span className="discovery-card-icon"><Icon size={22} /></span>}
    <div><small>{item.kind}</small><strong>{item.title}</strong>{item.subtitle ? <p>{item.subtitle}</p> : null}<span>{meta}</span></div>
  </Link>;
}
