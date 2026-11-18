import { PrismaService } from "../prisma/prisma.service";

/** İstatistik anahtarı: "Müzik Festivali" → "muzik_festivali" (diğer servislerdeki metricKey ile aynı). */
export function analyticsKey(value: string) {
  return value.toLocaleLowerCase("tr-TR").replace(/ı/g, "i").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "belirtilmedi";
}

export function analyticsPrefix(prefix: string, values: Record<string, number>) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [`${prefix}_${analyticsKey(key)}`, value]));
}

const DAY = 86_400_000;
export const interestPeriods = [["7d", 7], ["30d", 30], ["90d", 90], ["180d", 180]] as const;

export type InterestInsightOptions = {
  now?: Date;
  limit?: number;
  /** Verilirse satırlar bu etiket adlarıyla sınırlanır ve sıfır değerli olanlar da listelenir (17/11 #111–#113 "etiketleri değerlendir"). */
  fixedTags?: string[];
  /** Kullanıcı başına TL harcama (kapsamdaki etkinliklerin başarılı ödemeleri); verilirse `${prefix}Revenue_${etiket}` üretilir. */
  spendByUser?: Map<string, number>;
};

/**
 * 07/11 #89–#91: seçili kitlenin (takipçi/ziyaretçi, katılımcı/ziyaretçi, üye/ziyaretçi) son 1 hafta,
 * 1 ay, 3 ay ve 6 ayda profiline en çok yapıştırdığı ilgi alanları. Anahtar: `${prefix}${period}_${etiket}`.
 *
 * 17/11 #111–#113: her satır için ayrıca dönemdeki beğenen / kararsız / beğenmeyen sayıları
 * (`${prefix}Like|Ok|Dislike${period}_${etiket}`), bir önceki eş uzunluktaki dönemin sayıları
 * (`${prefix}LikePrev|OkPrev|DislikePrev${period}_${etiket}`) ve etiketi profilinde taşıyan kullanıcıların
 * kapsamdaki etkinliklere tüm zamanlarda yaptığı TL ödeme toplamı (`${prefix}Revenue_${etiket}`).
 */
