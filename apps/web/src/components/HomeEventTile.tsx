import type { Event } from "@konnektora/shared";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { DistanceLabel } from "./DistanceLabel";
import { useLanguage } from "../lib/i18n";

const turkishEventTitles: Record<string, string> = {
  "global-startup-demo-night": "Global Startup Demo Gecesi",
  "ai-product-builders-breakfast": "Yapay Zekâ Ürün Geliştiricileri Kahvaltısı",
  "saas-growth-office-hours": "SaaS Büyüme Danışmanlığı",
  "climate-tech-founder-roundtable": "İklim Teknolojileri Kurucu Yuvarlak Masası",
  "founders-operators-mixer": "Kurucular ve Profesyoneller Buluşması",
  "remote-builders-social": "Uzaktan Çalışan Üreticiler Buluşması",
  "investor-coffee-chats": "Yatırımcı Kahve Sohbetleri",
  "community-leaders-dinner": "Topluluk Liderleri Akşam Yemeği",
  "seed-funding-readiness-clinic": "Tohum Yatırım Hazırlık Kliniği",
  "angel-investor-ama": "Melek Yatırımcı Soru-Cevap Buluşması",
  "vc-reverse-pitch": "Girişim Sermayesi Tersine Sunum",
  "impact-capital-roundtable": "Etki Sermayesi Yuvarlak Masası",
  "solo-founder-accountability-sprint": "Tek Kurucular İçin Odak Sprinti",
  "founder-mental-load-circle": "Kurucular İçin Zihinsel Yük Çemberi",
  "co-founder-matching-lab": "Kurucu Ortak Eşleşme Atölyesi",
  "founder-story-night": "Kurucu Hikâyeleri Gecesi"
};

export function HomeEventTile({ event }: { event: Event }) {
  const { language } = useLanguage();
  const formatter = new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-US", {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
  });
  const visibilityLabel: Record<Event["visibility"], string> = language === "tr"
    ? { open: "Açık", approval_required: "Onay gerekli", invite_only: "Sadece davetli" }
    : { open: "Open", approval_required: "Approval", invite_only: "Invite only" };
  const place = [event.city, event.country].filter(Boolean).join(", ");
  const location = event.format === "online"
    ? "Online"
    : event.format === "hybrid"
      ? `Online & ${place || (language === "tr" ? "Mekân açıklanacak" : "Venue TBA")}`
      : place || (language === "tr" ? "Mekân açıklanacak" : "Venue TBA");
  const title = language === "tr" ? turkishEventTitles[event.slug] ?? event.title : event.title;

  return (
    <Link className="home-event-tile" to={`/events/${event.slug}`}>
      <div className="home-event-tile-media">
        {event.coverImageUrl ? <img alt="" src={event.coverImageUrl} /> : <div className="home-event-tile-fallback" />}
        <span className="home-event-tile-badge">{visibilityLabel[event.visibility]}</span>
      </div>
      <div className="home-event-tile-body">
        <h3>{title}</h3>
        <p className="home-event-tile-meta">
          <CalendarDays size={15} />
          {formatter.format(new Date(event.startsAt))}
        </p>
        <p className="home-event-tile-location"><MapPin size={15} />{location}</p>
        <p className="home-event-tile-location"><Users size={15} />{event.attendeeCount ?? 0} {language === "tr" ? "katılımcı" : "attendees"}</p>
        <p className="home-event-tile-location"><DistanceLabel latitude={event.latitude} longitude={event.longitude}/></p>
      </div>
    </Link>
  );
}
