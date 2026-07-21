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
import { scanMember } from "../lib/api";

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
  const queryClient = useQueryClient();
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
      setNotice(`${data.member.name} takip edildi.`);
      stopDevices();
      void queryClient.invalidateQueries({
        queryKey: ["member-scans", userId],
      });
    },
    onError: (error: Error) => {
      lastPayload.current = "";
      setNotice(error.message || "Kart geçersiz veya artık kullanılamıyor.");
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
          ? "Kamera izni verilmedi. Tarayıcı ayarlarından kameraya izin ver veya manuel girişi kullan."
          : "QR kamerası başlatılamadı. HTTPS bağlantısını ve kamera desteğini kontrol et.",
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
        "Web NFC bu cihazda desteklenmiyor. Android Chrome veya QR taramayı kullanabilirsin.",
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
        else setNotice("NFC etiketi Konnektora üye kartı içermiyor.");
      });
      reader.addEventListener("readingerror", () =>
        setNotice(
          "NFC etiketi okunamadı; telefonu etikete yaklaştırıp tekrar dene.",
        ),
      );
      await reader.scan({ signal: controller.signal });
      setMode("nfc");
      setNotice(
        "NFC taraması hazır. Telefonu diğer üyenin etiketine yaklaştır.",
      );
    } catch (error) {
      setMode("idle");
      setNotice(
        error instanceof Error && error.name === "NotAllowedError"
          ? "NFC izni verilmedi."
          : "NFC taraması başlatılamadı. HTTPS ve cihaz desteğini kontrol et.",
      );
    }
  }

  async function writeNfc() {
    const Reader = (window as unknown as { NDEFReader?: NdefReaderConstructor })
      .NDEFReader;
    if (!Reader || !nfcPayload) {
      setNotice("NFC yazma bu cihazda kullanılamıyor.");
      return;
    }
    try {
      await new Reader().write({
        records: [{ recordType: "url", data: nfcPayload }],
      });
      setNotice("Üye kartın NFC etiketine yazıldı.");
    } catch (error) {
      setNotice(
        error instanceof Error && error.name === "NotAllowedError"
          ? "NFC yazma izni verilmedi."
          : "NFC etiketi yazılamadı veya etiket salt okunur.",
      );
    }
  }

  return (
    <section className="identity-panel device-scanner">
      <div className="section-header compact">
        <div>
          <h2>QR / NFC tara</h2>
          <p>Gerçek kamerayı veya telefonunun NFC okuyucusunu kullan.</p>
        </div>
        <span>
          <ScanLine size={18} /> Hızlı takip
        </span>
      </div>
      <div className="scanner-mode-grid">
        <button
          className={mode === "qr" ? "scanner-mode is-active" : "scanner-mode"}
          onClick={() => void startQr()}
          type="button"
        >
          <QrCode />
          <strong>QR kamera</strong>
          <small>Arka kamerayla otomatik tara</small>
        </button>
        <button
          className={mode === "nfc" ? "scanner-mode is-active" : "scanner-mode"}
          onClick={() => void startNfc()}
          type="button"
        >
          <Nfc />
          <strong>NFC oku</strong>
          <small>Telefonları veya etiketi yaklaştır</small>
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
          <strong>Manuel</strong>
          <small>Kart verisini yapıştır</small>
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
            <Camera size={16} /> QR kodu çerçevenin içine getir
          </span>
          <button
            aria-label="Kamerayı kapat"
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
          <strong>NFC etiketi bekleniyor</strong>
          <span>Cihazını üye kartına birkaç santimetre yaklaştır.</span>
          <button className="ghost-action" onClick={stopDevices} type="button">
            Taramayı durdur
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
            aria-label="Üye kartı verisi"
            name="payload"
            placeholder="QR/NFC kart verisini yapıştır"
            required
            rows={3}
          />
          <button className="primary-action" type="submit">
            <Check size={18} /> Üyeyi bul ve takip et
          </button>
        </form>
      ) : null}
      <div className="nfc-write-row">
        <div>
          <strong>Kendi NFC kartını oluştur</strong>
          <span>
            Üye kartını boş bir NFC etiketine güvenli bağlantı olarak yaz.
          </span>
        </div>
        <button
          className="secondary-action"
          disabled={!nfcPayload}
          onClick={() => void writeNfc()}
          type="button"
        >
          <Nfc size={17} /> NFC etikete yaz
        </button>
      </div>
      {!window.isSecureContext ? (
        <p className="scanner-warning">
          <WifiOff size={17} /> Kamera ve NFC production ortamında HTTPS
          gerektirir.
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
