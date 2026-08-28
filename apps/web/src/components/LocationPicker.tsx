import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../lib/i18n";

type Props = {
  addressName: string;
  latitudeName?: string;
  longitudeName?: string;
  defaultAddress?: string;
  defaultLatitude?: number | null;
  defaultLongitude?: number | null;
};

export function LocationPicker({ addressName, latitudeName = "latitude", longitudeName = "longitude", defaultAddress = "", defaultLatitude, defaultLongitude }: Props) {
  const { language } = useLanguage();
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
    setMessage(language === "tr" ? "Koordinatlar haritada işaretlendi." : "Coordinates marked on the map.");
    return true;
  }

  async function locateAddress() {
    if (!address.trim() || parseCoordinates(address)) return;
    setSearching(true); setMessage("");
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address.trim())}`, { headers: { "Accept-Language": language } });
      const results = await response.json() as Array<{ lat: string; lon: string }>;
      if (!results[0]) { setMessage(language === "tr" ? "Adres bulunamadı; pini elle taşıyabilirsiniz." : "Address not found; you can move the pin manually."); return; }
      move(Number(results[0].lat), Number(results[0].lon));
      setMessage(language === "tr" ? "Adres haritada işaretlendi; gerekirse pini taşıyabilirsiniz." : "Address marked on the map; move the pin if needed.");
    } catch { setMessage(language === "tr" ? "Adres aranamadı; pini elle taşıyabilirsiniz." : "The address could not be searched; move the pin manually."); }
    finally { setSearching(false); }
  }

  return <div className="location-picker"><label>{language === "tr" ? "Adres (veya enlem boylam)" : "Address (or latitude, longitude)"}<span className="location-picker-address"><input maxLength={240} name={addressName} onBlur={() => { if (!parseCoordinates(address)) void locateAddress(); }} onChange={(event) => setAddress(event.target.value)} placeholder={language === "tr" ? "Adres veya 41.0082, 28.9784" : "Address or 41.0082, 28.9784"} value={address}/><button disabled={searching} onClick={() => void locateAddress()} type="button">{searching ? language === "tr" ? "Aranıyor…" : "Searching…" : language === "tr" ? "Haritada bul" : "Find on map"}</button></span></label><div className="location-picker-map" ref={mapElement}/><input name={latitudeName} type="hidden" value={latitude}/><input name={longitudeName} type="hidden" value={longitude}/><small>{message || (language === "tr" ? "Adresten otomatik konum bulabilir, haritaya tıklayabilir veya pini sürükleyebilirsiniz." : "Find the location from the address automatically, click the map or drag the pin.")}</small></div>;
}
