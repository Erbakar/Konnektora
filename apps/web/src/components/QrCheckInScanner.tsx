import type { IScannerControls } from "@zxing/browser";
import { Camera, Radio, QrCode, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getServiceErrorMessage } from "../lib/serviceErrors";
import { useLanguage } from "../lib/i18n";

export function QrCheckInScanner({
  onScan,
  pending,
  label = "QR ile check-in",
}: {
  onScan: (payload: string, method: "qr" | "nfc") => Promise<void> | void;
  pending: boolean;
  label?: string;
}) {
  const { language } = useLanguage();
  const tr = language === "tr";
  const videoRef = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const last = useRef("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeSuccess, setNoticeSuccess] = useState(false);
  useEffect(() => () => controls.current?.stop(), []);

  async function submit(payload: string, method: "qr" | "nfc") {
    const value = payload.trim();
    if (!value || pending || value === last.current) return;
    last.current = value;
    try {
      await onScan(value, method);
      setNotice(
        tr
          ? "Katılımcı bulundu. Pasaport kontrolü açılıyor."
          : "Participant found. Opening passport check.",
      );
      setNoticeSuccess(true);
      last.current = "";
      controls.current?.stop();
      setCameraOpen(false);
    } catch (error) {
      last.current = "";
      setNoticeSuccess(false);
      setNotice(
        getServiceErrorMessage(
          error,
          tr
            ? "QR kodu doğrulanamadı. Lütfen yeniden dene."
            : "The QR code could not be verified. Please try again.",
        ),
      );
    }
  }

  async function startCamera() {
    controls.current?.stop();
    setNotice("");
    setNoticeSuccess(false);
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
          if (result) void submit(result.getText(), "qr");
        },
      );
    } catch {
      setCameraOpen(false);
      setNotice(
        tr
          ? "Kamera başlatılamadı. HTTPS ve kamera iznini kontrol edin."
          : "The camera could not be started. Check HTTPS and camera permission.",
      );
    }
  }

  async function startNfc() {
    const Reader = (window as unknown as { NDEFReader?: new () => { scan: () => Promise<void>; addEventListener: (name: string, listener: (event: { message: { records: Array<{ data?: DataView; recordType: string }> } }) => void) => void } }).NDEFReader;
    if (!Reader) {
      setNotice(
        tr
          ? "Bu cihaz veya tarayıcı NFC okumayı desteklemiyor."
          : "This device or browser does not support NFC reading.",
      );
      setNoticeSuccess(false);
      return;
    }
    try {
      const reader = new Reader();
      await reader.scan();
      setNotice(
        tr
          ? "NFC kartını cihazın arkasına yaklaştırın."
          : "Hold the NFC card near the back of the device.",
      );
      setNoticeSuccess(true);
      reader.addEventListener("reading", (event) => {
        const record = event.message.records.find((item) => item.recordType === "text" || item.recordType === "url");
        if (record?.data) void submit(new TextDecoder().decode(record.data), "nfc");
      });
    } catch {
      setNotice(
        tr
          ? "NFC okuma başlatılamadı. Cihaz iznini kontrol edin."
          : "NFC reading could not be started. Check device permission.",
      );
      setNoticeSuccess(false);
    }
  }

  return (
    <section className="admin-form qr-checkin-scanner">
      <div className="section-header compact">
        <h2>
          <QrCode size={20} />
          {label}
        </h2>
        <div className="row-actions">
          <button
            className="secondary-action"
            onClick={() => void startCamera()}
            type="button"
          >
            <Camera size={17} />
            {tr ? "Kamerayı aç" : "Open camera"}
          </button>
          <button
            className="secondary-action"
            onClick={() => void startNfc()}
            type="button"
          >
            <Radio size={17} />
            {tr ? "NFC tara" : "Scan NFC"}
          </button>
        </div>
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
            aria-label={tr ? "Kamerayı kapat" : "Close camera"}
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
      {notice ? (
        <p
          className={noticeSuccess ? "form-success" : "form-error"}
        >
          {notice}
        </p>
      ) : null}
    </section>
  );
}
