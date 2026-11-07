import { expect, it } from "vitest";
import { dataRequestResponseDeadline } from "../lib/dataDeletion";

it("counts 30 calendar days across month, year and leap-year boundaries", () => {
  expect(dataRequestResponseDeadline("2026-12-20T12:00:00Z")?.toISOString()).toBe("2027-01-19T12:00:00.000Z");
  expect(dataRequestResponseDeadline("2028-02-10T12:00:00Z")?.toISOString()).toBe("2028-03-11T12:00:00.000Z");
});

it("does not invent a deadline when the server receipt date is absent or invalid", () => {
  expect(dataRequestResponseDeadline()).toBeNull();
  expect(dataRequestResponseDeadline("invalid")).toBeNull();
});
