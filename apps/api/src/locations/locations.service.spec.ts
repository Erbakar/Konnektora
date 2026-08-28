import { BadRequestException } from "@nestjs/common";
import { LocationsService } from "./locations.service";

describe("LocationsService", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("validates address length", () => {
    const service = new LocationsService();
    expect(() => service.geocode("x")).toThrow(BadRequestException);
  });

  it("geocodes and caches an address with an identified provider request", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          lat: "41.0339",
          lon: "28.9778",
          display_name: "İstiklal Caddesi, Beyoğlu, İstanbul",
        },
      ],
    }) as jest.Mock;
    const service = new LocationsService();

    await expect(service.geocode("İstiklal Caddesi Beyoğlu")).resolves.toEqual({
      found: true,
      latitude: 41.0339,
      longitude: 28.9778,
      displayName: "İstiklal Caddesi, Beyoğlu, İstanbul",
    });
    await service.geocode("  İstiklal   Caddesi Beyoğlu  ");

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("nominatim.openstreetmap.org/search"),
      expect.objectContaining({
        headers: expect.objectContaining({
          "User-Agent": expect.stringContaining("konnektora.com/contact"),
        }),
      }),
    );
  });

  it("returns a stable not-found response", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }) as jest.Mock;
    await expect(
      new LocationsService().geocode("Olmayan bir test adresi"),
    ).resolves.toEqual({ found: false });
  });
});
