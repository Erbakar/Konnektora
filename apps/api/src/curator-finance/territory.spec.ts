import { territoriesOverlap, territoryMatches } from "./territory";

describe("17/10 #13 curator territory names", () => {
  it("treats legacy GeoNames province names and the corrected Turkish names as the same region", () => {
    expect(territoryMatches([{ country: "Türkiye", region: "Istanbul" }], { country: "Türkiye", region: "İstanbul", city: "Kadıköy" })).toBe(true);
    expect(territoryMatches([{ country: "Türkiye", region: "İstanbul" }], { country: "Türkiye", region: "Istanbul", city: "Ataşehir" })).toBe(true);
    expect(territoryMatches([{ country: "Türkiye", region: "Adıyaman" }], { country: "Türkiye", region: "Adıyaman Province" })).toBe(true);
    expect(territoriesOverlap({ country: "Türkiye", region: "Istanbul" }, { country: "Türkiye", region: "İstanbul" })).toBe(true);
  });

  it("still separates different provinces and countries", () => {
    expect(territoryMatches([{ country: "Türkiye", region: "İstanbul" }], { country: "Türkiye", region: "İzmir" })).toBe(false);
    expect(territoryMatches([{ country: "Almanya", region: "Berlin" }], { country: "Türkiye", region: "Berlin" })).toBe(false);
    expect(territoryMatches([{ country: "Türkiye", city: "Kadıköy" }], { country: "Türkiye", region: "İstanbul", city: "Üsküdar" })).toBe(false);
  });
});
