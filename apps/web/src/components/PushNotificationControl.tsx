import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell, BellOff } from "lucide-react";
import { useState } from "react";
import { ServiceFeedback } from "./ServiceFeedback";
import { getPushPublicKey, registerPushSubscription, removePushSubscription } from "../lib/api";
import { getServiceErrorMessage } from "../lib/serviceErrors";
import { useLanguage } from "../lib/i18n";

function decodeKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export function PushNotificationControl() {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  const [enabled, setEnabled] = useState(Notification.permission === "granted");
  const [message, setMessage] = useState("");
  const publicKey = useQuery({ queryKey: ["push-public-key"], queryFn: getPushPublicKey, enabled: supported });
  const enable = useMutation({
    mutationFn: async () => {
      if (!publicKey.data) throw new Error(t("Push kanalı henüz yapılandırılmamış.", "The push channel has not been configured yet."));
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error(t("Bildirim izni verilmedi.", "Notification permission was not granted."));
      const registration = await navigator.serviceWorker.register("/notification-worker.js");
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(publicKey.data) });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error(t("Push aboneliği oluşturulamadı.", "The push subscription could not be created."));
      await registerPushSubscription({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth });
      setEnabled(true);
      setMessage(t("Push bildirimleri bu cihazda etkin.", "Push notifications are enabled on this device."));
    },
    onError: (error) =>
      setMessage(
        getServiceErrorMessage(
          error,
          t("Bildirimler şu anda etkinleştirilemedi. Lütfen yeniden dene.", "Notifications could not be enabled right now. Please try again."),
        ),
      ),
  });
  const disable = useMutation({
    mutationFn: async () => {
      const registration = await navigator.serviceWorker.getRegistration("/notification-worker.js");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setEnabled(false);
      setMessage(t("Push bildirimleri bu cihazda kapatıldı.", "Push notifications were disabled on this device."));
    },
    onError: (error) =>
      setMessage(
        getServiceErrorMessage(
          error,
          t("Bildirimler şu anda kapatılamadı. Lütfen yeniden dene.", "Notifications could not be disabled right now. Please try again."),
        ),
      ),
  });

  if (!supported) return <p className="muted">{t("Bu tarayıcı Web Push bildirimlerini desteklemiyor.", "This browser does not support Web Push notifications.")}</p>;
  return (
    <div className="push-notification-control">
      <div><strong>{t("Cihaz bildirimleri", "Device notifications")}</strong><span>{enabled ? t("Bu tarayıcı push bildirimlerini alabilir.", "This browser can receive push notifications.") : t("Gerçek zamanlı bildirim almak için bu cihazı etkinleştir.", "Enable this device to receive real-time notifications.")}</span></div>
      <button className="secondary-action" disabled={enable.isPending || disable.isPending || publicKey.isLoading} onClick={() => enabled ? disable.mutate() : enable.mutate()} type="button">
        {enabled ? <BellOff size={17} /> : <Bell size={17} />} {enabled ? t("Bu cihazda kapat", "Disable on this device") : t("Bu cihazda etkinleştir", "Enable on this device")}
      </button>
      {publicKey.error && !message ? (
        <ServiceFeedback
          compact
          error={publicKey.error}
          fallback={t("Bildirim servisine şu anda ulaşılamıyor. Lütfen daha sonra yeniden dene.", "The notification service is currently unavailable. Please try again later.")}
        />
      ) : message ? (
        <ServiceFeedback
          compact
          message={message}
          tone={enable.isError || disable.isError ? "error" : "success"}
        />
      ) : null}
    </div>
  );
}
