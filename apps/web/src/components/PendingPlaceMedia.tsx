import { useEffect, useState } from "react";
import { useLanguage } from "../lib/i18n";

export function PendingPlaceMedia({ files, onChange, disabled = false }: { files: File[]; onChange: (files: File[]) => void; disabled?: boolean }) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const [urls, setUrls] = useState<string[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  useEffect(() => {
    const next = files.map(file => URL.createObjectURL(file));
    setUrls(next);
    return () => next.forEach(url => URL.revokeObjectURL(url));
  }, [files]);
  const update = (next: File[]) => {
    const firstImage = next.findIndex(file => file.type.startsWith("image/"));
    if (firstImage > 0) next.unshift(next.splice(firstImage, 1)[0]!);
    onChange(next);
  };
  const move = (from: number, to: number) => {
    if (disabled || from === to || to < 0 || to >= files.length) return;
    const next = [...files]; const [file] = next.splice(from, 1); next.splice(to, 0, file!); update(next);
  };
  return <section>
    <label>{t("Fotoğraf ve videolar", "Photos and videos")}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/bmp,video/mp4,video/webm" multiple disabled={disabled} onChange={event => { const added = Array.from(event.currentTarget.files ?? []); update([...files, ...added].slice(0, 20)); event.currentTarget.value = ""; }}/></label>
    <p>{t("En az 1 resim, en fazla 20 dosya seçebilirsin. İlk resim mekan avatarı olur. Sürükleyerek veya oklarla sıralayın.", "Select at least 1 image and up to 20 files. The first image becomes the place avatar. Drag or use the arrows to reorder.")}</p>
    <div className="pending-media-grid">{files.map((file, index) => <article key={`${file.name}-${file.lastModified}-${index}`} draggable={!disabled} onDragStart={() => setDragIndex(index)} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (dragIndex !== null) move(dragIndex, index); setDragIndex(null); }}>
      {file.type.startsWith("image/") ? <img src={urls[index]} alt={file.name}/> : <video src={urls[index]} controls preload="metadata"/>}
      <span>{file.name}</span>
      {file.type.startsWith("image/") ? <button type="button" disabled={disabled || index === 0} onClick={() => move(index, 0)}>{index === 0 ? t("Mekân avatarı", "Place avatar") : t("Avatar yap", "Use as avatar")}</button> : null}
      <div className="row-actions"><button type="button" disabled={disabled || index === 0} aria-label={t("Öne taşı", "Move earlier")} onClick={() => move(index, index - 1)}>←</button><button type="button" disabled={disabled || index === files.length - 1} aria-label={t("Arkaya taşı", "Move later")} onClick={() => move(index, index + 1)}>→</button><button type="button" disabled={disabled} onClick={() => update(files.filter((_, i) => i !== index))}>{t("Kaldır", "Remove")}</button></div>
    </article>)}</div>
  </section>;
}
