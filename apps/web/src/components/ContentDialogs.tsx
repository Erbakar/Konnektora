import { Bell, BellOff, CalendarDays, CircleDashed, Copy, Facebook, Instagram, LayoutGrid, Mail, QrCode, Send, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState, type ReactNode } from "react";
import { useLanguage } from "../lib/i18n";
import { formatTimeZoneOffset } from "../lib/formats";
import { recordContentShare } from "../lib/api";
import { createCaptionCardFile, createEventStoryFile, createShareImageFile, downloadSocialFile, type EventStoryDetails } from "../lib/socialTemplates";
import { instagramCaptionWithLink } from "../lib/shareCaptions";

export function ShareDialog({
  open,
  onClose,
  title,
  text,
  url,
  targetType,
  targetId,
  storyDetails,
  instagramText,
  instagramImageUrl,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  text?: string;
  url: string;
  targetType: "event" | "place" | "tag" | "user" | "post";
  targetId: string;
  storyDetails?: EventStoryDetails;
  /** 17/10 #3–#9: Instagram (Feed / DM) açıklaması; bağlantı satırı otomatik eklenir. */
  instagramText?: string;
  /** 17/10 #6, #7, #9: Instagram paylaşımına eklenecek görsel (etkinlik kapağı, mekân fotoğrafı, profil fotoğrafı). */
  instagramImageUrl?: string | null;
}) {
  const { language } = useLanguage();
  const [qrImage, setQrImage] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [storyPending, setStoryPending] = useState(false);
  const [storyMessage, setStoryMessage] = useState("");
  const [instagramResult, setInstagramResult] = useState<(InstagramShareResult & { channel?: VisualChannel }) | null>(null);
  const [pendingChannel, setPendingChannel] = useState<VisualChannel | null>(null);
  const [preparedCard, setPreparedCard] = useState<File | null>(null);
  const instagramCaption = instagramCaptionWithLink(instagramText?.trim() || text?.trim() || title, url);
  useEffect(() => {
    if (!open) return;
    void QRCode.toDataURL(url, { width: 240, margin: 1 }).then(setQrImage);
  }, [open, url]);
  // 18/11: kart pencere açılınca hazırlanır; dokunuşta paylaşım menüsü beklemeden açılır (iOS kullanıcı etkileşimi süresi).
  useEffect(() => {
    if (!open) { setPreparedCard(null); return; }
    let active = true;
    void createCaptionCardFile({ caption: instagramCaption, imageUrl: instagramImageUrl, language }).then((file) => { if (active) setPreparedCard(file); }).catch(() => undefined);
    return () => { active = false; };
  }, [open, instagramCaption, instagramImageUrl, language]);
  if (!open) return null;
  const tr = language === "tr";
  const message = `${text?.trim() || title}\n${url}`;
  const track = (channel: string) => void recordContentShare(targetType, targetId, channel).catch(() => undefined);
  const copyLink = () => {
    const done = () => { setCopied(true); setStoryMessage(""); track("copy_link"); };
    // Pano izni olmayan tarayıcılarda URL kutusu seçilip klasik kopyalama denenir.
    const legacyCopy = () => {
      const input = document.querySelector<HTMLInputElement>(".share-sheet-url input");
      input?.select();
      let ok = false;
      try { ok = typeof document.execCommand === "function" && document.execCommand("copy"); } catch { ok = false; }
      if (ok) done(); else setStoryMessage((tr ? "Bağlantı kopyalanamadı: " : "Unable to copy link: ") + url);
    };
    if (!navigator.clipboard) { legacyCopy(); return; }
    void navigator.clipboard.writeText(url).then(done).catch(legacyCopy);
  };
  // 19/11 #4: Instagram, TikTok ve WhatsApp Durum'un web'den metin alan bir paylaşım adresi yoktur;
  // şablon kartı + panodaki açıklama cihazın paylaşım menüsüyle (masaüstünde indirme) gönderilir.
  const shareVisual = (channel: VisualChannel) => {
    setStoryPending(true);
    setPendingChannel(channel);
    setStoryMessage("");
    setInstagramResult(null);
    const story = channel === "instagram_story" || channel === "whatsapp_status";
    void shareToInstagram({ title, url, caption: instagramCaption, qrImage, language, imageUrl: instagramImageUrl, storyDetails: targetType === "event" ? storyDetails : undefined, preparedFile: story && targetType === "event" && storyDetails ? null : preparedCard, format: story ? "story" : "card" })
      .then((result) => { setInstagramResult({ ...result, channel }); track(channel === "instagram_feed" || channel === "instagram_dm" || channel === "instagram_story" ? "instagram_story_dm" : channel); })
      .catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) setStoryMessage(tr ? "Paylaşım hazırlanamadı. Yeniden deneyin veya bağlantıyı paylaşın." : "The share could not be prepared. Try again or share the link."); })
      .finally(() => { setStoryPending(false); setPendingChannel(null); });
  };
  const messengerHref = isMobileDevice() ? `fb-messenger://share/?link=${encodeURIComponent(url)}` : "https://www.messenger.com/new";
  const options: ShareOption[] = [
    { id: "qr", label: tr ? "QR kodu" : "QR code", icon: <QrCode size={24}/>, disabled: !qrImage, onClick: () => { setQrOpen(true); track("qr"); } },
    { id: "email", label: tr ? "E-mail ile gönder" : "Send by email", icon: <Mail size={24}/>, href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(message)}`, onClick: () => track("email") },
    { id: "whatsapp", label: tr ? "WhatsApp Mesaj" : "WhatsApp Message", icon: <WhatsAppIcon/>, href: `https://wa.me/?text=${encodeURIComponent(message)}`, external: true, onClick: () => track("whatsapp") },
    { id: "instagram-dm", label: tr ? "Instagram Mesaj" : "Instagram Message", icon: <Send size={22}/>, onClick: () => shareVisual("instagram_dm"), pending: pendingChannel === "instagram_dm" },
    { id: "instagram-story", label: tr ? "Instagram Story" : "Instagram Story", icon: <Instagram size={24}/>, onClick: () => shareVisual("instagram_story"), pending: pendingChannel === "instagram_story" },
    { id: "instagram-feed", label: tr ? "Instagram Feed" : "Instagram Feed", icon: <LayoutGrid size={22}/>, onClick: () => shareVisual("instagram_feed"), pending: pendingChannel === "instagram_feed" },
    { id: "messenger", label: tr ? "Facebook Mesaj" : "Facebook Message", icon: <MessengerIcon/>, href: messengerHref, external: !messengerHref.startsWith("fb-"), onClick: () => { if (!messengerHref.startsWith("fb-")) void copyText(url).then((done) => done && setStoryMessage(tr ? "Bağlantı kopyalandı; Messenger'da sohbete yapıştır." : "Link copied; paste it into a Messenger chat.")); track("facebook_message"); } },
    { id: "facebook", label: tr ? "Facebook Post" : "Facebook Post", icon: <Facebook size={24}/>, href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, external: true, onClick: () => track("facebook_post") },
    { id: "x", label: tr ? "X Tweet" : "X Post", icon: <XIcon/>, href: `https://x.com/intent/tweet?text=${encodeURIComponent(text?.trim() || title)}&url=${encodeURIComponent(url)}`, external: true, onClick: () => track("x") },
    { id: "tiktok", label: "TikTok", icon: <TikTokIcon/>, onClick: () => shareVisual("tiktok"), pending: pendingChannel === "tiktok" },
    { id: "whatsapp-status", label: tr ? "WhatsApp Durum" : "WhatsApp Status", icon: <CircleDashed size={26}/>, onClick: () => shareVisual("whatsapp_status"), pending: pendingChannel === "whatsapp_status" },
  ];
  return (
    <div
      className="emotion-modal share-sheet-modal"
      role="dialog"
      aria-modal="true"
      aria-label={tr ? "Paylaş" : "Share"}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); /* 07/11 #97–#99: siyah alana tıklayınca kapanır */ }}
    >
      <div>
        <button aria-label={tr ? "Kapat" : "Close"} onClick={onClose}>
          ×
        </button>
        <h2>
          <Share2 size={21} />
          {tr ? "Paylaş" : "Share"}
        </h2>
        <p>{tr ? "Bağlantıyı istediğin kanaldan topluluğunla paylaş." : "Share this link with your community using any channel."}</p>
        <div className="share-sheet-options" role="list">
          {options.map((option) => {
            const content = <><span aria-hidden="true" className="share-sheet-circle">{option.pending ? <span className="share-sheet-spinner"/> : option.icon}</span><span className="share-sheet-label">{option.pending ? tr ? "Hazırlanıyor…" : "Preparing…" : option.label}</span></>;
            return (
              <div className={`share-sheet-option share-${option.id}`} key={option.id} role="listitem">
                {option.href ? (
                  <a aria-label={option.label} href={option.href} onClick={option.onClick} {...(option.external ? { rel: "noopener noreferrer", target: "_blank" } : {})}>{content}</a>
                ) : (
                  <button aria-label={option.label} disabled={option.disabled || storyPending} onClick={option.onClick} type="button">{content}</button>
                )}
              </div>
            );
          })}
        </div>
        <div className="share-sheet-url">
          <input aria-label={tr ? "Paylaşım bağlantısı" : "Share link"} onClick={(event) => { event.currentTarget.select(); copyLink(); }} readOnly value={url}/>
          <button className={copied ? "primary-action" : "secondary-action"} onClick={copyLink} type="button"><Copy size={16}/>{copied ? tr ? "Kopyalandı!" : "Copied!" : tr ? "Kopyala" : "Copy"}</button>
        </div>
        {storyMessage ? <p className="form-success">{storyMessage}</p> : null}
        {instagramResult ? (
          <div className="share-instagram-result" role="status">
            <p className="form-success">{instagramNotice(instagramResult, language, instagramResult.channel)}</p>
            <pre aria-label={tr ? "Paylaşım açıklaması" : "Share caption"} className="share-instagram-caption">{instagramCaption}</pre>
            <div className="share-instagram-result-actions">
              {instagramResult.captionCopied ? null : <button className="secondary-action" onClick={() => void copyText(instagramCaption).then((captionCopied) => setInstagramResult((current) => current ? { ...current, captionCopied } : current))} type="button"><Copy size={17}/>{tr ? "Açıklamayı kopyala" : "Copy caption"}</button>}
              {instagramResult.mode === "shared" ? null : <a className="secondary-action" href={channelHome(instagramResult.channel)} rel="noopener noreferrer" target="_blank">{instagramResult.channel === "tiktok" ? <TikTokIcon/> : instagramResult.channel === "whatsapp_status" ? <WhatsAppIcon/> : <Instagram size={17}/>}{channelOpenLabel(instagramResult.channel, tr)}</a>}
            </div>
          </div>
        ) : null}
        {qrOpen && qrImage ? <div className="share-qr-backdrop" onClick={() => setQrOpen(false)} role="presentation"><section aria-label={tr ? "QR kodu" : "QR code"} aria-modal="true" onClick={(event) => event.stopPropagation()} role="dialog"><img alt={`${title} QR`} height="300" src={qrImage} width="300"/><strong>{tr ? "Ekrana dokunarak paylaşıma dön" : "Tap the screen to return to sharing"}</strong></section></div> : null}
      </div>
    </div>
  );
}

