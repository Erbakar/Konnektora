export type Territory = { country?: string | null; city?: string | null; region?: string | null };
// 17/10 #13: eski GeoNames adları ("Istanbul", "Adıyaman Province") ile doğru Türkçe il adları aynı bölge sayılır.
const norm = (value: unknown) => String(value ?? "").normalize("NFKC").trim().toLocaleLowerCase("tr").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/\s+province$/, "");
export function territoryMatches(territories: unknown, location: Territory) {
 return Array.isArray(territories) && territories.some((row: Territory) => Boolean(row && norm(row.country) && norm(row.country) === norm(location.country) && (!norm(row.city) || norm(row.city) === norm(location.city)) && (!norm(row.region) || norm(row.region) === norm(location.region))));
}
export function territoriesOverlap(a: Territory, b: Territory) {
 return Boolean(norm(a.country) && norm(a.country) === norm(b.country) && ["city", "region"].every(field => { const key=field as "city"|"region"; return !norm(a[key]) || !norm(b[key]) || norm(a[key])===norm(b[key]); }));
}