export async function periodInterestMetrics(prisma: PrismaService, prefix: string, userIds: Iterable<string | null | undefined>, nowOrOptions: Date | InterestInsightOptions = new Date(), limitArg = 10) {
  const options: InterestInsightOptions = nowOrOptions instanceof Date ? { now: nowOrOptions, limit: limitArg } : nowOrOptions;
  const now = options.now ?? new Date();
  const fixed = options.fixedTags ? [...new Set(options.fixedTags.map((name) => name.trim()).filter(Boolean))].slice(0, 200) : null;
  const limit = options.limit ?? (fixed ? 20 : 10);
  const ids = [...new Set([...userIds].filter((id): id is string => Boolean(id)))].slice(0, 20_000);
  if (fixed ? !fixed.length : !ids.length) return {};
  const fixedKeys = fixed ? new Set(fixed.map(analyticsKey)) : null;
  const rows = ids.length ? (await prisma.userInterestTag.findMany({
    where: { userId: { in: ids }, createdAt: { gte: new Date(now.getTime() - 360 * DAY) }, tag: { status: "active" } },
    select: { createdAt: true, sentiment: true, tag: { select: { name: true } } },
    take: 100_000,
  })).filter((row) => !fixedKeys || fixedKeys.has(analyticsKey(row.tag.name))) : [];
  const result: Record<string, number> = {};
  const listed = new Map<string, string>();
  for (const name of fixed ?? []) listed.set(analyticsKey(name), name);
  for (const [label, days] of interestPeriods) {
    const counts = new Map<string, { total: number; like: number; ok: number; dislike: number; likePrev: number; okPrev: number; dislikePrev: number }>();
    for (const key of fixedKeys ?? []) counts.set(key, { total: 0, like: 0, ok: 0, dislike: 0, likePrev: 0, okPrev: 0, dislikePrev: 0 });
    for (const row of rows) {
      const age = now.getTime() - row.createdAt.getTime();
      if (age < 0 || age > 2 * days * DAY) continue;
      const key = analyticsKey(row.tag.name);
      const current = counts.get(key) ?? { total: 0, like: 0, ok: 0, dislike: 0, likePrev: 0, okPrev: 0, dislikePrev: 0 };
      const sentiment = row.sentiment === "dislike" ? "dislike" : row.sentiment === "ok" ? "ok" : "like";
      if (age <= days * DAY) { current.total += 1; current[sentiment] += 1; } else current[`${sentiment}Prev`] += 1;
      counts.set(key, current);
      if (!listed.has(key)) listed.set(key, row.tag.name);
    }
    const top = [...counts.entries()].filter(([, value]) => fixedKeys ? true : value.total > 0).sort((a, b) => b[1].total - a[1].total).slice(0, limit);
    for (const [key, value] of top) {
      result[`${prefix}${label}_${key}`] = value.total;
      for (const [suffix, count] of [["Like", value.like], ["Ok", value.ok], ["Dislike", value.dislike], ["LikePrev", value.likePrev], ["OkPrev", value.okPrev], ["DislikePrev", value.dislikePrev]] as const) if (count > 0) result[`${prefix}${suffix}${label}_${key}`] = count;
    }
  }
  const spenders = options.spendByUser ? [...options.spendByUser.keys()].slice(0, 20_000) : [];
  const shownKeys = new Set(Object.keys(result).filter((key) => interestPeriods.some(([label]) => key.startsWith(`${prefix}${label}_`))).map((key) => key.slice(key.indexOf("_") + 1)));
  if (spenders.length && shownKeys.size) {
    const names = [...shownKeys].map((key) => listed.get(key)).filter((name): name is string => Boolean(name));
    const carriers = await prisma.userInterestTag.findMany({ where: { userId: { in: spenders }, tag: { status: "active", name: { in: names } } }, select: { userId: true, tag: { select: { name: true } } }, take: 100_000 });
    const revenue = new Map<string, number>();
    for (const row of carriers) { const key = analyticsKey(row.tag.name); revenue.set(key, (revenue.get(key) ?? 0) + (options.spendByUser!.get(row.userId) ?? 0)); }
    for (const [key, amount] of revenue) if (amount > 0 && shownKeys.has(key)) result[`${prefix}Revenue_${key}`] = Math.round(amount * 100) / 100;
  }
  return result;
}

/** 17/11 #111–#113: ödeyen kullanıcı başına TL tutar (iade düşülmüş). TRY dışı para birimleri güncel kurla çevrilir. */
export async function spendByPayerTry(payments: Array<{ payerId: string; grossAmount: unknown; refundedAmount?: unknown; currency?: string | null }>) {
  const spend = new Map<string, number>();
  const foreign = payments.some((payment) => (payment.currency || "TRY").toUpperCase() !== "TRY");
  const rates = foreign ? await usdRates() : {};
  for (const payment of payments) {
    const amount = Math.max(0, Number(payment.grossAmount ?? 0) - Number(payment.refundedAmount ?? 0));
    const currency = (payment.currency || "TRY").toUpperCase();
    const tryAmount = currency === "TRY" ? amount : rates[currency] && rates.TRY ? amount * rates[currency]! / rates.TRY : null;
    if (tryAmount === null || tryAmount <= 0) continue;
    spend.set(payment.payerId, (spend.get(payment.payerId) ?? 0) + tryAmount);
  }
  return spend;
}

export const seriesPeriods = ["24h", "7d", "30d", "12m"] as const;
export type SeriesPeriod = typeof seriesPeriods[number];
const HOUR = 3_600_000;
/** Gün ve ay kovaları Türkiye saatine (UTC+3, yaz saati yok) hizalanır. */
const SERIES_TZ_OFFSET = 3 * HOUR;

