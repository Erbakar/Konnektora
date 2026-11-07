import { describe, expect, it } from "vitest";
import writeExcelFile from "write-excel-file/node";
import { strFromU8, unzipSync } from "fflate";
import { financeExportSheets, matchesFinanceDate } from "../lib/financeExport";
describe("Financial Excel export", () => {
  it("writes a real XLSX with numeric amounts, dates and literal user text", async () => {
    const sheets = financeExportSheets([{ name: "Hareketler", headers: ["Üye", "Tutar", "Para birimi", "Zaman"], rows: [["=HYPERLINK(\"https://example.com\")", 12.5, "TRY", new Date("2026-10-08T10:00:00Z")], ["Ada & Deniz", 25, "EUR", null]] }]);
    const output = await writeExcelFile(sheets).toBuffer();
    const files = unzipSync(output);
    const xml = strFromU8(files["xl/worksheets/sheet1.xml"]!);
    expect(files["[Content_Types].xml"]).toBeDefined();
    expect(xml).toContain("12.5"); expect(xml).not.toContain("<f>");
    const strings = strFromU8(files["xl/sharedStrings.xml"]!);
    expect(strings).toContain("HYPERLINK"); expect(strings).toContain("Ada &amp; Deniz");
    expect(strings).toContain("TRY"); expect(strings).toContain("EUR");
  });
  it("includes the entire selected final day and excludes the following day", () => {
    expect(matchesFinanceDate("2026-10-08T23:59:59", "2026-10-08", "2026-10-08")).toBe(true);
    expect(matchesFinanceDate("2026-10-09T00:00:00", "2026-10-08", "2026-10-08")).toBe(false);
    expect(matchesFinanceDate("2026-10-07T23:59:59", "2026-10-08", "")).toBe(false);
  });
});
