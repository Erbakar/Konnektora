import { reverseGeocodeLocation } from "../lib/api";
import { countryCodes } from "../lib/countryCodes";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLanguage } from "../lib/i18n";

const countryCities: Record<string, string[]> = {
  "Türkiye": ["Adana", "Ankara", "Antalya", "Bursa", "Eskişehir", "Gaziantep", "İstanbul", "İzmir", "Kayseri", "Kocaeli", "Konya", "Mersin", "Muğla", "Samsun", "Trabzon"],
  "Almanya": ["Berlin", "Düsseldorf", "Frankfurt", "Hamburg", "Köln", "Münih"],
  "Birleşik Krallık": ["Birmingham", "Edinburgh", "Londra", "Manchester"],
  "Fransa": ["Bordeaux", "Lille", "Lyon", "Marsilya", "Paris"],
  "Hollanda": ["Amsterdam", "Eindhoven", "Rotterdam", "Utrecht"],
  "İspanya": ["Barselona", "Madrid", "Sevilla", "Valensiya"],
  "İtalya": ["Milano", "Napoli", "Roma", "Torino"],
  "Amerika Birleşik Devletleri": ["Chicago", "Los Angeles", "Miami", "New York", "San Francisco", "Seattle"],
};
const countryNamesEn: Record<string, string> = {
  Türkiye: "Turkey",
  Almanya: "Germany",
  "Birleşik Krallık": "United Kingdom",
  Fransa: "France",
  Hollanda: "Netherlands",
  İspanya: "Spain",
  İtalya: "Italy",
  "Amerika Birleşik Devletleri": "United States",
};
const cityNamesEn: Record<string, string> = {
  İstanbul: "Istanbul",
  İzmir: "Izmir",
  Eskişehir: "Eskisehir",
  Münih: "Munich",
  Köln: "Cologne",
  Londra: "London",
  Marsilya: "Marseille",
  Barselona: "Barcelona",
  Valensiya: "Valencia",
  Milano: "Milan",
  Roma: "Rome",
  Torino: "Turin",
};


countryCities["Türkiye"] = ["Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya", "Ardahan", "Artvin", "Aydın", "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkâri", "Hatay", "Iğdır", "Isparta", "İstanbul", "İzmir", "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri", "Kilis", "Kırıkkale", "Kırklareli", "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Mardin", "Mersin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Osmaniye", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Şanlıurfa", "Şırnak", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak"];

/**
 * 17/10 #12-13 — Türkiye adreslerinde üst kırılım "Şehir" (il), alt kırılım "İlçe"dir.
 * Eski kayıtlar GeoNames adlarıyla ("Istanbul", "Adıyaman Province") veya ili şehir alanında tutuyor olabilir;
 * bunlar 81 ilin doğru Türkçe adına eşlenir. İlçe listesi /data/regions/TR.json dosyasından (81 il, 973 ilçe) tembel yüklenir.
 */
const foldTurkish = (value: string) => value.toLocaleLowerCase("tr").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/\s+province$/, "").trim();
const legacyProvinceNames: Record<string, string> = { icel: "Mersin", afyon: "Afyonkarahisar", urfa: "Şanlıurfa", antep: "Gaziantep", maras: "Kahramanmaraş" };
export function turkishProvinceName(value?: string | null) {
  const key = foldTurkish(value ?? "");
  if (!key) return undefined;
  return countryCities["Türkiye"]!.find((name) => foldTurkish(name) === key) ?? legacyProvinceNames[key];
}
export function normalizeTurkishAddress(region?: string | null, city?: string | null) {
  const province = turkishProvinceName(region);
  if (province) return { region: province, city: city ?? "" };
  if (!region?.trim()) {
    // Eski kayıtlarda il, şehir alanında duruyor olabilir ("İstanbul"): ile taşınır, ilçe boş kalır.
    const fromCity = turkishProvinceName(city);
    if (fromCity) return { region: fromCity, city: "" };
  }
  return { region: region ?? "", city: city ?? "" };
}

