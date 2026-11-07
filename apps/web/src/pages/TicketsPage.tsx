import { ticketWindowText } from "../lib/ticket-window";
import { formatEventDateRange } from "../lib/formats";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Download,
  Ticket,
  Undo2,
  UserRoundPlus,
} from "lucide-react";
import QRCode from "qrcode";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
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
  const [transferNotice, setTransferNotice] = useState("");
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
      {transferNotice ? <p role="status" className="filter-notice">{transferNotice}</p> : null}
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
          onChanged={(deliveryFailed) => {
            setTransferNotice(deliveryFailed ? t("Bilet devredildi ancak e-posta veya bildirim gönderilemedi. Alıcı biletini hesabından görebilir; devir işlemini tekrar yapmayın.", "The ticket was transferred, but delivery failed. The recipient can view it in their account; do not repeat the transfer.") : t("Bilet devredildi.", "Ticket transferred."));
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
  const saleWindow = ticketWindowText(order.ticketType.saleStartsAt, order.ticketType.saleEndsAt, "sale", language);
  const gateWindow = ticketWindowText(order.ticketType.gateOpensAt, order.ticketType.gateClosesAt, "gate", language);
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
        <strong><Link to={`/events/${order.event.slug}`}>{order.event.title}</Link></strong>
        <span>
          <CalendarDays size={15} />{" "}
          {formatEventDateRange(order.event.startsAt, order.event.endsAt, { locale: language === "tr" ? "tr-TR" : "en-GB" })}
        </span>
        <span>
          {[order.event.locationName, order.event.locationAddress, order.event.city, order.event.country].filter(Boolean).join(", ") ||
            t("Çevrim içi", "Online")}
        </span>
        <b>
          {order.ticketType.name} · {order.quantity} {t("adet", "tickets")}
        </b>
        {order.ticketType.description ? <span>{order.ticketType.description}</span> : null}
        {saleWindow ? <span>{saleWindow}</span> : null}
        {gateWindow ? <span>{gateWindow}</span> : null}
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

        <button disabled={!active.length} onClick={onTransfer}>
          <UserRoundPlus size={16} /> {t("Devir et", "Transfer")}
        </button>
        {order.eventChanged ? <button disabled={!active.length || order.status !== "paid"} onClick={onRefund}><Undo2 size={16}/> {t("İade et", "Refund")}</button> : null}
        <button onClick={() => void downloadTicketPdf(order, language)}>
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
  onChanged: (deliveryFailed?: boolean) => void;
}) {
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const active = order.tickets.filter((ticket) => ticket.status === "active");
  const [count, setCount] = useState(1);
  const transfer = useMutation({
    mutationFn: (input: Parameters<typeof transferOwnedTickets>[0]) =>
      transferOwnedTickets(input),
    onSuccess: (result) => onChanged(result.deliveryFailed),
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
    <div className="emotion-modal ticket-transfer-dialog" role="dialog" aria-modal="true">
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
          {t("Alıcının adı (üye değilse, isteğe bağlı)", "Recipient name (optional for non-members)")}
          <input name="name" /><small>{t("Yeni kullanıcıya gönderilecek davette hitap etmek için kullanılır.", "Used to address a new member in the invitation.")}</small>
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

async function downloadTicketPdf(order: OwnedTicketOrder, language: "tr" | "en") {
  const images = await Promise.all(
    order.tickets.map((ticket) =>
      QRCode.toDataURL(ticket.qrPayload, { width: 420, margin: 1 }),
    ),
  );
  const [pdfMake, fontModule] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);
  const virtualFonts = fontModule.default as unknown as Record<string, string>;
  const locale = language === "tr" ? "tr-TR" : "en-GB";
  const content: Content[] = images.map((image, index) => ({
    pageBreak: index ? "before" : undefined,
    table: {
      widths: ["*", 190],
      body: [[
        {
          stack: [
            { text: "KONNEKTORA", color: "#1d7a50", bold: true, fontSize: 11, characterSpacing: 1.3 },
            { text: order.event.title, link: new URL(`/events/${order.event.slug}`, window.location.origin).href, style: "title", margin: [0, 12, 0, 12] },
            { text: order.ticketType.name, bold: true, fontSize: 15, color: "#174d36" },
            { text: order.ticketType.description ?? "" },
            { text: getUserSession()?.name ?? "" },
            { text: [order.ticketType.gateOpensAt ? `${language === "tr" ? "Giriş başlangıcı" : "Entry opens"}: ${new Date(order.ticketType.gateOpensAt).toLocaleString(locale)}` : "", order.ticketType.gateClosesAt ? `${language === "tr" ? "Bu zamandan önce giriş yapmalısınız" : "Enter before"}: ${new Date(order.ticketType.gateClosesAt).toLocaleString(locale)}` : ""].filter(Boolean).join("\n") },
            {
              text: formatEventDateRange(order.event.startsAt, order.event.endsAt, { locale }),
              margin: [0, 10, 0, 4],
            },
            { text: [order.event.locationName, order.event.locationAddress, order.event.city, order.event.country].filter(Boolean).join(", ") || (language === "tr" ? "Çevrim içi" : "Online") },
            {
              text: new Intl.NumberFormat(locale, { style: "currency", currency: order.currency }).format(order.unitPrice),
              bold: true,
              margin: [0, 14, 0, 0],
            },
            { text: `${language === "tr" ? "Bilet" : "Ticket"} ${index + 1} / ${images.length}`, color: "#687870", margin: [0, 8, 0, 0] },
          ],
          border: [false, false, false, false],
          margin: [12, 14, 16, 14],
        },
        {
          stack: [
            { image, width: 172, alignment: "center" },
            { text: language === "tr" ? "Girişte bu QR kodunu gösterin" : "Show this QR code at entry", alignment: "center", fontSize: 9, color: "#5c6d64", margin: [0, 8, 0, 0] },
            { text: order.tickets[index]?.id ?? "", alignment: "center", fontSize: 7, color: "#87958e", margin: [0, 5, 0, 0] },
          ],
          border: [true, false, false, false],
          borderColor: ["#d9e8df", "#d9e8df", "#d9e8df", "#d9e8df"],
          margin: [12, 12, 8, 12],
        },
      ]],
    },
    layout: {
      fillColor: () => "#f7fbf8",
      hLineColor: () => "#d9e8df",
      vLineColor: () => "#d9e8df",
    },
  }));
  const document: TDocumentDefinitions = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [42, 58, 42, 58],
    defaultStyle: { font: "Roboto", fontSize: 11, color: "#17231d" },
    content,
    styles: { title: { fontSize: 24, bold: true, color: "#10281d" } },
    footer: (currentPage, pageCount) => ({
      text: `${language === "tr" ? "Bilet" : "Ticket"} ${currentPage} / ${pageCount}`,
      alignment: "center",
      fontSize: 8,
      color: "#687870",
      margin: [0, 18, 0, 0],
    }),
  };
  pdfMake.default.vfs = virtualFonts;
  const safeTitle = order.event.title
    .toLocaleLowerCase(locale)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "etkinlik";
  pdfMake.default.createPdf(document).download(`${safeTitle}-${language === "tr" ? "biletler" : "tickets"}.pdf`);
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
