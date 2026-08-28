import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "../lib/i18n";
import { LocationPicker } from "../components/LocationPicker";
import { PlacesPage } from "../pages/PlacesPage";

const apiMocks = vi.hoisted(() => ({
  createPlace: vi.fn(),
  geocodeAddress: vi.fn(),
  getUserSession: vi.fn(),
  listMemberSuggestions: vi.fn(),
  listPlaces: vi.fn(),
  listTags: vi.fn(),
}));
const mapMocks = vi.hoisted(() => {
  const map = { on: vi.fn(), remove: vi.fn(), setView: vi.fn() };
  map.setView.mockReturnValue(map);
  const marker = { addTo: vi.fn(), getLatLng: vi.fn(), on: vi.fn(), setLatLng: vi.fn() };
  marker.addTo.mockReturnValue(marker);
  return { map, marker };
});

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, ...apiMocks };
});

vi.mock("leaflet", () => ({
  default: {
    divIcon: vi.fn(() => ({})),
    map: vi.fn(() => mapMocks.map),
    marker: vi.fn(() => mapMocks.marker),
    tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mapMocks.map.setView.mockReturnValue(mapMocks.map);
  mapMocks.marker.addTo.mockReturnValue(mapMocks.marker);
  apiMocks.geocodeAddress.mockResolvedValue({
    found: true,
    latitude: 41.034,
    longitude: 28.977,
  });
  apiMocks.getUserSession.mockReturnValue({ id: "owner-1", role: "user" });
  apiMocks.listMemberSuggestions.mockResolvedValue([]);
  apiMocks.listPlaces.mockResolvedValue({ items: [], page: 1, pageSize: 12, total: 0, hasNextPage: false });
  apiMocks.listTags.mockResolvedValue([]);
  apiMocks.createPlace.mockResolvedValue({ id: "place-1", name: "Konnektora Atölye" });
});

describe("etkinlik ve mekân adres seçici", () => {
  it("yazılan adresi gerçekten arayıp gizli koordinatları ve harita işaretini günceller", async () => {
    const { container } = render(
      <LanguageProvider>
        <LocationPicker addressName="address" />
      </LanguageProvider>,
    );

    const address = screen.getByRole("textbox", { name: "Adres (veya enlem boylam)" });
    await userEvent.clear(address);
    await userEvent.type(address, "İstiklal Caddesi Beyoğlu");
    await userEvent.click(screen.getByRole("button", { name: "Haritada bul" }));

    await waitFor(() => expect(apiMocks.geocodeAddress).toHaveBeenCalledWith("İstiklal Caddesi Beyoğlu", "tr"));
    expect(mapMocks.marker.setLatLng).toHaveBeenCalledWith([41.034, 28.977]);
    expect(mapMocks.map.setView).toHaveBeenCalledWith([41.034, 28.977], 16);
    expect(container.querySelector<HTMLInputElement>('input[name="latitude"]')).toHaveValue("41.034");
    expect(container.querySelector<HTMLInputElement>('input[name="longitude"]')).toHaveValue("28.977");
    expect(screen.getByText("Adres haritada işaretlendi; gerekirse pini taşıyabilirsiniz.")).toBeVisible();
  });

  it("zorunlu mekân bilgileri girildiğinde oluşturma isteğini gönderir ve genel hata göstermeden formu kapatır", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <LanguageProvider>
          <MemoryRouter><PlacesPage /></MemoryRouter>
        </LanguageProvider>
      </QueryClientProvider>,
    );

    await userEvent.click(await screen.findByRole("button", { name: "Mekân oluştur" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Ad" }), "Konnektora Atölye");
    await userEvent.click(screen.getByRole("button", { name: "Mekânı oluştur" }));

    await waitFor(() => expect(apiMocks.createPlace).toHaveBeenCalled());
    expect(apiMocks.createPlace.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      name: "Konnektora Atölye",
      placeType: "food_drink",
      visibility: "open",
    }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Yeni mekân" })).not.toBeInTheDocument());
    expect(screen.queryByText("Mekân oluşturulamadı. Alanları kontrol et.")).not.toBeInTheDocument();
  });
});
