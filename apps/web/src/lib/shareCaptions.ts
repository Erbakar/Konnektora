// 17/10 #3–#9: "Instagram'da paylaş" (Feed / DM) açıklama şablonları.
// Her fonksiyon ilgili maddedeki şablonu satır satır üretir; bağlantı satırını ShareDialog ekler.

export type ShareLanguage = "tr" | "en";

const pick = (language: ShareLanguage, tr: string, en: string) => (language === "tr" ? tr : en);
const numberLocale = (language: ShareLanguage) => (language === "tr" ? "tr-TR" : "en-US");
const formatCount = (value: number, language: ShareLanguage) => new Intl.NumberFormat(numberLocale(language)).format(value);
const hashtags = (tags: readonly string[] | undefined, limit: number) => (tags ?? []).filter(Boolean).slice(0, limit).map((tag) => `#${tag}`).join(" ");
const quote = (body: string) => `“${body.trim()}”`;

/** Boş satırlar blok ayırıcıdır; boş kalan satırlar ve bloklar atılır. */
function joinBlocks(blocks: Array<Array<string | null | undefined | false>>) {
  return blocks
    .map((block) => block.filter((line): line is string => Boolean(line && line.trim())).join("\n"))
    .filter(Boolean)
    .join("\n\n");
}

function safeTimeZone(timezone?: string | null) {
  if (!timezone) return undefined;
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return undefined;
  }
}

/** "Oct 17, 2026" / "17 Eki 2026" */
export function formatShareDate(startsAt: string, timezone: string | null | undefined, language: ShareLanguage) {
  return new Intl.DateTimeFormat(numberLocale(language), { day: "numeric", month: "short", year: "numeric", timeZone: safeTimeZone(timezone) }).format(new Date(startsAt));
}

/** "Oct 17 · 21:00" / "17 Eki · 21:00" */
export function formatShareDateTime(startsAt: string, timezone: string | null | undefined, language: ShareLanguage) {
  const timeZone = safeTimeZone(timezone);
  const date = new Date(startsAt);
  const day = new Intl.DateTimeFormat(numberLocale(language), { day: "numeric", month: "short", timeZone }).format(date);
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).format(date);
  return `${day} · ${time}`;
}

/** #3 — Etkinlik Detay > Post paylaş */
export function eventPostInstagramCaption(input: { author: string; body: string; eventTitle: string; venue?: string | null; city?: string | null; startsAt: string; timezone?: string | null }, language: ShareLanguage) {
  return joinBlocks([
    [pick(language, `${input.author} · ${input.eventTitle}`, `${input.author} at ${input.eventTitle}`), quote(input.body)],
    [
      [input.venue, input.city].filter(Boolean).length ? `📍 ${[input.venue, input.city].filter(Boolean).join(", ")}` : "",
      `🎪 ${input.eventTitle}`,
      `📅 ${formatShareDate(input.startsAt, input.timezone, language)}`,
    ],
    [pick(language, "🌎 Gönderiyi Konnektora’da gör →", "🌎 See the post on Konnektora →")],
  ]);
}

/** #4 — Mekân Detay > Post paylaş */
export function placePostInstagramCaption(input: { author: string; body: string; placeName: string; icon?: string | null; city?: string | null; tags?: readonly string[] }, language: ShareLanguage) {
  const place = [input.placeName, input.icon].filter(Boolean).join(" ");
  return joinBlocks([
    [pick(language, `${input.author} · ${place}`, `${input.author} at ${place}`), quote(input.body)],
    [`📍 ${[input.placeName, input.city].filter(Boolean).join(" · ")}`, hashtags(input.tags, 4)],
    [pick(language, "🌎 Gönderiyi Konnektora’da gör →", "🌎 See the post on Konnektora →")],
  ]);
}

/** #5 — İlgi Alanı Detay > Post paylaş */
export function tagPostInstagramCaption(input: { author: string; body: string; tagName: string; likeCount: number }, language: ShareLanguage) {
  return joinBlocks([
    [pick(language, `${input.author} #${input.tagName} ilgi alanında bir gönderi paylaştı`, `${input.author} shared a post in #${input.tagName}`), quote(input.body)],
    [pick(language, `✨ ${formatCount(input.likeCount, language)} kişi bu gönderiyi beğendi.`, `✨ ${formatCount(input.likeCount, language)} people like this post.`)],
    [pick(language, "🌎 Bu gönderiyi Konnektora’da gör →", "🌎 See this post on Konnektora →")],
  ]);
}

/** #6 — Etkinlik Detay > Etkinlik paylaş */
export function eventInstagramCaption(input: { title: string; venue?: string | null; startsAt: string; timezone?: string | null; tags?: readonly string[] }, language: ShareLanguage) {
  return joinBlocks([
    [`🎪 ${input.title}`, input.venue ? `📍 ${input.venue}` : "", `📅 ${formatShareDateTime(input.startsAt, input.timezone, language)}`, hashtags(input.tags, 4)],
    ["🌎 Konnektora →"],
  ]);
}

/** #7 — Mekân Detay > Mekân paylaş */
export function placeInstagramCaption(input: { name: string; icon?: string | null; address?: string | null; city?: string | null; tags?: readonly string[]; followerCount: number }, language: ShareLanguage) {
  const location = [input.address, input.city].filter(Boolean).join(", ");
  return joinBlocks([
    [[input.name, input.icon].filter(Boolean).join(" "), location ? `📍 ${location}` : "", hashtags(input.tags, 4)],
    [pick(language, `✨ ${formatCount(input.followerCount, language)} üye bu mekânı takip ediyor`, `✨ ${formatCount(input.followerCount, language)} members follow this place`)],
    [pick(language, "🌎 Konnektora’da keşfet →", "🌎 Discover on Konnektora →")],
  ]);
}

/** #8 — İlgi Alanı Detay > İlgi alanı paylaş */
export function tagInstagramCaption(input: { name: string; memberCount: number }, language: ShareLanguage) {
  return joinBlocks([
    [`#${input.name}`, pick(language, `✨ ${formatCount(input.memberCount, language)} üye bu etiketi profiline ekledi`, `✨ ${formatCount(input.memberCount, language)} members added this tag into their profile`)],
    [pick(language, `#${input.name} ile bağlantılı etkinlikleri, mekânları ve insanları keşfet.`, `Discover events, places & people connected to #${input.name}.`)],
    [pick(language, "🌎 Konnektora’da keşfet →", "🌎 Explore on Konnektora →")],
  ]);
}

/** #9 — Profil Detay > Profil paylaş */
export function profileInstagramCaption(input: { displayName: string; city?: string | null; country?: string | null; likedTags?: readonly string[]; followerCount: number }, language: ShareLanguage) {
  return joinBlocks([
    [`🤡 ${input.displayName}`, [input.city, input.country].filter(Boolean).join(" · "), hashtags(input.likedTags, 10)],
    [pick(language, `✨ ${formatCount(input.followerCount, language)} üye takip ediyor`, `✨ ${formatCount(input.followerCount, language)} members follow`)],
    [pick(language, "Seni bağlayan ortak noktaları bul.", "Find what connects you.")],
    [pick(language, "🌎 Sayfayı Konnektora’da gör →", "🌎 View page on Konnektora →")],
  ]);
}

/** Paylaşım bağlantısını şablondaki gibi şemasız gösterir: konnektora.com/events/xxxx */
export function instagramCaptionWithLink(caption: string, url: string) {
  return `${caption.trim()}\n${url.replace(/^https?:\/\//i, "")}`;
}
