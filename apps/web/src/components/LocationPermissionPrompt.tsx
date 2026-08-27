import { MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const locationRoutes = [/^\/$/, /^\/events(?:\/|$)/, /^\/places(?:\/|$)/];

export function LocationPermissionPrompt() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!locationRoutes.some((route) => route.test(location.pathname))) return;
    if (!navigator.geolocation || sessionStorage.getItem("konnektora:location-intro") === "seen") return;
    setOpen(true);
  }, [location.pathname]);

  if (!open) return null;
  return (
    <div className="dialog-backdrop" role="presentation">
      <section aria-labelledby="location-permission-title" aria-modal="true" className="content-dialog location-permission-dialog" role="dialog">
        <MapPin aria-hidden="true" size={30}/>
        <h2 id="location-permission-title">Konum deneyimini aç</h2>
        <p>Konnektora ilgi alanı ve konum bazlı bir deneyim sunar; özellikle etkinlikler ve mekânlarla ilgili. Bu ekranı kapattığınızda sistem konum erişim izninizi isteyecek.</p>
        <button className="primary-action" onClick={() => {
          sessionStorage.setItem("konnektora:location-intro", "seen");
          setOpen(false);
          navigator.geolocation.getCurrentPosition(() => window.dispatchEvent(new Event("konnektora:location-updated")), () => undefined, { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 });
        }} type="button">Tamam, konum izni iste</button>
      </section>
    </div>
  );
}
