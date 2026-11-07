export type Territory = { country?: string | null; city?: string | null; region?: string | null };
const norm = (value: unknown) => String(value ?? "").normalize("NFKC").trim().toLocaleLowerCase("tr");
export function territoryMatches(territories: unknown, location: Territory) {
 return Array.isArray(territories) && territories.some((row: Territory) => Boolean(row && norm(row.country) && norm(row.country) === norm(location.country) && (!norm(row.city) || norm(row.city) === norm(location.city)) && (!norm(row.region) || norm(row.region) === norm(location.region))));
}
export function territoriesOverlap(a: Territory, b: Territory) {
 return Boolean(norm(a.country) && norm(a.country) === norm(b.country) && ["city", "region"].every(field => { const key=field as "city"|"region"; return !norm(a[key]) || !norm(b[key]) || norm(a[key])===norm(b[key]); }));
}
