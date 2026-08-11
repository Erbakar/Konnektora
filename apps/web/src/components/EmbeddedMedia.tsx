function youtubeId(value: string) {
  const match = value.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/i);
  return match?.[1];
}

export function EmbeddedMedia({ text }: { text: string }) {
  const urls = text.match(/https?:\/\/[^\s]+/g) ?? [];
  const youtube = urls.map((url) => ({ url, id: youtubeId(url) })).find((item) => item.id);
  const soundcloud = urls.find((url) => /soundcloud\.com\//i.test(url));
  if (youtube) return <div className="embedded-media"><iframe allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" src={`https://www.youtube-nocookie.com/embed/${youtube.id}`} title="YouTube video"/></div>;
  if (soundcloud) return <div className="embedded-media embedded-audio"><iframe allow="autoplay" loading="lazy" src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(soundcloud)}&color=%231f5f46`} title="SoundCloud audio"/></div>;
  return null;
}
