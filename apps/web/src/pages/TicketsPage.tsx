import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Download,
  Ticket,
  Undo2,
  UserRoundPlus,
} from "lucide-react";
import QRCode from "qrcode";
import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getUserSession,
  listOwnedTickets,
  refundTicketOrder,
  transferOwnedTickets,
  type OwnedTicketOrder,
} from "../lib/api";
import { useLanguage } from "../lib/i18n";

export function TicketsPage() {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const user = getUserSession();
  const client = useQueryClient();
  const [past, setPast] = useState(false);
  const [transferOrder, setTransferOrder] = useState<OwnedTicketOrder | null>(
    null,
  );
  const orders = useQuery({
    queryKey: ["owned-tickets", user?.id],
    queryFn: listOwnedTickets,
    enabled: Boolean(user),
  });
  const refund = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      refundTicketOrder(id, reason),
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: ["owned-tickets"] }),
  });
  const visible = (orders.data ?? [])
    .filter((order) =>
      past
        ? new Date(order.event.endsAt ?? order.event.startsAt) < new Date()
        : new Date(order.event.endsAt ?? order.event.startsAt) >= new Date(),
    )
    .sort(
      (a, b) =>
        new Date(a.event.startsAt).getTime() -
        new Date(b.event.startsAt).getTime(),
    );
  if (!user)
    return (
      <section className="page empty-state">
        <Ticket size={40} />
        <h1>{t("Biletlerim", "My tickets")}</h1>
        <Link to="/login">{t("Giriş yap", "Log in")}</Link>
      </section>
    );
  return (
    <section className="page">
      <div className="section-header">
        <div>
          <p className="eyebrow">{t("Hesabın", "Your account")}</p>
          <h1>{t("Biletlerim", "My tickets")}</h1>
        </div>
      </div>
      <div className="feed-tabs">
        <button
          className={!past ? "active" : ""}
          onClick={() => setPast(false)}
        >
          {t("Güncel Biletlerim", "Upcoming tickets")}
        </button>
        <button className={past ? "active" : ""} onClick={() => setPast(true)}>
          {t("Geçmiş Biletlerim", "Past tickets")}
        </button>
      </div>
      <div className="admin-list">
        {orders.isLoading ? (
          <div className="empty-state">
            <p>{t("Biletlerin yükleniyor…", "Loading your tickets…")}</p>
          </div>
        ) : null}
        {orders.isError ? (
          <div className="empty-state">
            <Ticket size={36} />
            <p>
              {t("Biletler yüklenemedi. Bağlantını kontrol edip yeniden deneyebilirsin.", "Tickets could not be loaded. Check your connection and try again.")}
            </p>
            <button
              className="secondary-action"
              onClick={() => void orders.refetch()}
            >
              {t("Yeniden dene", "Try again")}
            </button>
          </div>
        ) : null}
        {visible.map((order) => (
          <TicketOrderCard
            key={order.id}
            language={language}
            order={order}
            onTransfer={() => setTransferOrder(order)}
            onRefund={() => {
              const reason =
                window.prompt(t("İade nedenini yazabilirsin:", "You may enter a refund reason:")) ?? undefined;
              if (
                window.confirm(
                  t("Bu siparişteki tüm aktif biletler iade edilsin mi?", "Refund all active tickets in this order?"),
                )
              )
                refund.mutate({ id: order.id, reason });
            }}
          />
        ))}
        {!visible.length && !orders.isLoading && !orders.isError ? (
          <div className="empty-state">
            <Ticket size={36} />
            <p>{t("Bu bölümde bilet bulunmuyor.", "There are no tickets in this section.")}</p>
            <Link className="secondary-action" to="/events">
              {t("Etkinlikleri keşfet", "Discover events")}
            </Link>
          </div>
        ) : null}
      </div>
      {transferOrder ? (
        <TransferDialog
          order={transferOrder}
          language={language}
          onClose={() => setTransferOrder(null)}
          onChanged={() => {
            setTransferOrder(null);
            void client.invalidateQueries({ queryKey: ["owned-tickets"] });
          }}
        />
      ) : null}
    </section>
  );
}

