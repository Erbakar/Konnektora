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
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { RichText } from "../components/RichText";
import { ContentComments } from "../components/ContentComments";
import { ContentMediaGallery } from "../components/ContentMediaGallery";
import { EventCard } from "../components/EventCard";
import { LocationMap } from "../components/LocationMap";
import { NotificationDialog, ShareDialog } from "../components/ContentDialogs";
import { ReportDialog } from "../components/ReportDialog";
import { formatEventDateRange, localizeCityName, localizeCountryName } from "../lib/formats";
import { getServiceErrorMessage, getServiceErrorPresentation } from "../lib/serviceErrors";
import { NotFoundPage } from "./NotFoundPage";
import {
  confirmEventPayment,
  archiveMyEvent,
  createBlock,
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
  purchaseEventTickets,
  requestEventAttendance,
  recordContentView,
  resolveMediaUrl,
  setContentNotification,
} from "../lib/api";
import { useLanguage } from "../lib/i18n";

export function EventDetailPage() {
  const { language } = useLanguage();
  const locale = language === "tr" ? "tr-TR" : "en-GB";
  const { slug = "" } = useParams();
  const user = getUserSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [moreInfoOpen, setMoreInfoOpen] = useState(false);
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [ticketPickerOpen, setTicketPickerOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [ticketQuantities, setTicketQuantities] = useState<
    Record<string, number>
  >({});
  const { data: event, error: eventError, isError: eventIsError, isLoading, refetch: refetchEvent } = useQuery({
    queryKey: ["event", slug],
    queryFn: () => getEvent(slug),
    enabled: Boolean(slug),
    retry: false,
  });
  const canManage = Boolean(event && user && (event.createdById === user.id || event.viewerParticipation?.status === "accepted" && ["organizer", "manager"].includes(event.viewerParticipation.role) || ["admin", "super_admin", "curator"].includes(user.role)));
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
    onSuccess: (_result, variables) => {
      setTicketPickerOpen(false);
      void ticketTypesQuery.refetch();
      const ticket = ticketTypesQuery.data?.find((item) => item.id === variables.id);
      setActionNotice({
        kind: "success",
        message:
          ticket?.salesPlatform === "door"
            ? language === "tr"
              ? "Bilet ayrıldı. Ödemeyi kapıda yapabilirsin."
              : "Your ticket is reserved. You can pay at the door."
            : language === "tr"
              ? "Bilet satın alındı. Biletlerim sayfasından görüntüleyebilirsin."
              : "Your ticket was purchased. You can view it under My tickets.",
      });
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
  const blockMutation = useMutation({
    mutationFn: () => createBlock("event", event!.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["blocks"] });
      navigate("/events");
    },
  });
  const archiveMutation = useMutation({ mutationFn: () => archiveMyEvent(event!.id), onSuccess: () => navigate("/events") });

  useEffect(() => {
    if (event?.id) void recordContentView("event", event.id);
  }, [event?.id]);

  if (isLoading) {
    return <section className="page">{language === "tr" ? "Etkinlik yükleniyor..." : "Loading event..."}</section>;
  }

  if (eventIsError) {
    const presentation = getServiceErrorPresentation(
      eventError,
      language === "tr" ? "Etkinlik bilgileri şu anda yüklenemedi. Lütfen tekrar dene." : "The event could not be loaded. Please try again.",
    );
    if (presentation.kind === "not-found") {
      return <NotFoundPage kind="event" />;
    }
    return (
      <section className="page not-found-page" role="alert">
        <p className="eyebrow">{language === "tr" ? "Etkinlik yüklenemedi" : "Event unavailable"}</p>
        <h1>{presentation.title}</h1>
        <p>{presentation.message}</p>
        <button className="primary-action" onClick={() => void refetchEvent()} type="button">
          {language === "tr" ? "Tekrar dene" : "Try again"}
        </button>
      </section>
    );
  }

  if (!event) {
    return <NotFoundPage kind="event" />;
  }
  const eventTagIds = new Set(event.tags.map((tag) => tag.id));
  const eventCutoff = event.endsAt
    ? new Date(event.endsAt).getTime() + 12 * 60 * 60 * 1000
    : new Date(event.startsAt).getTime() + 24 * 60 * 60 * 1000;
  const inviteAllowed = canManage || event.viewerParticipation?.status === "accepted" || event.viewerParticipation?.status === "attended" || event.viewerParticipation?.status === "invited";
  const invitedPreviewCount = canManage
    ? participantsQuery.data?.filter((item) => item.status === "invited").length ?? 0
    : event.invitedCount ?? 0;
  const recommendedEvents = (recommendationsQuery.data?.items ?? []).filter((item) => item.id !== event.id).map((item) => ({ item, score: item.tags.filter((tag) => eventTagIds.has(tag.id)).length * 5 + Number(item.organizerName === event.organizerName) * 3 + Number(Boolean(item.city && item.city === event.city)) * 2 + Math.min(item.attendeeCount ?? 0, 100) / 100 })).sort((a, b) => b.score - a.score).map(({ item }) => item).slice(0, 8);

  return (
    <article className="page detail-page">
      {event.coverImageUrl ? (
        <div className="detail-media">
          <img alt="" src={resolveMediaUrl(event.coverImageUrl)} />
        </div>
      ) : null}
      <ContentMediaGallery canManage={canManage} coverAlt={event.title} coverImageUrl={event.coverImageUrl} targetId={event.id} targetType="event" />
      <p className="eyebrow">
        {event.format === "online" ? language === "tr" ? "ÇEVRİM İÇİ" : "ONLINE" : event.format === "hybrid" ? language === "tr" ? "HİBRİT" : "HYBRID" : language === "tr" ? "YÜZ YÜZE" : "IN PERSON"} {language === "tr" ? "ETKİNLİK" : "EVENT"} – {event.visibility === "open" ? language === "tr" ? "HERKESE AÇIK" : "OPEN TO EVERYONE" : event.visibility === "approval_required" ? language === "tr" ? "ONAY GEREKLİ" : "APPROVAL REQUIRED" : language === "tr" ? "SADECE DAVETLİ" : "INVITE ONLY"}
      </p>
      <h1>{event.title}</h1>
      <div className="detail-meta">
        <span>
          <CalendarDays size={16} />
          {formatEventDateRange(event.startsAt, event.endsAt, { withDuration: true, locale })}
        </span>
        <span>
          <MapPin size={16} />
          {event.format === "online" ? (language === "tr" ? "Çevrim içi" : "Online") : event.place ? <Link to={`/places/${event.place.slug}`}>{event.place.name} · {[event.place.address, localizeCityName(event.place.city, language), localizeCountryName(event.place.country, language)].filter(Boolean).join(", ")}</Link> : [event.locationName, event.locationAddress, localizeCityName(event.city, language), localizeCountryName(event.country, language)].filter(Boolean).join(", ") || (language === "tr" ? "Konum belirtilmedi" : "Location not specified")}
        </span>
        <span>
          <ShieldCheck size={16} />
          {event.createdById ? <Link to={`/users/id/${event.createdById}`}>{event.organizerName || (language === "tr" ? "Konnektora topluluğu" : "Konnektora community")}</Link> : event.organizerName || (language === "tr" ? "Konnektora topluluğu" : "Konnektora community")}
        </span>
      </div>
      <button className="detail-more-link" onClick={() => setMoreInfoOpen(true)} type="button">{language === "tr" ? "Etkinlik ve mekân hakkında daha fazla bilgi" : "More about the event and place"}</button>
      <div className="tag-row">
        {event.tags.map((tag) => (
          <Link key={tag.id} to={`/tags/${tag.slug}`}>#{tag.name}</Link>
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
                ? language === "tr" ? "Onay bekliyor" : "Pending approval"
                : language === "tr" ? "Katılımın onaylandı" : "Attendance confirmed"
              : attendMutation.isPending
                ? language === "tr" ? "Gönderiliyor" : "Sending"
                : event.visibility === "invite_only"
                  ? language === "tr" ? "Daveti kabul et" : "Accept invitation"
                  : event.visibility === "approval_required"
                    ? language === "tr" ? "Katılım isteği gönder" : "Request to join"
                    : language === "tr" ? "Katıl" : "Join"}
          </button>
        ) : !user ? (
          <Link className="primary-action" to="/login">
            <Users size={18} />
            {language === "tr" ? "Katılmak için giriş yap" : "Log in to join"}
          </Link>
        ) : null}
        {user ? <button className="secondary-action" onClick={() => {
          if (Date.now() > eventCutoff) {
            setActionNotice({ kind: "error", message: language === "tr" ? "Bitmiş bir etkinliğe başkasını davet edemezsiniz. Bunda bir sorun olduğunu düşünüyorsanız Etkinlik Düzenle sayfasındaki etkinlik bitiş zamanını güncelleyerek tekrar deneyin." : "You cannot invite someone to an event that has ended. If this is incorrect, update the event end time and try again." });
            return;
          }
          if (!inviteAllowed) {
            setActionNotice({ kind: "error", message: language === "tr" ? "Sadece katılımcılar ve davetliler davet edebilir." : "Only attendees and invited people can send invitations." });
            return;
          }
          navigate(`/events/${event.slug}/invites`);
        }} type="button"><UserPlus size={18}/>{language === "tr" ? "Davet et" : "Invite"}</button> : <Link className="secondary-action" to={`/login?next=${encodeURIComponent(`/events/${event.slug}/invites`)}`}><UserPlus size={18}/>{language === "tr" ? "Davet et" : "Invite"}</Link>}
        <button className="secondary-action" onClick={() => setShareOpen(true)}><Share2 size={18}/>{language === "tr" ? "Paylaş" : "Share"}</button>
        <details className="detail-action-menu">
          <summary aria-label={language === "tr" ? "Etkinlik işlemleri" : "Event actions"}><MoreVertical size={20}/></summary>
          <div>
            {user ? <button aria-pressed={notificationQuery.data?.enabled} disabled={notificationMutation.isPending} onClick={() => setNotificationOpen(true)}><Bell size={18}/>{notificationQuery.data?.enabled ? language === "tr" ? "Bildirimleri kapat" : "Turn off notifications" : language === "tr" ? "Bildirimleri aç" : "Turn on notifications"}</button> : null}
            {ticketTypesQuery.data?.length ? <button onClick={() => setTicketPickerOpen(true)}><CreditCard size={18}/>{language === "tr" ? "Biletleri gör" : "View tickets"}</button> : null}
            {user && event.price > 0 ? <button disabled={paymentMutation.isPending || paymentMutation.isSuccess} onClick={() => paymentMutation.mutate()}><CreditCard size={18}/>{paymentMutation.isSuccess ? language === "tr" ? "Ödeme tamamlandı" : "Payment complete" : paymentMutation.isPending ? language === "tr" ? "Ödeniyor…" : "Processing…" : language === "tr" ? "Bilet al" : "Get ticket"}</button> : null}
            {canManage ? <button onClick={() => {
              if (Date.now() > eventCutoff) {
                setActionNotice({ kind: "error", message: language === "tr" ? "Bitmiş bir etkinlik için check-in kontrolü yapamazsınız. Bunda bir sorun olduğunu düşünüyorsanız Etkinlik Düzenle sayfasındaki etkinlik bitiş zamanını güncelleyerek tekrar deneyin." : "You cannot run check-in for an event that has ended. Update the event end time if this is incorrect." });
                return;
              }
              navigate(`/events/${event.slug}/invites#check-in`);
            }} type="button"><ShieldCheck size={18}/>{language === "tr" ? "Check-in kontrolü" : "Check-in control"}</button> : null}
            {canManage ? <Link to={`/events/create?edit=${event.id}`}><ExternalLink size={18}/>{language === "tr" ? "Etkinliği düzenle" : "Edit event"}</Link> : null}
            {canManage ? <button disabled={archiveMutation.isPending} onClick={() => window.confirm(language === "tr" ? "Etkinlik silinsin mi? Satılmış tüm biletler otomatik olarak iade edilecek ve bu işlem geri alınamayacaktır." : "Delete this event? All sold tickets will be refunded automatically and this action cannot be undone.") && archiveMutation.mutate()}><Flag size={18}/>{language === "tr" ? "Etkinliği sil" : "Delete event"}</button> : null}
            {statsQuery.data ? <Link to={`/stats/event/${event.id}`}><ShieldCheck size={18}/>{language === "tr" ? "Etkileşim istatistikleri" : "Interaction analytics"}</Link> : null}
            {user && !canManage ? <button onClick={() => setReportOpen((current) => !current)}><Flag size={18}/>{language === "tr" ? "Etkinliği rapor et" : "Report event"}</button> : null}
            {user && !canManage ? <button disabled={blockMutation.isPending} onClick={() => blockMutation.mutate()}><Ban size={18}/>{language === "tr" ? "Etkinliği engelle" : "Block event"}</button> : null}
          </div>
        </details>
      </div>
      {actionNotice ? (
        <div
          className={actionNotice.kind === "error" ? "form-error detail-action-notice" : "form-success detail-action-notice"}
          role={actionNotice.kind === "error" ? "alert" : "status"}
        >
          <span>{actionNotice.message}</span>
          <button aria-label={language === "tr" ? "Mesajı kapat" : "Dismiss message"} onClick={() => setActionNotice(null)} type="button">×</button>
        </div>
      ) : null}
      {ticketPickerOpen ? (
        <div
          className="emotion-modal ticket-picker-dialog"
          role="dialog"
          aria-modal="true"
          aria-label={language === "tr" ? "Biletler" : "Tickets"}
        >
          <div>
            <button
              aria-label={language === "tr" ? "Kapat" : "Close"}
              onClick={() => setTicketPickerOpen(false)}
            >
              ×
            </button>
            <h2>{language === "tr" ? "Biletler" : "Tickets"}</h2>
            <p>{language === "tr" ? "Satın aldığın biletlere Biletlerim sayfasından erişebilirsin." : "You can access purchased tickets from My tickets."}</p>
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
                          ? new Intl.NumberFormat(language === "tr" ? "tr-TR" : "en-GB", {
                              style: "currency",
                              currency: type.currency,
                            }).format(type.price)
                          : language === "tr" ? "Ücretsiz" : "Free"}{" "}
                        · {type.remaining} {language === "tr" ? "kaldı" : "remaining"}
                      </span>
                      {type.saleStartsAt || type.saleEndsAt ? (
                        <small>
                          {type.saleStartsAt
                            ? language === "tr" ? `${new Date(type.saleStartsAt).toLocaleString("tr-TR")} itibariyle` : `From ${new Date(type.saleStartsAt).toLocaleString("en-GB")}`
                            : ""}
                          {type.saleEndsAt
                            ? language === "tr" ? ` ${new Date(type.saleEndsAt).toLocaleString("tr-TR")} tarihine kadar` : ` until ${new Date(type.saleEndsAt).toLocaleString("en-GB")}`
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
                          quantity >= Math.min(20, type.remaining, type.perUserLimit ?? 20)
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
                        disabled={unavailable || quantity < 1 || ticketPurchase.isPending}
                        onClick={() => type.salesPlatform === "external" && type.externalSalesUrl ? window.open(type.externalSalesUrl, "_blank", "noopener,noreferrer") : ticketPurchase.mutate({ id: type.id, quantity })}
                      >
                        {unavailable ? language === "tr" ? "Tükendi" : "Sold out" : type.salesPlatform === "external" ? language === "tr" ? "Satış sayfasına git" : "Go to sales page" : type.salesPlatform === "door" ? language === "tr" ? "Bileti ayır" : "Reserve ticket" : language === "tr" ? "Satın al" : "Buy"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            {ticketPurchase.isError ? (
              <p className="form-error">{getServiceErrorMessage(ticketPurchase.error, language === "tr" ? "Bilet satın alınamadı. Stok ve satış zamanını kontrol et." : "The ticket could not be purchased. Check availability and sale times.")}</p>
            ) : null}
          </div>
        </div>
      ) : null}
      {paymentMutation.isError ? (
        <p className="form-error">
          {language === "tr" ? "Ödeme tamamlanamadı. Lütfen ödeme bilgilerini kontrol edin." : "Payment could not be completed. Please check your payment details."}
        </p>
      ) : null}
      <ReportDialog onClose={() => setReportOpen(false)} open={reportOpen} targetId={event.id} targetType="event"/>
      {attendMutation.data ? (
        <p className="form-success">
          {attendMutation.data.status === "accepted"
            ? language === "tr" ? "Katılımın onaylandı." : "Your attendance is confirmed."
            : language === "tr" ? "Katılım talebin organizatöre gönderildi." : "Your attendance request was sent to the organiser."}
        </p>
      ) : null}
      {attendMutation.isError ? (
        <p className="form-error">
          {getServiceErrorMessage(attendMutation.error, event.visibility === "invite_only" ? language === "tr" ? "Bu etkinliğe katılmak için organizatör daveti gerekiyor." : "You need an organiser invitation to join this event." : language === "tr" ? "Katılım talebi gönderilemedi. Lütfen tekrar dene." : "The attendance request could not be sent. Please try again.")}
        </p>
      ) : null}
      <section className="admin-form event-attendee-preview">
        <h2>{language === "tr" ? "Katılımcılar" : "Attendees"}</h2>
        <span className="attendee-avatar-stack">{(relatedUsersQuery.data ?? []).sort((a, b) => Number((followingQuery.data ?? []).some((item) => item.id === b.id)) - Number((followingQuery.data ?? []).some((item) => item.id === a.id))).slice(0, 8).map((participant) => <Link key={participant.id} title={participant.name} to={`/users/id/${participant.id}`}>{participant.avatarUrl ? <img alt="" src={resolveMediaUrl(participant.avatarUrl)}/> : participant.name?.[0] ?? "?"}</Link>)}</span>
        <strong className="related-count-links"><Link to={`/events/${event.slug}/users?filter=attendees`}>{event.attendeeCount ?? relatedUsersQuery.data?.length ?? 0} {language === "tr" ? "katılımcı" : (event.attendeeCount ?? relatedUsersQuery.data?.length ?? 0) === 1 ? "attendee" : "attendees"}</Link>{canManage ? <><span>·</span><Link to={`/events/${event.slug}/users?filter=pending`}>{participantsQuery.data?.filter((item) => item.status === "requested").length ?? 0} {language === "tr" ? "bekleyen" : "pending"}</Link></> : null}<span>·</span><Link to={`/events/${event.slug}/users?filter=invited`}>{invitedPreviewCount} {language === "tr" ? "davetli" : "invited"}</Link><span>·</span><Link to={`/events/${event.slug}/users?filter=following`}>{(relatedUsersQuery.data ?? []).filter((participant) => (followingQuery.data ?? []).some((item) => item.id === participant.id)).length} {language === "tr" ? "takip ettiğin kişi" : "people you follow"}</Link></strong>
      </section>
      <section className="detail-copy" id="more-info">
        <RichText text={!overviewExpanded && event.description.length > 650 ? `${event.description.slice(0, 650).trim()}…` : event.description} />
        {event.description.length > 650 ? <button className="text-action" onClick={() => setOverviewExpanded((expanded) => !expanded)} type="button">{overviewExpanded ? language === "tr" ? "Daha az göster" : "Show less" : language === "tr" ? "Devamını göster" : "Show more"}</button> : null}
      </section>
      {moreInfoOpen ? <div className="dialog-backdrop" role="presentation" onMouseDown={() => setMoreInfoOpen(false)}><section aria-modal="true" aria-labelledby="event-more-title" className="content-dialog event-more-dialog" onMouseDown={(event) => event.stopPropagation()} role="dialog"><div className="section-header"><div><p className="eyebrow">{language === "tr" ? "Etkinlik ve mekân" : "Event and place"}</p><h2 id="event-more-title">{event.title}</h2></div><button onClick={() => setMoreInfoOpen(false)} type="button">{language === "tr" ? "Kapat" : "Close"}</button></div><div className="event-more-description"><RichText text={event.description}/></div>{event.format !== "online" && event.latitude != null && event.longitude != null ? <LocationMap items={[{ id: event.id, title: event.place?.name ?? event.locationName ?? event.title, latitude: event.latitude, longitude: event.longitude, location: [event.place?.address, event.locationAddress, localizeCityName(event.city ?? event.place?.city, language), localizeCountryName(event.country ?? event.place?.country, language)].filter(Boolean).join(", ") }]} /> : null}<dl className="event-more-facts"><div><dt>{language === "tr" ? "Zaman" : "Time"}</dt><dd>{formatEventDateRange(event.startsAt, event.endsAt, { withDuration: true, locale })}</dd></div><div><dt>Format</dt><dd>{event.format === "online" ? language === "tr" ? "Çevrim içi" : "Online" : event.format === "hybrid" ? language === "tr" ? "Hibrit" : "Hybrid" : language === "tr" ? "Yüz yüze" : "In person"}</dd></div><div><dt>{language === "tr" ? "Katılım" : "Access"}</dt><dd>{event.visibility === "open" ? language === "tr" ? "Herkese açık" : "Open to everyone" : event.visibility === "approval_required" ? language === "tr" ? "Onay gerekli" : "Approval required" : language === "tr" ? "Sadece davetli" : "Invite only"}</dd></div>{event.format !== "online" ? <><div><dt>{language === "tr" ? "Etkinlik yeri" : "Event location"}</dt><dd>{event.place ? <Link to={`/places/${event.place.slug}`}>{event.place.name}</Link> : event.locationName || (language === "tr" ? "Konum adı belirtilmedi" : "Location name not provided")}</dd></div><div><dt>{language === "tr" ? "Adres" : "Address"}</dt><dd>{[event.place?.address, event.locationAddress, localizeCityName(event.city ?? event.place?.city, language), localizeCountryName(event.country ?? event.place?.country, language)].filter(Boolean).join(", ") || (event.latitude != null && event.longitude != null ? `${event.latitude}, ${event.longitude}` : language === "tr" ? "Adres belirtilmedi" : "Address not provided")}</dd></div></> : null}{event.format !== "offline" && event.liveUrl ? <div><dt>{language === "tr" ? "Canlı etkinlik bağlantısı" : "Live event URL"}</dt><dd><a href={event.liveUrl} rel="noreferrer" target="_blank">{event.liveUrl}<ExternalLink size={14}/></a></dd></div> : null}</dl></section></div> : null}
      {event.timeline ? (
        <section className="admin-form">
          <h2>{language === "tr" ? "Genel bakış" : "Overview"}</h2>
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
              {language === "tr" ? "Canlı yayına katıl" : "Join live stream"} <ExternalLink size={18} />
            </a>
          ) : null}
        </section>
      ) : null}
      {event.lineup?.length ? (
        <section className="admin-form event-program">
          <h2>{language === "tr" ? "Program" : "Programme"}</h2>
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
                      {item.type === "break" ? (
                        <>☕ <RichText text={item.title} /></>
                      ) : event.tags.find((tag) => tag.name.toLocaleLowerCase("tr-TR") === item.title.toLocaleLowerCase("tr-TR")) ? (
                        <Link to={`/tags/${event.tags.find((tag) => tag.name.toLocaleLowerCase("tr-TR") === item.title.toLocaleLowerCase("tr-TR"))!.slug}`}>#{item.title}</Link>
                      ) : (
                        <RichText text={item.title} />
                      )}
                      {item.startsAt ? <time>{new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.startsAt))}</time> : null}
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
          <h2>{language === "tr" ? "Biletler" : "Tickets"}</h2>
          <p>
            {Math.min(...ticketTypesQuery.data.map((item) => item.price)) ===
            Math.max(...ticketTypesQuery.data.map((item) => item.price))
              ? `${language === "tr" ? "Bilet" : "Ticket"}: ${new Intl.NumberFormat(language === "tr" ? "tr-TR" : "en-GB", { style: "currency", currency: ticketTypesQuery.data[0]!.currency }).format(ticketTypesQuery.data[0]!.price)}`
              : `${language === "tr" ? "Bilet" : "Ticket"}: ${Math.min(...ticketTypesQuery.data.map((item) => item.price))} - ${Math.max(...ticketTypesQuery.data.map((item) => item.price))}`}
          </p>
          <button
            className="primary-action"
            onClick={() => setTicketPickerOpen(true)}
          >
            {language === "tr" ? "Biletleri gör" : "View tickets"}
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
          {language === "tr" ? "Kayıt sayfası" : "Registration page"}
          <ExternalLink size={18} />
        </a>
      ) : null}
      <ContentComments
        targetId={event.id}
        targetType="event"
        title={language === "tr" ? "Etkinlik yorumları" : "Event posts and comments"}
        organizerId={event.createdById}
        canManage={canManage}
      />
      {recommendedEvents.length ? <section className="admin-form event-recommendations"><div className="section-header compact"><div><h2>{language === "tr" ? "İlginizi çekebilecek diğer etkinlikler" : "Other events you may like"}</h2><p>{language === "tr" ? "Ortak ilgi alanları, konum, organizatör ve popülerliğe göre seçildi." : "Selected by shared interests, location, organiser and popularity."}</p></div></div><div className="event-grid recommendation-carousel">{recommendedEvents.map((item) => <EventCard event={item} key={item.id}/>)}</div></section> : null}
      <NotificationDialog
        calendar={{ title: event.title, startsAt: event.startsAt, endsAt: event.endsAt, location: [event.locationName, event.locationAddress, event.city, event.country].filter(Boolean).join(", "), description: event.description }}
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
        targetId={event.id}
        targetType="event"
        title={event.title}
        url={window.location.href}
      />
    </article>
  );
}
