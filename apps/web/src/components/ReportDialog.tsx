import type { FormEvent } from "react";
import type { ReportTargetType } from "@konnektora/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createContentReport, listReportRules } from "../lib/api";

const fallbackSubjects = ["Dolandırıcılık", "Nefret söylemi", "Spam", "Taciz", "Uygunsuz içerik"];

export function ReportDialog({ open, targetType, targetId, onClose }: { open: boolean; targetType: ReportTargetType; targetId: string; onClose: () => void }) {
  const rules = useQuery({ queryKey: ["report-rules", targetType], queryFn: () => listReportRules(targetType), enabled: open });
  const report = useMutation({ mutationFn: createContentReport, onSuccess: () => onClose() });
  if (!open) return null;
  const subjects = (rules.data?.length ? rules.data.map((rule) => ({ id: rule.id, title: rule.title })) : fallbackSubjects.map((title) => ({ id: "", title }))).sort((a, b) => a.title.localeCompare(b.title, "tr"));
  return <div className="emotion-modal report-dialog" role="dialog" aria-modal="true" aria-label="Rapor et"><form onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); const selected = subjects.find((item) => `${item.id}|${item.title}` === form.get("subject")); if (!selected) return; report.mutate({ targetType, targetId, ruleId: selected.id || undefined, reason: selected.title, details: String(form.get("details") || "").trim() }); }}><h2>Rapor et</h2><label>Konu<select name="subject" required><option value="">Konu seçin</option>{subjects.map((subject) => <option key={`${subject.id}-${subject.title}`} value={`${subject.id}|${subject.title}`}>{subject.title}</option>)}</select></label><label>Bir mesaj gönderin<textarea maxLength={1000} minLength={3} name="details" required rows={5}/></label>{report.isError ? <p className="form-error">Rapor gönderilemedi. Lütfen tekrar deneyin.</p> : null}<div className="row-actions"><button className="ghost-action" onClick={onClose} type="button">İptal</button><button className="primary-action" disabled={report.isPending} type="submit">Gönder</button></div></form></div>;
}
