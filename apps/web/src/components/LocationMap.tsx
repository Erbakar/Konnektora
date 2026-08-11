import { ExternalLink, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

type MapItem = { id: string; title: string; latitude?: number | null; longitude?: number | null; location: string };

export function LocationMap({ items }: { items: MapItem[] }) {
  const mapElement = useRef<HTMLDivElement>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const located = items.filter((item) => item.latitude != null && item.longitude != null);
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(({ coords }) => setUserLocation({ latitude: coords.latitude, longitude: coords.longitude }), () => undefined, { maximumAge: 300_000, timeout: 5_000 });
  }, []);
  useEffect(() => {
    if (!mapElement.current || !located.length) return;
    let disposed = false;
    let map: import("leaflet").Map | undefined;
    void import("leaflet").then((leaflet) => {
      if (disposed || !mapElement.current) return;
      const points: Array<[number, number]> = located.map((item) => [item.latitude!, item.longitude!]);
      if (userLocation) points.push([userLocation.latitude, userLocation.longitude]);
      map = leaflet.map(mapElement.current, { scrollWheelZoom: false });
      leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(map);
      located.forEach((item) => leaflet.marker([item.latitude!, item.longitude!], { icon: leaflet.divIcon({ className: "location-map-marker place-marker", html: "<span>●</span>", iconSize: [24, 24], iconAnchor: [12, 12] }) }).addTo(map!).bindPopup(`<strong>${escapeMapText(item.title)}</strong><br>${escapeMapText(item.location)}`));
      if (userLocation) leaflet.marker([userLocation.latitude, userLocation.longitude], { icon: leaflet.divIcon({ className: "location-map-marker user-marker", html: "<span>●</span>", iconSize: [24, 24], iconAnchor: [12, 12] }) }).addTo(map).bindPopup("Konumunuz");
      if (points.length === 1) map.setView(points[0]!, 15); else map.fitBounds(points, { padding: [36, 36], maxZoom: 15 });
    });
    return () => { disposed = true; map?.remove(); };
  }, [located.map((item) => `${item.id}:${item.latitude}:${item.longitude}`).join("|"), userLocation?.latitude, userLocation?.longitude]);
  if (!located.length) return <div className="empty-state"><MapPin size={34}/><p>Bu sonuçlarda harita koordinatı bulunmuyor.</p></div>;
  return <section className="location-map"><div aria-label="Mekân ve kullanıcı konumu haritası" className="location-map-canvas" ref={mapElement}/><div className="location-map-links">{located.map((item) => <a href={`https://www.google.com/maps/search/?api=1&query=${item.latitude}%2C${item.longitude}`} key={item.id} rel="noreferrer" target="_blank"><MapPin size={15}/><span><strong>{item.title}</strong><small>{item.location}</small></span><ExternalLink size={14}/></a>)}{userLocation ? <span className="location-map-user-legend"><MapPin size={15}/>Konumunuz da haritada gösteriliyor</span> : null}</div></section>;
}

function escapeMapText(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}
