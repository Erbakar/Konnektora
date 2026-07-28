import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell, BellOff } from "lucide-react";
import { useState } from "react";
import { getPushPublicKey, registerPushSubscription, removePushSubscription } from "../lib/api";

function decodeKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const raw = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export function PushNotificationControl() {
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  const [enabled, setEnabled] = useState(Notification.permission === "granted");
  const [message, setMessage] = useState("");
  const publicKey = useQuery({ queryKey: ["push-public-key"], queryFn: getPushPublicKey, enabled: supported });
  const enable = useMutation({
    mutationFn: async () => {
      if (!publicKey.data) throw new Error("Push kanalı henüz yapılandırılmamış.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Bildirim izni verilmedi.");
      const registration = await navigator.serviceWorker.register("/notification-worker.js");
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(publicKey.data) });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error("Push aboneliği oluşturulamadı.");
      await registerPushSubscription({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth });
      setEnabled(true);
      setMessage("Push bildirimleri bu cihazda etkin.");
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Push etkinleştirilemedi.")
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
      setMessage("Push bildirimleri bu cihazda kapatıldı.");
    }
  });

  if (!supported) return <p className="muted">Bu tarayıcı Web Push bildirimlerini desteklemiyor.</p>;
  return (
    <div className="push-notification-control">
      <div><strong>Cihaz bildirimleri</strong><span>{enabled ? "Bu tarayıcı push bildirimlerini alabilir." : "Gerçek zamanlı bildirim almak için bu cihazı etkinleştir."}</span></div>
      <button className="secondary-action" disabled={enable.isPending || disable.isPending || publicKey.isLoading} onClick={() => enabled ? disable.mutate() : enable.mutate()} type="button">
        {enabled ? <BellOff size={17} /> : <Bell size={17} />} {enabled ? "Bu cihazda kapat" : "Bu cihazda etkinleştir"}
      </button>
      {message ? <small role="status">{message}</small> : null}
    </div>
  );
}
