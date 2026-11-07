import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Plus, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { getUserSession, voteContentPoll, type ContentPollInput, type ContentPollSummary } from "../lib/api";
import { formatShortDateTime } from "../lib/formats";
import { getServiceErrorMessage } from "../lib/serviceErrors";

/** Anket taslağı (07/11 #21). */
export type PollDraft = {
  question: string;
  options: string[];
  allowMultiple: boolean;
  maxChoices: number;
  allowOpenAnswer: boolean;
  audience: "everyone" | "participants";
  closesAt: string;
};

export const emptyPollDraft = (): PollDraft => ({ question: "", options: ["", ""], allowMultiple: false, maxChoices: 2, allowOpenAnswer: false, audience: "everyone", closesAt: "" });

export function pollDraftError(draft: PollDraft, tr: boolean) {
  const options = draft.options.map((option) => option.trim()).filter(Boolean);
  if (draft.question.trim().length < 2) return tr ? "Anket sorusunu yazın." : "Write the poll question.";
  if (options.length < 2) return tr ? "En az iki seçenek girin." : "Enter at least two options.";
  if (new Set(options.map((option) => option.toLocaleLowerCase("tr-TR"))).size !== options.length) return tr ? "Seçenekler birbirinden farklı olmalı." : "Options must be different.";
  if (draft.closesAt && new Date(draft.closesAt).getTime() <= Date.now()) return tr ? "Kapanma zamanı gelecekte olmalı." : "The closing time must be in the future.";
  return "";
}

export function pollDraftInput(draft: PollDraft): ContentPollInput {
  const options = draft.options.map((option) => option.trim()).filter(Boolean);
  return {
    question: draft.question.trim(),
    options,
    allowMultiple: draft.allowMultiple,
    maxChoices: draft.allowMultiple ? Math.min(draft.maxChoices, options.length) : 1,
    allowOpenAnswer: draft.allowOpenAnswer,
    audience: draft.audience,
    ...(draft.closesAt ? { closesAt: new Date(draft.closesAt).toISOString() } : {}),
  };
}

export function PollComposer({ draft, onChange, onRemove, kind, tr }: { draft: PollDraft; onChange: (draft: PollDraft) => void; onRemove: () => void; kind: "event" | "place"; tr: boolean }) {
  const set = (patch: Partial<PollDraft>) => onChange({ ...draft, ...patch });
  const filled = draft.options.filter((option) => option.trim()).length;
  const maxOptions = Math.max(2, filled);
  return (
    <fieldset className="poll-composer">
      <legend><BarChart3 size={17}/>{tr ? "Anket ayarları" : "Poll settings"}<button type="button" className="poll-composer-remove" aria-label={tr ? "Anketi kaldır" : "Remove poll"} onClick={onRemove}><X size={16}/></button></legend>
      <label>{tr ? "Soru başlığı" : "Question"}<input maxLength={300} required value={draft.question} onChange={(event) => set({ question: event.target.value })} placeholder={tr ? "Örn. Bir sonraki buluşma hangi gün olsun?" : "e.g. Which day should we meet next?"}/></label>
      <div className="poll-composer-options">
        <span>{tr ? "Seçenekler" : "Options"}</span>
        {draft.options.map((option, index) => (
          <div key={index} className="poll-composer-option">
            <input maxLength={160} value={option} aria-label={tr ? `Seçenek ${index + 1}` : `Option ${index + 1}`} placeholder={tr ? `Seçenek ${index + 1}` : `Option ${index + 1}`} onChange={(event) => set({ options: draft.options.map((value, position) => position === index ? event.target.value : value) })}/>
            {draft.options.length > 2 ? <button type="button" aria-label={tr ? "Seçeneği kaldır" : "Remove option"} onClick={() => set({ options: draft.options.filter((_, position) => position !== index) })}><X size={15}/></button> : null}
          </div>
        ))}
        {draft.options.length < 20 ? <button type="button" className="text-button poll-add-option" onClick={() => set({ options: [...draft.options, ""] })}><Plus size={15}/>{tr ? "Seçenek ekle" : "Add option"}</button> : null}
      </div>
      <label className="poll-switch"><input type="checkbox" role="switch" checked={draft.allowMultiple} onChange={(event) => set({ allowMultiple: event.target.checked, maxChoices: Math.max(2, Math.min(draft.maxChoices, maxOptions)) })}/><span>{tr ? "Birden fazla seçenek işaretlenebilsin" : "Allow multiple choices"}</span></label>
      {draft.allowMultiple ? <label>{tr ? "Maksimum cevap sayısı" : "Maximum number of answers"}<select value={Math.min(draft.maxChoices, maxOptions)} onChange={(event) => set({ maxChoices: Number(event.target.value) })}>{Array.from({ length: Math.max(1, maxOptions - 1) }, (_, index) => index + 2).map((value) => <option key={value} value={value}>{value}</option>)}</select></label> : null}
      <label className="poll-switch"><input type="checkbox" role="switch" checked={draft.allowOpenAnswer} onChange={(event) => set({ allowOpenAnswer: event.target.checked })}/><span>{tr ? "Açık uçlu cevap desteklensin" : "Allow open-ended answers"}</span></label>
      <label>{tr ? "Anket kapanma zamanı (isteğe bağlı)" : "Poll closing time (optional)"}<input type="datetime-local" value={draft.closesAt} onChange={(event) => set({ closesAt: event.target.value })}/><small className="form-help">{kind === "event" ? (tr ? "Belirlenmezse anket etkinlik bitiş zamanında otomatik kapanır." : "If not set, the poll closes automatically when the event ends.") : (tr ? "Belirlenmezse anket açık kalır." : "If not set, the poll stays open.")}</small></label>
      <label>{tr ? "Kimler yanıtlayabilir?" : "Who can answer?"}<select value={draft.audience} onChange={(event) => set({ audience: event.target.value as PollDraft["audience"] })}><option value="everyone">{tr ? "Herkes yanıtlayabilir" : "Everyone can answer"}</option><option value="participants">{kind === "event" ? (tr ? "Etkinlik katılımcıları yanıtlayabilir" : "Event attendees can answer") : (tr ? "Mekân katılımcıları yanıtlayabilir" : "Place members can answer")}</option></select></label>
    </fieldset>
  );
}