type VisualChannel = "instagram_dm" | "instagram_story" | "instagram_feed" | "tiktok" | "whatsapp_status";
type ShareOption = { id: string; label: string; icon: ReactNode; href?: string; external?: boolean; disabled?: boolean; pending?: boolean; onClick?: () => void };

function isMobileDevice() {
  return typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function channelHome(channel?: VisualChannel) {
  if (channel === "tiktok") return "https://www.tiktok.com/upload";
  if (channel === "whatsapp_status") return "https://web.whatsapp.com/";
  if (channel === "instagram_dm") return "https://www.instagram.com/direct/inbox/";
  return INSTAGRAM_URL;
}

function channelOpenLabel(channel: VisualChannel | undefined, tr: boolean) {
  if (channel === "tiktok") return tr ? "TikTok'u aç" : "Open TikTok";
  if (channel === "whatsapp_status") return tr ? "WhatsApp'ı aç" : "Open WhatsApp";
  return tr ? "Instagram'ı aç" : "Open Instagram";
}

function WhatsAppIcon() {
  return <svg aria-hidden="true" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.6.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3a.5.5 0 0 0 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.6-.3Z"/></svg>;
}

function MessengerIcon() {
  return <svg aria-hidden="true" fill="currentColor" height="24" viewBox="0 0 24 24" width="24"><path d="M12 2C6.4 2 2 6.1 2 11.7c0 2.9 1.2 5.5 3.2 7.2v3.1l3-1.6c1.2.3 2.4.5 3.8.5 5.6 0 10-4.1 10-9.7S17.6 2 12 2Zm1 12.9-2.5-2.7-5 2.7 5.5-5.8 2.6 2.7 4.9-2.7-5.5 5.8Z"/></svg>;
}

function XIcon() {
  return <svg aria-hidden="true" fill="currentColor" height="20" viewBox="0 0 24 24" width="20"><path d="M18.9 1.2h3.7l-8 9.2L24 22.8h-7.4l-5.8-7.6-6.6 7.6H.5l8.6-9.8L0 1.2h7.6l5.2 6.9 6.1-6.9Zm-1.3 19.5h2L6.5 3.2H4.3l13.3 17.5Z"/></svg>;
}

function TikTokIcon() {
  return <svg aria-hidden="true" fill="currentColor" height="22" viewBox="0 0 24 24" width="22"><path d="M16.6 2h-3.5v13.3a3 3 0 1 1-2.6-3V8.8a6.5 6.5 0 1 0 6.1 6.5V8.6a8.3 8.3 0 0 0 4.9 1.6V6.7a4.9 4.9 0 0 1-4.9-4.7Z"/></svg>;
}

const INSTAGRAM_URL = "https://www.instagram.com/";

export type InstagramShareResult = {
  /** shared: cihazın paylaşım menüsü açıldı · downloaded: görsel indirildi · caption_only: yalnızca açıklama hazırlandı */
  mode: "shared" | "downloaded" | "caption_only";
  captionCopied: boolean;
  hasImage: boolean;
};

async function copyText(value: string) {
  try {
    if (!navigator.clipboard) return false;
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function instagramNotice(result: InstagramShareResult, language: "tr" | "en", channel?: VisualChannel) {
  const tr = language === "tr";
  const target = channelTarget(channel, tr);
  const copied = result.captionCopied
    ? tr ? "Açıklama panoya kopyalandı; Instagram'da açıklama / mesaj alanına yapıştır." : "The caption was copied to your clipboard; paste it into the Instagram caption or message field."
    : tr ? "Açıklama otomatik kopyalanamadı; aşağıdaki metni kopyalayıp Instagram'a yapıştır." : "The caption could not be copied automatically; copy the text below and paste it into Instagram.";
  if (result.mode === "shared") return `${tr ? `Paylaşım menüsü açıldı: ${target.pick}.` : `The share menu was opened: ${target.pick}.`} ${copied}`;
  if (result.mode === "downloaded") return `${tr ? `Görsel indirildi. ${target.create} oluşturup görseli ekle.` : `The image was downloaded. Create ${target.create} and attach it.`} ${copied}`;
  return `${tr ? `${target.app}'ı açıp ${target.create} oluştur.` : `Open ${target.app} and create ${target.create}.`} ${copied}`;
}

function channelTarget(channel: VisualChannel | undefined, tr: boolean) {
  switch (channel) {
    case "instagram_dm": return tr ? { app: "Instagram", pick: "Instagram'ı ve ardından Mesaj'ı seç", create: "Instagram'da yeni mesaj" } : { app: "Instagram", pick: "choose Instagram, then Message", create: "a new Instagram message" };
    case "instagram_story": return tr ? { app: "Instagram", pick: "Instagram'ı ve ardından Story'yi seç", create: "Instagram'da yeni Story" } : { app: "Instagram", pick: "choose Instagram, then Story", create: "a new Instagram Story" };
    case "instagram_feed": return tr ? { app: "Instagram", pick: "Instagram'ı ve ardından Feed'i seç", create: "Instagram'da yeni gönderi (Feed)" } : { app: "Instagram", pick: "choose Instagram, then Feed", create: "a new Instagram post (Feed)" };
    case "tiktok": return tr ? { app: "TikTok", pick: "TikTok'u seç", create: "TikTok'ta yeni gönderi" } : { app: "TikTok", pick: "choose TikTok", create: "a new TikTok post" };
    case "whatsapp_status": return tr ? { app: "WhatsApp", pick: "WhatsApp'ı ve ardından Durumum'u seç", create: "WhatsApp'ta yeni Durum" } : { app: "WhatsApp", pick: "choose WhatsApp, then My Status", create: "a new WhatsApp Status" };
    default: return tr ? { app: "Instagram", pick: "Instagram'da Feed veya DM'i seç", create: "Instagram'da yeni gönderi (Feed) veya DM" } : { app: "Instagram", pick: "choose Instagram Feed or DM", create: "a new Instagram post (Feed) or DM" };
  }
}

/**
 * 17/10 #3–#9: Web, Instagram açıklamasını doğrudan dolduramaz. Bu nedenle tek ve tutarlı bir akış kullanılır:
 * 1) açıklama panoya kopyalanır, 2) destekleyen cihazlarda Web Share API ile görsel + açıklama paylaşım menüsüne
 * gönderilir, 3) desteklenmiyorsa görsel indirilir, açıklama ekranda gösterilir ve Instagram bağlantısı sunulur.
 */
export async function shareToInstagram({ title, url, caption, qrImage, language, imageUrl, storyDetails, preparedFile, format = "card" }: { title: string; url: string; caption: string; qrImage: string; language: "tr" | "en"; imageUrl?: string | null; storyDetails?: EventStoryDetails; preparedFile?: File | null; format?: "card" | "story" }): Promise<InstagramShareResult> {
  const captionCopied = await copyText(caption);
  // 19/11 #4: Story / Durum için etkinliklerde dikey hikâye görseli kullanılır.
  let file: File | null = format === "story" && storyDetails ? await createEventStoryFile(title, storyDetails, language).catch(() => null) : null;
  // 18/11: Instagram metni çoğu zaman almadığı için görsel, şablon metnini içeren karttır (QR yok).
  file = file ?? preparedFile ?? await createCaptionCardFile({ caption, imageUrl, language }).catch(() => null);
  if (!file && imageUrl) file = await createShareImageFile(imageUrl).catch(() => null);
  if (!file) file = await createFallbackCard(title, url, qrImage, language, storyDetails).catch(() => null);
  if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title, text: caption, files: [file] });
    return { mode: "shared", captionCopied, hasImage: true };
  }
  if (!file && navigator.share) {
    await navigator.share({ title, text: caption });
    return { mode: "shared", captionCopied, hasImage: false };
  }
  if (file) {
    downloadSocialFile(file);
    return { mode: "downloaded", captionCopied, hasImage: true };
  }
  return { mode: "caption_only", captionCopied, hasImage: false };
}

