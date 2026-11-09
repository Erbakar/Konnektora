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

/**
 * 07/11 #89–#91: seçili kitlenin (takipçi/ziyaretçi, katılımcı/ziyaretçi, üye/ziyaretçi) son 1 hafta,
 * 1 ay, 3 ay ve 6 ayda profiline en çok yapıştırdığı ilgi alanları. Anahtar: `${prefix}${period}_${etiket}`.
 */
export async function periodInterestMetrics(prisma: PrismaService, prefix: string, userIds: Iterable<string | null | undefined>, now = new Date(), limit = 10) {
  const ids = [...new Set([...userIds].filter((id): id is string => Boolean(id)))].slice(0, 20_000);
  if (!ids.length) return {};
  const rows = await prisma.userInterestTag.findMany({
    where: { userId: { in: ids }, createdAt: { gte: new Date(now.getTime() - 180 * DAY) }, tag: { status: "active" } },
    select: { createdAt: true, tag: { select: { name: true } } },
    take: 100_000,
  });
  const result: Record<string, number> = {};
  for (const [label, days] of interestPeriods) {
    const counts = new Map<string, number>();
    for (const row of rows) if (now.getTime() - row.createdAt.getTime() <= days * DAY) counts.set(row.tag.name, (counts.get(row.tag.name) ?? 0) + 1);
    for (const [name, count] of [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)) result[`${prefix}${label}_${analyticsKey(name)}`] = count;
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
