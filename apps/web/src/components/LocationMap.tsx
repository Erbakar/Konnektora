import { ExternalLink, MapPin } from "lucide-react";

type MapItem = { id: string; title: string; latitude?: number | null; longitude?: number | null; location: string };

export function LocationMap({ items }: { items: MapItem[] }) {
  const located = items.filter((item) => item.latitude != null && item.longitude != null);
  if (!located.length) return <div className="empty-state"><MapPin size={34}/><p>Bu sonuçlarda harita koordinatı bulunmuyor.</p></div>;
  const first = located[0]!;
  const lat = first.latitude!;
  const lon = first.longitude!;
  const bbox = [lon - .08, lat - .05, lon + .08, lat + .05].join("%2C");
  return <section className="location-map"><iframe title="Sonuç haritası" loading="lazy" src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`}/><div>{located.map((item) => <a href={`https://www.openstreetmap.org/?mlat=${item.latitude}&mlon=${item.longitude}#map=15/${item.latitude}/${item.longitude}`} key={item.id} rel="noreferrer" target="_blank"><MapPin size={15}/><span><strong>{item.title}</strong><small>{item.location}</small></span><ExternalLink size={14}/></a>)}</div></section>;
}
