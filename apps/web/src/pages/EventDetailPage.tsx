import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CalendarDays, CreditCard, ExternalLink, Flag, MapPin, QrCode, ShieldCheck, UserPlus, Users } from "lucide-react";
import QRCode from "qrcode";
import { type FormEvent, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { RichText } from "../components/RichText";
import { confirmEventPayment, createBlock, createContentReport, createEventPayment, getEvent, getMyEventTicket, getUserSession, listReportRules, requestEventAttendance } from "../lib/api";

export function EventDetailPage() {
  const { slug = "" } = useParams();
  const user = getUserSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  const [ticketQr, setTicketQr] = useState<string | null>(null);
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
      {event.externalRegistrationUrl ? (
        <a className="primary-action" href={event.externalRegistrationUrl} rel="noreferrer" target="_blank">
          Kayıt sayfası
          <ExternalLink size={18} />
        </a>
      ) : null}
    </article>
  );
}
