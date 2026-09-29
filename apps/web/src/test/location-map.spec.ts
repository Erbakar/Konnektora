import { describe, expect, it } from "vitest";
import { defaultMapHref } from "../components/LocationMap";

describe("Google Maps link", () => {
  it("opens the exact coordinates as a Google Maps pin on every device", () => {
    expect(defaultMapHref(41.0082, 28.9784)).toBe(
      "https://www.google.com/maps/search/?api=1&query=41.0082%2C28.9784",
    );
  });
});
