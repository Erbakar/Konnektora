import { ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

/**
 * 23/11 #62.11, #63: Postane ve tüm "Gönderiler" widget'larında ortak medya seçme/yükleme deneyimi.
 * - Seçilen resim/videolar geniş küçük resimlerle listelenir, kaldırmak için çöp kutusu.
 * - "Medya ekle" ile sonradan yeni dosya eklenebilir (en çok `max`).
 * - Yüklenirken küçük resmin üzerinde tamamlanma yüzdesi (%95 gibi) görünür, bitince kaybolur.
 */
export const pickerAccept = "image/jpeg,image/png,image/webp,image/gif,image/avif,image/bmp,image/heic,image/heif,video/mp4,video/webm,video/quicktime";

export function MediaPicker({ files, onChange, progress = {}, max = 6, disabled = false, language, showAddTile = true }: {
  files: File[];
  onChange: (files: File[]) => void;
  progress?: Record<number, number>;
  max?: number;
  disabled?: boolean;
  language: "tr" | "en";
  showAddTile?: boolean;
}) {
  const t = (tr: string, en: string) => (language === "tr" ? tr : en);
  const input = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews]);
  if (!files.length) return null;
  return <div className="media-picker" aria-label={t("Seçilen medyalar", "Selected media")}>
    {previews.map(({ file, url }, index) => {
      const percent = progress[index];
      return <div className="media-picker-item" key={`${index}-${file.name}-${file.lastModified}-${file.size}`}>
        {file.type.startsWith("video/") ? <video muted preload="metadata" src={url}/> : <img alt={file.name} src={url}/>}
        {percent !== undefined && percent < 100 ? <span className="media-picker-progress" role="status" aria-label={t(`Yükleniyor %${percent}`, `Uploading ${percent}%`)}>%{percent}</span> : null}
        <button aria-label={t(`${file.name} dosyasını kaldır`, `Remove ${file.name}`)} className="media-picker-remove" disabled={disabled} onClick={() => onChange(files.filter((_, i) => i !== index))} title={t("Kaldır", "Remove")} type="button"><Trash2 size={15}/></button>
      </div>;
    })}
    {showAddTile && files.length < max ? <button className="media-picker-add" disabled={disabled} onClick={() => input.current?.click()} type="button"><ImagePlus size={20}/><span>{t("Medya ekle", "Add media")}</span></button> : null}
    <input ref={input} hidden multiple type="file" accept={pickerAccept} onChange={(event) => {
      const selected = [...(event.target.files ?? [])].filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"));
      event.target.value = "";
      if (selected.length) onChange([...files, ...selected].slice(0, max));
    }}/>
  </div>;
}