/** 17/11 #66, #80, #85, #114: seçili dönemin kovalarının başlangıç anları (eskiden yeniye). Web'deki eşi: StatsCharts.seriesBucketStarts. */
export function seriesBucketStarts(period: SeriesPeriod, now: Date | number) {
  const at = typeof now === "number" ? now : now.getTime();
  if (period === "24h") { const last = Math.floor(at / HOUR) * HOUR; return Array.from({ length: 24 }, (_, index) => last - (23 - index) * HOUR); }
  if (period === "12m") { const local = new Date(at + SERIES_TZ_OFFSET); return Array.from({ length: 12 }, (_, index) => Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - (11 - index), 1) - SERIES_TZ_OFFSET); }
  const count = period === "7d" ? 7 : 30;
  const last = Math.floor((at + SERIES_TZ_OFFSET) / DAY) * DAY - SERIES_TZ_OFFSET;
  return Array.from({ length: count }, (_, index) => last - (count - 1 - index) * DAY);
}

/**
 * Dönem sekmelerine göre gerçek zaman serisi: 24 saat → saatlik 24 kova, 7 gün → günlük 7, 30 gün → günlük 30,
 * 12 ay → aylık 12. Anahtar: `ts_<seri>_<dönem>_<sıra>` (yalnız sıfırdan büyük kovalar) ve kovaların hizalandığı an `tsNow` (epoch saniye).
 */
export function timeSeriesMetrics(series: Record<string, Array<Date | null | undefined>>, now = new Date()) {
  const at = now.getTime();
  const result: Record<string, number> = { tsNow: Math.floor(at / 1000) };
  for (const period of seriesPeriods) {
    const starts = seriesBucketStarts(period, at);
    for (const [name, dates] of Object.entries(series)) {
      for (const date of dates) {
        const time = date?.getTime();
        if (time === undefined || time > at || time < starts[0]!) continue;
        let index = starts.length - 1;
        while (index > 0 && starts[index]! > time) index -= 1;
        const key = `ts_${name}_${period}_${index}`;
        result[key] = (result[key] ?? 0) + 1;
      }
    }
  }
  return result;
}

/** 17/11 #103, #104, #107: son `days` günün (UTC) günlük sayıları; anahtar `${prefix}_YYYY_MM_DD`. Boş günleri web tarafı sıfırla doldurur. */
export function dailyCountMetrics(prefix: string, dates: Array<Date | null | undefined>, now = new Date(), days = 30) {
  const result: Record<string, number> = {};
  const earliest = Math.floor(now.getTime() / DAY) * DAY - (days - 1) * DAY;
  for (const date of dates) {
    if (!date || date.getTime() < earliest || date.getTime() > now.getTime()) continue;
    const key = `${prefix}_${date.toISOString().slice(0, 10).replaceAll("-", "_")}`;
    result[key] = (result[key] ?? 0) + 1;
  }
  return result;
}

/**
 * 07/11 #74, #84: QR/NFC ile profil takası. Katılımcı kitlesi içinde takas yapan kişi sayısı, oranı,
 * toplam takas ve kişi başına takas.
 */
export function socializationMetrics(scans: Array<{ scannerId: string; memberId: string; method?: string | null }>, population: Iterable<string>) {
  const people = new Set(population);
  const relevant = scans.filter((scan) => people.has(scan.scannerId) || people.has(scan.memberId));
  const exchangers = new Set<string>();
  for (const scan of relevant) { if (people.has(scan.scannerId)) exchangers.add(scan.scannerId); if (people.has(scan.memberId)) exchangers.add(scan.memberId); }
  const methods: Record<string, number> = {};
  for (const scan of relevant) { const method = scan.method === "nfc" ? "nfc" : "qr"; methods[method] = (methods[method] ?? 0) + 1; }
  return {
    profileExchanges: relevant.length,
    profileExchangers: exchangers.size,
    profileExchangeRate: people.size ? Math.min(100, Math.round(exchangers.size / people.size * 100)) : 0,
    profileExchangesPerPerson: people.size ? Math.round(relevant.length / people.size * 10) / 10 : 0,
    ...analyticsPrefix("exchangeMethod", methods),
  };
}

