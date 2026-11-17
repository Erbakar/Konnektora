import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CountryCityFields, normalizeTurkishAddress, turkishProvinceName } from "../components/CountryCityFields";
import { LanguageProvider } from "../lib/i18n";

type Province = { code: string; name: string; cities: string[] };
const provinces = JSON.parse(readFileSync(resolve(process.cwd(), "public/data/regions/TR.json"), "utf8")) as Province[];
const districtsOf = (name: string) => provinces.find((row) => row.name === name)?.cities ?? [];

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("17/10 #13 Türkiye il ve ilçe verisi", () => {
  it("contains all 81 provinces with plate codes and all 973 districts", () => {
    expect(provinces).toHaveLength(81);
    expect(new Set(provinces.map((row) => row.name)).size).toBe(81);
    expect(provinces.map((row) => Number(row.code)).sort((a, b) => a - b)).toEqual(Array.from({ length: 81 }, (_, index) => index + 1));
    expect(provinces.reduce((total, row) => total + row.cities.length, 0)).toBe(973);
    for (const row of provinces) {
      expect(new Set(row.cities).size).toBe(row.cities.length);
      expect(row.name).not.toMatch(/Province/);
    }
    expect(provinces.map((row) => row.name)).toEqual(expect.arrayContaining(["İstanbul", "İzmir", "Şanlıurfa", "Iğdır", "Ağrı", "Çanakkale", "Hakkâri", "Kahramanmaraş", "Düzce"]));
  });

  it("lists Istanbul's 39 districts exactly", () => {
    expect([...districtsOf("İstanbul")].sort((a, b) => a.localeCompare(b, "tr"))).toEqual(["Adalar", "Arnavutköy", "Ataşehir", "Avcılar", "Bağcılar", "Bahçelievler", "Bakırköy", "Başakşehir", "Bayrampaşa", "Beşiktaş", "Beykoz", "Beylikdüzü", "Beyoğlu", "Büyükçekmece", "Çatalca", "Çekmeköy", "Esenler", "Esenyurt", "Eyüpsultan", "Fatih", "Gaziosmanpaşa", "Güngören", "Kadıköy", "Kâğıthane", "Kartal", "Küçükçekmece", "Maltepe", "Pendik", "Sancaktepe", "Sarıyer", "Silivri", "Sultanbeyli", "Sultangazi", "Şile", "Şişli", "Tuzla", "Ümraniye", "Üsküdar", "Zeytinburnu"].sort((a, b) => a.localeCompare(b, "tr")));
  });

  it.each([
    ["Ankara", 25, ["Çankaya", "Keçiören", "Kahramankazan", "Şereflikoçhisar"]],
    ["İzmir", 30, ["Konak", "Karşıyaka", "Bayraklı", "Ödemiş"]],
    ["Antalya", 19, ["Muratpaşa", "Konyaaltı", "Döşemealtı", "Kaş"]],
    ["Konya", 31, ["Selçuklu", "Meram", "Karatay", "Yalıhüyük"]],
    ["Hatay", 15, ["Antakya", "Defne", "Arsuz", "Payas"]],
    ["Artvin", 9, ["Merkez", "Kemalpaşa", "Şavşat"]],
    ["Aksaray", 8, ["Merkez", "Sultanhanı"]],
    ["Hakkâri", 5, ["Merkez", "Derecik", "Yüksekova"]],
    ["Bayburt", 3, ["Merkez", "Aydıntepe", "Demirözü"]],
    ["Şırnak", 7, ["Merkez", "Cizre", "Beytüşşebap"]],
    ["Muğla", 13, ["Menteşe", "Bodrum", "Seydikemer"]],
    ["Tekirdağ", 11, ["Süleymanpaşa", "Kapaklı", "Ergene"]],
  ] as Array<[string, number, string[]]>)("%s has %i districts including the expected ones", (name, count, expected) => {
    expect(districtsOf(name)).toHaveLength(count);
    expect(districtsOf(name)).toEqual(expect.arrayContaining(expected));
  });

  it("maps legacy province spellings to the correct Turkish names", () => {
    expect(turkishProvinceName("Istanbul")).toBe("İstanbul");
    expect(turkishProvinceName("Adıyaman Province")).toBe("Adıyaman");
    expect(turkishProvinceName("Canakkale")).toBe("Çanakkale");
    expect(turkishProvinceName("Kadıköy")).toBeUndefined();
    expect(normalizeTurkishAddress("Istanbul", "Ataşehir")).toEqual({ region: "İstanbul", city: "Ataşehir" });
    expect(normalizeTurkishAddress("", "İstanbul")).toEqual({ region: "İstanbul", city: "" });
    expect(normalizeTurkishAddress(null, "Kadıköy")).toEqual({ region: "", city: "Kadıköy" });
  });
});

