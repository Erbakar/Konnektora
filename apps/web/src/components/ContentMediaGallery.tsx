import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { listContentMedia, resolveMediaUrl } from "../lib/api";

export function ContentMediaGallery({ targetType, targetId }: { targetType: "event" | "place"; targetId: string }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const media = useQuery({ queryKey: ["content-media", targetType, targetId], queryFn: () => listContentMedia(targetType, targetId) });
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
  if (!media.data?.length) return null;
  const activeMedia = activeIndex == null ? null : media.data[activeIndex];
  return <>
    <section className="content-media-gallery" aria-label="Medya galerisi">{media.data.map((item, index) => <button aria-label={`Görsel ${index + 1} / ${media.data!.length} büyüt`} key={item.id} onClick={() => setActiveIndex(index)} type="button">{item.type === "video" ? <video muted preload="metadata" src={resolveMediaUrl(item.url)}/> : <img alt="" loading="lazy" src={resolveMediaUrl(item.url)}/>}</button>)}</section>
    {activeMedia ? <div className="media-lightbox" role="dialog" aria-modal="true" aria-label={`Medya ${activeIndex! + 1} / ${media.data.length}`} onMouseDown={() => setActiveIndex(null)}>
      <div onMouseDown={(event) => event.stopPropagation()}>
        <button className="media-lightbox-close" aria-label="Kapat" onClick={() => setActiveIndex(null)} type="button"><X/></button>
        {activeMedia.type === "video" ? <video autoPlay controls src={resolveMediaUrl(activeMedia.url)}/> : <img alt="" src={resolveMediaUrl(activeMedia.url)}/>}
        {media.data.length > 1 ? <><button className="media-lightbox-prev" aria-label="Önceki" onClick={() => setActiveIndex((activeIndex! - 1 + media.data!.length) % media.data!.length)} type="button"><ChevronLeft/></button><button className="media-lightbox-next" aria-label="Sonraki" onClick={() => setActiveIndex((activeIndex! + 1) % media.data!.length)} type="button"><ChevronRight/></button></> : null}
        <span>{activeIndex! + 1} / {media.data.length}</span>
      </div>
    </div> : null}
  </>;
}
