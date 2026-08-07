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

export function TicketsPage() {
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
        <h1>Biletlerim</h1>
        <Link to="/account">Giriş yap</Link>
      </section>
    );
  return (
    <section className="page">
      <div className="section-header">
        <div>
          <p className="eyebrow">Hesabın</p>
          <h1>Biletlerim</h1>
        </div>
      </div>
      <div className="feed-tabs">
        <button
          className={!past ? "active" : ""}
          onClick={() => setPast(false)}
        >
          Güncel Biletlerim
        </button>
        <button className={past ? "active" : ""} onClick={() => setPast(true)}>
          Geçmiş Biletlerim
        </button>
      </div>
      <div className="admin-list">
        {orders.isLoading ? (
          <div className="empty-state">
            <p>Biletlerin yükleniyor…</p>
          </div>
        ) : null}
        {orders.isError ? (
          <div className="empty-state">
            <Ticket size={36} />
            <p>
              Biletler yüklenemedi. Bağlantını kontrol edip yeniden
              deneyebilirsin.
            </p>
            <button
              className="secondary-action"
              onClick={() => void orders.refetch()}
            >
              Yeniden dene
            </button>
          </div>
        ) : null}
        {visible.map((order) => (
          <TicketOrderCard
            key={order.id}
            order={order}
            onTransfer={() => setTransferOrder(order)}
            onRefund={() => {
              const reason =
                window.prompt("İade nedenini yazabilirsin:") ?? undefined;
              if (
                window.confirm(
                  "Bu siparişteki tüm aktif biletler iade edilsin mi?",
                )
              )
                refund.mutate({ id: order.id, reason });
            }}
          />
        ))}
        {!visible.length && !orders.isLoading && !orders.isError ? (
          <div className="empty-state">
            <Ticket size={36} />
            <p>Bu bölümde bilet bulunmuyor.</p>
            <Link className="secondary-action" to="/events">
              Etkinlikleri keşfet
            </Link>
          </div>
        ) : null}
      </div>
      {transferOrder ? (
        <TransferDialog
          order={transferOrder}
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
  onTransfer,
  onRefund,
}: {
  order: OwnedTicketOrder;
  onTransfer: () => void;
  onRefund: () => void;
}) {
  const active = order.tickets.filter((ticket) => ticket.status === "active");
  const statusText = eventStatusText(order);
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
          {new Intl.DateTimeFormat("tr-TR", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(order.event.startsAt))}
        </span>
        <span>
          {[order.event.city, order.event.country].filter(Boolean).join(", ") ||
            "Online"}
        </span>
        <b>
          {order.ticketType.name} · {order.quantity} adet
        </b>
        <span>
          {new Intl.NumberFormat("tr-TR", {
            style: "currency",
            currency: order.currency,
          }).format(order.totalAmount)}{" "}
          ·{" "}
          {order.purchasedAt
            ? new Date(order.purchasedAt).toLocaleString("tr-TR")
            : ""}
        </span>
        <span>{statusText}</span>
        <span className={`status-pill status-${order.status}`}>
          {order.status}
        </span>
        <div className="ticket-qr-list">
          {order.tickets.map((ticket) => (
            <TicketQr
              key={ticket.id}
              payload={ticket.qrPayload}
              status={ticket.status}
            />
          ))}
        </div>
      </div>
      <div className="row-actions">
        <Link className="secondary-action" to={`/events/${order.event.slug}`}>
          Etkinlik
        </Link>
        <button disabled={!active.length} onClick={onTransfer}>
          <UserRoundPlus size={16} /> Devir et
        </button>
        <button
          disabled={!active.length || order.status !== "paid"}
          onClick={onRefund}
        >
          <Undo2 size={16} /> İade et
        </button>
        <button onClick={() => void printTicket(order)}>
          <Download size={16} /> PDF indir
        </button>
      </div>
    </article>
  );
}

function TicketQr({ payload, status }: { payload: string; status: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    void QRCode.toDataURL(payload, { width: 150, margin: 1 }).then(setSrc);
  }, [payload]);
  return (
    <div>
      <span>{status}</span>
      {src ? <img alt="Bilet QR kodu" src={src} /> : null}
    </div>
  );
}

function TransferDialog({
  order,
  onClose,
  onChanged,
}: {
  order: OwnedTicketOrder;
  onClose: () => void;
  onChanged: () => void;
}) {
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
        <button aria-label="Kapat" onClick={onClose} type="button">
          ×
        </button>
        <h2>Bilet Devir Et</h2>
        <p>
          {order.ticketType.name} biletlerinden devredilecek adedi ve alıcıyı
          seç.
        </p>
        <label>
          Adet
          <input
            max={active.length}
            min="1"
            onChange={(event) => setCount(Number(event.target.value))}
            type="number"
            value={count}
          />
        </label>
        <label>
          Kullanıcı adı
          <input name="username" />
        </label>
        <label>
          veya e-posta
          <input name="email" type="email" />
        </label>
        <label>
          veya telefon
          <input name="phone" />
        </label>
        <label>
          Üye değilse adı
          <input name="name" />
        </label>
        <button className="primary-action" disabled={transfer.isPending}>
          Devret
        </button>
        {transfer.isError ? (
          <p className="form-error">
            Bilet devredilemedi. Alıcı bilgilerini kontrol et.
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
async function printTicket(order: OwnedTicketOrder) {
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
    new Date(order.event.startsAt).toLocaleString("tr-TR"),
  );
  const amount = escapeHtml(order.totalAmount);
  const currency = escapeHtml(order.currency);
  win.document.write(
    `<html><head><title>${title} - Bilet</title><style>body{font-family:Arial;padding:40px}article{border:2px solid #222;padding:24px;max-width:720px}h1{margin:0 0 16px}.meta{margin:8px 0}.qrs{display:flex;flex-wrap:wrap;gap:16px}.qr{text-align:center}.qr img{width:180px}</style></head><body><article><h1>${title}</h1><div class="meta">${ticketName} · ${order.quantity} adet</div><div class="meta">${date}</div><div class="meta">${amount} ${currency}</div><div class="qrs">${images.map((src, index) => `<div class="qr"><img src="${src}"/><div>Bilet ${index + 1}</div></div>`).join("")}</div></article><script>window.onload=()=>window.print();</script></body></html>`,
  );
  win.document.close();
}
function eventStatusText(order: OwnedTicketOrder) {
  const now = Date.now(),
    start = new Date(order.event.startsAt).getTime(),
    end = new Date(order.event.endsAt ?? order.event.startsAt).getTime();
  const relative = (ms: number) => {
    const hours = Math.max(1, Math.round(Math.abs(ms) / 3_600_000));
    return hours < 24 ? `${hours} saat` : `${Math.round(hours / 24)} gün`;
  };
  if (now < start) return `Etkinlik ${relative(start - now)} sonra başlayacak.`;
  if (now <= end)
    return `Etkinlik ${relative(now - start)} önce başladı ve devam ediyor.`;
  return `Etkinlik ${relative(now - end)} önce bitti.`;
}
