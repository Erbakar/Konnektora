import { Bell, BellOff, Copy, Instagram, Mail, QrCode, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { useLanguage } from "../lib/i18n";
import { recordContentShare } from "../lib/api";
import { createEventStoryFile, shareOrDownloadSocialFiles, type EventStoryDetails } from "../lib/socialTemplates";

export function ShareDialog({
  open,
  onClose,
  title,
  text,
  url,
  targetType,
  targetId,
  storyDetails,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  text?: string;
  url: string;
  targetType: "event" | "place" | "tag" | "user" | "post";
  targetId: string;
  storyDetails?: EventStoryDetails;
}) {
  const { language } = useLanguage();
  const [qrImage, setQrImage] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [storyPending, setStoryPending] = useState(false);
  const [storyMessage, setStoryMessage] = useState("");
  useEffect(() => {
    if (!open) return;
    void QRCode.toDataURL(url, { width: 240, margin: 1 }).then(setQrImage);
  }, [open, url]);
  if (!open) return null;
  const message = `${text?.trim() || title}\n${url}`;
  const track = (channel: string) => void recordContentShare(targetType, targetId, channel).catch(() => undefined);
  const supportsSocialCard = /\/(events|places|tags)\//.test(new URL(url, window.location.origin).pathname);
  return (
    <div
      className="emotion-modal"
      role="dialog"
      aria-modal="true"
      aria-label={language === "tr" ? "Paylaş" : "Share"}
    >
      <div>
        <button aria-label={language === "tr" ? "Kapat" : "Close"} onClick={onClose}>
          ×
        </button>
        <h2>
          <Share2 size={21} />
          {language === "tr" ? "Paylaş" : "Share"}
        </h2>
        <p>{language === "tr" ? "Bağlantıyı istediğin kanaldan topluluğunla paylaş." : "Share this link with your community using any channel."}</p>
        <div className="share-dialog-actions">
          <button
            className="secondary-action"
            onClick={() => { if (!navigator.clipboard) { setStoryMessage(language === "tr" ? "Bağlantı: " + url : "Link: " + url); return; } void navigator.clipboard.writeText(url).then(() => { setCopied(true); track("copy_link"); }).catch(() => setStoryMessage(language === "tr" ? "Bağlantı kopyalanamadı: " + url : "Unable to copy link: " + url)); }}
          >
            <Copy size={17} />
            {copied ? language === "tr" ? "URL kopyalandı!" : "URL copied!" : language === "tr" ? "Bağlantıyı kopyala" : "Copy link"}
          </button>
          <button className="secondary-action" disabled={!qrImage} onClick={() => setQrOpen(true)}><QrCode size={17}/>{language === "tr" ? "QR kodu" : "QR code"}</button>
          <a
            className="secondary-action"
            href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(message)}`}
            onClick={() => track("email")}
          >
            <Mail size={17} />
            {language === "tr" ? "E-posta" : "Email"}
          </a>
          <a
            className="secondary-action"
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            onClick={() => track("whatsapp")}
            rel="noreferrer"
            target="_blank"
          >
            WhatsApp
          </a>
          {supportsSocialCard ? <button className="secondary-action" disabled={!qrImage || storyPending} onClick={() => { setStoryPending(true); setStoryMessage(""); void shareStoryCard(title, url, qrImage, language, targetType === "event" ? storyDetails : undefined).then((result) => { setStoryMessage(result); track("instagram_story_dm"); }).catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) setStoryMessage(language === "tr" ? "Kart hazırlanamadı. Yeniden deneyin veya bağlantıyı paylaşın." : "The card could not be prepared. Try again or share the link."); }).finally(() => setStoryPending(false)); }}><Instagram size={17}/>{storyPending ? language === "tr" ? "Kart hazırlanıyor…" : "Preparing card…" : "Instagram Story / DM"}</button> : null}
          {navigator.share ? (
            <button
              className="primary-action"
              onClick={() => void navigator.share({ title, text: text?.trim() || title, url }).then(() => { track("native_share"); onClose(); }).catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) setStoryMessage(language === "tr" ? "Paylaşım açılamadı. Bağlantıyı kopyalayın." : "Unable to open sharing. Copy the link instead."); })}
            >
              <Share2 size={17} />
              {language === "tr" ? "Diğer uygulamalar" : "Other apps"}
            </button>
          ) : null}
        </div>
        {storyMessage ? <p className="form-success">{storyMessage}</p> : null}
        {qrOpen && qrImage ? <div className="share-qr-backdrop" onClick={() => setQrOpen(false)} role="presentation"><section aria-label={language === "tr" ? "QR kodu" : "QR code"} aria-modal="true" onClick={(event) => event.stopPropagation()} role="dialog"><img alt={`${title} QR`} height="300" src={qrImage} width="300"/><strong>{language === "tr" ? "Ekrana dokunarak paylaşıma dön" : "Tap the screen to return to sharing"}</strong></section></div> : null}
      </div>
    </div>
  );
}

async function shareStoryCard(title: string, url: string, qrImage: string, language: "tr" | "en", storyDetails?: EventStoryDetails) {
  if (storyDetails) {
    const file = await createEventStoryFile(title, storyDetails, language);
    const result = await shareOrDownloadSocialFiles([file], title);
    return result === "shared"
      ? language === "tr" ? "Etkinlik Story kartı Instagram veya seçtiğiniz uygulamaya gönderildi." : "The event Story card was sent to Instagram or your selected app."
      : language === "tr" ? "Etkinlik Story kartı indirildi." : "The event Story card was downloaded.";
  }
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const context = canvas.getContext("2d");
  if (!context) throw new Error(language === "tr" ? "Paylaşım kartı hazırlanamadı." : "The sharing card could not be prepared.");
  const gradient = context.createLinearGradient(0, 0, 1080, 1920);
  gradient.addColorStop(0, "#0b3e2b");
  gradient.addColorStop(0.58, "#176c4a");
  gradient.addColorStop(1, "#dff2e7");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1080, 1920);
  context.fillStyle = "rgba(255,255,255,.12)";
  context.beginPath();
  context.arc(920, 260, 360, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#ffffff";
  context.font = "700 54px system-ui, sans-serif";
  context.fillText("KONNEKTORA", 90, 145);
  context.font = "800 92px system-ui, sans-serif";
  drawWrappedText(context, title, 90, 560, 900, 112, 5);
  context.font = "500 38px system-ui, sans-serif";
  context.fillStyle = "rgba(255,255,255,.84)";
  context.fillText(language === "tr" ? "İlgi alanlarından gerçek bağlantılara." : "From shared interests to real connections.", 90, 1220);
  const qr = new Image();
  qr.src = qrImage;
  await qr.decode();
  context.fillStyle = "#ffffff";
  roundRect(context, 90, 1360, 350, 350, 34);
  context.fill();
  context.drawImage(qr, 125, 1395, 280, 280);
  context.fillStyle = "#113b2a";
  context.font = "700 34px system-ui, sans-serif";
  context.fillText(language === "tr" ? "Detayları görmek için tara" : "Scan to view details", 485, 1485);
  context.font = "500 27px system-ui, sans-serif";
  context.fillText(new URL(url, window.location.origin).hostname, 485, 1540);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error(language === "tr" ? "Kart oluşturulamadı." : "The card could not be created.")), "image/png", 0.96));
  const file = new File([blob], "konnektora-story.png", { type: "image/png" });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title, text: `${title}\n${url}`, files: [file] });
    return language === "tr" ? "Paylaşım kartı Instagram veya seçtiğiniz uygulamaya gönderildi." : "The sharing card was sent to Instagram or your selected app.";
  }
  const download = document.createElement("a");
  download.href = URL.createObjectURL(blob);
  download.download = "konnektora-story.png";
  download.click();
  URL.revokeObjectURL(download.href);
  await navigator.clipboard?.writeText(url).catch(() => undefined);
  return language === "tr" ? "Story kartı indirildi. Instagram'da Story veya DM olarak paylaşabilirsiniz." : "The Story card was downloaded. You can share it as an Instagram Story or DM.";
}

function drawWrappedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const words = text.split(/\s+/);
  let line = "";
  let lineNo = 0;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      context.fillText(line, x, y + lineNo * lineHeight);
      line = word;
      lineNo += 1;
      if (lineNo === maxLines - 1) break;
    } else line = candidate;
  }
  if (lineNo < maxLines) context.fillText(line, x, y + lineNo * lineHeight);
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
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
  calendar?: CalendarEvent;
}) {
  const { language } = useLanguage();
  const [addToCalendar, setAddToCalendar] = useState(false);
  const [calendarProvider, setCalendarProvider] = useState("google");
  if (!open) return null;
  return (
    <div
      className="emotion-modal"
      role="dialog"
      aria-modal="true"
      aria-label={language === "tr" ? "Bildirim ayarı" : "Notification setting"}
    >
      <div>
        <button aria-label={language === "tr" ? "Kapat" : "Close"} onClick={onClose}>
          ×
        </button>
        <h2>
          {enabled ? <BellOff size={21} /> : <Bell size={21} />}{language === "tr" ? `Bildirimleri ${enabled ? "kapat" : "aç"}` : `${enabled ? "Turn off" : "Turn on"} notifications`}
        </h2>
        <p>
          {language === "tr" ? <><strong>{title}</strong> için yeni içerik ve önemli güncellemeler hakkında bildirim {enabled ? "almayı durduracaksın" : "alacaksın"}.</> : <><strong>{title}</strong> {enabled ? "will stop sending you" : "will send you"} notifications about new content and important updates.</>}
        </p>
        {!enabled && calendar ? <label className="calendar-notification-option"><input checked={addToCalendar} onChange={(event) => setAddToCalendar(event.target.checked)} type="checkbox"/> {language === "tr" ? "Bu etkinliği varsayılan takvimime de eklemek istiyorum." : "I also want to add this event to my default calendar."}</label> : null}
        {!enabled && addToCalendar && calendar ? <label>{language === "tr" ? "Takvim uygulaması" : "Calendar app"}<select value={calendarProvider} onChange={event => setCalendarProvider(event.target.value)}><option value="google">Google Calendar</option><option value="outlook">Outlook</option><option value="file">Apple / iCal (.ics)</option></select></label> : null}
        <div className="row-actions">
          <button className="ghost-action" onClick={onClose}>
            {language === "tr" ? "Vazgeç" : "Cancel"}
          </button>
          <button
            className="primary-action"
            disabled={pending}
            onClick={() => { if (!enabled && addToCalendar && calendar) void addCalendarEvent(calendar, calendarProvider); onConfirm(); }}
          >
            {pending
              ? language === "tr" ? "Kaydediliyor…" : "Saving…"
              : enabled
                ? language === "tr" ? "Bildirimleri kapat" : "Turn off notifications"
                : language === "tr" ? "Bildirimleri aç" : "Turn on notifications"}
          </button>
        </div>
      </div>
    </div>
  );
}

export type CalendarEvent = { title: string; startsAt: string; endsAt?: string | null; location?: string; description?: string; url?: string };

export function calendarEventLink(event: CalendarEvent, provider: "google" | "outlook") {
  const end = event.endsAt ?? new Date(new Date(event.startsAt).getTime() + 3600000).toISOString();
  const details = [event.description, event.url].filter(Boolean).join("\n\n");
  const format = (value: string) => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  if (provider === "google") return `https://calendar.google.com/calendar/render?${new URLSearchParams({ action: "TEMPLATE", text: event.title, dates: `${format(event.startsAt)}/${format(end)}`, details, location: event.location ?? "", ctz: "UTC" })}`;
  return `https://outlook.live.com/calendar/0/deeplink/compose?${new URLSearchParams({ subject: event.title, startdt: new Date(event.startsAt).toISOString(), enddt: new Date(end).toISOString(), body: details, location: event.location ?? "" })}`;
}

export async function addCalendarEvent(event: CalendarEvent, provider: string) {
  if (provider === "google" || provider === "outlook") { window.open(calendarEventLink(event, provider), "_blank", "noopener,noreferrer"); return; }
  await openCalendarEvent(event);
}

export function CalendarDialog({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  const { language } = useLanguage();
  return <div className="dialog-backdrop"><section className="content-dialog" role="dialog" aria-modal="true" aria-label={language === "tr" ? "Takvimime ekle" : "Add to calendar"}><h2>{language === "tr" ? "Takvimime ekle" : "Add to calendar"}</h2><p>{event.title} · GMT/UTC</p><div className="share-dialog-actions"><a className="secondary-action" href={calendarEventLink(event, "google")} target="_blank" rel="noopener noreferrer">Google Calendar</a><a className="secondary-action" href={calendarEventLink(event, "outlook")} target="_blank" rel="noopener noreferrer">Outlook</a><button className="secondary-action" onClick={() => void openCalendarEvent(event)}>Apple / iCal (.ics)</button><button className="secondary-action" onClick={onClose}>{language === "tr" ? "Kapat" : "Close"}</button></div></section></div>;
}

async function openCalendarEvent(event: CalendarEvent) {
  const format = (value: string) => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const escape = (value = "") => value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const start = format(event.startsAt);
  const end = format(event.endsAt ?? new Date(new Date(event.startsAt).getTime() + 60 * 60 * 1000).toISOString());
  const content = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Konnektora//TR", "BEGIN:VEVENT", `UID:${crypto.randomUUID()}@konnektora.com`, `DTSTAMP:${format(new Date().toISOString())}`, `DTSTART:${start}`, `DTEND:${end}`, `SUMMARY:${escape(event.title)}`, `DESCRIPTION:${escape([event.description, event.url].filter(Boolean).join("\n\n"))}`, ...(event.url ? [`URL:${event.url.replace(/[\r\n]/g, "")}`] : []), `LOCATION:${escape(event.location)}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const fileName = `${event.title.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9çğıöşü]+/gi, "-").replace(/^-|-$/g, "") || "etkinlik"}.ics`;
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const file = new File([blob], fileName, { type: "text/calendar" });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title: event.title, files: [file] });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      // The file download below remains a reliable browser fallback.
    }
  }
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}
