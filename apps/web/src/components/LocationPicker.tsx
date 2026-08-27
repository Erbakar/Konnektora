import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";

type Props = {
  addressName: string;
  latitudeName?: string;
  longitudeName?: string;
  defaultAddress?: string;
  defaultLatitude?: number | null;
  defaultLongitude?: number | null;
};

export function LocationPicker({ addressName, latitudeName = "latitude", longitudeName = "longitude", defaultAddress = "", defaultLatitude, defaultLongitude }: Props) {
  const initialLat = defaultLatitude ?? 41.0082;
  const initialLon = defaultLongitude ?? 28.9784;
  const [address, setAddress] = useState(defaultAddress);
  const [latitude, setLatitude] = useState(initialLat);
  const [longitude, setLongitude] = useState(initialLon);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapElement.current || mapRef.current) return;
    const map = L.map(mapElement.current, { scrollWheelZoom: true }).setView([initialLat, initialLon], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(map);
    const icon = L.divIcon({ className: "location-picker-pin", html: "<span>●</span>", iconAnchor: [12, 24], iconSize: [24, 24] });
    const marker = L.marker([initialLat, initialLon], { draggable: true, icon }).addTo(map);
    const update = (lat: number, lon: number) => { setLatitude(Number(lat.toFixed(7))); setLongitude(Number(lon.toFixed(7))); marker.setLatLng([lat, lon]); };
    marker.on("dragend", () => { const point = marker.getLatLng(); update(point.lat, point.lng); });
    map.on("click", (event) => update(event.latlng.lat, event.latlng.lng));
    mapRef.current = map;
    markerRef.current = marker;
    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
  }, [initialLat, initialLon]);

  function move(lat: number, lon: number, zoom = 16) {
    setLatitude(Number(lat.toFixed(7)));
    setLongitude(Number(lon.toFixed(7)));
    markerRef.current?.setLatLng([lat, lon]);
    mapRef.current?.setView([lat, lon], zoom);
  }

  function parseCoordinates(value: string) {
    const match = value.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
    if (!match) return false;
    const lat = Number(match[1]); const lon = Number(match[2]);
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return false;
    move(lat, lon);
    setMessage("Koordinatlar haritada işaretlendi.");
    return true;
  }

  async function locateAddress() {
    if (!address.trim() || parseCoordinates(address)) return;
    setSearching(true); setMessage("");
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address.trim())}`, { headers: { "Accept-Language": "tr" } });
      const results = await response.json() as Array<{ lat: string; lon: string }>;
      if (!results[0]) { setMessage("Adres bulunamadı; pini elle taşıyabilirsiniz."); return; }
      move(Number(results[0].lat), Number(results[0].lon));
      setMessage("Adres haritada işaretlendi; gerekirse pini taşıyabilirsiniz.");
    } catch { setMessage("Adres aranamadı; pini elle taşıyabilirsiniz."); }
    finally { setSearching(false); }
  }

  return <div className="location-picker"><label>Adres (veya enlem boylam)<span className="location-picker-address"><input maxLength={240} name={addressName} onBlur={() => parseCoordinates(address)} onChange={(event) => setAddress(event.target.value)} placeholder="Adres veya 41.0082, 28.9784" value={address}/><button disabled={searching} onClick={() => void locateAddress()} type="button">{searching ? "Aranıyor…" : "Haritada bul"}</button></span></label><div className="location-picker-map" ref={mapElement}/><input name={latitudeName} type="hidden" value={latitude}/><input name={longitudeName} type="hidden" value={longitude}/><small>{message || "Haritaya tıklayın veya pini sürükleyin."}</small></div>;
}
