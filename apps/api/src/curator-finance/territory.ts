export type Territory = { country?: string | null; city?: string | null; region?: string | null };
// 17/10 #13: eski GeoNames adları ("Istanbul", "Adıyaman Province") ile doğru Türkçe il adları aynı bölge sayılır.
const norm = (value: unknown) => String(value ?? "").normalize("NFKC").trim().toLocaleLowerCase("tr").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/\s+province$/, "");
export function territoryMatches(territories: unknown, location: Territory) {
 return Array.isArray(territories) && territories.some((row: Territory) => Boolean(row && norm(row.country) && norm(row.country) === norm(location.country) && (!norm(row.city) || norm(row.city) === norm(location.city)) && (!norm(row.region) || norm(row.region) === norm(location.region))));
}
export function territoriesOverlap(a: Territory, b: Territory) {
 return Boolean(norm(a.country) && norm(a.country) === norm(b.country) && ["city", "region"].every(field => { const key=field as "city"|"region"; return !norm(a[key]) || !norm(b[key]) || norm(a[key])===norm(b[key]); }));
}

// 17/10 #13: Türkiye adresleri artık il = region, ilçe = city olarak kaydediliyor; eski kayıtlarda il "city" alanında
// ve GeoNames yazımıyla ("Istanbul", "Adıyaman Province") duruyor. Veritabanı sorgusunda iki düzen de eşleşsin diye
// bir bölge adının olası yazımları ve hem city hem region alanı aranır.
const turkishProvinces = ["Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya", "Ardahan", "Artvin", "Aydın", "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkâri", "Hatay", "Iğdır", "Isparta", "İstanbul", "İzmir", "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri", "Kırıkkale", "Kırklareli", "Kırşehir", "Kilis", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Şanlıurfa", "Şırnak", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak"];
const foldTurkish = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/İ/g, "I");
export function territoryNameVariants(value: string) {
  const name = value.trim().replace(/\s+province$/i, "");
  const ascii = foldTurkish(name);
  // Aksansız yazılmış il adı ("Istanbul", "Sanliurfa") doğru Türkçe yazımıyla da aranır.
  const province = turkishProvinces.find(item => foldTurkish(item).toLocaleLowerCase("en") === ascii.toLocaleLowerCase("en"));
  return [...new Set([name, ascii, ...(province ? [province] : []), `${name} Province`, `${ascii} Province`])];
}
export function territoryWhere(row: Territory) {
  const equalsAny = (field: "city" | "region", value: string) => territoryNameVariants(value).map(name => ({ [field]: { equals: name, mode: "insensitive" as const } }));
  const country = { country: { equals: String(row.country ?? ""), mode: "insensitive" as const } };
  const city = row.city?.trim();
  const region = row.region?.trim();
  if (city && region) return { AND: [country, { OR: equalsAny("city", city) }, { OR: equalsAny("region", region) }] };
  const single = city || region;
  if (single) return { AND: [country, { OR: [...equalsAny("city", single), ...equalsAny("region", single)] }] };
  return country;
}
