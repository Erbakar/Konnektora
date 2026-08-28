import { useMutation } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useState } from "react";
import { rateContent } from "../lib/api";
import { useLanguage } from "../lib/i18n";

export function ContentRating({ targetId, targetType }: { targetId: string; targetType: "event" | "place" }) {
  const { language } = useLanguage();
  const [score, setScore] = useState(0);
  const rating = useMutation({ mutationFn: (value: number) => rateContent(targetType, targetId, value), onSuccess: (_, value) => setScore(value) });
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  return <section className="content-rating" aria-labelledby={`${targetType}-rating-title`}>
    <div><strong id={`${targetType}-rating-title`}>{t(targetType === "event" ? "Etkinliği değerlendir" : "Mekânı değerlendir", targetType === "event" ? "Rate this event" : "Rate this place")}</strong><span>{t("Deneyiminizi 1–5 arasında puanlayın.", "Rate your experience from 1 to 5.")}</span></div>
    <div aria-label={t("Puan", "Rating")} className="content-rating-stars" role="group">{[1, 2, 3, 4, 5].map((value) => <button aria-label={t(`${value} yıldız`, `${value} stars`)} aria-pressed={score === value} disabled={rating.isPending} key={value} onClick={() => rating.mutate(value)} type="button"><Star fill={value <= score ? "currentColor" : "none"}/></button>)}</div>
    {rating.isSuccess ? <small role="status">{t("Değerlendirmeniz kaydedildi.", "Your rating was saved.")}</small> : null}
    {rating.isError ? <small className="form-error" role="alert">{t("Değerlendirme kaydedilemedi.", "The rating could not be saved.")}</small> : null}
  </section>;
}