const trNames = new Intl.DisplayNames(["tr"], { type: "region" });
const enNames = new Intl.DisplayNames(["en"], { type: "region" });
export const regions = countryCodes.map((code) => ({ code, tr: code === "TR" ? "Türkiye" : trNames.of(code) ?? code, en: enNames.of(code) ?? code }));
export function normalizeCountry(value: string) {
  return regions.find((item) => [item.code, item.tr, item.en, countryNamesEn[item.tr]].includes(value))?.tr ?? value;
}
export function CountryCityFields({ addressFields = false, defaultRegion = "", defaultPostalCode = "", defaultCountry = "", defaultCity = "", requiredCountry = false, requiredCity = false, countryLabel, cityLabel, detectLocation = false, cityDropdown = false, onChange }: { addressFields?: boolean; defaultRegion?: string | null; defaultPostalCode?: string | null; defaultCountry?: string | null; defaultCity?: string | null; requiredCountry?: boolean; requiredCity?: boolean; countryLabel?: string; cityLabel?: string; detectLocation?: boolean; cityDropdown?: boolean; onChange?: (country: string, city: string, region?: string) => void }) {
  const { language } = useLanguage();
  // Şehir etiketini kendisi veren formlar (ör. "Firmanın şehri") genel eyalet/şehir düzeninde kalır.
  const turkishAddressMode = addressFields && !cityLabel;
  const initialAddress = () => turkishAddressMode && normalizeCountry(defaultCountry ?? "") === "Türkiye" ? normalizeTurkishAddress(defaultRegion, defaultCity) : { region: defaultRegion ?? "", city: defaultCity ?? "" };
  const [country, setCountry] = useState(normalizeCountry(defaultCountry ?? ""));
  const [administrativeRegion, setAdministrativeRegion] = useState(() => initialAddress().region);
  const [postalCode, setPostalCode] = useState(defaultPostalCode ?? "");
  const [subdivisions, setSubdivisions] = useState<Array<{code:string;name:string;cities:string[]}>>([]);
  const [city, setCity] = useState(() => initialAddress().city);
  const [loaded, setLoaded] = useState<{ code: string; names: string[] }>();
  const [loadError, setLoadError] = useState(false);
  const edited = useRef(false);
  const listId = useId();
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const detect = () => {
    if (!navigator.geolocation) { setLocationError(true); return; }
    setLocating(true); setLocationError(false);
    navigator.geolocation.getCurrentPosition((position) => {
      void reverseGeocodeLocation(position.coords.latitude, position.coords.longitude).then((location) => {
        if (!edited.current && location.country) { const address = turkishAddressMode && normalizeCountry(location.country) === "Türkiye" ? normalizeTurkishAddress("", location.city) : { region: "", city: location.city }; edited.current = true; setCountry(normalizeCountry(location.country)); setCity(address.city); setAdministrativeRegion(address.region); setPostalCode(""); onChange?.(normalizeCountry(location.country), address.city, address.region || undefined); }
      }).catch(() => setLocationError(true)).finally(() => setLocating(false));
    }, () => { setLocating(false); setLocationError(true); }, { timeout: 8000, maximumAge: 300000 });
  };
  useEffect(() => {
    if (!detectLocation || defaultCountry || !navigator.geolocation) return;
    // Only auto-detect when browser permission has already been granted.
    let active = true;
    void navigator.permissions?.query({ name: "geolocation" }).then((permission) => { if (active && permission.state === "granted") detect(); }).catch(() => undefined);
    return () => { active = false; };
  }, [detectLocation]);
  const region = regions.find((item) => item.tr === country);
  useEffect(() => {
    setSubdivisions([]);
    if (!addressFields || !region) return;
    const controller = new AbortController();
    fetch(`/data/regions/${region.code}.json`, {signal:controller.signal}).then(r => r.ok ? r.json() : []).then(rows => { if (!controller.signal.aborted) setSubdivisions(rows); }).catch(() => undefined);
    return () => controller.abort();
  }, [addressFields, region?.code]);
  useEffect(() => {
    if (!edited.current) { const address = initialAddress(); setCountry(normalizeCountry(defaultCountry ?? "")); setCity(address.city); setAdministrativeRegion(address.region); setPostalCode(defaultPostalCode ?? ""); }
  }, [defaultCountry, defaultCity, defaultRegion, defaultPostalCode]);
  useEffect(() => {
    setLoadError(false);
    if (!region || region.code === "TR") return;
    const controller = new AbortController();
    fetch(`/data/cities/${region.code}.json`, { signal: controller.signal }).then((response) => {
      if (!response.ok) throw new Error("Cities unavailable");
      return response.json() as Promise<string[]>;
    }).then((names) => setLoaded({ code: region.code, names })).catch(() => { if (!controller.signal.aborted) setLoadError(true); });
    return () => controller.abort();
  }, [region?.code]);
  const scopedCities = subdivisions.find(row => row.name === administrativeRegion)?.cities;
  // İl listesi dosya yüklenemese de seçilebilsin diye 81 il gömülü listeden tamamlanır.
  const regionOptions = subdivisions.length || !(turkishAddressMode && region?.code === "TR") ? subdivisions : countryCities["Türkiye"]!.map(name => ({ code: name, name, cities: [] as string[] }));
  useEffect(() => {
    // Yalnız ilçe bilinen eski Türkiye kayıtlarında il, ilçe tek bir ile aitse otomatik bulunur.
    if (!(turkishAddressMode && region?.code === "TR") || administrativeRegion || !city || edited.current) return;
    const owners = subdivisions.filter(row => row.cities.includes(city));
    if (owners.length === 1) setAdministrativeRegion(owners[0]!.name);
  }, [addressFields, region?.code, administrativeRegion, city, subdivisions]);
  // Türkiye adres girişinde il → "Şehir", ilçe → "İlçe"; ikisi de tam listeden seçilir.
  const turkishAddress = turkishAddressMode && region?.code === "TR";
  const cities = addressFields && scopedCities?.length ? scopedCities : turkishAddress ? [] : region?.code === "TR" ? countryCities.Türkiye! : loaded?.code === region?.code ? loaded?.names ?? [] : countryCities[country] ?? [];
  const suggestions = useMemo(() => cities.filter((name) => !city || name.toLocaleLowerCase(language).includes(city.toLocaleLowerCase(language))).slice(0, 100), [cities, city, language]);
  const options = [...regions].sort((a, b) => (language === "tr" ? a.tr : a.en).localeCompare(language === "tr" ? b.tr : b.en, language));
  return <>
    {detectLocation ? <><button type="button" className="secondary-action" disabled={locating} onClick={() => { edited.current = false; detect(); }}>{locating ? (language === "tr" ? "Konum bulunuyor…" : "Finding location…") : (language === "tr" ? "Konumumu kullan" : "Use my location")}</button>{locationError ? <small role="status">{language === "tr" ? "Konum alınamadı. Tarayıcı iznini kontrol et veya ülke ve şehri seç." : "Location unavailable. Check browser permission or choose your country and city."}</small> : null}<small className="form-help">© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a></small></> : null}
    <label>{countryLabel ?? (language === "tr" ? "Ülke" : "Country")}<select value={country} name="country" onChange={(event) => { edited.current = true; setCountry(event.target.value); setCity(""); setAdministrativeRegion(""); setPostalCode(""); onChange?.(event.target.value, ""); }} required={requiredCountry}><option value="">{language === "tr" ? "Ülke seçin" : "Select country"}</option>{country && !region ? <option value={country}>{country}</option> : null}{options.map((item) => <option key={item.code} value={item.tr}>{language === "tr" ? item.tr : item.en}</option>)}</select></label>
    {addressFields && <label>{turkishAddress ? (language === "tr" ? "Şehir" : "Province") : language === "tr" ? "Eyalet / bölge" : "State / region"}{cityDropdown || turkishAddress ? <select name="region" value={administrativeRegion} disabled={!country} onChange={e => { edited.current = true; setAdministrativeRegion(e.target.value); setCity(""); setPostalCode(""); onChange?.(country, "", e.target.value); }}><option value="">{turkishAddress ? (language === "tr" ? "Şehir seçin" : "Select province") : language === "tr" ? "Bölge seçin" : "Select region"}</option>{administrativeRegion && !regionOptions.some(row => row.name === administrativeRegion) ? <option value={administrativeRegion}>{administrativeRegion}</option> : null}{regionOptions.map(row => <option key={row.code} value={row.name}>{row.name}</option>)}</select> : <><input name="region" list={`${listId}-regions`} value={administrativeRegion} disabled={!country} maxLength={120} autoComplete="address-level1" onChange={e => { edited.current=true; setAdministrativeRegion(e.target.value); setCity(""); setPostalCode(""); }}/><datalist id={`${listId}-regions`}>{subdivisions.map(row=><option key={row.code} value={row.name}/>)}</datalist></>}</label>}
    <label>{cityLabel ?? (turkishAddress ? (language === "tr" ? "İlçe" : "District") : language === "tr" ? "Şehir" : "City")}{(!addressFields && region?.code === "TR") || cityDropdown || turkishAddress ? <select disabled={!country || turkishAddress && !administrativeRegion} name="city" value={city} required={requiredCity} onChange={(event) => { edited.current = true; setCity(event.target.value); onChange?.(country, event.target.value, administrativeRegion); }}><option value="">{turkishAddress ? (language === "tr" ? "İlçe seçin" : "Select district") : language === "tr" ? "Şehir seçin" : "Select city"}</option>{city && !cities.includes(city) ? <option value={city}>{city}</option> : null}{cities.map((item) => <option key={item} value={item}>{language === "tr" ? item : cityNamesEn[item] ?? item}</option>)}</select> : <><input name="city" list={listId} value={city} disabled={!country} required={requiredCity} maxLength={120} autoComplete="address-level2" onChange={(event) => { edited.current = true; setCity(event.target.value); onChange?.(country, event.target.value, administrativeRegion); }} placeholder={language === "tr" ? "Şehir ara veya yaz" : "Search or enter city"}/><datalist id={listId}>{suggestions.map((item) => <option key={item} value={item}/>)}</datalist></>}</label>
    {addressFields && <label>{language === "tr" ? "Posta kodu (opsiyonel)" : "Postal code (optional)"}<input name="postalCode" value={postalCode} disabled={!country} autoComplete="postal-code" maxLength={20} onChange={e=>{edited.current=true;setPostalCode(e.target.value);}}/></label>}
    {loadError ? <small role="status">{language === "tr" ? "Şehir listesi yüklenemedi. Sayfayı yenileyerek tekrar deneyebilirsin." : "City list unavailable. Refresh the page to try again."}</small> : null}
    <small className="form-help"><a href="https://www.geonames.org/" target="_blank" rel="noreferrer">GeoNames</a> · CC BY 4.0</small>
  </>;
}
