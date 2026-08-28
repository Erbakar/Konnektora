import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Download, Flag, GripVertical, Images, Trash2, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteContentMedia, getUserSession, listContentMedia, reorderContentMedia, resolveMediaUrl, uploadContentMedia } from "../lib/api";
import { ReportDialog } from "./ReportDialog";
import { useLanguage } from "../lib/i18n";

export function ContentMediaGallery({ targetType, targetId, canManage = false, coverImageUrl, coverAlt = "" }: { targetType: "event" | "place"; targetId: string; canManage?: boolean; coverImageUrl?: string | null; coverAlt?: string }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [coverOpen, setCoverOpen] = useState(false);
  const [reportMediaId, setReportMediaId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const user = getUserSession();
  const queryClient = useQueryClient();
  const media = useQuery({ queryKey: ["content-media", targetType, targetId], queryFn: () => listContentMedia(targetType, targetId) });
  const refresh = (items?: unknown) => {
    if (items) queryClient.setQueryData(["content-media", targetType, targetId], items);
    else void queryClient.invalidateQueries({ queryKey: ["content-media", targetType, targetId] });
    void queryClient.invalidateQueries({ queryKey: [targetType, targetId] });
  };
  const upload = useMutation({ mutationFn: (file: File) => uploadContentMedia(targetType, targetId, file), onSuccess: () => refresh() });
  const reorder = useMutation({ mutationFn: (mediaIds: string[]) => reorderContentMedia(targetType, targetId, mediaIds), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (mediaId: string) => deleteContentMedia(targetType, targetId, mediaId), onSuccess: (items) => { setActiveIndex(null); refresh(items); } });
  useEffect(() => {
    if (activeIndex == null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowLeft") setActiveIndex((index) => index == null ? null : (index - 1 + (media.data?.length ?? 1)) % (media.data?.length ?? 1));
      if (event.key === "ArrowRight") setActiveIndex((index) => index == null ? null : (index + 1) % (media.data?.length ?? 1));
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, media.data?.length]);
  if (!media.data?.length) {
    if (!coverImageUrl) return canManage ? <section className="content-media-empty"><Images size={25}/><div><strong>{t("Medya albümü boş", "Media album is empty")}</strong><span>{t("İlk fotoğrafı veya videoyu yükleyin.", "Upload the first photo or video.")}</span></div><MediaUploadButton disabled={upload.isPending} language={language} onFile={(file) => upload.mutate(file)}/>{upload.isError ? <p className="form-error">{t("Medya yüklenemedi.", "Media could not be uploaded.")}</p> : null}</section> : null;
    return <>
      <section className="content-media-gallery-shell"><section className="content-media-gallery content-media-cover-only" aria-label={t("Kapak görseli", "Cover image")}><button aria-label={t("Kapak görselini büyüt", "Enlarge cover image")} onClick={() => setCoverOpen(true)} type="button"><img alt={coverAlt} src={resolveMediaUrl(coverImageUrl)}/></button></section>{canManage ? <div className="content-media-management"><MediaUploadButton disabled={upload.isPending} language={language} onFile={(file) => upload.mutate(file)}/></div> : null}{upload.isError ? <p className="form-error">{t("Medya yüklenemedi.", "Media could not be uploaded.")}</p> : null}</section>
      {coverOpen ? <div className="media-lightbox" role="dialog" aria-modal="true" aria-label={t("Kapak görseli", "Cover image")} onMouseDown={() => setCoverOpen(false)}><div onMouseDown={(event) => event.stopPropagation()}><button className="media-lightbox-close" aria-label={t("Kapat", "Close")} onClick={() => setCoverOpen(false)} type="button"><X/></button><img alt={coverAlt} src={resolveMediaUrl(coverImageUrl)}/></div></div> : null}
    </>;
  }
  const activeMedia = activeIndex == null ? null : media.data[activeIndex];
  const thumbnails = media.data.slice(0, 4);
  return <>
    <section className="content-media-gallery-shell"><section className="content-media-gallery" aria-label={t("Medya galerisi", "Media gallery")}>{thumbnails.map((item, index) => <button aria-label={language === "tr" ? `Görsel ${index + 1} / ${media.data!.length} büyüt` : `Enlarge media ${index + 1} of ${media.data!.length}`} key={item.id} onClick={() => setActiveIndex(index)} type="button">{item.type === "video" ? <video muted preload="metadata" src={resolveMediaUrl(item.url)}/> : <img alt="" loading="lazy" src={resolveMediaUrl(item.url)}/>} {index === thumbnails.length - 1 && media.data!.length > thumbnails.length ? <span className="content-media-more">+{media.data!.length - thumbnails.length}</span> : null}</button>)}</section>{canManage ? <div className="content-media-management"><MediaUploadButton disabled={upload.isPending} language={language} onFile={(file) => upload.mutate(file)}/><button className="secondary-action" onClick={() => { setListOpen(true); setActiveIndex(0); }} type="button"><Images size={16}/>{t("Listeyi düzenle", "Edit list")}</button></div> : null}{upload.isError ? <p className="form-error">{t("Medya yüklenemedi.", "Media could not be uploaded.")}</p> : null}</section>
    {activeMedia ? <div className="media-lightbox" role="dialog" aria-modal="true" aria-label={language === "tr" ? `Medya ${activeIndex! + 1} / ${media.data.length}` : `Media ${activeIndex! + 1} of ${media.data.length}`} onMouseDown={() => setActiveIndex(null)}>
      <div onMouseDown={(event) => event.stopPropagation()}>
        <button className="media-lightbox-close" aria-label={t("Kapat", "Close")} onClick={() => setActiveIndex(null)} type="button"><X/></button>
        {listOpen ? <div className="media-list-editor"><header><div><strong>{t("Liste görünümü", "List view")}</strong><span>{t("Sürükleyin veya oklarla sıralayın. İlk fotoğraf kapak olur.", "Drag or use the arrows to reorder. The first photo becomes the cover.")}</span></div><button onClick={() => setListOpen(false)} type="button">{t("Tam ekran", "Full screen")}</button></header><div>{media.data.map((item, index) => <article draggable key={item.id} onDragEnd={() => setDraggedId(null)} onDragOver={(event) => event.preventDefault()} onDragStart={() => setDraggedId(item.id)} onDrop={() => { if (!draggedId || draggedId === item.id) return; const ids = media.data!.map((entry) => entry.id); const from = ids.indexOf(draggedId); const to = ids.indexOf(item.id); ids.splice(to, 0, ids.splice(from, 1)[0]!); reorder.mutate(ids); setDraggedId(null); }}><GripVertical aria-hidden="true"/><button className="media-list-preview" onClick={() => { setActiveIndex(index); setListOpen(false); }} type="button">{item.type === "video" ? <video muted src={resolveMediaUrl(item.url)}/> : <img alt="" src={resolveMediaUrl(item.url)}/>}</button><span>{index + 1}{index === 0 ? t(" · Kapak", " · Cover") : ""}</span><div><button aria-label={t("Yukarı taşı", "Move up")} disabled={index === 0 || reorder.isPending} onClick={() => moveMedia(media.data!, index, index - 1, reorder.mutate)} type="button"><ChevronUp/></button><button aria-label={t("Aşağı taşı", "Move down")} disabled={index === media.data!.length - 1 || reorder.isPending} onClick={() => moveMedia(media.data!, index, index + 1, reorder.mutate)} type="button"><ChevronDown/></button><button aria-label={t("Sil", "Delete")} disabled={remove.isPending} onClick={() => window.confirm(t("Bu medya albümden silinsin mi?", "Remove this media from the album?")) && remove.mutate(item.id)} type="button"><Trash2/></button></div></article>)}</div>{reorder.isError || remove.isError ? <p className="form-error">{t("Albüm değişikliği kaydedilemedi.", "The album change could not be saved.")}</p> : null}</div> : <>{activeMedia.type === "video" ? <video autoPlay controls src={resolveMediaUrl(activeMedia.url)}/> : <img alt="" src={resolveMediaUrl(activeMedia.url)}/>} {media.data.length > 1 ? <><button className="media-lightbox-prev" aria-label={t("Önceki", "Previous")} onClick={() => setActiveIndex((activeIndex! - 1 + media.data!.length) % media.data!.length)} type="button"><ChevronLeft/></button><button className="media-lightbox-next" aria-label={t("Sonraki", "Next")} onClick={() => setActiveIndex((activeIndex! + 1) % media.data!.length)} type="button"><ChevronRight/></button></> : null}<span>{activeIndex! + 1} / {media.data.length}</span><div className="media-lightbox-actions"><a download href={resolveMediaUrl(activeMedia.url)}><Download size={16}/>{t("İndir", "Download")}</a>{canManage ? <><MediaUploadButton compact disabled={upload.isPending} language={language} onFile={(file) => upload.mutate(file)}/><button onClick={() => setListOpen(true)} type="button"><Images size={16}/>{t("Liste", "List")}</button><button disabled={remove.isPending} onClick={() => window.confirm(t("Bu medya albümden silinsin mi?", "Remove this media from the album?")) && remove.mutate(activeMedia.id)} type="button"><Trash2 size={16}/>{t("Sil", "Delete")}</button></> : user ? <button onClick={() => setReportMediaId(activeMedia.id)} type="button"><Flag size={16}/>{t("Rapor et", "Report")}</button> : null}</div></>}
      </div>
    </div> : null}
    <ReportDialog onClose={() => setReportMediaId(null)} open={Boolean(reportMediaId)} targetId={reportMediaId ?? ""} targetType="media"/>
  </>;
}

function MediaUploadButton({ compact = false, disabled, language, onFile }: { compact?: boolean; disabled: boolean; language: "tr" | "en"; onFile: (file: File) => void }) {
  return <label className={compact ? "media-upload-button compact" : "media-upload-button secondary-action"}><Upload size={16}/><span>{language === "tr" ? "Fotoğraf/video yükle" : "Upload photo/video"}</span><input accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" disabled={disabled} onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) onFile(file); event.currentTarget.value = ""; }} type="file"/></label>;
}

function moveMedia(items: Array<{ id: string }>, from: number, to: number, save: (ids: string[]) => void) {
  const ids = items.map((item) => item.id);
  ids.splice(to, 0, ids.splice(from, 1)[0]!);
  save(ids);
}
