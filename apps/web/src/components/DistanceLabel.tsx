import { Navigation } from "lucide-react";
import { useEffect, useState } from "react";

let cachedPosition: { latitude: number; longitude: number } | null = null;
let positionRequest: Promise<{ latitude: number; longitude: number } | null> | null = null;

function userPosition() {
  if (cachedPosition) return Promise.resolve(cachedPosition);
  if (!positionRequest) positionRequest = new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(({ coords }) => { cachedPosition = { latitude: coords.latitude, longitude: coords.longitude }; resolve(cachedPosition); }, () => resolve(null), { maximumAge: 300_000, timeout: 5000 });
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
  useEffect(() => { if (latitude == null || longitude == null) return; void userPosition().then((position) => { if (position) setDistance(haversine(position, { latitude, longitude })); }); }, [latitude, longitude]);
  return <span><Navigation size={15}/>{distance == null ? "Mesafe hesaplanamadı" : distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(distance < 10 ? 1 : 0)} km`}</span>;
}
