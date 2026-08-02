import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { RichText } from "../components/RichText";
import { getUserSession, listMyNotifications, markMyNotificationRead } from "../lib/api";

export function NotificationsPage() {
  const [tab, setTab] = useState<"all" | "waiting">("all");
  const user = getUserSession();
  const client = useQueryClient();
  const notifications = useQuery({ queryKey: ["my-notifications", user?.id], queryFn: listMyNotifications, enabled: Boolean(user) });
  const read = useMutation({
    mutationFn: markMyNotificationRead,
    onSuccess: () => void client.invalidateQueries({ queryKey: ["my-notifications", user?.id] }),
  });

  if (!user) return <section className="page empty-state"><Bell size={42}/><h1>Bildirimler</h1><p>Bildirimlerini görmek için giriş yap.</p><Link className="primary-action" to="/account">Giriş yap</Link></section>;
  const waitingTypes = new Set(["event_invite", "place_invite", "follow_request", "participation_request", "membership_request"]);
  const visible = notifications.data?.filter((item) => tab === "all" || waitingTypes.has(item.type)) ?? [];
  return <section className="page">
    <div className="section-header"><div><p className="eyebrow">Hesabın</p><h1>Bildirimler</h1><p className="lead">{notifications.data?.filter((item) => !item.readAt).length ?? 0} okunmamış bildirimin var.</p></div></div>
    <div className="feed-tabs" role="tablist" aria-label="Bildirim türü"><button className={tab === "all" ? "active" : ""} onClick={() => setTab("all")} role="tab" aria-selected={tab === "all"}>Tümü</button><button className={tab === "waiting" ? "active" : ""} onClick={() => setTab("waiting")} role="tab" aria-selected={tab === "waiting"}>Onay bekleyenler</button></div>
    <div className="admin-list">
      {visible.map((item) => <article className={`admin-list-row${item.readAt ? "" : " is-unread"}`} key={item.id}>
        <div><strong>{item.title}</strong><span><RichText text={item.body}/></span><small>{item.createdAt ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt)) : ""}</small></div>
        {!item.readAt ? <button className="secondary-action" onClick={() => read.mutate(item.id)}><Check size={16}/> Okundu</button> : null}
      </article>)}
      {!notifications.isLoading && !visible.length ? <div className="empty-state"><Bell size={36}/><h2>{tab === "waiting" ? "Onay bekleyen bildirim yok" : "Henüz bildirim yok"}</h2></div> : null}
    </div>
  </section>;
}
