import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Download, Flag, ImagePlus, Images, Trash2, UserRound, X } from "lucide-react";
import { deleteContentMedia, getUserSession, resolveMediaUrl, uploadContentMedia } from "../lib/api";
import { getServiceErrorMessage } from "../lib/serviceErrors";
import { useLanguage } from "../lib/i18n";
import { ReportDialog } from "./ReportDialog";

type Media = { id: string; type: string; url: string };

/**
 * Lightbox "Aksiyonlar" menüsünün bağlamı (07/11 #18).
 * - event/place: resmî etkinlik/mekân albümü, canManage = kurucu/yönetici
 * - profile: profil albümü, canManage = profil sahibi
 * - post: ileti/yorum albümü, canManage = ileti sahibi
 */
export type MediaViewerActions = {
  kind: "event" | "place" | "profile" | "post";
  canManage: boolean;
  avatarMediaId?: string | null;
  onUpload?: (files: File[]) => Promise<unknown>;
  onMakeAvatar?: (mediaId: string) => Promise<unknown>;
  onEditAlbum?: () => void;
  onDelete?: (mediaId: string) => Promise<unknown>;
};

const VIEWER_OPEN_CLASS = "media-viewer-open";

export function MediaViewer({ items, index, onChange, onClose, reportTargetType = "media", alt = "", actions }: { alt?: string; reportTargetType?: "media" | "event" | "place"; items: Media[]; index: number; onChange: (index: number) => void; onClose: () => void; actions?: MediaViewerActions }) {
  const { language } = useLanguage();
  const tr = language === "tr";
  const [report, setReport] = useState(false);
  const [numbersOpen, setNumbersOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const numberList = useRef<HTMLUListElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const item = items[index];
  const viewer = getUserSession();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Mobil ve tablette lightbox açıkken tabbar gizlenir (07/11 #16).
    document.body.classList.add(VIEWER_OPEN_CLASS);
    close.current?.focus();
    return () => { document.body.style.overflow = overflow; document.body.classList.remove(VIEWER_OPEN_CLASS); previous?.focus(); };
  }, []);
  useEffect(() => { setError(""); }, [index]);
  useEffect(() => {
    if (!numbersOpen) return;
    numberList.current?.querySelector<HTMLElement>("[aria-selected='true']")?.scrollIntoView?.({ block: "center" });
  }, [numbersOpen]);
  if (!item) return null;
  const canManage = Boolean(viewer && actions?.canManage);
  const isImage = item.type === "image";
  const avatarLabel = actions?.kind === "profile" ? (tr ? "Profil resmim yap" : "Make my profile picture") : actions?.kind === "event" ? (tr ? "Etkinlik avatarı yap" : "Make event avatar") : actions?.kind === "place" ? (tr ? "Mekân avatarı yap" : "Make place avatar") : "";
  const run = async (task: () => Promise<unknown>) => {
    setActionsOpen(false);
    setBusy(true);
    setError("");
    try { await task(); } catch (failure) { setError(getServiceErrorMessage(failure, tr ? "İşlem tamamlanamadı." : "The action could not be completed.")); } finally { setBusy(false); }
  };
  const menu: Array<{ key: string; label: string; icon: React.ReactNode; onSelect: () => void; danger?: boolean }> = [];
  if (canManage && actions?.onUpload) menu.push({ key: "upload", label: tr ? "Resim / video ekle" : "Add photo / video", icon: <ImagePlus size={16}/>, onSelect: () => { setActionsOpen(false); fileInput.current?.click(); } });
  if (canManage && isImage && actions?.onMakeAvatar && actions.kind !== "post" && actions.avatarMediaId !== item.id) menu.push({ key: "avatar", label: avatarLabel, icon: <UserRound size={16}/>, onSelect: () => void run(() => actions.onMakeAvatar!(item.id)) });
  menu.push({ key: "download", label: tr ? "Medyayı indir" : "Download media", icon: <Download size={16}/>, onSelect: () => { setActionsOpen(false); downloadMedia(item); } });
  if (canManage && actions?.onEditAlbum) menu.push({ key: "edit", label: tr ? "Albümü düzenle" : "Edit album", icon: <Images size={16}/>, onSelect: () => { setActionsOpen(false); actions.onEditAlbum!(); } });
  if (viewer && !canManage) menu.push({ key: "report", label: tr ? "Rapor et" : "Report", icon: <Flag size={16}/>, onSelect: () => { setActionsOpen(false); setReport(true); } });
  if (canManage && actions?.onDelete) menu.push({ key: "delete", label: tr ? "Sil" : "Delete", icon: <Trash2 size={16}/>, danger: true, onSelect: () => { setActionsOpen(false); if (window.confirm(tr ? "Bu medya silinsin mi?" : "Delete this media?")) void run(() => actions.onDelete!(item.id)); } });
  return createPortal(<div className="album-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialog} className="album-viewer" role="dialog" aria-modal="true" aria-label={tr ? `Medya ${index + 1} / ${items.length}` : `Media ${index + 1} of ${items.length}`} onMouseDown={event => { const target = event.target as HTMLElement; if (!target.closest(".album-number-picker")) setNumbersOpen(false); if (!target.closest(".album-actions")) setActionsOpen(false); }} onKeyDown={event => {
      if (report) return;
      if (event.key === "Escape") { if (numbersOpen || actionsOpen) { setNumbersOpen(false); setActionsOpen(false); } else onClose(); return; }
      if (numbersOpen || actionsOpen) return;
      if (event.key === "ArrowLeft") onChange((index - 1 + items.length) % items.length);
      if (event.key === "ArrowRight") onChange((index + 1) % items.length);
      if (event.key === "Tab") {
        const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), video[controls], a[href]') ?? []);
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
      <div className="album-number-picker">
        <button type="button" aria-haspopup="listbox" aria-expanded={numbersOpen} aria-label={tr ? `Medya numarası seç, şu an ${index + 1} / ${items.length}` : `Choose media number, currently ${index + 1} of ${items.length}`} disabled={items.length < 2} onClick={() => setNumbersOpen(open => !open)}>
          <span aria-live="polite">{index + 1} / {items.length}</span>{items.length > 1 ? <ChevronDown size={15}/> : null}
        </button>
        {numbersOpen ? <ul ref={numberList} role="listbox" aria-label={tr ? "Medya numaraları" : "Media numbers"}>
          {items.map((entry, position) => <li key={entry.id} role="option" aria-selected={position === index}><button type="button" className={position === index ? "is-current" : undefined} onClick={() => { onChange(position); setNumbersOpen(false); }}>{position + 1} / {items.length}{position === index ? <Check size={14}/> : null}</button></li>)}
        </ul> : null}
      </div>
      <button ref={close} className="album-close" aria-label={tr ? "Kapat" : "Close"} onClick={onClose}><X/></button>
      {item.type === "video" ? <video key={item.id} controls autoPlay src={resolveMediaUrl(item.url)}/> : <img onClick={() => { if (items.length > 1) onChange((index + 1) % items.length); }} style={{ cursor: items.length > 1 ? "pointer" : undefined }} alt={alt || (tr ? `Medya ${index + 1} / ${items.length}` : `Media ${index + 1} of ${items.length}`)} src={resolveMediaUrl(item.url)}/>}
      <footer>
        <div className="album-footer-status">{busy ? <span role="status">{tr ? "İşleniyor…" : "Working…"}</span> : null}{error ? <span className="album-error" role="alert">{error}</span> : null}</div>
        <div>
          <button aria-label={tr ? "Önceki" : "Previous"} disabled={items.length < 2} onClick={() => onChange((index - 1 + items.length) % items.length)}><ChevronLeft/></button>
          <button aria-label={tr ? "Sonraki" : "Next"} disabled={items.length < 2} onClick={() => onChange((index + 1) % items.length)}><ChevronRight/></button>
          <div className="album-actions">
            <button type="button" className="album-actions-toggle" aria-haspopup="menu" aria-expanded={actionsOpen} disabled={busy} onClick={() => setActionsOpen(open => !open)}>{tr ? "Aksiyonlar" : "Actions"}<ChevronDown size={15}/></button>
            {actionsOpen ? <div className="album-actions-menu" role="menu">{menu.map(entry => <button key={entry.key} type="button" role="menuitem" className={entry.danger ? "is-danger" : undefined} onClick={entry.onSelect}>{entry.icon}{entry.label}</button>)}</div> : null}
          </div>
        </div>
      </footer>
      {canManage && actions?.onUpload ? <input ref={fileInput} hidden multiple type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/bmp,video/mp4,video/webm" onChange={event => { const files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ""; if (files.length) void run(() => actions.onUpload!(files)); }}/> : null}
    </div>
    <ReportDialog open={report} onClose={() => setReport(false)} targetId={item.id} targetType={reportTargetType}/>
  </div>, document.body);
}

function downloadMedia(item: Media) {
  const url = resolveMediaUrl(item.url);
  const name = url.split("?")[0]?.split("/").pop() || `konnektora-${item.id}`;
  void fetch(url).then(response => { if (!response.ok) throw new Error(String(response.status)); return response.blob(); }).then(blob => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }).catch(() => { window.open(url, "_blank", "noopener"); });
}

