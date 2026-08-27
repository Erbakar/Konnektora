import { Bell, BellOff, Copy, Mail, QrCode, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

export function ShareDialog({
  open,
  onClose,
  title,
  url,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  url: string;
}) {
  const [qrImage, setQrImage] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!open) return;
    void QRCode.toDataURL(url, { width: 240, margin: 1 }).then(setQrImage);
  }, [open, url]);
  if (!open) return null;
  const message = `${title}\n${url}`;
  return (
    <div
      className="emotion-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Paylaş"
    >
      <div>
        <button aria-label="Kapat" onClick={onClose}>
          ×
        </button>
        <h2>
          <Share2 size={21} />
          Paylaş
        </h2>
        <p>Bağlantıyı istediğin kanaldan topluluğunla paylaş.</p>
        <div className="share-dialog-actions">
          <button
            className="secondary-action"
            onClick={() => void navigator.clipboard.writeText(url).then(() => setCopied(true))}
          >
            <Copy size={17} />
            {copied ? "URL kopyalandı!" : "Bağlantıyı kopyala"}
          </button>
          <button className="secondary-action" disabled={!qrImage} onClick={() => setQrOpen(true)}><QrCode size={17}/>QR kodu</button>
          <a
            className="secondary-action"
            href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(message)}`}
          >
            <Mail size={17} />
            E-posta
          </a>
          <a
            className="secondary-action"
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            rel="noreferrer"
            target="_blank"
          >
            WhatsApp
          </a>
          {navigator.share ? (
            <button
              className="primary-action"
              onClick={() => void navigator.share({ title, url }).then(onClose)}
            >
              <Share2 size={17} />
              Diğer uygulamalar
            </button>
          ) : null}
        </div>
        {qrOpen && qrImage ? <div className="share-qr-backdrop" onClick={() => setQrOpen(false)} role="presentation"><section aria-label="QR kodu" aria-modal="true" onClick={(event) => event.stopPropagation()} role="dialog"><img alt={`${title} QR kodu`} height="300" src={qrImage} width="300"/><strong>Ekrana dokunarak paylaşıma dön</strong></section></div> : null}
      </div>
    </div>
  );
}

export function NotificationDialog({
  open,
  onClose,
  enabled,
  pending,
  onConfirm,
  title,
  calendar,
}: {
  open: boolean;
  onClose: () => void;
  enabled: boolean;
  pending: boolean;
  onConfirm: () => void;
  title: string;
  calendar?: { title: string; startsAt: string; endsAt?: string | null; location?: string; description?: string };
}) {
  const [addToCalendar, setAddToCalendar] = useState(false);
  if (!open) return null;
  return (
    <div
      className="emotion-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Bildirim ayarı"
    >
      <div>
        <button aria-label="Kapat" onClick={onClose}>
          ×
        </button>
        <h2>
          {enabled ? <BellOff size={21} /> : <Bell size={21} />}Bildirimleri{" "}
          {enabled ? "kapat" : "aç"}
        </h2>
        <p>
          <strong>{title}</strong> için yeni içerik ve önemli güncellemeler
          hakkında bildirim {enabled ? "almayı durduracaksın" : "alacaksın"}.
        </p>
        {!enabled && calendar ? <label className="calendar-notification-option"><input checked={addToCalendar} onChange={(event) => setAddToCalendar(event.target.checked)} type="checkbox"/> Bu etkinliği varsayılan takvimime de eklemek istiyorum.</label> : null}
        <div className="row-actions">
          <button className="ghost-action" onClick={onClose}>
            Vazgeç
          </button>
          <button
            className="primary-action"
            disabled={pending}
            onClick={() => { if (!enabled && addToCalendar && calendar) downloadCalendarEvent(calendar); onConfirm(); }}
          >
            {pending
              ? "Kaydediliyor…"
              : enabled
                ? "Bildirimleri kapat"
                : "Bildirimleri aç"}
          </button>
        </div>
      </div>
    </div>
  );
}

function downloadCalendarEvent(event: { title: string; startsAt: string; endsAt?: string | null; location?: string; description?: string }) {
  const format = (value: string) => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const escape = (value = "") => value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const start = format(event.startsAt);
  const end = format(event.endsAt ?? new Date(new Date(event.startsAt).getTime() + 60 * 60 * 1000).toISOString());
  const content = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Konnektora//TR", "BEGIN:VEVENT", `UID:${crypto.randomUUID()}@konnektora.com`, `DTSTAMP:${format(new Date().toISOString())}`, `DTSTART:${start}`, `DTEND:${end}`, `SUMMARY:${escape(event.title)}`, `DESCRIPTION:${escape(event.description)}`, `LOCATION:${escape(event.location)}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));
  link.download = `${event.title.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9çğıöşü]+/gi, "-").replace(/^-|-$/g, "") || "etkinlik"}.ics`;
  link.click();
  URL.revokeObjectURL(link.href);
}