export function PollCard({ poll, kind, queryKey, tr }: { poll: ContentPollSummary; kind: "event" | "place"; queryKey: unknown[]; tr: boolean }) {
  const client = useQueryClient();
  const user = getUserSession();
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string[]>(poll.viewerOptionIds);
  const [openAnswer, setOpenAnswer] = useState("");
  const vote = useMutation({
    mutationFn: () => voteContentPoll(poll.id, { optionIds: selected, ...(openAnswer.trim() ? { openAnswer: openAnswer.trim() } : {}) }),
    onSuccess: async () => { setEditing(false); setOpenAnswer(""); await client.invalidateQueries({ queryKey }); },
  });
  const limit = poll.allowMultiple ? poll.maxChoices : 1;
  const chosenCount = selected.length + (openAnswer.trim() ? 1 : 0);
  const showForm = poll.canVote && (!poll.viewerVoted || editing);
  const toggle = (id: string) => {
    if (!poll.allowMultiple) { setSelected([id]); setOpenAnswer(""); return; }
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : current.length + (openAnswer.trim() ? 1 : 0) >= limit ? current : [...current, id]);
  };
  const audienceNote = poll.audience === "participants" ? kind === "event" ? (tr ? "Yalnız etkinlik katılımcıları yanıtlayabilir" : "Only event attendees can answer") : (tr ? "Yalnız mekân katılımcıları yanıtlayabilir" : "Only place members can answer") : (tr ? "Herkes yanıtlayabilir" : "Everyone can answer");
  const sorted = [...poll.options].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
  return (
    <section className="content-poll" aria-label={tr ? "Anket" : "Poll"}>
      <header><BarChart3 size={17}/><strong>{poll.question}</strong></header>
      <p className="content-poll-meta">
        {poll.allowMultiple ? (tr ? `En fazla ${poll.maxChoices} seçenek` : `Up to ${poll.maxChoices} choices`) : (tr ? "Tek seçim" : "Single choice")}
        {" · "}{audienceNote}
        {" · "}{poll.closed ? (tr ? "Anket kapandı" : "Poll closed") : poll.closesAt ? (tr ? `Kapanış: ${formatShortDateTime(poll.closesAt)}` : `Closes: ${formatShortDateTime(poll.closesAt)}`) : (tr ? "Süresiz" : "No end date")}
      </p>
      {showForm ? (
        <form className="content-poll-form" onSubmit={(event) => { event.preventDefault(); if (chosenCount) vote.mutate(); }}>
          {poll.options.map((option) => (
            <label key={option.id} className={`content-poll-choice${selected.includes(option.id) ? " is-selected" : ""}`}>
              <input type={poll.allowMultiple ? "checkbox" : "radio"} name={`poll-${poll.id}`} checked={selected.includes(option.id)} onChange={() => toggle(option.id)}/>
              <span>{option.label}</span>
            </label>
          ))}
          {poll.allowOpenAnswer ? <label className="content-poll-open">{tr ? "Kendi cevabın" : "Your own answer"}<input maxLength={160} value={openAnswer} placeholder={tr ? "Açık uçlu cevabını yaz…" : "Write your own answer…"} onChange={(event) => { const value = event.target.value; if (!poll.allowMultiple && value.trim()) setSelected([]); else if (poll.allowMultiple && value.trim() && !openAnswer.trim() && selected.length >= limit) return; setOpenAnswer(value); }}/></label> : null}
          {vote.isError ? <p className="form-error" role="alert">{getServiceErrorMessage(vote.error, tr ? "Oy kaydedilemedi." : "The vote could not be saved.")}</p> : null}
          <div className="content-poll-actions">
            <button className="primary-action" disabled={!chosenCount || vote.isPending} type="submit">{poll.viewerVoted ? (tr ? "Oyumu güncelle" : "Update my vote") : (tr ? "Oy ver" : "Vote")}</button>
            {editing ? <button className="text-button" type="button" onClick={() => { setEditing(false); setSelected(poll.viewerOptionIds); setOpenAnswer(""); }}>{tr ? "Vazgeç" : "Cancel"}</button> : null}
            {poll.allowMultiple ? <small>{chosenCount}/{limit}</small> : null}
          </div>
        </form>
      ) : poll.resultsVisible ? (
        <div className="content-poll-results">
          <ol>
            {sorted.map((option) => {
              const mine = poll.viewerOptionIds.includes(option.id);
              return (
                <li key={option.id} className={mine ? "is-mine" : undefined}>
                  <div className="content-poll-result-line"><span>{option.label}{mine ? <em className="content-poll-mine">{tr ? "senin oyun" : "your vote"}</em> : null}</span><strong>{option.votes ?? 0} {tr ? "oy" : (option.votes === 1 ? "vote" : "votes")} · %{option.percent ?? 0}</strong></div>
                  <span className="content-poll-bar" aria-hidden="true"><i style={{ width: `${option.percent ?? 0}%` }}/></span>
                </li>
              );
            })}
          </ol>
          <footer>
            <span>{tr ? "Oy kullanan toplam katılımcı sayısı" : "Total participants who voted"}: <strong>{poll.totalVoters ?? 0}</strong></span>
            <span>{tr ? "Oy kullanma oranı" : "Voting rate"}: <strong>{poll.participationRate === null ? "—" : `%${poll.participationRate}`}</strong> <small>({kind === "event" ? (tr ? `${poll.eligibleCount} etkinlik katılımcısına göre` : `based on ${poll.eligibleCount} event attendees`) : (tr ? `${poll.eligibleCount} mekân üyesine göre` : `based on ${poll.eligibleCount} place members`)})</small></span>
            <span className="content-poll-anon">{tr ? "Oylar anonimdir." : "Votes are anonymous."}</span>
            {poll.canVote && poll.viewerVoted ? <button className="text-button content-poll-change" type="button" onClick={() => { setSelected(poll.viewerOptionIds); setEditing(true); }}>{tr ? "Oyunu değiştir" : "Change your vote"}</button> : null}
          </footer>
        </div>
      ) : (
        <div className="content-poll-locked">
          <ul>{poll.options.map((option) => <li key={option.id}>{option.label}</li>)}</ul>
          <p className="form-help">{!user ? <><Link to="/login">{tr ? "Giriş yaparak" : "Log in"}</Link> {tr ? "oy verebilirsin. Sonuçlar oy verdikten sonra görünür." : "to vote. Results are shown after voting."}</> : poll.closed ? (tr ? "Anket kapandı." : "The poll is closed.") : `${audienceNote}. ${tr ? "Sonuçlar oy verdikten sonra görünür." : "Results are shown after voting."}`}</p>
        </div>
      )}
    </section>
  );
}