function TicketOrderCard({
  order,
  language,
  onTransfer,
  onRefund,
}: {
  order: OwnedTicketOrder;
  language: "tr" | "en";
  onTransfer: () => void;
  onRefund: () => void;
}) {
  const active = order.tickets.filter((ticket) => ticket.status === "active");
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const statusText = eventStatusText(order, language);
  return (
    <article className="admin-list-row ticket-order-card">
      {order.event.coverImageUrl ? (
        <img
          alt=""
          className="ticket-event-cover"
          src={order.event.coverImageUrl}
        />
      ) : null}
      <div>
        <strong>{order.event.title}</strong>
        <span>
          <CalendarDays size={15} />{" "}
          {new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-GB", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(order.event.startsAt))}
        </span>
        <span>
          {[order.event.city, order.event.country].filter(Boolean).join(", ") ||
            t("Çevrim içi", "Online")}
        </span>
        <b>
          {order.ticketType.name} · {order.quantity} {t("adet", "tickets")}
        </b>
        <span>
          {new Intl.NumberFormat(language === "tr" ? "tr-TR" : "en-GB", {
            style: "currency",
            currency: order.currency,
          }).format(order.totalAmount)}{" "}
          ·{" "}
          {order.purchasedAt
            ? new Date(order.purchasedAt).toLocaleString(language === "tr" ? "tr-TR" : "en-GB")
            : ""}
        </span>
        <span>{statusText}</span>
        {order.eventChanged && order.status === "paid" ? <span className="ticket-change-warning">{t("Etkinliğin zamanı veya yeri değişti. Yeni bilgiler uygun değilse biletinizi iade edebilirsiniz.", "The event time or location changed. You can request a refund if the new details do not work for you.")}</span> : null}
        {order.event.status === "cancelled" || order.event.status === "archived" ? <span className="ticket-change-warning">{t("Etkinlik iptal edildi. Uygun bilet iadeleri ödeme kanalına aktarılır.", "The event was cancelled. Eligible ticket refunds are returned through the payment channel.")}</span> : null}
        <span className={`status-pill status-${order.status}`}>
          {ticketOrderStatus(order.status, language)}
        </span>
        <div className="ticket-qr-list">
          {order.tickets.map((ticket) => (
            <TicketQr
              key={ticket.id}
              payload={ticket.qrPayload}
              status={ticket.status}
              language={language}
            />
          ))}
        </div>
      </div>
      <div className="row-actions">
        <Link className="secondary-action" to={`/events/${order.event.slug}`}>
          {t("Etkinlik", "Event")}
        </Link>
        <button disabled={!active.length} onClick={onTransfer}>
          <UserRoundPlus size={16} /> {t("Devir et", "Transfer")}
        </button>
        <button
          disabled={!active.length || order.status !== "paid"}
          onClick={onRefund}
        >
          <Undo2 size={16} /> {t("İade et", "Refund")}
        </button>
        <button onClick={() => void printTicket(order, language)}>
          <Download size={16} /> {t("PDF indir", "Download PDF")}
        </button>
      </div>
    </article>
  );
}

function TicketQr({ payload, status, language }: { payload: string; status: string; language: "tr" | "en" }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    void QRCode.toDataURL(payload, { width: 150, margin: 1 }).then(setSrc);
  }, [payload]);
  return (
    <div>
      <span>{status}</span>
      {src ? <img alt={language === "tr" ? "Bilet QR kodu" : "Ticket QR code"} src={src} /> : null}
    </div>
  );
}

