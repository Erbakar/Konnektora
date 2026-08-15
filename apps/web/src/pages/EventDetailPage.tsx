import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  Bell,
  CalendarDays,
  CreditCard,
  ExternalLink,
  Flag,
  MapPin,
  MoreVertical,
  Share2,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { type CSSProperties, type FormEvent, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { RichText } from "../components/RichText";
import { ContentComments } from "../components/ContentComments";
import { ContentMediaGallery } from "../components/ContentMediaGallery";
import { EventCard } from "../components/EventCard";
import { NotificationDialog, ShareDialog } from "../components/ContentDialogs";
import {
  confirmEventPayment,
  archiveMyEvent,
  createBlock,
  createContentReport,
  createEventPayment,
  getContentNotification,
  getEvent,
  getInteractionStats,
  getUserSession,
  listEventTicketTypes,
  listEventParticipants,
  listEventRelatedUsers,
  listFollowing,
  listEvents,
  listReportRules,
  purchaseEventTickets,
  requestEventAttendance,
  resolveMediaUrl,
  setContentNotification,
} from "../lib/api";

export function EventDetailPage() {
  const { slug = "" } = useParams();
  const user = getUserSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [recommendationsExpanded, setRecommendationsExpanded] = useState(false);
  const [ticketPickerOpen, setTicketPickerOpen] = useState(false);
  const [ticketQuantities, setTicketQuantities] = useState<
    Record<string, number>
  >({});
  const { data: event, isLoading } = useQuery({
    queryKey: ["event", slug],
    queryFn: () => getEvent(slug),
    enabled: Boolean(slug),
  });
  const canManage = Boolean(event && user && (event.createdById === user.id || event.viewerParticipation?.status === "accepted" && ["organizer", "manager"].includes(event.viewerParticipation.role) || ["admin", "super_admin", "curator"].includes(user.role)));
  const { data: reportRules = [] } = useQuery({
    queryKey: ["report-rules", "event"],
    queryFn: () => listReportRules("event"),
    enabled: Boolean(user),
  });
  const ticketTypesQuery = useQuery({
    queryKey: ["event-ticket-types", event?.id],
    queryFn: () => listEventTicketTypes(event!.id),
    enabled: Boolean(event),
  });
  const participantsQuery = useQuery({
    queryKey: ["event-participants-preview", event?.id],
    queryFn: () => listEventParticipants(event!.id, "user"),
    enabled: canManage,
    retry: false,
  });
  const relatedUsersQuery = useQuery({ queryKey: ["event", event?.id, "related-users"], queryFn: () => listEventRelatedUsers(event!.id), enabled: Boolean(event) });
  const followingQuery = useQuery({ queryKey: ["following", user?.id], queryFn: listFollowing, enabled: Boolean(user) });
  const recommendationsQuery = useQuery({ queryKey: ["event-recommendations", event?.id], queryFn: () => listEvents(new URLSearchParams({ pageSize: "20" })), enabled: Boolean(event) });
  const statsQuery = useQuery({
    queryKey: ["interaction-stats", "event", event?.id],
    queryFn: () => getInteractionStats("event", event!.id),
    enabled: canManage,
  });
  const notificationQuery = useQuery({
    queryKey: ["content-notification", "event", event?.id],
    queryFn: () => getContentNotification("event", event!.id),
    enabled: Boolean(user && event),
  });
  const notificationMutation = useMutation({
    mutationFn: () =>
      setContentNotification(
        "event",
        event!.id,
        !notificationQuery.data?.enabled,
      ),
    onSuccess: (result) => {
      queryClient.setQueryData(
        ["content-notification", "event", event?.id],
        result,
      );
      setNotificationOpen(false);
    },
  });
  const ticketPurchase = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      purchaseEventTickets(id, quantity),
    onSuccess: () => {
      setTicketPickerOpen(false);
      void ticketTypesQuery.refetch();
      window.alert(
        "Bilet satın alındı. Biletlerim sayfasından görüntüleyebilirsin.",
      );
    },
  });
  const attendMutation = useMutation({
    mutationFn: requestEventAttendance,
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["interaction-stats", "event", event?.id],
      }),
  });
  const paymentMutation = useMutation({
    mutationFn: async () => {
      const intent = await createEventPayment(event!.id, crypto.randomUUID());
      return confirmEventPayment(
        intent.id,
        `pm_sandbox_${crypto.randomUUID()}`,
      );
    },
  });
  const reportMutation = useMutation({
    mutationFn: createContentReport,
  });
  const blockMutation = useMutation({
    mutationFn: () => createBlock("event", event!.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["blocks"] });
      navigate("/events");
    },
  });
  const archiveMutation = useMutation({ mutationFn: () => archiveMyEvent(event!.id), onSuccess: () => navigate("/events") });

  if (isLoading) {
    return <section className="page">Etkinlik yükleniyor...</section>;
  }

  if (!event) {
    return <section className="page">Etkinlik bulunamadı.</section>;
  }
  const eventTagIds = new Set(event.tags.map((tag) => tag.id));
  const recommendedEvents = (recommendationsQuery.data?.items ?? []).filter((item) => item.id !== event.id).map((item) => ({ item, score: item.tags.filter((tag) => eventTagIds.has(tag.id)).length * 5 + Number(item.organizerName === event.organizerName) * 3 + Number(Boolean(item.city && item.city === event.city)) * 2 + Math.min(item.attendeeCount ?? 0, 100) / 100 })).sort((a, b) => b.score - a.score).map(({ item }) => item).slice(0, recommendationsExpanded ? 5 : 2);

  return (
    <article className="page detail-page">
      {event.coverImageUrl ? (
        <div className="detail-media">
          <img alt="" src={event.coverImageUrl} />
        </div>
      ) : null}
      <ContentMediaGallery targetId={event.id} targetType="event" />
      <p className="eyebrow">
        {event.format} · {event.visibility.replace("_", " ")}
      </p>
      <h1>{event.title}</h1>
      <div className="detail-meta">
        <span>
          <CalendarDays size={16} />
          {new Intl.DateTimeFormat("tr-TR", {
            dateStyle: "full",
            timeStyle: "short",
          }).format(new Date(event.startsAt))}
        </span>
        <span>
          <MapPin size={16} />
          {event.format === "online" ? "Online" : event.place ? <Link to={`/places/${event.place.slug}`}>{event.place.name} · {[event.place.address, event.place.city, event.place.country].filter(Boolean).join(", ")}</Link> : [event.locationName, event.locationAddress, event.city, event.country].filter(Boolean).join(", ") || "Konum belirtilmedi"}
        </span>
        <span>
          <ShieldCheck size={16} />
          {event.createdById ? <Link to={`/users/id/${event.createdById}`}>{event.organizerName || "Konnektora topluluğu"}</Link> : event.organizerName || "Konnektora topluluğu"}
        </span>
      </div>
      <Link className="detail-more-link" to={`/events/${event.slug}#more-info`}>More about the event and place</Link>
      <div className="tag-row">
        {event.tags.map((tag) => (
          <span key={tag.id}>{tag.name}</span>
        ))}
      </div>
      <div className="detail-actions event-primary-actions">
        {user && !canManage ? (
          <button
            className="primary-action"
            disabled={attendMutation.isPending}
            onClick={() => attendMutation.mutate(event.id)}
            type="button"
          >
            <Users size={18} />
            {attendMutation.isSuccess
              ? event.visibility === "approval_required"
                ? "Onay bekliyor"
                : "Katılımın onaylandı"
              : attendMutation.isPending
                ? "Gönderiliyor"
                : event.visibility === "invite_only"
                  ? "Daveti kabul et"
                  : event.visibility === "approval_required"
                    ? "Katılım isteği gönder"
                    : "Katıl"}
          </button>
        ) : !user ? (
          <Link className="primary-action" to="/login">
            <Users size={18} />
            Katılmak için giriş yap
          </Link>
        ) : null}
        {canManage ? <Link className="secondary-action" to={`/events/${event.slug}/invites`}><UserPlus size={18}/>Davet et</Link> : <a className="secondary-action" href={`mailto:?subject=${encodeURIComponent(event.title)}&body=${encodeURIComponent(`${event.title}\n\n${window.location.href}`)}`}><UserPlus size={18}/>Davet et</a>}
        <button className="secondary-action" onClick={() => setShareOpen(true)}><Share2 size={18}/>Paylaş</button>
        <details className="detail-action-menu">
          <summary aria-label="Etkinlik işlemleri"><MoreVertical size={20}/></summary>
          <div>
            {user ? <button aria-pressed={notificationQuery.data?.enabled} disabled={notificationMutation.isPending} onClick={() => setNotificationOpen(true)}><Bell size={18}/>{notificationQuery.data?.enabled ? "Bildirimleri kapat" : "Bildirimleri aç"}</button> : null}
            {ticketTypesQuery.data?.length ? <button onClick={() => setTicketPickerOpen(true)}><CreditCard size={18}/>Biletleri gör</button> : null}
            {user && event.price > 0 ? <button disabled={paymentMutation.isPending || paymentMutation.isSuccess} onClick={() => paymentMutation.mutate()}><CreditCard size={18}/>{paymentMutation.isSuccess ? "Ödeme tamamlandı" : paymentMutation.isPending ? "Ödeniyor…" : "Bilet al"}</button> : null}
            {canManage ? <Link to={`/events/${event.slug}/invites`}><ShieldCheck size={18}/>Check-in control</Link> : null}
            {event.createdById === user?.id ? <Link to="/events/create"><ExternalLink size={18}/>Etkinliği düzenle</Link> : null}
            {event.createdById === user?.id ? <button disabled={archiveMutation.isPending} onClick={() => window.confirm("Etkinlik silinsin mi? Satılmış tüm biletler otomatik olarak iade edilecek ve bu işlem geri alınamayacaktır.") && archiveMutation.mutate()}><Flag size={18}/>Etkinliği sil</button> : null}
            {statsQuery.data ? <a href="#interaction-stats"><ShieldCheck size={18}/>Etkileşim istatistikleri</a> : null}
            {user && !canManage ? <button onClick={() => setReportOpen((current) => !current)}><Flag size={18}/>Etkinliği rapor et</button> : null}
            {user && !canManage ? <button disabled={blockMutation.isPending} onClick={() => blockMutation.mutate()}><Ban size={18}/>Etkinliği engelle</button> : null}
          </div>
        </details>
      </div>
      {attendMutation.isError ? (
        <p className="form-error">
          {event.visibility === "invite_only"
            ? "Bu etkinliğe katılmak için organizatör daveti gerekiyor."
            : "Katılım işlemi tamamlanamadı. Kapasite dolmuş olabilir."}
        </p>
      ) : null}
      {ticketPickerOpen ? (
        <div
          className="emotion-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Biletler"
        >
          <div>
            <button
              aria-label="Kapat"
              onClick={() => setTicketPickerOpen(false)}
            >
              ×
            </button>
            <h2>Biletler</h2>
            <p>Satın aldığın biletlere Biletlerim sayfasından erişebilirsin.</p>
            <div className="admin-list">
              {ticketTypesQuery.data?.map((type) => {
                const quantity = ticketQuantities[type.id] ?? 0;
                const unavailable =
                  type.remaining <= 0 || type.status !== "active";
                return (
                  <article className="admin-list-row" key={type.id}>
                    <div>
                      <strong>{type.name}</strong>
                      <span>{type.description}</span>
                      <span>
                        {type.price
                          ? new Intl.NumberFormat("tr-TR", {
                              style: "currency",
                              currency: type.currency,
                            }).format(type.price)
                          : "Ücretsiz"}{" "}
                        · {type.remaining} kaldı
                      </span>
                      {type.saleStartsAt || type.saleEndsAt ? (
                        <small>
                          {type.saleStartsAt
                            ? `${new Date(type.saleStartsAt).toLocaleString("tr-TR")} itibariyle`
                            : ""}
                          {type.saleEndsAt
                            ? ` ${new Date(type.saleEndsAt).toLocaleString("tr-TR")} tarihine kadar`
                            : ""}
                        </small>
                      ) : null}
                    </div>
                    <div className="row-actions">
                      <button
                        disabled={quantity <= 0}
                        onClick={() =>
                          setTicketQuantities((values) => ({
                            ...values,
                            [type.id]: Math.max(0, quantity - 1),
                          }))
                        }
                      >
                        −
                      </button>
                      <strong>{quantity}</strong>
                      <button
                        disabled={
                          unavailable ||
                          quantity >= Math.min(20, type.remaining)
                        }
                        onClick={() =>
                          setTicketQuantities((values) => ({
                            ...values,
                            [type.id]: quantity + 1,
                          }))
                        }
                      >
                        +
                      </button>
                      <button
                        className="primary-action"
                        disabled={
                          unavailable ||
                          quantity < 1 ||
                          ticketPurchase.isPending
                        }
                        onClick={() =>
                          ticketPurchase.mutate({ id: type.id, quantity })
                        }
                      >
                        {unavailable ? "Tükendi" : "Satın al"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            {ticketPurchase.isError ? (
              <p className="form-error">
                Bilet satın alınamadı. Stok ve satış zamanını kontrol et.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      {paymentMutation.isError ? (
        <p className="form-error">
          Ödeme tamamlanamadı. Lütfen ödeme bilgilerini kontrol edin.
        </p>
      ) : null}
      {reportOpen ? (
        <form
          className="admin-form compact-form"
          onSubmit={(submitEvent: FormEvent<HTMLFormElement>) => {
            submitEvent.preventDefault();
            const form = new FormData(submitEvent.currentTarget);
            const ruleId = String(form.get("ruleId") || "");
            const selectedRule = reportRules.find((rule) => rule.id === ruleId);
            reportMutation.mutate({
              targetType: "event",
              targetId: event.id,
              ruleId: ruleId || undefined,
              reason: selectedRule?.title ?? String(form.get("reason")),
              details: String(form.get("details") || "") || undefined,
            });
            submitEvent.currentTarget.reset();
          }}
        >
          {reportRules.length ? (
            <label>
              Rapor sebebi
              <select name="ruleId" required>
                <option value="">Sebep seç</option>
                {reportRules.map((rule) => (
                  <option key={rule.id} value={rule.id}>
                    {rule.title}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              Rapor sebebi
              <input
                name="reason"
                placeholder="Yanıltıcı bilgi, uygunsuz içerik..."
                required
                minLength={3}
                maxLength={120}
              />
            </label>
          )}
          <label>
            Detay
            <textarea name="details" rows={3} maxLength={1000} />
          </label>
          <button
            className="secondary-action"
            disabled={reportMutation.isPending}
            type="submit"
          >
            <Flag size={18} />
            {reportMutation.isPending ? "Gönderiliyor" : "Rapor gönder"}
          </button>
        </form>
      ) : null}
      {attendMutation.data ? (
        <p className="form-success">
          {attendMutation.data.status === "accepted"
            ? "Katılımın onaylandı."
            : "Katılım talebin organizatöre gönderildi."}
        </p>
      ) : null}
      {attendMutation.isError ? (
        <p className="form-error">
          Katılım talebi gönderilemedi. Lütfen tekrar dene.
        </p>
      ) : null}
      {reportMutation.data ? (
        <p className="form-success">Rapor alındı. Admin panelde incelenecek.</p>
      ) : null}
      {reportMutation.isError ? (
        <p className="form-error">Rapor gönderilemedi. Lütfen tekrar dene.</p>
      ) : null}
      <section className="admin-form event-attendee-preview">
        <h2>Katılımcılar</h2>
        <Link to={`/events/${event.slug}/users`}>
          <span className="attendee-avatar-stack">{(relatedUsersQuery.data ?? []).sort((a, b) => Number((followingQuery.data ?? []).some((item) => item.id === b.id)) - Number((followingQuery.data ?? []).some((item) => item.id === a.id))).slice(0, 8).map((participant) => <span key={participant.id} title={participant.name}>{participant.avatarUrl ? <img alt="" src={resolveMediaUrl(participant.avatarUrl)}/> : participant.name?.[0] ?? "?"}</span>)}</span>
          <strong>{event.attendeeCount ?? relatedUsersQuery.data?.length ?? 0} attendees · {participantsQuery.data?.filter((item) => item.status === "invited").length ?? 0} invited · {(relatedUsersQuery.data ?? []).filter((participant) => (followingQuery.data ?? []).some((item) => item.id === participant.id)).length} following</strong>
        </Link>
      </section>
      <p className="detail-copy" id="more-info">
        <RichText text={event.description} />
      </p>
      {statsQuery.data ? (
        <section className="admin-form" id="interaction-stats">
          <h2>Etkileşim istatistikleri</h2>
          <div className="compact-metrics interaction-chart-grid">
            <article style={{ "--metric-value": statsQuery.data.accepted ?? 0 } as CSSProperties}>
              <strong>{statsQuery.data.accepted ?? 0}</strong>
              <span>Katılımcı</span>
            </article>
            <article style={{ "--metric-value": statsQuery.data.attended ?? 0 } as CSSProperties}>
              <strong>{statsQuery.data.attended ?? 0}</strong>
              <span>Check-in</span>
            </article>
            <article style={{ "--metric-value": statsQuery.data.comments ?? 0 } as CSSProperties}>
              <strong>{statsQuery.data.comments ?? 0}</strong>
              <span>Yorum</span>
            </article>
            <article style={{ "--metric-value": statsQuery.data.views ?? 0 } as CSSProperties}>
              <strong>{statsQuery.data.views ?? 0}</strong>
              <span>Görüntülenme</span>
            </article>
            <article style={{ "--metric-value": statsQuery.data.ticketsSold ?? 0 } as CSSProperties}><strong>{statsQuery.data.ticketsSold ?? 0}</strong><span>Satılan bilet</span></article>
            <article style={{ "--metric-value": statsQuery.data.ticketRevenue ?? 0 } as CSSProperties}><strong>{statsQuery.data.ticketRevenue ?? 0}</strong><span>Bilet geliri</span></article>
            <article style={{ "--metric-value": statsQuery.data.refunds ?? 0 } as CSSProperties}><strong>{statsQuery.data.refunds ?? 0}</strong><span>İade</span></article>
            <article style={{ "--metric-value": statsQuery.data.rsvpRate ?? 0 } as CSSProperties}><strong>%{statsQuery.data.rsvpRate ?? 0}</strong><span>RSVP dönüşümü</span></article>
            <article style={{ "--metric-value": statsQuery.data.attendanceRate ?? 0 } as CSSProperties}><strong>%{statsQuery.data.attendanceRate ?? 0}</strong><span>Katılım oranı</span></article>
            <article style={{ "--metric-value": statsQuery.data.engagementRate ?? 0 } as CSSProperties}><strong>%{statsQuery.data.engagementRate ?? 0}</strong><span>Etkileşim oranı</span></article>
          </div>
        </section>
      ) : null}
      {event.timeline ? (
        <section className="admin-form">
          <h2>Overview</h2>
          <p>
            <RichText text={event.timeline} />
          </p>
          {event.liveUrl ? (
            <a
              className="primary-action"
              href={event.liveUrl}
              rel="noreferrer"
              target="_blank"
            >
              Canlı yayına katıl <ExternalLink size={18} />
            </a>
          ) : null}
        </section>
      ) : null}
      {event.lineup?.length ? (
        <section className="admin-form event-program">
          <h2>Program</h2>
          <div className="admin-list">
            {event.lineup.map((item, index) =>
              item.type === "heading" ? (
                <h3 className="program-heading" key={`${item.title}-${index}`}>
                  {item.title}
                </h3>
              ) : item.type === "subheading" ? (
                <h4
                  className="program-subheading"
                  key={`${item.title}-${index}`}
                >
                  {item.title}
                </h4>
              ) : (
                <article
                  className={`admin-list-row program-${item.type ?? "session"}`}
                  key={`${item.startsAt ?? item.title}-${index}`}
                >
                  <div>
                    <strong>
                      {item.type === "break" ? <>☕ <RichText text={item.title}/></> : <RichText text={item.title}/>}
                      {item.startsAt ? <time>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.startsAt))}</time> : null}
                    </strong>
                    {item.description ? (
                      <span>
                        <RichText text={item.description} />
                      </span>
                    ) : null}
                  </div>
                </article>
              ),
            )}
          </div>
        </section>
      ) : null}
      {ticketTypesQuery.data?.length ? (
        <section className="admin-form">
          <h2>Biletler</h2>
          <p>
            {Math.min(...ticketTypesQuery.data.map((item) => item.price)) ===
            Math.max(...ticketTypesQuery.data.map((item) => item.price))
              ? `Bilet: ${new Intl.NumberFormat("tr-TR", { style: "currency", currency: ticketTypesQuery.data[0]!.currency }).format(ticketTypesQuery.data[0]!.price)}`
              : `Bilet: ${Math.min(...ticketTypesQuery.data.map((item) => item.price))} - ${Math.max(...ticketTypesQuery.data.map((item) => item.price))}`}
          </p>
          <button
            className="primary-action"
            onClick={() => setTicketPickerOpen(true)}
          >
            Biletleri gör
          </button>
        </section>
      ) : null}
      {event.externalRegistrationUrl ? (
        <a
          className="primary-action"
          href={event.externalRegistrationUrl}
          rel="noreferrer"
          target="_blank"
        >
          Kayıt sayfası
          <ExternalLink size={18} />
        </a>
      ) : null}
      <ContentComments
        targetId={event.id}
        targetType="event"
        title="Etkinlik yorumları"
        organizerId={event.createdById}
        canManage={canManage}
      />
      {recommendedEvents.length ? <section className="admin-form event-recommendations"><div className="section-header compact"><div><h2>İlginizi çekebilecek diğer etkinlikler</h2><p>Ortak ilgi alanları, konum, organizatör ve popülerliğe göre seçildi.</p></div>{!recommendationsExpanded && (recommendationsQuery.data?.items.length ?? 0) > 2 ? <button className="secondary-action" onClick={() => setRecommendationsExpanded(true)} type="button">Daha fazla göster</button> : null}</div><div className="event-grid">{recommendedEvents.map((item) => <EventCard event={item} key={item.id}/>)}</div></section> : null}
      <NotificationDialog
        open={notificationOpen}
        onClose={() => setNotificationOpen(false)}
        enabled={Boolean(notificationQuery.data?.enabled)}
        pending={notificationMutation.isPending}
        onConfirm={() => notificationMutation.mutate()}
        title={event.title}
      />
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={event.title}
        url={window.location.href}
      />
    </article>
  );
}
