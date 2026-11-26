import { ImagePlus, Trash2 } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { COMPOSER_MEDIA_MAX_BYTES, COMPOSER_MEDIA_MAX_FILES, composerMediaAccept, mediaDisplayOrder, mediaProgressLabel, mediaRejectionNotice, mergeMediaSelection } from "../lib/mediaSelection";

/**
 * 23/11 #62.11, #63 — 26/11 test dönüşü: Postane ve tüm "Gönderiler" widget'larında ortak medya seçme/yükleme deneyimi.
 * - Seçilen tüm resim/videolar yatay kaydırılabilir şeritte, kare küçük resimlerle listelenir
 *   (en son seçilen solda, en eski sağda); şeridin başında ve sonunda "Medya ekle" kartı vardır.
 * - Yazma alanındaki kendi düğmeler de bu bileşenin tek dosya girişini açar (`inputId` ya da `open()`),
 *   böylece sınır/tür denetimi ve uyarılar her yerde aynıdır. Gönderim sürerken de yeni medya eklenebilir.
 * - Gönderim sürerken her küçük resmin üzerinde tamamlanma yüzdesi (%0…%99) görünür, yüklenince kaybolur.
 */
export const pickerAccept = composerMediaAccept;

export type MediaPickerHandle = { open: () => void };

export const MediaPicker = forwardRef<MediaPickerHandle, {
  files: File[];
  onChange: (files: File[]) => void;
  /** Dosya başına yükleme yüzdesi; 100 olanlarda yüzde gizlenir. */
  progress?: ReadonlyMap<File, number>;
  /** Gönderim sürüyor: sıradaki dosyalarda %0 gösterilir ve dosya kaldırma kapanır. */
  uploading?: boolean;
  max?: number;
  maxBytes?: number;
  /** Yeni medya eklemeyi tamamen kapatır (ör. kullanıcı mesaj almıyor). */
  disabled?: boolean;
  language: "tr" | "en";
  /** Yazma alanındaki "Resim / video ekle" etiketinin bağlanacağı dosya girişi kimliği. */
  inputId?: string;
}>(function MediaPicker({ files, onChange, progress, uploading = false, max = COMPOSER_MEDIA_MAX_FILES, maxBytes = COMPOSER_MEDIA_MAX_BYTES, disabled = false, language, inputId }, ref) {
  const t = (tr: string, en: string) => (language === "tr" ? tr : en);
  const input = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState("");
  // Seçim dosya penceresi açıkken değişebilir; her zaman en güncel listeye ekle.
  const latest = useRef(files);
  latest.current = files;
  useImperativeHandle(ref, () => ({ open: () => input.current?.click() }), []);
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews]);
  const canAdd = !disabled && files.length < max;
  const addTile = (position: "start" | "end") => canAdd ? <button className={`media-picker-add media-picker-add-${position}`} onClick={() => input.current?.click()} type="button"><ImagePlus aria-hidden="true" size={22}/><span>{t("Medya ekle", "Add media")}</span></button> : null;
  return <>
    <input ref={input} id={inputId} hidden multiple type="file" accept={pickerAccept} disabled={disabled} data-testid="media-picker-input" onChange={(event) => {
      const picked = [...(event.target.files ?? [])];
      // Aynı dosyalar yeniden seçilebilsin diye giriş her seçimden sonra sıfırlanır.
      event.target.value = "";
      if (!picked.length) return;
      const { files: next, rejected } = mergeMediaSelection(latest.current, picked, { max, maxBytes });
      setNotice(mediaRejectionNotice(rejected, language, { max, maxBytes }));
      if (next.length !== latest.current.length) onChange(next);
    }}/>
    {notice ? <p className="form-error media-picker-notice" role="alert">{notice}</p> : null}
    {files.length ? <div className="media-picker" aria-label={t(`Seçilen medyalar (${files.length})`, `Selected media (${files.length})`)}>
      {addTile("start")}
      {mediaDisplayOrder(files.length).map((index) => {
        const { file, url } = previews[index]!;
        const percent = mediaProgressLabel(file, progress, uploading);
        return <div className="media-picker-item" key={`${file.name}-${file.lastModified}-${file.size}-${index}`}>
          {file.type.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(file.name) ? <video muted playsInline preload="metadata" src={url}/> : <img alt={file.name} src={url}/>}
          {percent !== null ? <span className="media-picker-progress" role="status" aria-label={t(`Yükleniyor %${percent}`, `Uploading ${percent}%`)}>%{percent}</span> : null}
          <button aria-label={t(`${file.name} dosyasını kaldır`, `Remove ${file.name}`)} className="media-picker-remove" disabled={uploading} onClick={() => { setNotice(""); onChange(files.filter((_, i) => i !== index)); }} title={t("Kaldır", "Remove")} type="button"><Trash2 size={15}/></button>
        </div>;
      })}
      {addTile("end")}
    </div> : null}
  </>;
});