describe("17/10 #12 Türkiye adres etiketleri", () => {
  const stubData = () => vi.stubGlobal("fetch", vi.fn(async (url: string) => ({ ok: true, json: async () => url.includes("/regions/TR") ? provinces : url.includes("/regions/") ? [{ code: "CA", name: "California", cities: ["Los Angeles"] }] : ["Los Angeles"] })));

  it("labels the province dropdown 'Şehir' and the district dropdown 'İlçe' when Türkiye is selected", async () => {
    stubData();
    render(<LanguageProvider><CountryCityFields addressFields defaultCountry="Türkiye" defaultRegion="Istanbul" defaultCity="Kadıköy"/></LanguageProvider>);
    const province = screen.getByRole("combobox", { name: "Şehir" });
    const district = screen.getByRole("combobox", { name: "İlçe" });
    expect(screen.queryByRole("combobox", { name: "Eyalet / bölge" })).toBeNull();
    expect(province.tagName).toBe("SELECT");
    expect(province).toHaveValue("İstanbul");
    await waitFor(() => expect(within(district).getAllByRole("option")).toHaveLength(40));
    expect(district).toHaveValue("Kadıköy");
    expect(within(province).getAllByRole("option")).toHaveLength(82);
    await userEvent.selectOptions(province, "Ankara");
    expect(district).toHaveValue("");
    expect(within(district).getAllByRole("option")).toHaveLength(26);
    await userEvent.selectOptions(district, "Çankaya");
    expect(district).toHaveValue("Çankaya");
  });

  it("keeps the generic labels for other countries and switches when Türkiye is chosen", async () => {
    stubData();
    render(<LanguageProvider><CountryCityFields addressFields defaultCountry="US" defaultRegion="California" defaultCity="Los Angeles"/></LanguageProvider>);
    expect(screen.getByRole("combobox", { name: "Eyalet / bölge" })).toHaveValue("California");
    expect(screen.getByRole("combobox", { name: "Şehir" })).toHaveValue("Los Angeles");
    expect(screen.queryByRole("combobox", { name: "İlçe" })).toBeNull();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Ülke" }), "Türkiye");
    expect(screen.getByRole("combobox", { name: "Şehir" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "İlçe" })).toBeDisabled();
    expect(screen.queryByRole("combobox", { name: "Eyalet / bölge" })).toBeNull();
  });

  it("moves a legacy province stored in the city field to the province dropdown and still offers 81 provinces if the file fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<LanguageProvider><CountryCityFields addressFields defaultCountry="Türkiye" defaultCity="İzmir"/></LanguageProvider>);
    const province = screen.getByRole("combobox", { name: "Şehir" });
    expect(province).toHaveValue("İzmir");
    expect(within(province).getAllByRole("option")).toHaveLength(82);
    expect(screen.getByRole("combobox", { name: "İlçe" })).toHaveValue("");
  });

  it("still lists the 81 provinces as cities outside address forms (filters, curator form)", () => {
    stubData();
    render(<LanguageProvider><CountryCityFields cityDropdown defaultCountry="Türkiye"/></LanguageProvider>);
    const city = screen.getByRole("combobox", { name: "Şehir" });
    expect(within(city).getAllByRole("option")).toHaveLength(82);
    expect(within(city).getByRole("option", { name: "Şanlıurfa" })).toBeInTheDocument();
    expect(within(city).queryByRole("option", { name: "Kadıköy" })).toBeNull();
  });
});
