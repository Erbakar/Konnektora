import { Play } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "../lib/i18n";

function youtubeId(value: string) {
  const match = value.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/i);
  return match?.[1];
}

export function EmbeddedMedia({ text }: { text: string }) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const [playing, setPlaying] = useState(false);
  const urls = text.match(/https?:\/\/[^\s]+/g) ?? [];
  const youtube = urls.map((url) => ({ url, id: youtubeId(url) })).find((item) => item.id);
  const soundcloud = urls.find((url) => /soundcloud\.com\//i.test(url));
  const sourceUrl = youtube?.url ?? soundcloud;
  const sourceTitle = useEmbedTitle(sourceUrl, youtube ? t("YouTube videosu", "YouTube video") : t("SoundCloud kaydı", "SoundCloud recording"));
  if (youtube) return <div className="embedded-media"><a href={youtube.url} rel="noreferrer" target="_blank">{sourceTitle}</a>{playing ? <iframe allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" src={`https://www.youtube-nocookie.com/embed/${youtube.id}?autoplay=1`} title={sourceTitle}/> : <button className="youtube-preview" onClick={() => setPlaying(true)} type="button"><img alt={t(`${sourceTitle} önizlemesi`, `${sourceTitle} preview`)} src={`https://i.ytimg.com/vi/${youtube.id}/hqdefault.jpg`}/><span><Play fill="currentColor" size={25}/></span></button>}</div>;
  if (soundcloud) return <div className="embedded-media embedded-audio"><a href={soundcloud} rel="noreferrer" target="_blank">{sourceTitle}</a><iframe allow="autoplay" loading="lazy" src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(soundcloud)}&color=%231f5f46&show_artwork=true`} title={sourceTitle}/></div>;
  return null;
}

function useEmbedTitle(url: string | undefined, fallback: string) {
  const [title, setTitle] = useState(fallback);
  useEffect(() => {
    setTitle(fallback);
    if (!url) return;
    const endpoint = /youtu(?:\.be|be\.com)/i.test(url)
      ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`
      : `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`;
    const controller = new AbortController();
    void fetch(endpoint, { signal: controller.signal }).then((response) => response.ok ? response.json() as Promise<{ title?: string }> : Promise.reject()).then((data) => { if (data.title?.trim()) setTitle(data.title.trim()); }).catch(() => undefined);
    return () => controller.abort();
  }, [fallback, url]);
  return title;
}
