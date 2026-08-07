import { useQuery } from "@tanstack/react-query";
import { listContentMedia, resolveMediaUrl } from "../lib/api";

export function ContentMediaGallery({ targetType, targetId }: { targetType: "event" | "place"; targetId: string }) {
  const media = useQuery({ queryKey: ["content-media", targetType, targetId], queryFn: () => listContentMedia(targetType, targetId) });
  if (!media.data?.length) return null;
  return <section className="content-media-gallery" aria-label="Medya galerisi">{media.data.map((item) => item.type === "video" ? <video controls key={item.id} preload="metadata" src={resolveMediaUrl(item.url)}/> : <img alt="" key={item.id} loading="lazy" src={resolveMediaUrl(item.url)}/>)}</section>;
}