function TransferDialog({
  order,
  language,
  onClose,
  onChanged,
}: {
  order: OwnedTicketOrder;
  language: "tr" | "en";
  onClose: () => void;
  onChanged: () => void;
}) {
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const active = order.tickets.filter((ticket) => ticket.status === "active");
  const [count, setCount] = useState(1);
  const transfer = useMutation({
    mutationFn: (input: Parameters<typeof transferOwnedTickets>[0]) =>
      transferOwnedTickets(input),
    onSuccess: onChanged,
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    transfer.mutate({
      ticketIds: active.slice(0, count).map((ticket) => ticket.id),
      username: String(form.get("username") || "") || undefined,
      email: String(form.get("email") || "") || undefined,
      phone: String(form.get("phone") || "") || undefined,
      name: String(form.get("name") || "") || undefined,
    });
  }
  return (
    <div className="emotion-modal" role="dialog" aria-modal="true">
      <form className="admin-form" onSubmit={submit}>
        <button aria-label={t("Kapat", "Close")} onClick={onClose} type="button">
          ×
        </button>
        <h2>{t("Bilet Devret", "Transfer tickets")}</h2>
        <p>
          {language === "tr" ? `${order.ticketType.name} biletlerinden devredilecek adedi ve alıcıyı seç.` : `Choose how many ${order.ticketType.name} tickets to transfer and the recipient.`}
        </p>
        <label>
          {t("Adet", "Quantity")}
          <input
            max={active.length}
            min="1"
            onChange={(event) => setCount(Number(event.target.value))}
            type="number"
            value={count}
          />
        </label>
        <label>
          {t("Kullanıcı adı", "Username")}
          <input name="username" />
        </label>
        <label>
          {t("veya e-posta", "or email")}
          <input name="email" type="email" />
        </label>
        <label>
          {t("veya telefon", "or phone")}
          <input name="phone" />
        </label>
        <label>
          {t("Üye değilse adı", "Name, if not a member")}
          <input name="name" />
        </label>
        <button className="primary-action" disabled={transfer.isPending}>
          {t("Devret", "Transfer")}
        </button>
        {transfer.isError ? (
          <p className="form-error">
            {t("Bilet devredilemedi. Alıcı bilgilerini kontrol et.", "The ticket could not be transferred. Check the recipient details.")}
          </p>
        ) : null}
      </form>
    </div>
  );
}

function escapeHtml(value: string | number) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );
}
async function printTicket(order: OwnedTicketOrder, language: "tr" | "en") {
  const images = await Promise.all(
    order.tickets.map((ticket) =>
      QRCode.toDataURL(ticket.qrPayload, { width: 180, margin: 1 }),
    ),
  );
  const win = window.open("", "_blank");
  if (!win) return;
  const title = escapeHtml(order.event.title);
  const ticketName = escapeHtml(order.ticketType.name);
  const date = escapeHtml(
    new Date(order.event.startsAt).toLocaleString(language === "tr" ? "tr-TR" : "en-GB"),
  );
  const amount = escapeHtml(order.totalAmount);
  const currency = escapeHtml(order.currency);
  win.document.write(
    `<html><head><title>${title} - ${language === "tr" ? "Bilet" : "Ticket"}</title><style>body{font-family:Arial;padding:40px}article{border:2px solid #222;padding:24px;max-width:720px}h1{margin:0 0 16px}.meta{margin:8px 0}.qrs{display:flex;flex-wrap:wrap;gap:16px}.qr{text-align:center}.qr img{width:180px}</style></head><body><article><h1>${title}</h1><div class="meta">${ticketName} · ${order.quantity} ${language === "tr" ? "adet" : "tickets"}</div><div class="meta">${date}</div><div class="meta">${amount} ${currency}</div><div class="qrs">${images.map((src, index) => `<div class="qr"><img src="${src}"/><div>${language === "tr" ? "Bilet" : "Ticket"} ${index + 1}</div></div>`).join("")}</div></article><script>window.onload=()=>window.print();</script></body></html>`,
  );
  win.document.close();
}
function eventStatusText(order: OwnedTicketOrder, language: "tr" | "en") {
  const now = Date.now(),
    start = new Date(order.event.startsAt).getTime(),
    end = new Date(order.event.endsAt ?? order.event.startsAt).getTime();
  const relative = (ms: number) => {
    const hours = Math.max(1, Math.round(Math.abs(ms) / 3_600_000));
    return hours < 24 ? `${hours} ${language === "tr" ? "saat" : hours === 1 ? "hour" : "hours"}` : `${Math.round(hours / 24)} ${language === "tr" ? "gün" : Math.round(hours / 24) === 1 ? "day" : "days"}`;
  };
  if (now < start) return language === "tr" ? `Etkinlik ${relative(start - now)} sonra başlayacak.` : `The event starts in ${relative(start - now)}.`;
  if (now <= end)
    return language === "tr" ? `Etkinlik ${relative(now - start)} önce başladı ve devam ediyor.` : `The event started ${relative(now - start)} ago and is in progress.`;
  return language === "tr" ? `Etkinlik ${relative(now - end)} önce bitti.` : `The event ended ${relative(now - end)} ago.`;
}

function ticketOrderStatus(status: string, language: "tr" | "en") {
  const labels: Record<string, [string, string]> = { paid: ["Aktif", "Active"], refunded: ["İade edildi", "Refunded"], cancelled: ["İptal edildi", "Cancelled"], pending: ["Bekliyor", "Pending"] };
  return labels[status]?.[language === "tr" ? 0 : 1] ?? status;
}
