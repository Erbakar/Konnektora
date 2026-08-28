import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { RichText } from "../components/RichText";
import { CheckInDecisionDialog } from "../components/CheckInDecisionDialog";
import { decideProfileTagSuggestion, getUserSession, listMyNotifications, listProfileTagSuggestions, markMyNotificationRead } from "../lib/api";
import { useLanguage } from "../lib/i18n";

export function NotificationsPage() {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const [tab, setTab] = useState<"all" | "waiting">("all");
  const [decisionId, setDecisionId] = useState<string | null>(null);
  const user = getUserSession();
  const client = useQueryClient();
  const notifications = useQuery({ queryKey: ["my-notifications", user?.id], queryFn: listMyNotifications, enabled: Boolean(user) });
  const tagSuggestions = useQuery({ queryKey: ["profile-tag-suggestions", user?.id], queryFn: listProfileTagSuggestions, enabled: Boolean(user) });
  const read = useMutation({
    mutationFn: markMyNotificationRead,
    onSuccess: () => void client.invalidateQueries({ queryKey: ["my-notifications", user?.id] }),
  });
  const tagDecision = useMutation({ mutationFn: ({ id, action }: { id: string; action: "accept" | "decline" }) => decideProfileTagSuggestion(id, action), onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ["profile-tag-suggestions"] }), client.invalidateQueries({ queryKey: ["public-profile"] })]); } });
  const decisionNotifications = notifications.data?.filter((item) => ["event_check_in_admitted", "event_check_in_declined", "place_check_in_admitted", "place_check_in_declined"].includes(item.type)) ?? [];

  if (!user) return <section className="page empty-state"><Bell size={42}/><h1>{t("Bildirimler", "Notifications")}</h1><p>{t("Bildirimlerini görmek için giriş yap.", "Log in to view your notifications.")}</p><Link className="primary-action" to="/login">{t("Giriş yap", "Log in")}</Link></section>;
  const waitingTypes = new Set(["event_invite", "place_invite", "follow_request", "participation_request", "membership_request"]);
  const visible = notifications.data?.filter((item) => tab === "all" || waitingTypes.has(item.type)) ?? [];
  return <section className="page">
    <div className="section-header"><div><p className="eyebrow">{t("Hesabın", "Your account")}</p><h1>{t("Bildirimler", "Notifications")}</h1><p className="lead">{notifications.data?.filter((item) => !item.readAt).length ?? 0} {t("okunmamış bildirimin var.", "unread notifications.")}</p></div><Link className="secondary-action" to="/settings/notifications">{t("Bildirim Ayarları", "Notification settings")}</Link></div>
    <div className="feed-tabs" role="tablist" aria-label={t("Bildirim türü", "Notification type")}><button className={tab === "all" ? "active" : ""} onClick={() => setTab("all")} role="tab" aria-selected={tab === "all"}>{t("Tümü", "All")}</button><button className={tab === "waiting" ? "active" : ""} onClick={() => setTab("waiting")} role="tab" aria-selected={tab === "waiting"}>{t("Onay bekleyenler", "Awaiting approval")}</button></div>
    <div className="admin-list">
      {(tagSuggestions.data ?? []).filter((item) => item.targetUserId === user.id).map((item) => <article className="admin-list-row is-unread" key={item.id}><div><strong>{t("Profil etiketi onayınızı bekliyor", "A profile tag is awaiting your approval")}</strong><span><Link to={`/users/id/${item.suggestedBy.id}`}>@{item.suggestedBy.username ?? item.suggestedBy.name}</Link>, {language === "tr" ? <><Link to={`/tags/${item.tag.slug}`}>{item.tag.name}</Link> etiketini “{item.sentiment === "like" ? "Beğeniyorum" : item.sentiment === "dislike" ? "Beğenmiyorum" : "Nötr"}” duygusuyla profilinize eklemek istiyor.</> : <>wants to add <Link to={`/tags/${item.tag.slug}`}>{item.tag.name}</Link> to your profile with the “{item.sentiment === "like" ? "Like" : item.sentiment === "dislike" ? "Dislike" : "Neutral"}” sentiment.</>}</span></div><div className="row-actions"><button className="primary-action" disabled={tagDecision.isPending} onClick={() => tagDecision.mutate({ id: item.id, action: "accept" })}>{t("Onayla", "Approve")}</button><button className="danger-action" disabled={tagDecision.isPending} onClick={() => tagDecision.mutate({ id: item.id, action: "decline" })}>{t("Reddet", "Decline")}</button></div></article>)}
      {visible.map((item) => <article className={`admin-list-row${item.readAt ? "" : " is-unread"}`} key={item.id}>
        <div><strong>{item.title}</strong><span><RichText text={item.body}/></span><small>{item.createdAt ? new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt)) : ""}</small></div>
        <div className="row-actions">{decisionNotifications.some((decision) => decision.id === item.id) ? <button className="secondary-action" onClick={() => setDecisionId(item.id)}>{t("Sonucu aç", "Open result")}</button> : null}{!item.readAt ? <button className="secondary-action" onClick={() => read.mutate(item.id)}><Check size={16}/> {t("Okundu", "Mark as read")}</button> : null}</div>
      </article>)}
      {!notifications.isLoading && !visible.length && !(tagSuggestions.data ?? []).some((item) => item.targetUserId === user.id) ? <div className="empty-state"><Bell size={36}/><h2>{tab === "waiting" ? t("Onay bekleyen bildirim yok", "No notifications awaiting approval") : t("Henüz bildirim yok", "No notifications yet")}</h2></div> : null}
    </div>
    {decisionId ? <CheckInDecisionDialog notification={decisionNotifications.find((item) => item.id === decisionId)} onClose={() => { const item = decisionNotifications.find((notification) => notification.id === decisionId); if (item && !item.readAt) read.mutate(item.id); setDecisionId(null); }}/>: null}
  </section>;
}
