import type { IScannerControls } from "@zxing/browser";
import { Camera, Keyboard, QrCode, X } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { getServiceErrorMessage } from "../lib/serviceErrors";

export function QrCheckInScanner({
  onScan,
  pending,
  label = "QR ile check-in",
}: {
  onScan: (payload: string) => Promise<void> | void;
  pending: boolean;
  label?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const last = useRef("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => () => controls.current?.stop(), []);

  async function submit(payload: string) {
    const value = payload.trim();
    if (!value || pending || value === last.current) return;
    last.current = value;
    try {
      await onScan(value);
      setNotice("Check-in tamamlandı.");
      controls.current?.stop();
      setCameraOpen(false);
    } catch (error) {
      last.current = "";
      setNotice(getServiceErrorMessage(error, "QR kodu doğrulanamadı. Lütfen yeniden dene."));
    }
  }

  async function startCamera() {
    controls.current?.stop();
    setNotice("");
    setCameraOpen(true);
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader(undefined, {
        delayBetweenScanAttempts: 150,
      });
      controls.current = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        videoRef.current!,
        (result) => {
          if (result) void submit(result.getText());
        },
      );
    } catch {
      setCameraOpen(false);
      setNotice(
        "Kamera başlatılamadı. HTTPS ve kamera iznini kontrol et veya manuel girişi kullan.",
      );
    }
  }

  return (
    <section className="admin-form qr-checkin-scanner">
      <div className="section-header compact">
        <h2>
          <QrCode size={20} />
          {label}
        </h2>
        <button
          className="secondary-action"
          onClick={() => void startCamera()}
          type="button"
        >
          <Camera size={17} />
          Kamerayı aç
        </button>
      </div>
      {cameraOpen ? (
        <div className="qr-camera-shell">
          <video muted playsInline ref={videoRef} />
          <div className="qr-scan-frame">
            <i />
            <i />
            <i />
            <i />
          </div>
          <button
            aria-label="Kamerayı kapat"
            onClick={() => {
              controls.current?.stop();
              setCameraOpen(false);
            }}
            type="button"
          >
            <X />
          </button>
        </div>
      ) : null}
      <form
        className="identity-scan-form"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          const form = event.currentTarget;
          void submit(String(new FormData(form).get("payload") ?? "")).then(
            () => form.reset(),
          );
        }}
      >
        <label>
          <Keyboard size={16} />
          QR içeriğini manuel gir
          <textarea
            name="payload"
            placeholder="QR kodunu tara veya içeriğini yapıştır"
            required
            rows={2}
          />
        </label>
        <button className="primary-action" disabled={pending}>
          <QrCode size={17} />
          {pending ? "Doğrulanıyor…" : "Check-in yap"}
        </button>
      </form>
      {notice ? (
        <p
          className={
            notice === "Check-in tamamlandı." ? "form-success" : "form-error"
          }
        >
          {notice}
        </p>
      ) : null}
    </section>
  );
}
