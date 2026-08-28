import { ArrowUpRight, CalendarDays, Hash, MapPin, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import type { DiscoveryItem } from "@konnektora/shared";
import { useLanguage } from "../lib/i18n";
import { DistanceLabel } from "./DistanceLabel";
import { recordContentImpression, rememberContentSource, resolveMediaUrl } from "../lib/api";

const icons = { user: UserRound, tag: Hash, event: CalendarDays, place: MapPin };

export function DiscoveryCard({ item, hideSubtitle = false }: { item: DiscoveryItem; hideSubtitle?: boolean }) {
  const cardRef = useRef<HTMLAnchorElement>(null);
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
  })() : item.kind === "user" && item.meta
    ? item.meta
        .replace(/\btakipçi\b/gi, language === "tr" ? "takipçi" : "followers")
        .replace(/\bortak ilgi alanı\b/gi, language === "tr" ? "ortak ilgi alanı" : "shared interests")
    : item.meta && language === "en"
      ? item.meta.replace(/\btakipçi\b/gi, "followers").replace(/\büye\b/gi, "members").replace(/\bdavetli\b/gi, "invited").replace(/\betkinlik\b/gi, "events")
      : item.meta;
  const kindLabel = language === "tr"
    ? { user: "Topluluk üyesi", tag: "İlgi alanı", event: "Etkinlik", place: "Mekân" }[item.kind]
    : { user: "Community member", tag: "Interest", event: "Event", place: "Place" }[item.kind];
  const subtitle = item.kind === "tag" ? null : item.subtitle;
  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.35)) {
        void recordContentImpression(item.kind, item.id);
        observer.disconnect();
      }
    }, { threshold: [0.35] });
    observer.observe(element);
    return () => observer.disconnect();
  }, [item.id, item.kind]);
  return (
    <Link className={`discovery-card discovery-${item.kind}`} onClick={() => rememberContentSource(item.kind, item.id)} ref={cardRef} to={item.href}>
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
        {item.kind === "event" && item.attendeeCount != null ? <span className="discovery-card-meta">{item.attendeeCount} {language === "tr" ? "katılımcı" : "attendees"}</span> : null}
        {(item.kind === "event" || item.kind === "place") ? <DistanceLabel latitude={item.latitude} longitude={item.longitude}/> : null}
      </span>
      <span className="discovery-card-arrow" aria-hidden="true"><ArrowUpRight size={17} /></span>
    </Link>
  );
}
