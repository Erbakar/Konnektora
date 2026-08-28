import type { FormEvent } from "react";
import type { ReportTargetType } from "@konnektora/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Flag, X } from "lucide-react";
import { createContentReport, listReportRules } from "../lib/api";
import { useLanguage } from "../lib/i18n";

const fallbackSubjects = {
  tr: ["Dolandırıcılık", "Nefret söylemi", "Spam", "Taciz", "Uygunsuz içerik"],
  en: ["Fraud", "Hate speech", "Spam", "Harassment", "Inappropriate content"],
};

export function ReportDialog({ open, targetType, targetId, onClose }: { open: boolean; targetType: ReportTargetType; targetId: string; onClose: () => void }) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const rules = useQuery({ queryKey: ["report-rules", targetType], queryFn: () => listReportRules(targetType), enabled: open });
  const report = useMutation({ mutationFn: createContentReport, onSuccess: () => onClose() });
  if (!open) return null;
  const subjects = (rules.data?.length ? rules.data.map((rule) => ({ id: rule.id, title: rule.title })) : fallbackSubjects[language].map((title) => ({ id: "", title }))).sort((a, b) => a.title.localeCompare(b.title, language));
  return <div className="dialog-backdrop report-dialog" role="presentation" onMouseDown={onClose}><form aria-label={t("Rapor et", "Report")} aria-modal="true" className="report-dialog-panel" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); const selected = subjects.find((item) => `${item.id}|${item.title}` === form.get("subject")); if (!selected) return; report.mutate({ targetType, targetId, ruleId: selected.id || undefined, reason: selected.title, details: String(form.get("details") || "").trim() }); }} role="dialog"><header><span className="report-dialog-icon"><Flag size={22}/></span><div><p className="eyebrow">{t("Topluluk güvenliği", "Community safety")}</p><h2>{t("İçeriği raporla", "Report content")}</h2></div><button aria-label={t("Kapat", "Close")} className="passport-close" onClick={onClose} type="button"><X size={20}/></button></header><p className="report-dialog-copy">{t("Size en uygun nedeni seçin ve inceleme ekibimize yardımcı olacak kısa bir açıklama ekleyin. Bildiriminiz gizli tutulur.", "Choose the most relevant reason and add a short explanation to help our review team. Your report remains confidential.")}</p><label>{t("Konu", "Subject")}<select name="subject" required><option value="">{t("Konu seçin", "Choose a subject")}</option>{subjects.map((subject) => <option key={`${subject.id}-${subject.title}`} value={`${subject.id}|${subject.title}`}>{subject.title}</option>)}</select></label><label>{t("Açıklama", "Description")}<textarea maxLength={1000} minLength={3} name="details" placeholder={t("Neyi incelememiz gerektiğini kısaca anlatın…", "Briefly tell us what we should review…")} required rows={5}/><small>{t("En az 3, en fazla 1000 karakter.", "Between 3 and 1,000 characters.")}</small></label>{report.isError ? <p className="form-error">{t("Rapor gönderilemedi. Lütfen tekrar deneyin.", "The report could not be submitted. Please try again.")}</p> : null}<footer><button className="secondary-action" onClick={onClose} type="button">{t("Vazgeç", "Cancel")}</button><button className="primary-action" disabled={report.isPending} type="submit">{report.isPending ? t("Gönderiliyor…", "Submitting…") : t("Raporu gönder", "Submit report")}</button></footer></form></div>;
}
