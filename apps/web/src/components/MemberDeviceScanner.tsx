import type { IScannerControls } from "@zxing/browser";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  Check,
  Keyboard,
  Nfc,
  QrCode,
  ScanLine,
  WifiOff,
  X,
} from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { scanMember } from "../lib/api";
import { getServiceErrorMessage } from "../lib/serviceErrors";
import { useLanguage } from "../lib/i18n";

type NdefRecord = { data?: DataView; encoding?: string };
type NdefReadingEvent = Event & { message: { records: NdefRecord[] } };
type NdefReader = {
  scan(options?: { signal?: AbortSignal }): Promise<void>;
  write(message: {
    records: Array<{ recordType: string; data: string }>;
  }): Promise<void>;
  addEventListener(
    type: "reading",
    listener: (event: NdefReadingEvent) => void,
  ): void;
  addEventListener(type: "readingerror", listener: () => void): void;
};
type NdefReaderConstructor = new () => NdefReader;

export function MemberDeviceScanner({
  userId,
  nfcPayload,
}: {
  userId: string;
  nfcPayload?: string;
}) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrControls = useRef<IScannerControls | null>(null);
  const nfcAbort = useRef<AbortController | null>(null);
  const lastPayload = useRef("");
  const [mode, setMode] = useState<"idle" | "qr" | "nfc" | "manual">("idle");
  const [notice, setNotice] = useState("");
  const scan = useMutation({
    mutationFn: ({
      payload,
      method,
    }: {
      payload: string;
      method: "qr" | "nfc";
    }) => scanMember(payload, method),
    onSuccess: (data) => {
      setNotice(language === "tr" ? `${data.member.name} profili açılıyor.` : `Opening ${data.member.name}'s profile.`);
      stopDevices();
      void queryClient.invalidateQueries({
        queryKey: ["member-scans", userId],
      });
      navigate(`/users/id/${data.member.id}`);
    },
    onError: (error) => {
      lastPayload.current = "";
      setNotice(
        getServiceErrorMessage(
          error,
          t("Kart geçersiz veya artık kullanılamıyor. Lütfen yeniden dene.", "The card is invalid or no longer available. Please try again."),
        ),
      );
    },
  });

  useEffect(
    () => () => {
      qrControls.current?.stop();
      nfcAbort.current?.abort();
    },
    [],
  );
  function stopDevices() {
    qrControls.current?.stop();
    qrControls.current = null;
    nfcAbort.current?.abort();
    nfcAbort.current = null;
    setMode("idle");
  }
  function submitPayload(payload: string, method: "qr" | "nfc") {
    const value = payload.trim();
    if (!value || value === lastPayload.current || scan.isPending) return;
    lastPayload.current = value;
    scan.mutate({ payload: value, method });
  }

  async function startQr() {
    stopDevices();
    setNotice("");
    setMode("qr");
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader(undefined, {
        delayBetweenScanAttempts: 120,
      });
      qrControls.current = await reader.decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
        videoRef.current!,
        (result) => {
          if (result) submitPayload(result.getText(), "qr");
        },
      );
    } catch (error) {
      setMode("idle");
      setNotice(
        error instanceof Error && error.name === "NotAllowedError"
          ? t("Kamera izni verilmedi. Tarayıcı ayarlarından kameraya izin ver veya manuel girişi kullan.", "Camera permission was denied. Allow camera access in your browser settings or use manual entry.")
          : t("QR kamerası başlatılamadı. HTTPS bağlantısını ve kamera desteğini kontrol et.", "The QR camera could not start. Check HTTPS and camera support."),
      );
    }
  }

  async function startNfc() {
    stopDevices();
    setNotice("");
    const Reader = (window as unknown as { NDEFReader?: NdefReaderConstructor })
      .NDEFReader;
    if (!Reader) {
      setNotice(
        t("Web NFC bu cihazda desteklenmiyor. Android Chrome veya QR taramayı kullanabilirsin.", "Web NFC is not supported on this device. Use Android Chrome or QR scanning."),
      );
      return;
    }
    try {
      const reader = new Reader();
      const controller = new AbortController();
      nfcAbort.current = controller;
      reader.addEventListener("reading", (event) => {
        const payload = decodeNdef(event.message.records);
        if (payload) submitPayload(payload, "nfc");
        else setNotice(t("NFC etiketi Konnektora üye kartı içermiyor.", "The NFC tag does not contain a Konnektora member card."));
      });
      reader.addEventListener("readingerror", () =>
        setNotice(
          t("NFC etiketi okunamadı; telefonu etikete yaklaştırıp tekrar dene.", "The NFC tag could not be read. Move your phone closer and try again."),
        ),
      );
      await reader.scan({ signal: controller.signal });
      setMode("nfc");
      setNotice(
        t("NFC taraması hazır. Telefonu diğer üyenin etiketine yaklaştır.", "NFC scanning is ready. Move your phone close to the other member's tag."),
      );
    } catch (error) {
      setMode("idle");
      setNotice(
        error instanceof Error && error.name === "NotAllowedError"
          ? t("NFC izni verilmedi.", "NFC permission was denied.")
          : t("NFC taraması başlatılamadı. HTTPS ve cihaz desteğini kontrol et.", "NFC scanning could not start. Check HTTPS and device support."),
      );
    }
  }

  async function writeNfc() {
    const Reader = (window as unknown as { NDEFReader?: NdefReaderConstructor })
      .NDEFReader;
    if (!Reader || !nfcPayload) {
      setNotice(t("NFC yazma bu cihazda kullanılamıyor.", "NFC writing is unavailable on this device."));
      return;
    }
    try {
      await new Reader().write({
        records: [{ recordType: "url", data: nfcPayload }],
      });
      setNotice(t("Üye kartın NFC etiketine yazıldı.", "Your member card was written to the NFC tag."));
    } catch (error) {
      setNotice(
        error instanceof Error && error.name === "NotAllowedError"
          ? t("NFC yazma izni verilmedi.", "NFC write permission was denied.")
          : t("NFC etiketi yazılamadı veya etiket salt okunur.", "The NFC tag could not be written or is read-only."),
      );
    }
  }

  return (
    <section className="identity-panel device-scanner">
      <div className="section-header compact">
        <div>
          <h2>{t("QR / NFC tara", "Scan QR / NFC")}</h2>
          <p>{t("Gerçek kamerayı veya telefonunun NFC okuyucusunu kullan.", "Use your camera or your phone's NFC reader.")}</p>
        </div>
        <span>
          <ScanLine size={18} /> {t("Hızlı tanışma", "Quick introduction")}
        </span>
      </div>
      <div className="scanner-mode-grid">
        <button
          className={mode === "qr" ? "scanner-mode is-active" : "scanner-mode"}
          onClick={() => void startQr()}
          type="button"
        >
          <QrCode />
          <strong>{t("QR kamera", "QR camera")}</strong>
          <small>{t("Arka kamerayla otomatik tara", "Scan automatically with the rear camera")}</small>
        </button>
        <button
          className={mode === "nfc" ? "scanner-mode is-active" : "scanner-mode"}
          onClick={() => void startNfc()}
          type="button"
        >
          <Nfc />
          <strong>{t("NFC oku", "Read NFC")}</strong>
          <small>{t("Telefonları veya etiketi yaklaştır", "Move the phones or tag close together")}</small>
        </button>
        <button
          className={
            mode === "manual" ? "scanner-mode is-active" : "scanner-mode"
          }
          onClick={() => {
            stopDevices();
            setMode("manual");
          }}
          type="button"
        >
          <Keyboard />
          <strong>{t("Manuel", "Manual")}</strong>
          <small>{t("Kart verisini yapıştır", "Paste the card data")}</small>
        </button>
      </div>
      {mode === "qr" ? (
        <div className="qr-camera-shell">
          <video muted playsInline ref={videoRef} />
          <div className="qr-scan-frame">
            <i />
            <i />
            <i />
            <i />
          </div>
          <span>
            <Camera size={16} /> {t("QR kodu çerçevenin içine getir", "Place the QR code inside the frame")}
          </span>
          <button
            aria-label={t("Kamerayı kapat", "Close camera")}
            onClick={stopDevices}
            type="button"
          >
            <X />
          </button>
        </div>
      ) : null}
      {mode === "nfc" ? (
        <div className="nfc-reading-state">
          <Nfc size={52} />
          <strong>{t("NFC etiketi bekleniyor", "Waiting for NFC tag")}</strong>
          <span>{t("Cihazını üye kartına birkaç santimetre yaklaştır.", "Move your device within a few centimetres of the member card.")}</span>
          <button className="ghost-action" onClick={stopDevices} type="button">
            {t("Taramayı durdur", "Stop scanning")}
          </button>
        </div>
      ) : null}
      {mode === "manual" ? (
        <form
          className="identity-scan-form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const form = event.currentTarget;
            submitPayload(
              String(new FormData(form).get("payload") ?? ""),
              "qr",
            );
            form.reset();
          }}
        >
          <textarea
            aria-label={t("Üye kartı verisi", "Member card data")}
            name="payload"
            placeholder={t("QR/NFC kart verisini yapıştır", "Paste QR/NFC card data")}
            required
            rows={3}
          />
          <button className="primary-action" type="submit">
            <Check size={18} /> {t("Üyeyi bul ve takip et", "Find and follow member")}
          </button>
        </form>
      ) : null}
      <div className="nfc-write-row">
        <div>
          <strong>{t("Kendi NFC kartını oluştur", "Create your NFC card")}</strong>
          <span>
            {t("Üye kartını boş bir NFC etiketine güvenli bağlantı olarak yaz.", "Write your member card to a blank NFC tag as a secure link.")}
          </span>
        </div>
        <button
          className="secondary-action"
          disabled={!nfcPayload}
          onClick={() => void writeNfc()}
          type="button"
        >
          <Nfc size={17} /> {t("NFC etikete yaz", "Write NFC tag")}
        </button>
      </div>
      {!window.isSecureContext ? (
        <p className="scanner-warning">
          <WifiOff size={17} /> {t("Kamera ve NFC canlı ortamda HTTPS gerektirir.", "Camera and NFC require HTTPS in production.")}
        </p>
      ) : null}
      {notice ? (
        <p
          className={
            scan.isSuccess
              ? "success-note"
              : scan.isError
                ? "form-error"
                : "form-help"
          }
        >
          {notice}
        </p>
      ) : null}
    </section>
  );
}

function decodeNdef(records: NdefRecord[]) {
  for (const record of records) {
    if (!record.data) continue;
    const value = new TextDecoder(record.encoding || "utf-8").decode(
      record.data,
    );
    if (
      value.startsWith("konnektora://member?") ||
      value.split(".").length === 3
    )
      return value;
  }
  return "";
}
