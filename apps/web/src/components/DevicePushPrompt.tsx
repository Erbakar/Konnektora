import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";
import { devicePushSupported, enableDevicePush } from "./PushNotificationControl";
import { getServiceErrorMessage } from "../lib/serviceErrors";
import { useLanguage } from "../lib/i18n";

const storageKey = (userId: string) => `konnektora:device-push-prompt:${userId}`;

function alreadyAsked(userId: string) {
  try { return localStorage.getItem(storageKey(userId)) !== null; } catch { return true; }
}

function markAsked(userId: string, value: string) {
  try { localStorage.setItem(storageKey(userId), value); } catch { /* depolama kapalıysa tekrar sorulabilir */ }
}

/** Üyeliği tamamlanmış kullanıcıya ilk girişte bir kereye mahsus cihaz bildirimi izni sorar. */
export function DevicePushPrompt({ userId, blocked }: { userId?: string | null; blocked?: boolean }) {
  const { language } = useLanguage();
  const tr = language === "tr";
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!userId || blocked || !devicePushSupported()) return;
    if (Notification.permission !== "default") { markAsked(userId, Notification.permission); return; }
    if (alreadyAsked(userId)) return;
    const timer = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(timer);
  }, [userId, blocked]);
  if (!open || !userId) return null;
  const close = (value: string) => { markAsked(userId, value); setOpen(false); };
  const allow = async () => {
    setPending(true);
    setError("");
    try {
      await enableDevicePush(tr);
      close("granted");
    } catch (failure) {
      if (typeof Notification !== "undefined" && Notification.permission === "denied") close("denied");
      else setError(getServiceErrorMessage(failure, tr ? "Bildirimler şu anda etkinleştirilemedi." : "Notifications could not be enabled right now."));
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="dialog-backdrop location-intro-backdrop" role="presentation">
      <section aria-describedby="device-push-description" aria-labelledby="device-push-title" aria-modal="true" className="content-dialog location-intro-dialog device-push-dialog" role="dialog">
        <button aria-label={tr ? "Şimdi değil" : "Not now"} className="passport-close" onClick={() => close("dismissed")} type="button"><X size={20}/></button>
        <span className="location-intro-icon"><Bell size={25}/></span>
        <p className="eyebrow">{tr ? "Cihaz bildirimleri" : "Device notifications"}</p>
        <h2 id="device-push-title">{tr ? "Önemli gelişmeleri kaçırma" : "Don't miss what matters"}</h2>
        <p id="device-push-description">{tr ? "Davetler, mesajlar, etkinlik değişiklikleri ve onay bekleyen işlemler için bu cihazda gerçek zamanlı bildirim almak ister misin? Bu tercihi daha sonra Bildirim Ayarları'ndan değiştirebilirsin." : "Would you like real-time notifications on this device for invitations, messages, event changes and pending approvals? You can change this later in Notification settings."}</p>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="location-intro-actions">
          <button className="primary-action" disabled={pending} onClick={() => void allow()} type="button">{tr ? "Bildirimlere izin ver" : "Allow notifications"}</button>
          <button className="secondary-action" disabled={pending} onClick={() => close("dismissed")} type="button">{tr ? "Şimdi değil" : "Not now"}</button>
        </div>
      </section>
    </div>
  );
}
