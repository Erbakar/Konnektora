import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "../lib/i18n";
import { keepMapSized } from "../lib/mapResize";
import { TagPicker } from "../components/TagPicker";
import { LocationMap } from "../components/LocationMap";
import { PlacesPage } from "../pages/PlacesPage";

const apiMocks = vi.hoisted(() => ({
  getUserSession: vi.fn(),
  listMemberSuggestions: vi.fn(),
  listPlaces: vi.fn(),
  listTags: vi.fn(),
  getTrendingTagSuggestions: vi.fn(),
}));
vi.mock("../lib/api", async () => ({ ...(await vi.importActual<typeof import("../lib/api")>("../lib/api")), ...apiMocks }));

const mapMocks = vi.hoisted(() => {
  const map = { fitBounds: vi.fn(), on: vi.fn(), remove: vi.fn(), setView: vi.fn(), invalidateSize: vi.fn() };
  const marker = { addTo: vi.fn(), bindPopup: vi.fn() };
  marker.addTo.mockReturnValue(marker);
  marker.bindPopup.mockReturnValue(marker);
  return { map, marker };
});
vi.mock("leaflet", () => {
  const api = { divIcon: vi.fn(() => ({})), map: vi.fn(() => mapMocks.map), marker: vi.fn(() => mapMocks.marker), tileLayer: vi.fn(() => ({ addTo: vi.fn() })) };
  return { default: api, ...api };
});

let resizeCallbacks: Array<() => void> = [];
class ResizeObserverStub { constructor(callback: () => void) { resizeCallbacks.push(callback); } observe() {} disconnect() {} unobserve() {} }

beforeEach(() => {
  vi.clearAllMocks();
  resizeCallbacks = [];
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  mapMocks.marker.addTo.mockReturnValue(mapMocks.marker);
  mapMocks.marker.bindPopup.mockReturnValue(mapMocks.marker);
  apiMocks.getUserSession.mockReturnValue({ id: "owner-1", role: "user" });
  apiMocks.listMemberSuggestions.mockResolvedValue([]);
  apiMocks.listPlaces.mockResolvedValue({ items: [{ id: "p1", slug: "p1", name: "Atölye", latitude: 41, longitude: 29, city: "İstanbul", country: "Türkiye", tags: [] }], page: 1, pageSize: 12, total: 30, hasNextPage: true });
  apiMocks.listTags.mockResolvedValue([]);
  apiMocks.getTrendingTagSuggestions.mockResolvedValue([]);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("26/11 #109, #110: gizli form adımındaki harita", () => {
  it("kapsayıcı görünür olduğunda boyutu yeniden hesaplar ve görünümü yeniden ortalar", () => {
    const element = document.createElement("div");
    const size = { width: 0, height: 0 };
    Object.defineProperty(element, "clientWidth", { get: () => size.width });
    Object.defineProperty(element, "clientHeight", { get: () => size.height });
    const map = { invalidateSize: vi.fn() };
    const onReveal = vi.fn();
    const stop = keepMapSized(map, element, onReveal);
    resizeCallbacks[0]!();
    expect(map.invalidateSize).not.toHaveBeenCalled();
    size.width = 600; size.height = 320;
    resizeCallbacks[0]!();
    expect(map.invalidateSize).toHaveBeenCalledTimes(1);
    expect(onReveal).toHaveBeenCalledTimes(1);
    size.width = 700;
    resizeCallbacks[0]!();
    expect(map.invalidateSize).toHaveBeenCalledTimes(2);
    expect(onReveal).toHaveBeenCalledTimes(1);
    stop();
  });
});

describe("26/11 #107, #108: etiket seçici", () => {
  it("önerilerde '- seç' eki ve forma özgü açıklama gösterir", () => {
    render(<QueryClientProvider client={new QueryClient()}><LanguageProvider><TagPicker label="Mekân etiketleri" recommendationNote="Mekân türüne göre önerilen etiketler önce gösteriliyor; seçmeden mekâna eklenmez." recommendedIds={["t2"]} tags={[{ id: "t1", name: "Kahve" }, { id: "t2", name: "Caz" }] as never}/></LanguageProvider></QueryClientProvider>);
    expect(screen.getByText("Mekân türüne göre önerilen etiketler önce gösteriliyor; seçmeden mekâna eklenmez.")).toBeVisible();
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveTextContent("#Caz - seç");
    expect(buttons[1]).toHaveTextContent("#Kahve - seç");
  });
});

describe("26/11 #125, #126: harita görünümü", () => {
  it("konum izni verilmemişse haritanın altında izin bağlantısı gösterir ve tıklanınca izin ister", async () => {
    const getCurrentPosition = vi.fn();
    Object.defineProperty(window.navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });
    Object.defineProperty(window.navigator, "permissions", { configurable: true, value: { query: vi.fn().mockResolvedValue({ state: "prompt", onchange: null }) } });
    render(<LanguageProvider><LocationMap locationPermissionLink showLinks={false} items={[{ id: "p1", title: "Atölye", latitude: 41, longitude: 29, location: "İstanbul" }]}/></LanguageProvider>);
    const link = await screen.findByRole("button", { name: "Konumunuzu haritada görebilmek için izin verin" });
    expect(getCurrentPosition).not.toHaveBeenCalled();
    fireEvent.click(link);
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it("Mekânlar sayfasında haritada sayfalamayı gizler ve haritaya 50 mekân yükler", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><LanguageProvider><MemoryRouter><PlacesPage/></MemoryRouter></LanguageProvider></QueryClientProvider>);
    expect(await screen.findByRole("button", { name: "Sonraki" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Haritada göster" }));
    await waitFor(() => expect(apiMocks.listPlaces.mock.calls.at(-1)?.[0].get("pageSize")).toBe("50"));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Sonraki" })).not.toBeInTheDocument());
  });
});

describe("26/11 #114: Mekân filtrelerinde Ülke/Şehir", () => {
  it("Ülke Şehir'in üstünde; ülke seçilmeden şehir pasif ve 'Önce ülke seç' yazar", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><LanguageProvider><MemoryRouter><PlacesPage/></MemoryRouter></LanguageProvider></QueryClientProvider>);
    const filters = await screen.findByRole("complementary");
    const country = within(filters).getByLabelText("Ülke") as HTMLSelectElement;
    const city = within(filters).getByLabelText("Şehir") as HTMLSelectElement;
    expect(country.tagName).toBe("SELECT");
    expect(city.tagName).toBe("SELECT");
    expect(country.compareDocumentPosition(city) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(country.value).toBe("");
    expect(country.options[0]!.textContent).toBe("Seçiniz...");
    expect(city).toBeDisabled();
    expect(city.options[0]!.textContent).toBe("Önce ülke seç");
    fireEvent.change(country, { target: { value: "Türkiye" } });
    await waitFor(() => expect(apiMocks.listPlaces.mock.calls.at(-1)?.[0].get("country")).toBe("Türkiye"));
    const cityAfter = within(await screen.findByRole("complementary")).getByLabelText("Şehir") as HTMLSelectElement;
    expect(cityAfter).not.toBeDisabled();
    expect(cityAfter.options[0]!.textContent).toBe("Seçiniz...");
  });
});
