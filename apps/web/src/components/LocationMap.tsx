import { ExternalLink, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { useLanguage } from "../lib/i18n";
import { keepMapSized } from "../lib/mapResize";

type MapItem = { id: string; title: string; latitude?: number | null; longitude?: number | null; location: string };

export function LocationMap({ items, showLinks = true, locationPermissionLink = false }: { items: MapItem[]; showLinks?: boolean; locationPermissionLink?: boolean }) {
  const { language } = useLanguage();
  const mapElement = useRef<HTMLDivElement>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  // 26/11 #125, #126: konum izni verilmemişse haritanın altında izin bağlantısı gösterilir.
  const [locationPermission, setLocationPermission] = useState<"unknown" | "granted" | "prompt" | "denied">("unknown");
  const located = items.filter((item) => item.latitude != null && item.longitude != null);
  const requestUserLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(({ coords }) => { setLocationPermission("granted"); setUserLocation({ latitude: coords.latitude, longitude: coords.longitude }); }, (error) => { if (error.code === 1) setLocationPermission("denied"); }, { maximumAge: 300_000, timeout: 10_000 });
  };
  useEffect(() => {
    if (!navigator.geolocation) return;
    if (!locationPermissionLink) { requestUserLocation(); return; }
    // İzin bağlantısı gösterilen listelerde tarayıcı izni kendiliğinden istenmez; yalnız izin zaten verilmişse konum alınır.
    let active = true;
    let status: PermissionStatus | undefined;
    const apply = (state: PermissionState) => { if (!active) return; setLocationPermission(state); if (state === "granted") requestUserLocation(); };
    const query = navigator.permissions?.query({ name: "geolocation" });
    if (!query) { setLocationPermission("prompt"); return; }
    void query.then((result) => { status = result; apply(result.state); result.onchange = () => apply(result.state); }).catch(() => apply("prompt"));
    return () => { active = false; if (status) status.onchange = null; };
  }, [locationPermissionLink]);
  useEffect(() => {
    if (!mapElement.current || !located.length) return;
    let disposed = false;
    let map: import("leaflet").Map | undefined;
    let stopResize: (() => void) | undefined;
    void import("leaflet").then((leaflet) => {
      if (disposed || !mapElement.current) return;
      const points: Array<[number, number]> = located.map((item) => [item.latitude!, item.longitude!]);
      if (userLocation) points.push([userLocation.latitude, userLocation.longitude]);
      map = leaflet.map(mapElement.current, { scrollWheelZoom: false });
      leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(map);
      located.forEach((item) => leaflet.marker([item.latitude!, item.longitude!], { icon: leaflet.divIcon({ className: "location-map-marker place-marker", html: "<span>●</span>", iconSize: [24, 24], iconAnchor: [12, 12] }) }).addTo(map!).bindPopup(`<strong>${escapeMapText(item.title)}</strong><br>${escapeMapText(item.location)}`));
      if (userLocation) leaflet.marker([userLocation.latitude, userLocation.longitude], { icon: leaflet.divIcon({ className: "location-map-marker user-marker", html: "<span>●</span>", iconSize: [24, 24], iconAnchor: [12, 12] }) }).addTo(map).bindPopup(language === "tr" ? "Konumunuz" : "Your location");
      const frame = () => { if (points.length === 1) map!.setView(points[0]!, 15); else map!.fitBounds(points, { padding: [36, 36], maxZoom: 15 }); };
      frame();
      stopResize = keepMapSized(map, mapElement.current, frame);
    });
    return () => { disposed = true; stopResize?.(); map?.remove(); };
  }, [language, located.map((item) => `${item.id}:${item.latitude}:${item.longitude}`).join("|"), userLocation?.latitude, userLocation?.longitude]);
  if (!located.length) return <div className="empty-state"><MapPin size={34}/><p>{language === "tr" ? "Bu sonuçlarda harita koordinatı bulunmuyor." : "No map coordinates are available for these results."}</p></div>;
  const permissionLink = locationPermissionLink && !userLocation && locationPermission !== "granted" && locationPermission !== "unknown" && typeof navigator !== "undefined" && Boolean(navigator.geolocation)
    ? <p className="location-map-permission"><button className="link-button" onClick={requestUserLocation} type="button"><MapPin size={15}/>{language === "tr" ? "Konumunuzu haritada görebilmek için izin verin" : "Allow location access to see yourself on the map"}</button>{locationPermission === "denied" ? <small>{language === "tr" ? "Konum izni engellenmiş; tarayıcı ayarlarından bu site için konum iznini açabilirsiniz." : "Location access is blocked; enable it for this site in your browser settings."}</small> : null}</p>
    : null;
  return <section className="location-map"><div aria-label={language === "tr" ? "Mekân ve kullanıcı konumu haritası" : "Place and user location map"} className="location-map-canvas" ref={mapElement}/>{permissionLink}{showLinks ? <div className="location-map-links">{located.map((item) => {
    const distance = userLocation ? distanceBetween(userLocation.latitude, userLocation.longitude, item.latitude!, item.longitude!) : null;
    const distanceLabel = distance == null ? null : distance < 1 ? `${Math.round(distance * 1_000)} m` : `${distance.toLocaleString(language === "tr" ? "tr-TR" : "en-GB", { maximumFractionDigits: distance < 10 ? 1 : 0 })} km`;
    return <a href={defaultMapHref(item.latitude!, item.longitude!)} key={item.id} rel="noreferrer" target="_blank"><MapPin size={15}/><span><strong>{item.title}</strong><small>{item.location}{distanceLabel ? ` · ${distanceLabel}` : ""}</small></span><span className="map-open-action"><ExternalLink size={24}/>{language === "tr" ? "Google Haritalar’da aç" : "Open in Google Maps"}</span></a>;
  })}{userLocation ? <span className="location-map-user-legend"><MapPin size={15}/>{language === "tr" ? "Konumunuz da haritada gösteriliyor" : "Your location is also shown on the map"}</span> : null}</div> : null}</section>;
}

function distanceBetween(fromLatitude: number, fromLongitude: number, toLatitude: number, toLongitude: number) {
  const radians = (value: number) => value * Math.PI / 180;
  const earthRadiusKm = 6_371;
  const latitudeDelta = radians(toLatitude - fromLatitude);
  const longitudeDelta = radians(toLongitude - fromLongitude);
  const value = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(fromLatitude)) * Math.cos(radians(toLatitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function defaultMapHref(latitude: number, longitude: number) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude}%2C${longitude}`;
}

function escapeMapText(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}
