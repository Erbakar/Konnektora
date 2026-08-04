import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CalendarDays, CreditCard, ExternalLink, Flag, MapPin, QrCode, ShieldCheck, UserPlus, Users } from "lucide-react";
import QRCode from "qrcode";
import { type FormEvent, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { RichText } from "../components/RichText";
import { confirmEventPayment, createBlock, createContentReport, createEventPayment, getEvent, getMyEventTicket, getUserSession, listEventTicketTypes, listReportRules, purchaseEventTickets, requestEventAttendance } from "../lib/api";

export function EventDetailPage() {
  const { slug = "" } = useParams();
  const user = getUserSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  const [ticketQr, setTicketQr] = useState<string | null>(null);
  const [ticketPickerOpen, setTicketPickerOpen] = useState(false);
  const [ticketQuantities, setTicketQuantities] = useState<Record<string, number>>({});
  const { data: event, isLoading } = useQuery({
    queryKey: ["event", slug],
    queryFn: () => getEvent(slug),
    enabled: Boolean(slug)
  });
  const { data: reportRules = [] } = useQuery({
    queryKey: ["report-rules", "event"],
    queryFn: () => listReportRules("event"),
    enabled: Boolean(user)
  });
  const ticketTypesQuery = useQuery({ queryKey: ["event-ticket-types", event?.id], queryFn: () => listEventTicketTypes(event!.id), enabled: Boolean(event) });
  const ticketPurchase = useMutation({ mutationFn: ({ id, quantity }: { id: string; quantity: number }) => purchaseEventTickets(id, quantity), onSuccess: () => { setTicketPickerOpen(false); void ticketTypesQuery.refetch(); window.alert("Bilet satın alındı. Biletlerim sayfasından görüntüleyebilirsin."); } });
  const attendMutation = useMutation({
    mutationFn: requestEventAttendance
  });
  const paymentMutation = useMutation({ mutationFn: async () => { const intent = await createEventPayment(event!.id, crypto.randomUUID()); return confirmEventPayment(intent.id, `pm_sandbox_${crypto.randomUUID()}`); } });
  const ticketMutation = useMutation({
    mutationFn: getMyEventTicket,
    onSuccess: async (ticket) => {
      setTicketQr(await QRCode.toDataURL(ticket.qrPayload, { width: 240, margin: 1 }));
    }
  });
  const reportMutation = useMutation({
    mutationFn: createContentReport
  });
  const blockMutation = useMutation({
    mutationFn: () => createBlock("event", event!.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void queryClient.invalidateQueries({ queryKey: ["blocks"] });
      navigate("/events");
    }
  });

  if (isLoading) {
    return <section className="page">Etkinlik yükleniyor...</section>;
  }

  if (!event) {
    return <section className="page">Etkinlik bulunamadı.</section>;
  }

  return (
    <article className="page detail-page">
      {event.coverImageUrl ? (
        <div className="detail-media">
          <img alt="" src={event.coverImageUrl} />
        </div>
      ) : null}
      <p className="eyebrow">
        {event.format} · {event.visibility.replace("_", " ")}
      </p>
      <h1>{event.title}</h1>
      <div className="detail-meta">
        <span>
          <CalendarDays size={16} />
          {new Intl.DateTimeFormat("tr-TR", { dateStyle: "full", timeStyle: "short" }).format(new Date(event.startsAt))}
        </span>
        <span>
          <MapPin size={16} />
          {[event.city, event.country].filter(Boolean).join(", ") || "Online"}
        </span>
        <span>
          <ShieldCheck size={16} />
          {event.organizerName || "Konnektora topluluğu"}
        </span>
      </div>
      <div className="tag-row">
        {event.tags.map((tag) => (
          <span key={tag.id}>{tag.name}</span>
        ))}
      </div>
      <div className="detail-actions">
        {ticketTypesQuery.data?.length ? <button className="primary-action" onClick={() => setTicketPickerOpen(true)}><CreditCard size={18}/> Bilet al</button> : null}
        {user && event.price > 0 ? <button className="primary-action" disabled={paymentMutation.isPending || paymentMutation.isSuccess} onClick={() => paymentMutation.mutate()}><CreditCard size={18}/>{paymentMutation.isSuccess ? "Ödeme tamamlandı" : paymentMutation.isPending ? "Ödeniyor…" : `${new Intl.NumberFormat("tr-TR", { style: "currency", currency: event.currency }).format(event.price)} · Bilet al`}</button> : null}
        {user ? (
          <button
            className="primary-action"
            disabled={attendMutation.isPending}
            onClick={() => attendMutation.mutate(event.id)}
            type="button"
          >
            <Users size={18} />
            {attendMutation.isPending ? "Gönderiliyor" : "Katıl"}
          </button>
        ) : (
          <Link className="primary-action" to="/account">
            <Users size={18} />
            Katılmak için giriş yap
          </Link>
        )}
        <a
          className="secondary-action"
          href={`mailto:?subject=${encodeURIComponent(event.title)}&body=${encodeURIComponent(
            `${event.title}\n\n${window.location.href}`
          )}`}
        >
          <UserPlus size={18} />
          Davet et
        </a>
        {user ? (
          <button className="ghost-action" onClick={() => setReportOpen((current) => !current)} type="button">
            <Flag size={18} />
            Raporla
          </button>
        ) : null}
        {user ? (
          <button
            className="secondary-action"
            disabled={ticketMutation.isPending}
            onClick={() => ticketMutation.mutate(event.id)}
            type="button"
          >
            <QrCode size={18} />
            {ticketMutation.isPending ? "Hazırlanıyor" : "QR Biletim"}
          </button>
        ) : null}
        {user ? (
          <button className="ghost-action" disabled={blockMutation.isPending} onClick={() => blockMutation.mutate()} type="button">
            <Ban size={18} />
            Engelle
          </button>
        ) : null}
      </div>
      {ticketPickerOpen ? <div className="emotion-modal" role="dialog" aria-modal="true" aria-label="Biletler"><div><button aria-label="Kapat" onClick={() => setTicketPickerOpen(false)}>×</button><h2>Biletler</h2><p>Satın aldığın biletlere Biletlerim sayfasından erişebilirsin.</p><div className="admin-list">{ticketTypesQuery.data?.map((type) => { const quantity = ticketQuantities[type.id] ?? 0; const unavailable = type.remaining <= 0 || type.status !== "active"; return <article className="admin-list-row" key={type.id}><div><strong>{type.name}</strong><span>{type.description}</span><span>{type.price ? new Intl.NumberFormat("tr-TR", { style: "currency", currency: type.currency }).format(type.price) : "Ücretsiz"} · {type.remaining} kaldı</span>{type.saleStartsAt || type.saleEndsAt ? <small>{type.saleStartsAt ? `${new Date(type.saleStartsAt).toLocaleString("tr-TR")} itibariyle` : ""}{type.saleEndsAt ? ` ${new Date(type.saleEndsAt).toLocaleString("tr-TR")} tarihine kadar` : ""}</small> : null}</div><div className="row-actions"><button disabled={quantity <= 0} onClick={() => setTicketQuantities((values) => ({ ...values, [type.id]: Math.max(0, quantity - 1) }))}>−</button><strong>{quantity}</strong><button disabled={unavailable || quantity >= Math.min(20, type.remaining)} onClick={() => setTicketQuantities((values) => ({ ...values, [type.id]: quantity + 1 }))}>+</button><button className="primary-action" disabled={unavailable || quantity < 1 || ticketPurchase.isPending} onClick={() => ticketPurchase.mutate({ id: type.id, quantity })}>{unavailable ? "Tükendi" : "Satın al"}</button></div></article>; })}</div>{ticketPurchase.isError ? <p className="form-error">Bilet satın alınamadı. Stok ve satış zamanını kontrol et.</p> : null}</div></div> : null}
      {paymentMutation.isError ? <p className="form-error">Ödeme tamamlanamadı. Lütfen ödeme bilgilerini kontrol edin.</p> : null}
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
              details: String(form.get("details") || "") || undefined
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
              <input name="reason" placeholder="Yanıltıcı bilgi, uygunsuz içerik..." required minLength={3} maxLength={120} />
            </label>
          )}
          <label>
            Detay
            <textarea name="details" rows={3} maxLength={1000} />
          </label>
          <button className="secondary-action" disabled={reportMutation.isPending} type="submit">
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
      {attendMutation.isError ? <p className="form-error">Katılım talebi gönderilemedi. Lütfen tekrar dene.</p> : null}
      {ticketMutation.data && ticketQr ? (
        <section className="admin-form compact-form" aria-label="Etkinlik QR bileti">
          <strong>{ticketMutation.data.eventTitle}</strong>
          <img alt="Etkinlik giriş QR kodu" height="240" src={ticketQr} width="240" />
          <p className="form-help">Bu tek kullanımlık kodu girişte organizatöre göster.</p>
        </section>
      ) : null}
      {ticketMutation.isError ? <p className="form-error">Bilet yalnızca onaylanmış katılımcılar için oluşturulabilir.</p> : null}
      {reportMutation.data ? <p className="form-success">Rapor alındı. Admin panelde incelenecek.</p> : null}
      {reportMutation.isError ? <p className="form-error">Rapor gönderilemedi. Lütfen tekrar dene.</p> : null}
      <p className="detail-copy"><RichText text={event.description}/></p>
      {event.timeline ? <section className="admin-form"><h2>Overview</h2><p><RichText text={event.timeline} /></p>{event.liveUrl ? <a className="primary-action" href={event.liveUrl} rel="noreferrer" target="_blank">Canlı yayına katıl <ExternalLink size={18} /></a> : null}</section> : null}
      {event.lineup?.length ? <section className="admin-form"><h2>Line up</h2><div className="admin-list">{event.lineup.map((item, index) => <article className="admin-list-row" key={`${item.startsAt}-${index}`}><div><strong>{item.title}</strong><span>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.startsAt))}</span>{item.description ? <span><RichText text={item.description} /></span> : null}</div></article>)}</div></section> : null}
      {ticketTypesQuery.data?.length ? <section className="admin-form"><h2>Biletler</h2><p>{Math.min(...ticketTypesQuery.data.map((item) => item.price)) === Math.max(...ticketTypesQuery.data.map((item) => item.price)) ? `Bilet: ${new Intl.NumberFormat("tr-TR", { style: "currency", currency: ticketTypesQuery.data[0]!.currency }).format(ticketTypesQuery.data[0]!.price)}` : `Bilet: ${Math.min(...ticketTypesQuery.data.map((item) => item.price))} - ${Math.max(...ticketTypesQuery.data.map((item) => item.price))}`}</p><button className="primary-action" onClick={() => setTicketPickerOpen(true)}>Biletleri gör</button></section> : null}
      {event.externalRegistrationUrl ? (
        <a className="primary-action" href={event.externalRegistrationUrl} rel="noreferrer" target="_blank">
          Kayıt sayfası
          <ExternalLink size={18} />
        </a>
      ) : null}
    </article>
  );
}
