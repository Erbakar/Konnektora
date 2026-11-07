import { describe, expect, it } from "vitest";
import { ticketWindowText } from "../lib/ticket-window";

describe("bilet satış ve giriş zamanları", () => {
 const start = "2027-01-01T10:00:00Z", end = "2027-01-02T18:00:00Z";
 it.each([
  ["sale", start, null, "tarihi itibarıyla bu bilet alınabilir."],
  ["sale", null, end, "tarihine kadar bu bilet alınabilir."],
  ["sale", start, end, "arasında bu bilet alınabilir."],
  ["gate", start, null, "zamanından sonra giriş yapmalısınız."],
  ["gate", null, end, "zamanından önce giriş yapmalısınız."],
  ["gate", start, end, "arasında giriş yapmalısınız."],
 ] as const)("%s %s %s", (kind, first, last, suffix) => {
  expect(ticketWindowText(first, last, kind, "tr")).toContain(suffix);
 });
 it.each(["sale", "gate"] as const)("tanımsız %s zamanını gizler", kind => {
  expect(ticketWindowText(null, null, kind, "tr")).toBe("");
 });
});
