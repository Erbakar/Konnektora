import { useMemo, useState } from "react";
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

export function CountryCityFields({ defaultCountry = "", defaultCity = "", requiredCountry = false, requiredCity = false }: { defaultCountry?: string | null; defaultCity?: string | null; requiredCountry?: boolean; requiredCity?: boolean }) {
  const { language } = useLanguage();
  const [country, setCountry] = useState(defaultCountry ?? "");
  const countryKey = useMemo(() => Object.keys(countryCities).find((key) => key === country || countryNamesEn[key] === country) ?? country, [country]);
  const cities = useMemo(() => countryCities[countryKey] ?? [], [countryKey]);
  const countryOptions = defaultCountry && !countryCities[defaultCountry]
    ? [defaultCountry, ...Object.keys(countryCities).filter((key) => countryNamesEn[key] !== defaultCountry)]
    : Object.keys(countryCities);
  const cityOptions = defaultCity && !cities.includes(defaultCity) ? [defaultCity, ...cities] : cities;

  return <>
    <label>{language === "tr" ? "Ülke" : "Country"}<select defaultValue={defaultCountry ?? ""} name="country" onChange={(event) => setCountry(event.target.value)} required={requiredCountry}><option value="">{language === "tr" ? "Ülke seçin" : "Select country"}</option>{countryOptions.map((item) => <option key={item} value={item}>{language === "tr" ? item : countryNamesEn[item] ?? item}</option>)}</select></label>
    <label>{language === "tr" ? "Şehir" : "City"}<select defaultValue={defaultCity ?? ""} name="city" required={requiredCity}><option value="">{language === "tr" ? "Şehir seçin" : "Select city"}</option>{cityOptions.map((item) => <option key={item} value={item}>{language === "tr" ? item : cityNamesEn[item] ?? item}</option>)}</select></label>
  </>;
}
