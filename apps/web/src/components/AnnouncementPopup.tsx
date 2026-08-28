import type { Announcement } from "@konnektora/shared";
import { Megaphone, X } from "lucide-react";
import { useState } from "react";
import { RichText } from "./RichText";
import { useLanguage } from "../lib/i18n";

export function AnnouncementPopup({ announcements }: { announcements: Announcement[] }) {
  const { language } = useLanguage();
  const [, setRevision] = useState(0);
  const active = announcements.find((announcement) => !localStorage.getItem(`konnektora_announcement_done_${announcement.id}`) && !sessionStorage.getItem(`konnektora_announcement_later_${announcement.id}`));
  if (!active) return null;
  const dismiss = (mode: "done" | "later") => {
    (mode === "done" ? localStorage : sessionStorage).setItem(`konnektora_announcement_${mode}_${active.id}`, "1");
    setRevision((value) => value + 1);
  };
  return <div className="emotion-modal announcement-modal" onMouseDown={() => dismiss("later")} role="presentation"><section aria-describedby={`announcement-description-${active.id}`} aria-labelledby={`announcement-title-${active.id}`} aria-modal="true" className="announcement-dialog" onMouseDown={(event) => event.stopPropagation()} role="dialog"><aside className="announcement-visual" aria-hidden="true"><span className="announcement-new-badge">{language === "tr" ? "YENİ" : "NEW"}</span><img alt="" className="announcement-art" src="/media/announcement-community-discovery-v1.webp"/><strong>Konnektora</strong><small>{language === "tr" ? "Toplulukta yeni bir gelişme var." : "Something new is happening in the community."}</small></aside><div className="announcement-content"><button aria-label={language === "tr" ? "Kapat" : "Close"} className="announcement-close" onClick={() => dismiss("later")} type="button"><X size={20}/></button><p className="announcement-eyebrow"><span/><Megaphone size={15}/>{language === "tr" ? "Duyuru" : "Announcement"}</p><h2 id={`announcement-title-${active.id}`}>{active.title}</h2><p className="announcement-description" id={`announcement-description-${active.id}`}><RichText text={active.body}/></p><div className="announcement-actions"><button className="announcement-primary-action" onClick={() => dismiss("done")} type="button">{language === "tr" ? "Tamam" : "Got it"}</button><button className="announcement-secondary-action" onClick={() => dismiss("later")} type="button">{language === "tr" ? "Sonra hatırlat" : "Remind me later"}</button></div></div></section></div>;
}
