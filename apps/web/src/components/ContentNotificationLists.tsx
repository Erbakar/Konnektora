import { BellOff } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listContentNotifications, setContentNotification, type ContentNotificationList } from "../lib/api";
import { formatShortDateTime, placeLocationLabel } from "../lib/formats";
import { useLanguage } from "../lib/i18n";
import { userProfilePath } from "./UserIdentityLink";

type NotificationEvent = ContentNotificationList["events"][number];

/** 26/11 #113: Güncel (bitmemiş) etkinlikler en yakın başlangıçtan, geçmiş etkinlikler en yeniden eskiye sıralanır. */
export function splitNotificationEvents(events: NotificationEvent[], now = Date.now()) {
  const ended = (event: NotificationEvent) => new Date(event.endsAt ?? event.startsAt).getTime() < now;
  const time = (event: NotificationEvent) => new Date(event.startsAt).getTime();
  return {
    current: events.filter((event) => !ended(event)).sort((a, b) => time(a) - time(b)),
    past: events.filter(ended).sort((a, b) => time(b) - time(a)),
  };
}

type Row = { key: string; targetType: "tag" | "place" | "user" | "event"; targetId: string; label: string; href: string; prefix?: string; subtitle?: string };

/** 26/11 #113: Bildirim ayarları sayfasının altındaki bildirimleri açık içerik listeleri. */
export function ContentNotificationLists() {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const client = useQueryClient();
  const [eventTab, setEventTab] = useState<"current" | "past">("current");
  const list = useQuery({ queryKey: ["content-notifications"], queryFn: listContentNotifications });
  const disable = useMutation({
    mutationFn: (row: Row) => setContentNotification(row.targetType, row.targetId, false),
    onSuccess: (_result, row) => {
      void client.invalidateQueries({ queryKey: ["content-notifications"] });
      void client.invalidateQueries({ queryKey: ["content-notification", row.targetType, row.targetId] });
    },
  });
  if (list.isLoading) return <p className="form-help">{t("Bildirim listeleri yükleniyor…", "Loading notification lists…")}</p>;
  if (list.isError || !list.data) return <p className="form-error">{t("Bildirim listeleri yüklenemedi.", "Notification lists could not be loaded.")}</p>;
  const data = list.data;
  const events = splitNotificationEvents(data.events);
  const groups: Array<{ id: string; title: string; empty: string; rows: Row[]; tabs?: boolean }> = [
    { id: "tags", title: t("Bildirimleri açık etiketler", "Tags with notifications on"), empty: t("Bildirimlerini açtığın etiket yok.", "You have not turned on notifications for any tag."), rows: data.tags.map((tag) => ({ key: tag.id, targetType: "tag", targetId: tag.id, label: tag.name, href: `/tags/${tag.slug}` })) },
    { id: "places", title: t("Bildirimleri açık mekânlar", "Places with notifications on"), empty: t("Bildirimlerini açtığın mekân yok.", "You have not turned on notifications for any place."), rows: data.places.map((place) => ({ key: place.id, targetType: "place", targetId: place.id, label: place.name, href: `/places/${place.slug}`, subtitle: placeLocationLabel(place, language) || undefined })) },
    { id: "users", title: t("Bildirimleri açık hesaplar", "Accounts with notifications on"), empty: t("Bildirimlerini açtığın hesap yok.", "You have not turned on notifications for any account."), rows: data.users.map((user) => ({ key: user.id, targetType: "user", targetId: user.id, label: user.username ? `@${user.username}` : user.name, href: userProfilePath(user) })) },
    { id: "events", tabs: true, title: t("Bildirimleri açık etkinlikler", "Events with notifications on"), empty: eventTab === "current" ? t("Bildirimlerini açtığın güncel etkinlik yok.", "No current events with notifications on.") : t("Bildirimlerini açtığın geçmiş etkinlik yok.", "No past events with notifications on."), rows: events[eventTab].map((event) => ({ key: event.id, targetType: "event", targetId: event.id, label: event.title, href: `/events/${event.slug}`, prefix: formatShortDateTime(event.startsAt) })) },
  ];
  return (
    <section className="identity-panel settings-form content-notification-lists" aria-label={t("Bildirimleri açık içerikler", "Content with notifications on")}>
      {groups.map((group) => (
        <div className="admin-form" key={group.id}>
          <h2>{group.title}</h2>
          {group.tabs ? (
            <div className="feed-tabs" role="tablist">
              <button aria-selected={eventTab === "current"} className={eventTab === "current" ? "active" : ""} onClick={() => setEventTab("current")} role="tab" type="button">{t("Güncel", "Current")}</button>
              <button aria-selected={eventTab === "past"} className={eventTab === "past" ? "active" : ""} onClick={() => setEventTab("past")} role="tab" type="button">{t("Geçmiş", "Past")}</button>
            </div>
          ) : null}
          {group.rows.length ? (
            <div className="admin-list">
              {group.rows.map((row) => (
                <article className="admin-list-row" key={row.key}>
                  <div>
                    <strong>{row.prefix ? <>{row.prefix} · </> : null}<Link to={row.href}>{row.label}</Link></strong>
                    {row.subtitle ? <span>{row.subtitle}</span> : null}
                  </div>
                  <button aria-label={t(`${row.label} için bildirimleri kapat`, `Turn off notifications for ${row.label}`)} className="secondary-action" disabled={disable.isPending} onClick={() => disable.mutate(row)} title={t("Kaldır / Bildirimleri kapat", "Remove / Turn off notifications")} type="button">
                    <BellOff size={18} />
                  </button>
                </article>
              ))}
            </div>
          ) : <p className="form-help">{group.empty}</p>}
        </div>
      ))}
      {disable.isError ? <p className="form-error" role="alert">{t("Bildirim kapatılamadı.", "Notifications could not be turned off.")}</p> : null}
    </section>
  );
}
