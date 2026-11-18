import { territoriesOverlap, territoryNameVariants, territoryWhere, territoryMatches } from "./territory";

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

  it("builds a database filter that finds both the legacy city layout and the new province/district layout", () => {
    expect(territoryNameVariants("İstanbul")).toEqual(["İstanbul", "Istanbul", "İstanbul Province", "Istanbul Province"]);
    expect(territoryNameVariants("Istanbul Province")).toEqual(expect.arrayContaining(["Istanbul", "İstanbul"]));
    expect(territoryNameVariants("sanliurfa")).toContain("Şanlıurfa");
    expect(territoryNameVariants("Berlin")).toEqual(["Berlin", "Berlin Province"]);
    const legacy = JSON.stringify(territoryWhere({ country: "Türkiye", city: "Istanbul" }));
    expect(legacy).toContain('"region":{"equals":"Istanbul"');
    expect(legacy).toContain('"city":{"equals":"Istanbul"');
    const modern = territoryWhere({ country: "Türkiye", region: "İstanbul", city: "" }) as { AND: Array<Record<string, unknown>> };
    expect(JSON.stringify(modern)).toContain('"city":{"equals":"Istanbul"');
    expect(JSON.stringify(modern)).toContain('"region":{"equals":"İstanbul"');
    const district = JSON.stringify(territoryWhere({ country: "Türkiye", region: "İstanbul", city: "Kadıköy" }));
    expect(district).toContain('"city":{"equals":"Kadıköy"');
    expect(district).not.toContain('"region":{"equals":"Kadıköy"');
    expect(territoryWhere({ country: "Almanya" })).toEqual({ country: { equals: "Almanya", mode: "insensitive" } });
  });
});
