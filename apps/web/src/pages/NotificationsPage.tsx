import { FollowStar } from "../components/MemberSignals";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Mail } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PushNotificationControl } from "../components/PushNotificationControl";
import { RichText } from "../components/RichText";
import { CheckInDecisionDialog } from "../components/CheckInDecisionDialog";
import { resolveMediaUrl, respondToNotification, decideProfileTagSuggestion, getUserSession, listMyNotifications, listProfileTagSuggestions, markMyNotificationRead } from "../lib/api";
import { useLanguage } from "../lib/i18n";
import { formatShortDateTime } from "../lib/formats";

export function NotificationsPage() {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const [tab, setTab] = useState<"all" | "waiting">(() => new URLSearchParams(window.location.search).get("tab") === "waiting" ? "waiting" : "all");
  const [decisionId, setDecisionId] = useState<string | null>(null);
  const user = getUserSession();
  const client = useQueryClient();
  const notifications = useQuery({ queryKey: ["my-notifications", user?.id], queryFn: listMyNotifications, enabled: Boolean(user) });
  const tagSuggestions = useQuery({ queryKey: ["profile-tag-suggestions", user?.id], queryFn: listProfileTagSuggestions, enabled: Boolean(user) });
  const read = useMutation({
    mutationFn: markMyNotificationRead,
    onSuccess: () => void client.invalidateQueries({ queryKey: ["my-notifications", user?.id] }),
  });
  const respond = useMutation({mutationFn:({id,action}:{id:string;action:"accept"|"decline"})=>respondToNotification(id,action),onSuccess:async()=>{await Promise.all([client.invalidateQueries({queryKey:["my-notifications"]}),client.invalidateQueries({queryKey:["event"]}),client.invalidateQueries({queryKey:["place"]})]);}});
  const observedReads = useRef(new Set<string>());
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(entries => { for (const entry of entries) { const id = (entry.target as HTMLElement).dataset.notificationId; if (entry.isIntersecting && id && !observedReads.current.has(id)) { observedReads.current.add(id); void markMyNotificationRead(id).then(() => client.invalidateQueries({ queryKey: ["my-notifications"] })).catch(() => observedReads.current.delete(id)); observer.unobserve(entry.target); } } }, { threshold: 0.6 });
    document.querySelectorAll('[data-notification-id]').forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, [notifications.data, tab, client]);
  const tagDecision = useMutation({ mutationFn: ({ id, action }: { id: string; action: "accept" | "decline" }) => decideProfileTagSuggestion(id, action), onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ["profile-tag-suggestions"] }), client.invalidateQueries({ queryKey: ["public-profile"] })]); } });
  const decisionNotifications = notifications.data?.filter((item) => ["event_check_in_admitted", "event_check_in_declined", "place_check_in_admitted", "place_check_in_declined"].includes(item.type)) ?? [];

  if (!user) return <section className="page empty-state"><Bell size={42}/><h1>{t("Bildirimler", "Notifications")}</h1><p>{t("Bildirimlerini görmek için giriş yap.", "Log in to view your notifications.")}</p><Link className="primary-action" to="/login">{t("Giriş yap", "Log in")}</Link></section>;
  const waitingTypes = new Set(["event_invite", "place_invite", "event_manager", "place_manager", "follow_request", "participation_request", "membership_request"]);
  const visible = [...(notifications.data ?? [])].filter((item) => item.type !== "profile_tag_suggestion").filter((item) => tab === "all" || (waitingTypes.has(item.type) && item.canRespond !== false)).sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
  return <section className="page notifications-page">
    <div className="section-header"><div><p className="eyebrow">{t("Hesabın", "Your account")}</p><h1>{t("Bildirimler", "Notifications")}</h1><p className="lead">{notifications.data?.filter((item) => !item.readAt).length ?? 0} {t("okunmamış bildirimin var.", "unread notifications.")}</p></div><Link className="secondary-action" to="/settings/notifications">{t("Bildirim Ayarları", "Notification settings")}</Link></div>
    <PushNotificationControl/>
    <div className="feed-tabs" role="tablist" aria-label={t("Bildirim türü", "Notification type")}><button className={tab === "all" ? "active" : ""} onClick={() => setTab("all")} role="tab" aria-selected={tab === "all"}>{t("Tümü", "All")}</button><button className={tab === "waiting" ? "active" : ""} onClick={() => setTab("waiting")} role="tab" aria-selected={tab === "waiting"}>{t("Onay bekleyenler", "Awaiting approval")}</button></div>
    {respond.isError?<p className="form-error" role="alert">{respond.error instanceof Error?respond.error.message:t("Davet yanıtlanamadı.","Could not respond to invitation.")}</p>:null}
    <div className="admin-list">
      {(tagSuggestions.data ?? []).filter((item) => item.targetUserId === user.id).map((item) => <article className="admin-list-row is-unread" key={item.id}><div><strong>{t("Profil etiketi onayınızı bekliyor", "A profile tag is awaiting your approval")}</strong><span><Link className="rich-text-link" to={`/users/id/${item.suggestedBy.id}`}>@{item.suggestedBy.username ?? item.suggestedBy.name}</Link>, {language === "tr" ? <>“<Link className="rich-text-link" to={`/tags/${item.tag.slug}`}>{item.tag.name}</Link>” etiketini “{item.sentiment === "like" ? "Beğeniyorum" : item.sentiment === "dislike" ? "Beğenmiyorum" : "Nötr"}” duygusuyla profilinize eklemek istiyor.</> : <>wants to add “<Link className="rich-text-link" to={`/tags/${item.tag.slug}`}>{item.tag.name}</Link>” to your profile with the “{item.sentiment === "like" ? "Like" : item.sentiment === "dislike" ? "Dislike" : "Neutral"}” sentiment.</>}</span></div><div className="row-actions"><button className="primary-action" disabled={tagDecision.isPending} onClick={() => tagDecision.mutate({ id: item.id, action: "accept" })}>{t("Onayla", "Approve")}</button><button className="danger-action" disabled={tagDecision.isPending} onClick={() => tagDecision.mutate({ id: item.id, action: "decline" })}>{t("Reddet", "Decline")}</button></div></article>)}
      {visible.map((item) => <article className={`admin-list-row${item.readAt ? "" : " is-unread"}`} key={item.id} data-notification-id={!item.readAt ? item.id : undefined}>
        <div className="notification-card-content">
          {item.admin ? <img className="notification-admin-mark" src="/brand/konnektora-logo.svg" alt="Konnektora"/> : null}
          {item.actors?.length ? <div className="notification-actors">{item.actors.map(actor=><div className="member-name-line" key={actor.id}><Link to={`/users/id/${actor.id}`}>{actor.avatarUrl?<img className="notification-avatar" src={resolveMediaUrl(actor.avatarUrl)} alt=""/>:<span className="notification-avatar notification-avatar-fallback">{(actor.username??actor.name).slice(0,1).toUpperCase()}</span>}</Link><FollowStar id={actor.id}/><Link to={`/users/id/${actor.id}`}>@{actor.username??actor.name}</Link>{actor.canMessage?<Link aria-label={t("Mesaj gönder","Send message")} to={`/messages?peer=${actor.id}`}><Mail size={17}/></Link>:null}</div>)}</div>:null}
          {item.entity ? <div className="notification-entity">{item.entity.imageUrl?<Link to={item.entity.url}><img src={resolveMediaUrl(item.entity.imageUrl)} alt=""/></Link>:null}<div><Link to={item.entity.url}><strong>{item.entity.title}</strong></Link><span>{item.entity.location}</span>{item.entity.startsAt?<time>{new Intl.DateTimeFormat(language==="tr"?"tr-TR":"en-GB",{dateStyle:"medium",timeStyle:"short"}).format(new Date(item.entity.startsAt))}</time>:null}</div></div>:null}
          {item.mediaUrl?(/\.(mp4|webm)(?:\?|$)/i.test(item.mediaUrl)?<video className="notification-media" controls preload="metadata" src={resolveMediaUrl(item.mediaUrl)}/>:<img className="notification-media" src={resolveMediaUrl(item.mediaUrl)} alt={t("İlgili medya","Related media")}/>):null}
          <strong>{item.targetUrl ? <Link to={item.targetUrl}>{item.title}</Link> : item.title}</strong><span><NotificationBody text={item.body} label={item.targetLabel} url={item.targetUrl}/></span><small>{item.createdAt ? new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt)) : ""}</small></div>
        <div className="row-actions">{item.canRespond?<><button className="primary-action" disabled={respond.isPending} onClick={()=>respond.mutate({id:item.id,action:"accept"})}>{t("Kabul et","Accept")}</button><button className="secondary-action" disabled={respond.isPending} onClick={()=>respond.mutate({id:item.id,action:"decline"})}>{t("Reddet","Decline")}</button></>:null}{decisionNotifications.some((decision) => decision.id === item.id) ? <button className="secondary-action" onClick={() => setDecisionId(item.id)}>{t("Sonucu aç", "Open result")}</button> : null}{!item.readAt ? <button className="secondary-action" onClick={() => read.mutate(item.id)}><Check size={16}/> {t("Okundu", "Mark as read")}</button> : null}</div>
      </article>)}
      {!notifications.isLoading && !visible.length && !(tagSuggestions.data ?? []).some((item) => item.targetUserId === user.id) ? <div className="empty-state"><Bell size={36}/><h2>{tab === "waiting" ? t("Onay bekleyen bildirim yok", "No notifications awaiting approval") : t("Henüz bildirim yok", "No notifications yet")}</h2></div> : null}
    </div>
    {decisionId ? <CheckInDecisionDialog notification={decisionNotifications.find((item) => item.id === decisionId)} onClose={() => { const item = decisionNotifications.find((notification) => notification.id === decisionId); if (item && !item.readAt) read.mutate(item.id); setDecisionId(null); }}/>: null}
  </section>;
}

const isoDateTime = /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})\b/g;

function NotificationBody({ text: raw, label, url }: { text: string; label?: string | null; url?: string | null }) {
  const text = raw.replace(isoDateTime, (value) => formatShortDateTime(value) || value);
  if (!label || !url || !text.includes(label)) return <RichText text={text}/>;
  const parts = text.split(label);
  return <>{parts.map((part, index) => <span key={index}>{index > 0 ? <Link to={url}>{label}</Link> : null}<RichText text={part}/></span>)}</>;
}
