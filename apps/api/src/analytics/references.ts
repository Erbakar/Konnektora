export type AnalyticsReference = { metricKey: string; name: string; to: string; kind: "tag" | "event" | "user" | "place" };
export function analyticsReference(prefix: string, name: string, to: string, kind: AnalyticsReference["kind"]): AnalyticsReference {
  const key = name.toLocaleLowerCase("tr-TR").replace(/ı/g, "i").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "belirtilmedi";
  return { metricKey: `${prefix}_${key}`, name, to, kind };
}
// Metrics generated from names cannot identify two records with the same normalized label.
export function uniqueAnalyticsReferences(rows: AnalyticsReference[]) {
  const groups = new Map<string, AnalyticsReference[]>();
  for (const row of rows) groups.set(row.metricKey, [...(groups.get(row.metricKey) ?? []), row]);
  return [...groups.values()].filter(group => new Set(group.map(row => row.to)).size === 1).map(group => group[0]!);
}
