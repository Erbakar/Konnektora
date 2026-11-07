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
