import { cleanup, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { CountryCityFields } from "../components/CountryCityFields";
import { LanguageProvider } from "../lib/i18n";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("offers all countries and all 81 Turkish provinces and clears the old city when switching country", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ["Berlin", "Hamburg"] }));
  render(<LanguageProvider><CountryCityFields defaultCountry="TR" defaultCity="İstanbul" /></LanguageProvider>);
  expect(within(screen.getByRole("combobox", { name: "Ülke" })).getAllByRole("option")).toHaveLength(251);
  expect(within(screen.getByRole("combobox", { name: "Şehir" })).getAllByRole("option")).toHaveLength(82);
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Ülke" }), "Almanya");
  const city = screen.getByRole("combobox", { name: "Şehir" });
  expect(city).toHaveValue("");
  await userEvent.type(city, "Hamburg");
  expect(city).toHaveValue("Hamburg");
});
it("keeps manual entries when inferred location arrives late, including when city download fails", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  const view = render(<LanguageProvider><CountryCityFields /></LanguageProvider>);
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Ülke" }), "Japonya");
  await userEvent.type(screen.getByRole("combobox", { name: "Şehir" }), "Kyoto");
  view.rerender(<LanguageProvider><CountryCityFields defaultCountry="TR" defaultCity="İstanbul" /></LanguageProvider>);
  expect(screen.getByRole("combobox", { name: "Ülke" })).toHaveValue("Japonya");
  expect(screen.getByRole("combobox", { name: "Şehir" })).toHaveValue("Kyoto");
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Şehir listesi yüklenemedi"));
});

it("uses downloaded city options for non-Turkish event filters", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ["Berlin", "Hamburg"] }));
  render(<LanguageProvider><CountryCityFields cityDropdown defaultCountry="TR" defaultCity="İstanbul" /></LanguageProvider>);
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Ülke" }), "Almanya");
  await screen.findByRole("option", { name: "Hamburg" });
  const city = screen.getByRole("combobox", { name: "Şehir" });
  expect(city.tagName).toBe("SELECT");
  expect(city).toHaveValue("");
  await userEvent.selectOptions(city, "Hamburg");
  expect(city).toHaveValue("Hamburg");
});

it("restores the full address, scopes city suggestions by region and clears dependent fields", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url:string) => ({ok:true,json:async()=>url.includes("/regions/")?[{code:"CA",name:"California",cities:["Los Angeles"]},{code:"NY",name:"New York",cities:["Buffalo"]}]:["Los Angeles","Buffalo"]})));
  render(<LanguageProvider><CountryCityFields addressFields defaultCountry="US" defaultRegion="California" defaultCity="Los Angeles" defaultPostalCode="90001"/></LanguageProvider>);
  const region=screen.getByRole("combobox",{name:"Eyalet / bölge"});
  expect(region).toHaveValue("California");expect(screen.getByLabelText("Posta kodu")).toHaveValue("90001");
  await waitFor(()=>expect(document.querySelector('datalist option[value="New York"]')).not.toBeNull());
  await userEvent.clear(region);await userEvent.type(region,"New York");
  expect(screen.getByRole("combobox",{name:"Şehir"})).toHaveValue("");expect(screen.getByLabelText("Posta kodu")).toHaveValue("");
  expect(document.querySelector('datalist option[value="Buffalo"]')).not.toBeNull();
  expect(document.querySelector('datalist option[value="Los Angeles"]')).toBeNull();
  await userEvent.selectOptions(screen.getByRole("combobox",{name:"Ülke"}),"Türkiye");expect(region).toHaveValue("");
});