async function createFallbackCard(title: string, url: string, qrImage: string, language: "tr" | "en", storyDetails?: EventStoryDetails) {
  if (storyDetails) return createEventStoryFile(title, storyDetails, language);
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
  // decode() bazı tarayıcı durumlarında (arka plandaki sekme vb.) hiç sonuçlanmayabiliyor; paylaşım
  // "hazırlanıyor"da takılı kalmasın diye yükleme olayı ve 3 sn sınırıyla beklenir.
  const qr = new Image();
  const qrReady = await new Promise<boolean>((resolve) => {
    const timer = window.setTimeout(() => resolve(qr.complete && qr.naturalWidth > 0), 3000);
    qr.onload = () => { window.clearTimeout(timer); resolve(true); };
    qr.onerror = () => { window.clearTimeout(timer); resolve(false); };
    qr.src = qrImage;
  });
  context.fillStyle = "#ffffff";
  roundRect(context, 90, 1360, 350, 350, 34);
  context.fill();
  if (qrReady) context.drawImage(qr, 125, 1395, 280, 280);
  context.fillStyle = "#113b2a";
  context.font = "700 34px system-ui, sans-serif";
  context.fillText(language === "tr" ? "Detayları görmek için tara" : "Scan to view details", 485, 1485);
  context.font = "500 27px system-ui, sans-serif";
  context.fillText(new URL(url, window.location.origin).hostname, 485, 1540);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error(language === "tr" ? "Kart oluşturulamadı." : "The card could not be created.")), "image/png", 0.96));
  return new File([blob], "konnektora-story.png", { type: "image/png" });
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
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); /* 07/11 #97–#99 */ }}
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

