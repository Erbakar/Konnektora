function youtubeId(value: string) {
  const match = value.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/i);
  return match?.[1];
}

export function EmbeddedMedia({ text }: { text: string }) {
  const [playing, setPlaying] = useState(false);
  const urls = text.match(/https?:\/\/[^\s]+/g) ?? [];
  const youtube = urls.map((url) => ({ url, id: youtubeId(url) })).find((item) => item.id);
  const soundcloud = urls.find((url) => /soundcloud\.com\//i.test(url));
  if (youtube) return <div className="embedded-media"><a href={youtube.url} rel="noreferrer" target="_blank">YouTube videosunu aç</a>{playing ? <iframe allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" src={`https://www.youtube-nocookie.com/embed/${youtube.id}?autoplay=1`} title="YouTube video"/> : <button className="youtube-preview" onClick={() => setPlaying(true)} type="button"><img alt="YouTube video önizlemesi" src={`https://i.ytimg.com/vi/${youtube.id}/hqdefault.jpg`}/><span><Play fill="currentColor" size={25}/></span></button>}</div>;
  if (soundcloud) return <div className="embedded-media embedded-audio"><a href={soundcloud} rel="noreferrer" target="_blank">SoundCloud kaydını aç</a><iframe allow="autoplay" loading="lazy" src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(soundcloud)}&color=%231f5f46`} title="SoundCloud audio"/></div>;
  return null;
}
import { Play } from "lucide-react";
import { useState } from "react";
