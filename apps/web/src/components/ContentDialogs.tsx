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
        {qrImage ? <div className="share-dialog-qr"><QrCode size={18}/><img alt={`${title} QR kodu`} height="180" src={qrImage} width="180"/><small>Afiş ve basılı materyaller için doğrudan içerik bağlantısı</small></div> : null}
        <div className="share-dialog-actions">
          <button
            className="secondary-action"
            onClick={() =>
              void navigator.clipboard.writeText(url).then(onClose)
            }
          >
            <Copy size={17} />
            Bağlantıyı kopyala
          </button>
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
}: {
  open: boolean;
  onClose: () => void;
  enabled: boolean;
  pending: boolean;
  onConfirm: () => void;
  title: string;
}) {
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
        <div className="row-actions">
          <button className="ghost-action" onClick={onClose}>
            Vazgeç
          </button>
          <button
            className="primary-action"
            disabled={pending}
            onClick={onConfirm}
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
