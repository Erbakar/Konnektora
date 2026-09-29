import type { Event } from "@konnektora/shared";

export type EventStoryDetails = {
  startsAt: string;
  endsAt?: string | null;
  timezone?: string;
  venue?: string | null;
  address?: string | null;
  city?: string | null;
};

export type WeeklyWindow = { start: Date; end: Date; endExclusive: Date; dateFrom: string; dateTo: string };

const GREEN = "#24b866";
const DARK_GREEN = "#102d20";
const INK = "#151918";
const LIGHT_GREY = "#eef0ee";
const YELLOW = "#f5cf45";

export async function createEventStoryFile(title: string, details: EventStoryDetails, language: "tr" | "en") {
  await document.fonts?.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const context = canvas.getContext("2d");
  if (!context) throw new Error(language === "tr" ? "Story kartı hazırlanamadı." : "The story card could not be prepared.");

  context.fillStyle = DARK_GREEN;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = LIGHT_GREY;
  context.fillRect(0, 0, canvas.width, 540);
  drawPattern(context, 0, 0, canvas.width, 540, "fade-up");
  drawLogoMark(context, 62, 58, 116);
  drawLogoArt(context, 850, 34, 0.62);

  context.fillStyle = INK;
  context.font = "500 44px Inter, system-ui, sans-serif";
  context.fillText(language === "tr" ? "GELECEK ETKİNLİK:" : "UPCOMING EVENT:", 218, 112);
  context.font = "800 67px Inter, system-ui, sans-serif";
  drawWrappedText(context, title.toLocaleUpperCase(language === "tr" ? "tr-TR" : "en-GB"), 218, 194, 760, 76, 4);

  const mediaX = 62;
  const mediaY = 540;
  const mediaWidth = 956;
  const mediaHeight = 900;
  context.fillStyle = "#ffffff";
  roundRect(context, mediaX, mediaY, mediaWidth, mediaHeight, 24);
  context.fill();
  context.save();
  roundRect(context, mediaX + 18, mediaY + 18, mediaWidth - 36, mediaHeight - 36, 13);
  context.clip();
  context.fillStyle = YELLOW;
  context.fillRect(mediaX + 18, mediaY + 18, mediaWidth - 36, mediaHeight - 36);
  context.restore();

  context.fillStyle = "#ffffff";
  context.font = "800 51px Inter, system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText(formatStoryDate(details, language), 540, 1550);
  context.font = "750 42px Inter, system-ui, sans-serif";
  drawCenteredWrappedText(context, `📍 ${details.venue?.trim() || (language === "tr" ? "ETKİNLİK MEKÂNI" : "EVENT VENUE")}`, 540, 1640, 900, 54, 2);
  context.font = "500 31px Inter, system-ui, sans-serif";
  drawCenteredWrappedText(context, [details.address, details.city].filter(Boolean).join(", ") || (language === "tr" ? "ETKİNLİK AÇIK ADRESİ" : "EVENT ADDRESS"), 540, 1762, 900, 43, 2);
  context.textAlign = "left";
  context.fillStyle = GREEN;
  context.fillRect(0, 1872, 1080, 48);

  return new File([await canvasBlob(canvas, language)], "konnektora-gelecek-etkinlik-story.png", { type: "image/png" });
}

export async function createWeeklyEventFiles(events: Event[], language: "tr" | "en", window = getCurrentWeekWindow()) {
  await document.fonts?.ready;
  const ordered = [...events]
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const groups = groupWeeklyEvents(ordered);
  const files: File[] = [];
  for (let index = 0; index < groups.length; index += 1) {
    const canvas = await drawWeeklySlide(groups[index]!, index, groups.length, language, window);
    files.push(new File([await canvasBlob(canvas, language)], `konnektora-haftanin-etkinlikleri-${index + 1}.png`, { type: "image/png" }));
  }
  return files;
}

export async function shareOrDownloadSocialFiles(files: File[], shareTitle: string) {
  if (navigator.share && navigator.canShare?.({ files })) {
    await navigator.share({ files, title: shareTitle });
    return "shared" as const;
  }
  files.forEach((file, index) => {
    const href = URL.createObjectURL(file);
    window.setTimeout(() => {
      const download = document.createElement("a");
      download.href = href;
      download.download = file.name;
      download.click();
      URL.revokeObjectURL(href);
    }, index * 180);
  });
  return "downloaded" as const;
}

export function formatWeeklyEventTime(event: Pick<Event, "startsAt" | "endsAt" | "timezone">, language: "tr" | "en") {
  const locale = language === "tr" ? "tr-TR" : "en-GB";
  const timeZone = validTimeZone(event.timezone);
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : null;
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone }).format(start);
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone }).format(start);
  if (!end) return `${capitalize(weekday, locale)}, ${time}`;
  const endDay = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone }).format(end);
  const endTime = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone }).format(end);
  if (dateKey(start, timeZone) === dateKey(end, timeZone)) return `${capitalize(weekday, locale)}, ${time} - ${endTime}`;
  return `${capitalize(weekday, locale)} ${time} - ${capitalize(endDay, locale)} ${endTime}`;
}

