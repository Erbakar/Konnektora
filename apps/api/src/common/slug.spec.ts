import { toSlug } from "./slug";

describe("toSlug", () => {
  it("normalizes Turkish characters and whitespace", () => {
    expect(toSlug("Girişimcilik ve Yatırım Ağı")).toBe("girisimcilik-ve-yatirim-agi");
  });

  it("removes punctuation and collapses repeated separators", () => {
    expect(toSlug("EU Startup: Networking Night!!!")).toBe("eu-startup-networking-night");
  });
});

