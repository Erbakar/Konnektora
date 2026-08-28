import type { Notification } from "@konnektora/shared";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../lib/i18n";

export function CheckInDecisionDialog({ notification, onClose }: { notification?: Notification; onClose: () => void }) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const admitted = notification?.type.endsWith("_admitted") ?? false;
  const place = notification?.type.startsWith("place_") ?? false;
  const translatedBody = notification
    ? language === "tr"
      ? notification.body
      : translateDecisionBody(notification.body)
    : "";
  useEffect(() => {
    if (!notification) return;
    navigator.vibrate?.(admitted ? [100, 60, 100] : [260, 100, 260]);
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = admitted ? 880 : 220;
      gain.gain.setValueAtTime(0.08, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.35);
    } catch {
      /* Otomatik ses engellense bile görsel karar ekranı gösterilir. */
    }
  }, [admitted, notification]);
  if (!notification) return null;
  return <div className="passport-backdrop" role="presentation" onMouseDown={onClose}><section aria-modal="true" className={`checkin-decision-dialog ${admitted ? "is-admitted" : "is-declined"}`} onMouseDown={(event) => event.stopPropagation()} role="dialog"><button aria-label={t("Kapat", "Close")} className="passport-close" onClick={onClose} type="button"><X size={20}/></button>{admitted ? <CheckCircle2 size={52}/> : <XCircle size={52}/>}<p className="eyebrow">{place ? t("Mekân", "Place") : t("Etkinlik", "Event")} {t("check-in sonucu", "check-in result")}</p><h2>{admitted ? t("Hoş geldin, iyi eğlenceler.", "Welcome, have fun.") : place ? t("Üzgünüz, mekâna kabul edilmediniz.", "Sorry, you were not admitted to the place.") : t("Üzgünüz, etkinliğe kabul edilmediniz.", "Sorry, you were not admitted to the event.")}</h2><p>{translatedBody}</p>{admitted ? <p>{t("Diğer üyelerin QR kodunu kameranla veya NFC ile okutarak profillerine, ortak ilgi alanlarınıza ve uyum bilgilerinize erişebilirsin.", "Scan other members' QR codes or NFC cards to open their profiles and see your shared interests and compatibility.")}</p> : <Link className="secondary-action" onClick={onClose} to={place ? "/places?scope=near" : "/events?scope=near"}>{place ? t("Yakındaki benzer mekânları göster", "Show similar places nearby") : t("Yakındaki benzer etkinlikleri göster", "Show similar events nearby")}</Link>}<button className="primary-action" onClick={onClose} type="button">{t("Kapat", "Close")}</button></section></div>;
}

function translateDecisionBody(body: string) {
  return body
    .replace("Hoş geldin, iyi eğlenceler.", "Welcome, have fun.")
    .replace(
      "Üzgünüz, etkinliğe kabul edilmediniz.",
      "Sorry, you were not admitted to the event.",
    )
    .replace(
      "Üzgünüz, mekâna kabul edilmediniz.",
      "Sorry, you were not admitted to the place.",
    )
    .replace(/([0-9.,]+\s+[A-Z]{3}) bilet ücretiniz iade edildi\./, "$1 ticket fee was refunded.");
}
