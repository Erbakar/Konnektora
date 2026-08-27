import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { listAdminNotificationDeliveries, retryAdminNotificationDelivery } from "../lib/api";

export function AdminNotificationOperationsPage() {
  const client = useQueryClient();
  const [status, setStatus] = useState("failed");
  const deliveries = useQuery({ queryKey: ["admin-notification-deliveries", status], queryFn: () => listAdminNotificationDeliveries(status) });
  const retry = useMutation({
    mutationFn: retryAdminNotificationDelivery,
    onSuccess: () => void client.invalidateQueries({ queryKey: ["admin-notification-deliveries"] })
  });

  return (
    <main className="page notification-operations-page">
      <Link className="back-link" to="/admin"><ArrowLeft size={16} /> Admin paneline dön</Link>
      <header><div><span className="eyebrow">Operasyon</span><h1>Bildirim teslimatları</h1><p>E-posta ve push kanallarının son 200 teslimatını izle ve başarısız kayıtları yeniden dene.</p></div><select aria-label="Bildirim teslimat durumu" onChange={(event) => setStatus(event.target.value)} value={status}><option value="failed">Başarısız</option><option value="pending">Bekliyor</option><option value="sent">Gönderildi</option><option value="skipped">Atlandı</option><option value="">Tümü</option></select></header>
      <section className="notification-delivery-list">
        {deliveries.isError ? <div className="help-empty"><strong>Teslimatlar yüklenemedi.</strong><span>Admin oturumunu ve messages.manage yetkisini kontrol edin.</span></div> : null}
        {deliveries.data?.map((delivery) => <article key={delivery.id}><div><strong>{delivery.notification.title}</strong><span>{delivery.user.name} · {delivery.user.email}</span><small>{delivery.channel} · {delivery.provider ?? "sağlayıcı yok"} · {new Date(delivery.createdAt).toLocaleString("tr-TR")}</small>{delivery.lastError ? <code>{delivery.lastError}</code> : null}</div><b className={`status-${delivery.status}`}>{delivery.status}</b>{delivery.status === "failed" ? <button className="secondary-action" disabled={retry.isPending} onClick={() => retry.mutate(delivery.id)} type="button"><RefreshCw size={16} /> Yeniden dene</button> : null}</article>)}
        {!deliveries.isError && !deliveries.data?.length ? <div className="help-empty">Bu durumda teslimat bulunmuyor.</div> : null}
      </section>
    </main>
  );
}