export function getCurrentWeekWindow(reference = new Date()): WeeklyWindow {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const endExclusive = new Date(start);
  endExclusive.setDate(start.getDate() + 7);
  return { start, end, endExclusive, dateFrom: start.toISOString(), dateTo: new Date(endExclusive.getTime() - 1).toISOString() };
}

function formatStoryDate(details: EventStoryDetails, language: "tr" | "en") {
  const locale = language === "tr" ? "tr-TR" : "en-GB";
  const timeZone = validTimeZone(details.timezone);
  const format = (value: Date) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", weekday: "short", hour: "2-digit", minute: "2-digit", timeZone }).format(value).replace(",", "").toLocaleUpperCase(locale);
  const start = new Date(details.startsAt);
  if (!details.endsAt) return format(start);
  const end = new Date(details.endsAt);
  const startText = format(start);
  const endText = dateKey(start, timeZone) === dateKey(end, timeZone)
    ? new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone }).format(end)
    : format(end);
  return `${startText} - ${endText}`;
}

async function drawWeeklySlide(events: Event[], slideIndex: number, slideCount: number, language: "tr" | "en", window: WeeklyWindow) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext("2d");
  if (!context) throw new Error(language === "tr" ? "Haftalık kart hazırlanamadı." : "The weekly card could not be prepared.");
  context.fillStyle = LIGHT_GREY;
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawPattern(context, 0, 0, canvas.width, canvas.height - 72, "solid");
  drawLogoMark(context, 58, 52, 112);
  context.fillStyle = INK;
  context.font = "850 58px Inter, system-ui, sans-serif";
  context.fillText(language === "tr" ? "HAFTANIN ETKİNLİKLERİ" : "EVENTS OF THE WEEK", 205, 96);
  context.fillStyle = "#66706b";
  context.font = "650 31px Inter, system-ui, sans-serif";
  context.fillText(formatWeeklyRange(window.start, window.end, language), 205, 143);

  const rowHeight = 195;
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]!;
    const y = 205 + index * rowHeight;
    const image = event.coverImageUrl ? await loadImage(event.coverImageUrl) : null;
    context.save();
    context.beginPath();
    context.arc(125, y + 74, 65, 0, Math.PI * 2);
    context.clip();
    if (image) drawCoverImage(context, image, 60, y + 9, 130, 130);
    else {
      context.fillStyle = index % 2 === 0 ? GREEN : YELLOW;
      context.fillRect(60, y + 9, 130, 130);
      drawLogoArt(context, 92, y + 40, 0.28);
    }
    context.restore();
    context.lineWidth = 7;
    context.strokeStyle = index % 2 === 0 ? GREEN : "#ffffff";
    context.beginPath();
    context.arc(125, y + 74, 68, 0, Math.PI * 2);
    context.stroke();

    context.fillStyle = INK;
    context.font = "500 29px Inter, system-ui, sans-serif";
    context.fillText(formatWeeklyEventTime(event, language), 225, y + 43);
    const venue = event.place?.name ?? event.locationName;
    const info = `${event.title.toLocaleUpperCase(language === "tr" ? "tr-TR" : "en-GB")}${venue ? ` @${venue}` : ""}${event.city ? `, ${event.city}` : ""}`;
    drawFittedWrappedText(context, info, 225, y + 91, 790, 39, 3, 34, 25);
  }

  context.fillStyle = "#d6d9d7";
  context.fillRect(0, 1200, 1080, 78);
  context.fillStyle = "#67706c";
  context.font = "700 50px Inter, system-ui, sans-serif";
  context.fillText("→", 934, 1257);
  context.fillStyle = GREEN;
  context.beginPath();
  context.moveTo(0, 1278);
  context.lineTo(1080, 1215);
  context.lineTo(1080, 1350);
  context.lineTo(0, 1350);
  context.closePath();
  context.fill();
  context.fillStyle = "#ffffff";
  context.font = "650 27px Inter, system-ui, sans-serif";
  context.fillText("www.konnektora.com", 735, 1321);
  context.font = "650 21px Inter, system-ui, sans-serif";
  context.fillText(`${slideIndex + 1}/${slideCount}`, 62, 1321);
  return canvas;
}

function drawPattern(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, mode: "fade-up" | "solid") {
  context.save();
  for (let row = -1; row < Math.ceil(height / 94) + 1; row += 1) {
    for (let column = -1; column < Math.ceil(width / 94) + 1; column += 1) {
      const px = x + column * 94;
      const py = y + row * 94;
      const alpha = mode === "fade-up" ? 0.035 + Math.max(0, py / Math.max(height, 1)) * 0.12 : 0.075;
      context.globalAlpha = alpha;
      context.strokeStyle = row % 2 === 0 ? GREEN : "#56615c";
      context.fillStyle = context.strokeStyle;
      context.lineWidth = 5;
      context.beginPath();
      context.moveTo(px + 18, py + 17);
      context.lineTo(px + 65, py + 64);
      context.moveTo(px + 65, py + 17);
      context.lineTo(px + 41, py + 41);
      context.lineTo(px + 65, py + 64);
      context.stroke();
      [[18, 17], [65, 17], [18, 64], [65, 64]].forEach(([dx, dy]) => {
        context.beginPath(); context.arc(px + dx!, py + dy!, 8, 0, Math.PI * 2); context.fill();
      });
    }
  }
  context.restore();
}

