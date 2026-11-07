import { supportedMediaHelp } from "../lib/mediaPolicy";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, GripVertical, Images, Maximize2, Trash2, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteContentMedia, listContentMedia, reorderContentMedia, resolveMediaUrl, uploadContentMedia } from "../lib/api";
import { MediaViewer, type MediaViewerActions } from "./MediaAlbum";
import { useLanguage } from "../lib/i18n";

export function ContentMediaGallery({ targetType, targetId, canManage = false, coverImageUrl, coverAlt = "" }: { targetType: "event" | "place"; targetId: string; canManage?: boolean; coverImageUrl?: string | null; coverAlt?: string }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [coverOpen, setCoverOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const queryClient = useQueryClient();
  const media = useQuery({ queryKey: ["content-media", targetType, targetId], queryFn: () => listContentMedia(targetType, targetId) });
  const refresh = (items?: unknown) => {
    if (items) queryClient.setQueryData(["content-media", targetType, targetId], items);
    else void queryClient.invalidateQueries({ queryKey: ["content-media", targetType, targetId] });
    void queryClient.invalidateQueries({ queryKey: [targetType, targetId] });
  };
  const upload = useMutation({ mutationFn: async (files: File[]) => { for (const file of files) await uploadContentMedia(targetType, targetId, file); }, onSettled: () => refresh() });
  const reorder = useMutation({ mutationFn: (mediaIds: string[]) => reorderContentMedia(targetType, targetId, mediaIds), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (mediaId: string) => deleteContentMedia(targetType, targetId, mediaId), onSuccess: (items) => { setActiveIndex(null); refresh(items); } });
  useEffect(() => {
    if (!listOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setListOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("media-viewer-open");
    return () => { document.removeEventListener("keydown", onKey); document.body.classList.remove("media-viewer-open"); };
  }, [listOpen]);
  const viewerActions: MediaViewerActions = {
    kind: targetType,
    canManage,
    avatarMediaId: media.data?.[0]?.id ?? null,
    onUpload: (files) => upload.mutateAsync(files),
    onMakeAvatar: async (mediaId) => { const ids = (media.data ?? []).map((item) => item.id); const from = ids.indexOf(mediaId); if (from > 0) { ids.splice(0, 0, ids.splice(from, 1)[0]!); await reorder.mutateAsync(ids); setActiveIndex(0); } },
    onEditAlbum: () => { setActiveIndex(null); setListOpen(true); },
    onDelete: (mediaId) => remove.mutateAsync(mediaId),
  };
  if (!media.data?.length) {
    if (!coverImageUrl) return canManage ? <section className="content-media-empty"><Images size={25}/><div><strong>{t("Medya albümü boş", "Media album is empty")}</strong><span>{upload.isPending ? t("Yükleniyor…", "Uploading…") : t("İlk fotoğrafı veya videoyu yükleyin.", "Upload the first photo or video.")}</span></div><MediaUploadButton disabled={upload.isPending} language={language} onFile={(files) => upload.mutate(files)}/>{upload.isError ? <p className="form-error">{upload.error instanceof Error ? upload.error.message : supportedMediaHelp}</p> : null}</section> : null;
    return <>
      <section className="content-media-gallery-shell"><section className="content-media-gallery content-media-cover-only" aria-label={t("Kapak görseli", "Cover image")}><button aria-label={t("Kapak görselini büyüt", "Enlarge cover image")} onClick={() => setCoverOpen(true)} type="button"><img alt={coverAlt} src={resolveMediaUrl(coverImageUrl)}/></button></section>{canManage ? <div className="content-media-management"><MediaUploadButton disabled={upload.isPending} language={language} onFile={(files) => upload.mutate(files)}/>{upload.isPending ? <span role="status">{t("Yükleniyor…", "Uploading…")}</span> : null}</div> : null}{upload.isError ? <p className="form-error">{upload.error instanceof Error ? upload.error.message : supportedMediaHelp}</p> : null}</section>
      {coverOpen ? <MediaViewer items={[{ id: targetId, type: "image", url: coverImageUrl }]} index={0} onChange={() => {}} onClose={() => setCoverOpen(false)} reportTargetType={targetType} actions={{ kind: targetType, canManage, avatarMediaId: targetId, onUpload: async (files) => { await upload.mutateAsync(files); setCoverOpen(false); } }}/> : null}
    </>;
  }
  const activeMedia = activeIndex == null ? null : media.data[activeIndex];
  const thumbnails = media.data.slice(0, 4);
  return <>
    <section className="content-media-gallery-shell"><section className="content-media-gallery" aria-label={t("Medya galerisi", "Media gallery")}>{thumbnails.map((item, index) => <button aria-label={language === "tr" ? `Görsel ${index + 1} / ${media.data!.length} büyüt` : `Enlarge media ${index + 1} of ${media.data!.length}`} key={item.id} onClick={() => setActiveIndex(index)} type="button">{item.type === "video" ? <video muted preload="metadata" src={resolveMediaUrl(item.url)}/> : <img alt="" loading="lazy" src={resolveMediaUrl(item.url)}/>} {index === thumbnails.length - 1 && media.data!.length > thumbnails.length ? <span className="content-media-more">+{media.data!.length - thumbnails.length}</span> : null}</button>)}</section>{canManage ? <div className="content-media-management"><MediaUploadButton disabled={upload.isPending} language={language} onFile={(files) => upload.mutate(files)}/><button className="secondary-action" onClick={() => { setListOpen(true); setActiveIndex(0); }} type="button"><Images size={16}/>{t("Listeyi düzenle", "Edit list")}</button>{upload.isPending ? <span role="status">{t("Yükleniyor…", "Uploading…")}</span> : null}</div> : null}{upload.isError ? <p className="form-error">{upload.error instanceof Error ? upload.error.message : supportedMediaHelp}</p> : null}</section>
    {activeMedia && !listOpen ? <MediaViewer items={media.data} index={activeIndex!} onChange={setActiveIndex} onClose={() => setActiveIndex(null)} actions={viewerActions}/> : null}
    {listOpen ? <div className="media-lightbox media-list-lightbox" role="dialog" aria-modal="true" aria-label={t("Albümü düzenle", "Edit album")} onMouseDown={(event) => { if (event.target === event.currentTarget || (event.target as HTMLElement).classList.contains("media-list-lightbox-frame")) setListOpen(false); }}><div className="media-list-lightbox-frame">
        {listOpen ? <div className="media-list-editor"><header><div><strong>{t("Liste görünümü", "List view")}</strong><span>{t("Sürükleyin veya oklarla sıralayın. İlk fotoğraf kapak olur.", "Drag or use the arrows to reorder. The first photo becomes the cover.")}</span></div><div className="media-list-editor-actions"><button className="secondary-action media-list-fullscreen" onClick={() => { setListOpen(false); setActiveIndex(0); }} type="button"><Maximize2 size={16}/>{t("Tam ekran", "Full screen")}</button><button className="media-list-close" aria-label={t("Kapat", "Close")} onClick={() => setListOpen(false)} type="button"><X size={20}/></button></div></header><div>{media.data.map((item, index) => <article draggable key={item.id} onDragEnd={() => setDraggedId(null)} onDragOver={(event) => event.preventDefault()} onDragStart={() => setDraggedId(item.id)} onDrop={() => { if (!draggedId || draggedId === item.id) return; const ids = media.data!.map((entry) => entry.id); const from = ids.indexOf(draggedId); const to = ids.indexOf(item.id); ids.splice(to, 0, ids.splice(from, 1)[0]!); reorder.mutate(ids); setDraggedId(null); }}><GripVertical aria-hidden="true"/><button className="media-list-preview" onClick={() => { setActiveIndex(index); setListOpen(false); }} type="button">{item.type === "video" ? <video muted src={resolveMediaUrl(item.url)}/> : <img alt="" src={resolveMediaUrl(item.url)}/>}</button><span>{index + 1}{index === 0 ? t(" · Kapak", " · Cover") : ""}</span><div>{item.type === "image" && index > 0 ? <button type="button" disabled={reorder.isPending} onClick={() => moveMedia(media.data!, index, 0, reorder.mutate)}>{targetType === "event" ? t("Etkinlik afişi yap", "Use as event poster") : t("Mekân avatarı yap", "Use as place avatar")}</button> : null}<button aria-label={t("Yukarı taşı", "Move up")} disabled={index === 0 || reorder.isPending} onClick={() => moveMedia(media.data!, index, index - 1, reorder.mutate)} type="button"><ChevronUp/></button><button aria-label={t("Aşağı taşı", "Move down")} disabled={index === media.data!.length - 1 || reorder.isPending} onClick={() => moveMedia(media.data!, index, index + 1, reorder.mutate)} type="button"><ChevronDown/></button><button aria-label={t("Sil", "Delete")} disabled={remove.isPending} onClick={() => window.confirm(t("Bu medya albümden silinsin mi?", "Remove this media from the album?")) && remove.mutate(item.id)} type="button"><Trash2/></button></div></article>)}</div>{reorder.isError || remove.isError ? <p className="form-error">{t("Albüm değişikliği kaydedilemedi.", "The album change could not be saved.")}</p> : null}</div> : null}
      </div></div> : null}
  </>;
}

function MediaUploadButton({ compact = false, disabled, language, onFile }: { compact?: boolean; disabled: boolean; language: "tr" | "en"; onFile: (files: File[]) => void }) {
  return <label className={compact ? "media-upload-button compact" : "media-upload-button secondary-action"}><Upload size={16}/><span>{language === "tr" ? "Fotoğraf/video yükle" : "Upload photo/video"}</span><input accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/bmp,video/mp4,video/webm" disabled={disabled} multiple onChange={(event) => { const files = Array.from(event.currentTarget.files ?? []); if (files.length) onFile(files); event.currentTarget.value = ""; }} type="file"/></label>;
}

function moveMedia(items: Array<{ id: string }>, from: number, to: number, save: (ids: string[]) => void) {
  const ids = items.map((item) => item.id);
  ids.splice(to, 0, ids.splice(from, 1)[0]!);
  save(ids);
}
