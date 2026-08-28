import type { Event } from "@konnektora/shared";
import { useLanguage } from "../lib/i18n";
import { EventCard } from "./EventCard";

const turkishEventTitles: Record<string, string> = {
  "global-startup-demo-night-420001": "Global Startup Demo Gecesi",
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
  const title = language === "tr" ? turkishEventTitles[event.slug] ?? event.title : event.title;
  return <EventCard displayTitle={title} event={event} />;
}