const usdFallback: Record<string, number> = { USD: 1, TRY: 0.024, EUR: 1.08, GBP: 1.27 };
let usdCache: { at: number; rates: Record<string, number> } | null = null;

/** 1 birim para biriminin USD karşılığı. ECB (frankfurter.app) kurları 12 saat önbelleklenir; erişilemezse sabit yedek tablo. */
export async function usdRates(): Promise<Record<string, number>> {
  if (usdCache && Date.now() - usdCache.at < 12 * 3_600_000) return usdCache.rates;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2_500);
    const response = await fetch("https://api.frankfurter.app/latest?from=USD", { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) throw new Error(String(response.status));
    const body = await response.json() as { rates?: Record<string, number> };
    const rates: Record<string, number> = { USD: 1 };
    for (const [currency, perUsd] of Object.entries(body.rates ?? {})) if (perUsd > 0) rates[currency] = 1 / perUsd;
    usdCache = { at: Date.now(), rates: { ...usdFallback, ...rates } };
  } catch {
    usdCache = { at: Date.now() - 11 * 3_600_000, rates: usdCache?.rates ?? usdFallback };
  }
  return usdCache.rates;
}

export function toUsd(amount: number, currency: string | null | undefined, rates: Record<string, number>) {
  const rate = rates[(currency || "TRY").toUpperCase()];
  return rate === undefined ? null : amount * rate;
}

const dayKeys = ["paz", "pzt", "sal", "car", "per", "cum", "cmt"] as const;
/** 07/11 #81: gün × saat (12:00–22:00, 2 saatlik) yoğunluk; ağırlık = satılan bilet. Anahtar: density_<gün>_<saat>. */
export function densityMetrics(rows: Array<{ startsAt: Date; timezone?: string | null; weight: number }>) {
  const result: Record<string, number> = {};
  for (const row of rows) {
    if (row.weight <= 0) continue;
    let weekday = row.startsAt.getUTCDay();
    let hour = row.startsAt.getUTCHours();
    try {
      const parts = new Intl.DateTimeFormat("en-US", { timeZone: row.timezone || "Europe/Istanbul", weekday: "short", hour: "numeric", hourCycle: "h23" }).formatToParts(row.startsAt);
      weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.find((part) => part.type === "weekday")?.value ?? "Sun");
      hour = Number(parts.find((part) => part.type === "hour")?.value ?? hour);
    } catch { /* geçersiz saat dilimi: UTC */ }
    const slot = hour < 12 ? 12 : Math.min(22, hour - (hour % 2));
    const key = `density_${dayKeys[weekday]}_${slot}`;
    result[key] = (result[key] ?? 0) + row.weight;
  }
  return result;
}

/** 17/11 #105, #109, #117: check-in anlarının gün × saat (2 saatlik, 00:00–22:00) dağılımı. Anahtar: checkinHeat_<gün>_<saat>. */
export function checkinHeatmapMetrics(rows: Array<{ at: Date | null | undefined; timezone?: string | null }>, prefix = "checkinHeat") {
  const result: Record<string, number> = {};
  for (const row of rows) {
    if (!row.at) continue;
    const { weekday, hour } = localWeekdayHour(row.at, row.timezone);
    const key = `${prefix}_${dayKeys[weekday]}_${hour - (hour % 2)}`;
    result[key] = (result[key] ?? 0) + 1;
  }
  return result;
}

function localWeekdayHour(date: Date, timezone?: string | null) {
  let weekday = date.getUTCDay();
  let hour = date.getUTCHours();
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone || "Europe/Istanbul", weekday: "short", hour: "numeric", hourCycle: "h23" }).formatToParts(date);
    const index = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.find((part) => part.type === "weekday")?.value ?? "");
    const parsed = Number(parts.find((part) => part.type === "hour")?.value);
    if (index >= 0 && Number.isFinite(parsed)) { weekday = index; hour = parsed % 24; }
  } catch { /* geçersiz saat dilimi: UTC */ }
  return { weekday, hour };
}
