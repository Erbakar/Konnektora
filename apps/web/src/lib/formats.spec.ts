import { describe, expect, it } from "vitest";
import { formatPostDateTime } from "./formats";

describe("formatPostDateTime", () => {
  const now = new Date(2026, 8, 2, 18, 30);

  it("shows today's posts with hours and minutes only", () => {
    expect(formatPostDateTime(new Date(2026, 8, 2, 9, 7), "tr", now)).toBe("Bugün, 09:07");
  });

  it("labels yesterday without showing seconds", () => {
    expect(formatPostDateTime(new Date(2026, 8, 1, 23, 59, 48), "tr", now)).toBe("Dün, 23:59");
  });

  it("shows the date and time for older posts", () => {
    const result = formatPostDateTime(new Date(2026, 7, 30, 12, 4, 51), "tr", now);
    expect(result).toMatch(/^30 Ağu 2026 12:04$/);
    expect(result).not.toContain("51");
  });
});