function drawLogoMark(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  context.save();
  context.fillStyle = "#18181b";
  roundRect(context, x, y, size, size, size * 0.2);
  context.fill();
  const scale = size / 48;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = 3 * scale;
  context.strokeStyle = "#ffffff";
  context.beginPath(); context.moveTo(x + 14 * scale, y + 14 * scale); context.lineTo(x + 34 * scale, y + 34 * scale); context.stroke();
  context.strokeStyle = "#d8ff54";
  context.beginPath(); context.moveTo(x + 34 * scale, y + 14 * scale); context.lineTo(x + 22 * scale, y + 24 * scale); context.lineTo(x + 34 * scale, y + 34 * scale); context.stroke();
  [[14, 14, "#d8ff54"], [34, 14, "#ffffff"], [14, 34, "#bfc3c1"], [34, 34, "#d8ff54"]].forEach(([cx, cy, color]) => {
    context.fillStyle = String(color); context.beginPath(); context.arc(x + Number(cx) * scale, y + Number(cy) * scale, 4.5 * scale, 0, Math.PI * 2); context.fill();
  });
  context.restore();
}

function drawLogoArt(context: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  context.globalAlpha = 0.8;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = 22;
  context.strokeStyle = "#ffffff";
  context.beginPath(); context.moveTo(30, 35); context.lineTo(185, 190); context.stroke();
  context.strokeStyle = GREEN;
  context.beginPath(); context.moveTo(185, 35); context.lineTo(95, 112); context.lineTo(185, 190); context.stroke();
  [[30, 35, GREEN], [185, 35, "#ffffff"], [30, 190, "#aeb5b1"], [185, 190, GREEN]].forEach(([cx, cy, color]) => {
    context.fillStyle = String(color); context.beginPath(); context.arc(Number(cx), Number(cy), 28, 0, Math.PI * 2); context.fill();
  });
  context.restore();
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
  if (lineNo < maxLines && line) context.fillText(line, x, y + lineNo * lineHeight);
}

function drawCenteredWrappedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const previous = context.textAlign;
  context.textAlign = "center";
  drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxLines);
  context.textAlign = previous;
}

function drawCoverImage(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function canvasBlob(canvas: HTMLCanvasElement, language: "tr" | "en") {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error(language === "tr" ? "Kart oluşturulamadı." : "The card could not be created.")), "image/png", 0.96));
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

export function groupWeeklyEvents(events: Event[]) {
  if (events.length <= 5) return events.length ? [events] : [];
  const groupCount = Math.ceil(events.length / 5);
  const baseSize = Math.floor(events.length / groupCount);
  if (baseSize < 4) return Array.from({ length: groupCount }, (_, index) => events.slice(index * 5, index * 5 + 5)).filter((group) => group.length);
  const largerGroups = events.length % groupCount;
  const groups: Event[][] = [];
  let cursor = 0;
  for (let index = 0; index < groupCount; index += 1) {
    const size = baseSize + (index < largerGroups ? 1 : 0);
    groups.push(events.slice(cursor, cursor + size));
    cursor += size;
  }
  return groups;
}

function formatWeeklyRange(first: Date, last: Date, language: "tr" | "en") {
  const locale = language === "tr" ? "tr-TR" : "en-GB";
  const day = (date: Date) => new Intl.DateTimeFormat(locale, { day: "numeric" }).format(date);
  const dayMonth = (date: Date) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(date);
  return first.getMonth() === last.getMonth() ? `${day(first)} - ${dayMonth(last)}` : `${dayMonth(first)} - ${dayMonth(last)}`;
}

function capitalize(value: string, locale: string) {
  return value.charAt(0).toLocaleUpperCase(locale) + value.slice(1);
}

function drawFittedWrappedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number, initialSize: number, minimumSize: number) {
  let size = initialSize;
  let lines: string[] = [];
  while (size >= minimumSize) {
    context.font = `800 ${size}px Inter, system-ui, sans-serif`;
    lines = wrapText(context, text, maxWidth);
    if (lines.length <= maxLines) break;
    size -= 1;
  }
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    let last = lines[maxLines - 1]!;
    while (last.length > 1 && context.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1).trimEnd();
    lines[maxLines - 1] = `${last}…`;
  }
  lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

function validTimeZone(timezone?: string) {
  if (!timezone) return undefined;
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return undefined;
  }
}

function dateKey(date: Date, timeZone?: string) {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone }).format(date);
}
