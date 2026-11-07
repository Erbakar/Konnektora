import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from "@nestjs/common";

export type GeocodedLocation = {
  found: boolean;
  latitude?: number;
  longitude?: number;
  displayName?: string;
};

type NominatimResult = {
  lat?: string;
  lon?: string;
  display_name?: string;
};

@Injectable()
export class LocationsService {
  private readonly cache = new Map<
    string,
    { expiresAt: number; value: GeocodedLocation }
  >();
  private readonly pending = new Map<string, Promise<GeocodedLocation>>();
  private queue: Promise<unknown> = Promise.resolve();
  private lastProviderRequestAt = 0;

  geocode(query: string, language = "tr"): Promise<GeocodedLocation> {
    const normalized = query.trim().replace(/\s+/g, " ");
    if (normalized.length < 3 || normalized.length > 240) {
      throw new BadRequestException("Adres 3 ile 240 karakter arasında olmalıdır.");
    }
    const locale = language.toLowerCase().startsWith("en") ? "en" : "tr";
    const key = `${locale}:${normalized.toLocaleLowerCase("tr-TR")}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return Promise.resolve(cached.value);
    }
    const existing = this.pending.get(key);
    if (existing) return existing;

    const task = this.enqueue(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8_000);
      try {
        const params = new URLSearchParams({
          format: "jsonv2",
          limit: "1",
          q: normalized,
        });
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?${params}`,
          {
            headers: {
              Accept: "application/json",
              "Accept-Language": locale,
              "User-Agent":
                "Konnektora/1.0 (https://konnektora.com/contact)",
            },
            signal: controller.signal,
          },
        );
        if (!response.ok) {
          throw new BadGatewayException("Adres sağlayıcısına ulaşılamadı.");
        }
        const rows = (await response.json()) as NominatimResult[];
        const latitude = Number(rows[0]?.lat);
        const longitude = Number(rows[0]?.lon);
        const value: GeocodedLocation =
          Number.isFinite(latitude) && Number.isFinite(longitude)
            ? {
                found: true,
                latitude,
                longitude,
                displayName: rows[0]?.display_name?.trim() || normalized,
              }
            : { found: false };
        this.remember(key, value);
        return value;
      } catch (error) {
        if (error instanceof BadGatewayException) throw error;
        throw new BadGatewayException("Adres aranamadı. Lütfen tekrar deneyin.");
      } finally {
        clearTimeout(timeout);
      }
    });
    this.pending.set(key, task);
    void task.finally(() => this.pending.delete(key)).catch(() => undefined);
    return task;
  }

  async reverse(latitude: number, longitude: number) {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new BadRequestException("Geçersiz koordinatlar.");
    return this.enqueue(async () => {
      try {
        const params = new URLSearchParams({ format: "jsonv2", lat: String(latitude), lon: String(longitude), zoom: "10", addressdetails: "1" });
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, { headers: { Accept: "application/json", "Accept-Language": "tr", "User-Agent": "Konnektora/1.0 (https://konnektora.com/contact)" }, signal: AbortSignal.timeout(6000) });
        if (!response.ok) throw new Error("Location provider unavailable");
        const data = await response.json() as { address?: { country_code?: string; city?: string; town?: string; village?: string; state?: string } };
        const address = data.address;
        return { country: address?.country_code?.toUpperCase() ?? "", city: address?.city ?? address?.town ?? address?.village ?? address?.state ?? "" };
      } catch { throw new BadGatewayException("Konum bulunamadı. Ülke ve şehri elle seçebilirsiniz."); }
    });
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const task = this.queue.catch(() => undefined).then(async () => {
      const remaining = Math.max(
        0,
        1_000 - (Date.now() - this.lastProviderRequestAt),
      );
      if (remaining) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      this.lastProviderRequestAt = Date.now();
      return operation();
    });
    this.queue = task;
    return task;
  }

  private remember(key: string, value: GeocodedLocation) {
    if (this.cache.size >= 500) {
      const oldest = this.cache.keys().next().value as string | undefined;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, {
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1_000,
      value,
    });
  }
}
