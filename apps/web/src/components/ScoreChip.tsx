import { useState, type CSSProperties, type ReactNode, type SyntheticEvent } from "react";

export type ScoreKind = "overall" | "eventPartner" | "attendees" | "eventMatch" | "placeMatch" | "shared";

/** 19/11 #9: Uyum kutucuklarının ne olduğunu ve nasıl hesaplandığını anlatan kısa metinler. */
export function scoreTooltip(kind: ScoreKind, tr: boolean) {
  const texts: Record<ScoreKind, [string, string]> = {
    overall: [
      "İkinizin ne kadar iyi anlaşabileceğinin özeti: ortak ilgi alanlarınız, aynı etkinlik ve mekânlara katılımınız, birbirinizin paylaşımlarına beğeni ve yorumlarınızdan hesaplanır. Arkadaşlık, networking, etkinlik, seyahat ve iş uyumunun ortalamasıdır.",
      "A snapshot of how well you two click: calculated from shared interests, events and places you both joined, and likes and comments on each other's posts. It averages friendship, networking, event, travel and business fit.",
    ],
    eventPartner: [
      "Birlikte etkinliğe gitmek için ne kadar iyi bir ikili olduğunuzu gösterir: aynı etkinliklere ve mekânlara katılımınız ile ortak ilgi alanlarınızdan hesaplanır.",
      "Shows how great a pair you would be at events: calculated from the events and places you both joined and your shared interests.",
    ],
    attendees: [
      "Bu kişinin etkinliğe katılanlarla ne kadar iyi kaynaşacağını gösterir: katılımcılarla ortak ilgi alanlarının ortalamasından hesaplanır.",
      "Shows how well this person would blend in with the attendees: the average of their shared interests with each attendee.",
    ],
    eventMatch: [
      "Bu kişinin etkinliğiniz için ne kadar doğru bir davetli olduğunu gösterir: genel uyum, etkinlik partneri uyumu ve katılımcılarla uyumun ortalamasıdır. Daha önce etkinliğinize katılmış veya son günlerde aktif olmak ek puan kazandırır.",
      "Shows how right this person is for your event: the average of overall, event partner and attendee compatibility. Past attendance at your events and recent activity add bonus points.",
    ],
    placeMatch: [
      "Bu kişinin mekânınız için ne kadar doğru bir davetli olduğunu gösterir: genel uyum, etkinlik partneri uyumu ve mekân katılımcılarıyla uyumun ortalamasıdır. Mekânınızdaki etkinliklere daha önce katılmış veya son günlerde aktif olmak ek puan kazandırır.",
      "Shows how right this person is for your place: the average of overall, event partner and attendee compatibility. Past attendance at your place's events and recent activity add bonus points.",
    ],
    shared: [
      "İkinizin de profiline yapıştırdığı ortak ilgi alanı sayısı.",
      "The number of interests you both pinned to your profiles.",
    ],
  };
  return texts[kind][tr ? 0 : 1];
}

/** Masaüstünde üzerine gelince, mobil/tablette dokununca siyah açıklama baloncuğu açan uyum kutucuğu. */
export function ScoreChip({ kind, tr, className = "", label, children }: { kind: ScoreKind; tr: boolean; className?: string; label: ReactNode; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const tip = scoreTooltip(kind, tr);
  // Baloncuk ekranın sağından taşmasın diye gerekirse sola kaydırılır (mobilde yatay kayma olmaz).
  const place = (event: SyntheticEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const width = Math.min(280, window.innerWidth * 0.8);
    setShift(Math.min(0, window.innerWidth - 16 - rect.left - width));
  };
  return (
    <span
      aria-expanded={open}
      aria-label={typeof label === "string" ? `${label}: ${tip}` : undefined}
      className={`compatibility-score has-score-tip ${className}${open ? " tooltip-open" : ""}`.trim()}
      data-tooltip={tip}
      onBlur={() => setOpen(false)}
      onClick={(event) => { event.preventDefault(); event.stopPropagation(); place(event); setOpen((value) => !value); }}
      onFocus={place}
      onMouseEnter={place}
      onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setOpen((value) => !value); } }}
      role="button"
      style={{ "--score-tip-shift": `${shift}px` } as CSSProperties}
      tabIndex={0}
    >
      <span>{label}</span>
      {children}
    </span>
  );
}
