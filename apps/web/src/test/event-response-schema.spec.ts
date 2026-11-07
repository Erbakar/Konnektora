import { describe, expect, it } from "vitest";
import { eventSchema } from "@konnektora/shared";
import { mockEvents } from "../lib/mockData";

describe("event response media URLs", () => {
  it("loads events whose cover was uploaded to Konnektora", () => {
    const event = { ...mockEvents[0], coverImageUrl: "/uploads/427c1d84-21b0-4470-a968-4ceb305b6595.jpg" };
    expect(eventSchema.parse(event).coverImageUrl).toBe(event.coverImageUrl);
  });
  it.each(["https://images.example.com/cover.jpg", null])("accepts external and absent covers: %s", coverImageUrl => {
    expect(eventSchema.safeParse({ ...mockEvents[0], coverImageUrl }).success).toBe(true);
  });
  it.each(["javascript:alert(1)", "//foreign.example/cover.jpg", "/\\foreign.example/a"])("rejects unsafe media URLs: %s", coverImageUrl => {
    expect(eventSchema.safeParse({ ...mockEvents[0], coverImageUrl }).success).toBe(false);
  });
  it.each(["QA only", ""])("renders summaries already accepted by the event API: %s",summary=>{
    expect(eventSchema.safeParse({...mockEvents[0],summary}).success).toBe(true);
  });

});
