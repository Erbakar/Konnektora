import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InteractionStatsPage } from "../pages/InteractionStatsPage";
import { LanguageProvider } from "../lib/i18n";
const api = vi.hoisted(() => ({ getInteractionStats: vi.fn(), getPlaceAnalyticsReferences: vi.fn(), listTags: vi.fn(), getTagStats: vi.fn(), getPublicProfileById: vi.fn() }));
vi.mock("../lib/api", () => api);
afterEach(cleanup);
describe("Analytics reference links", () => {
  it("links people and events using source references rather than a discovery search", async () => {
    api.getInteractionStats.mockResolvedValue({ organizerEvents_cagr: 2, topVisitor_deniz: 3, fullEvent_event_59: 75 });
    api.getPlaceAnalyticsReferences.mockResolvedValue([
      { metricKey: "organizerEvents_cagr", name: "@Çağrı", kind: "user", to: "/users/id/u1" },
      { metricKey: "topVisitor_deniz", name: "@Deniz", kind: "user", to: "/users/id/u2" },
      { metricKey: "fullEvent_event_59", name: "Event 59", kind: "event", to: "/events/event-59" },
    ]);
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LanguageProvider><MemoryRouter initialEntries={["/stats/place/p1"]}><Routes><Route path="/stats/:targetType/:targetId" element={<InteractionStatsPage/>}/></Routes></MemoryRouter></LanguageProvider></QueryClientProvider>);
    expect(await screen.findByRole("link", { name: "@Çağrı" })).toHaveAttribute("href", "/users/id/u1");
    expect(screen.getByRole("link", { name: "@Deniz" })).toHaveAttribute("href", "/users/id/u2");
    expect(screen.getAllByRole("link", { name: /Event 59/ }).every(link => link.getAttribute("href") === "/events/event-59")).toBe(true);
    expect(api.listTags).not.toHaveBeenCalled();
  });
});