/** İleti ve yorum albümü. owner verilirse sahibine ekle/sil aksiyonları açılır. */
export function MediaAlbum({ items, owner }: { items: Media[]; owner?: { contentType: "tag_comment" | "event_comment" | "place_comment" | "comment_reply"; contentId: string; ownerId?: string | null; queryKeys?: unknown[][] } }) {
  const [index, setIndex] = useState<number | null>(null);
  const { language } = useLanguage();
  const client = useQueryClient();
  const viewer = getUserSession();
  const refresh = async () => { await Promise.all((owner?.queryKeys ?? []).map(queryKey => client.invalidateQueries({ queryKey }))); };
  const actions: MediaViewerActions | undefined = owner ? {
    kind: "post",
    canManage: Boolean(viewer && (viewer.id === owner.ownerId || ["admin", "super_admin"].includes(viewer.role))),
    onUpload: async files => { for (const file of files) await uploadContentMedia(owner.contentType, owner.contentId, file); await refresh(); },
    onDelete: async mediaId => { await deleteContentMedia(owner.contentType, owner.contentId, mediaId); setIndex(current => current === null ? null : items.length <= 1 ? null : Math.max(0, Math.min(current, items.length - 2))); await refresh(); },
  } : undefined;
  return <><div className={`post-media-album count-${Math.min(items.length, 4)}`}>{items.slice(0, 4).map((item, i) => <button key={item.id} type="button" aria-label={language === "tr" ? `Medya ${i + 1} / ${items.length}` : `Media ${i + 1} of ${items.length}`} onClick={() => setIndex(i)}>{item.type === "video" ? <video muted preload="metadata" src={resolveMediaUrl(item.url)}/> : <img alt="" loading="lazy" src={resolveMediaUrl(item.url)}/>} {i === 3 && items.length > 4 ? <span>+{items.length - 4}</span> : null}</button>)}</div>{index !== null && items[index] ? <MediaViewer items={items} index={index} onChange={setIndex} onClose={() => setIndex(null)} actions={actions}/> : null}</>;
}