export type CalendarEvent = { title: string; startsAt: string; endsAt?: string | null; location?: string; description?: string; url?: string; timezone?: string | null };

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
  // 07/11 #52: kapatma sağ üstteki × ikonu veya siyah alan; başlıkta "GMT/UTC:+3" gibi saat dilimi farkı.
  const offset = formatTimeZoneOffset(event.timezone || "UTC", event.startsAt).replace(/^GMT/, "GMT/UTC:");
  return <div className="emotion-modal" role="dialog" aria-modal="true" aria-label={language === "tr" ? "Takvimime ekle" : "Add to calendar"} onMouseDown={(mouse) => { if (mouse.target === mouse.currentTarget) onClose(); }}><div><button aria-label={language === "tr" ? "Kapat" : "Close"} onClick={onClose} type="button">×</button><h2><CalendarDays size={21}/>{language === "tr" ? "Takvimime ekle" : "Add to calendar"}</h2><p>{event.title} · {offset}</p><div className="share-dialog-actions"><a className="secondary-action" href={calendarEventLink(event, "google")} target="_blank" rel="noopener noreferrer">Google Calendar</a><a className="secondary-action" href={calendarEventLink(event, "outlook")} target="_blank" rel="noopener noreferrer">Outlook</a><button className="secondary-action" onClick={() => void openCalendarEvent(event)} type="button">Apple / iCal (.ics)</button></div></div></div>;
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
