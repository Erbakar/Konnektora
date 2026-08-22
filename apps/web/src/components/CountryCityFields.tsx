import { useMemo, useState } from "react";

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

export function CountryCityFields({ defaultCountry = "", defaultCity = "", requiredCountry = false, requiredCity = false }: { defaultCountry?: string | null; defaultCity?: string | null; requiredCountry?: boolean; requiredCity?: boolean }) {
  const [country, setCountry] = useState(defaultCountry ?? "");
  const cities = useMemo(() => countryCities[country] ?? [], [country]);
  const countryOptions = defaultCountry && !countryCities[defaultCountry] ? [defaultCountry, ...Object.keys(countryCities)] : Object.keys(countryCities);
  const cityOptions = defaultCity && !cities.includes(defaultCity) ? [defaultCity, ...cities] : cities;

  return <>
    <label>Ülke<select defaultValue={defaultCountry ?? ""} name="country" onChange={(event) => setCountry(event.target.value)} required={requiredCountry}><option value="">Ülke seçin</option>{countryOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
    <label>Şehir<select defaultValue={defaultCity ?? ""} name="city" required={requiredCity}><option value="">Şehir seçin</option>{cityOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
  </>;
}
