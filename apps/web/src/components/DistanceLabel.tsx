import { Navigation } from "lucide-react";
import { useEffect, useState } from "react";

let cachedPosition: { latitude: number; longitude: number } | null = null;
let positionRequest: Promise<{ latitude: number; longitude: number } | null> | null = null;

function userPosition() {
  if (cachedPosition) return Promise.resolve(cachedPosition);
  if (!positionRequest) positionRequest = new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(({ coords }) => { cachedPosition = { latitude: coords.latitude, longitude: coords.longitude }; resolve(cachedPosition); }, () => { positionRequest = null; resolve(null); }, { maximumAge: 300_000, timeout: 5000 });
  });
  return positionRequest;
}

function haversine(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(to.latitude - from.latitude);
  const dLon = radians(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function DistanceLabel({ latitude, longitude }: { latitude?: number | null; longitude?: number | null }) {
  const [distance, setDistance] = useState<number | null>(null);
  const [permissionNeeded, setPermissionNeeded] = useState(false);
  const calculate = () => { if (latitude == null || longitude == null) return; setPermissionNeeded(false); void userPosition().then((position) => { if (position) setDistance(haversine(position, { latitude, longitude })); else setPermissionNeeded(true); }); };
  useEffect(calculate, [latitude, longitude]);
  if (latitude == null || longitude == null) return null;
  if (permissionNeeded) return <button className="distance-permission" onClick={calculate} type="button"><Navigation size={15}/>Konum için izin verin</button>;
  return <span><Navigation size={15}/>{distance == null ? "Konum alınıyor…" : distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(distance < 10 ? 1 : 0)} km`}</span>;
}
