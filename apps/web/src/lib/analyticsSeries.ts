export function analyticsSeries(stats: Record<string, number>) {
  const entries = Object.entries(stats).filter(([, value]) => Number.isFinite(value) && value >= 0);
  const counts = ["views", "detailViews", "profileViews", "shares", "comments", "reactions", "followers", "attended"].filter(key => stats[key] !== undefined).map(key => [key, stats[key]] as [string, number]);
  const sentiments = ["likes", "ok", "dislikes"].filter(key => stats[key] !== undefined).map(key => [key, stats[key]] as [string, number]);
  const source = entries.filter(([key]) => key.startsWith("source_"));
  const pie = sentiments.length ? sentiments : source;
  const prefix = ["viewsDay_", "ticketSaleDay_"].find(candidate => entries.some(([key]) => key.startsWith(candidate)));
  const daily = prefix ? entries.filter(([key]) => key.startsWith(prefix) && /^\d{4}[-_]\d{2}[-_]\d{2}$/.test(key.slice(prefix.length))).map(([key, value]) => [key.slice(prefix.length).replaceAll("_", "-"), value] as [string, number]).sort(([a], [b]) => a.localeCompare(b)) : [];
  return { counts, pie, pieKind: sentiments.length ? "sentiment" : "source", daily, dailyKind: prefix === "ticketSaleDay_" ? "ticketOrders" : "views" };
}

const DAY_MS = 86_400_000;
/**
 * 17/11 #103, #104, #107: günlük seriyi boş günleri sıfırla doldurarak döndürür; böylece zaman çizgisi her zaman çizilir.
 * Görüntülenmelerde son `days` gün (UTC, bugün dahil); bilet siparişlerinde ilk satıştan son satışa (en az iki gün).
 */
export function fillDailySeries(daily: Array<[string, number]>, kind: string, now = Date.now(), days = 30): Array<[string, number]> {
  const values = new Map(daily);
  const today = Math.floor(now / DAY_MS) * DAY_MS;
  let first = today - (days - 1) * DAY_MS;
  let last = today;
  if (kind !== "views" && daily.length) {
    first = Date.parse(daily[0]![0]);
    last = Date.parse(daily[daily.length - 1]![0]);
    if (first === last) first -= DAY_MS;
  } else if (daily.length) first = Math.min(first, Date.parse(daily[0]![0]));
  if (!Number.isFinite(first) || !Number.isFinite(last) || last < first) return daily;
  const filled: Array<[string, number]> = [];
  for (let day = first; day <= last; day += DAY_MS) { const key = new Date(day).toISOString().slice(0, 10); filled.push([key, values.get(key) ?? 0]); }
  return filled;
}
