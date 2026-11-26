import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ContentNotificationLists, splitNotificationEvents } from "../components/ContentNotificationLists";
import { LanguageProvider } from "../lib/i18n";

const apiMocks = vi.hoisted(() => ({
  listContentNotifications: vi.fn(),
  setContentNotification: vi.fn(),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, ...apiMocks };
});

const now = Date.parse("2026-11-26T12:00:00Z");
const day = 86_400_000;
const events = [
  { id: "far", title: "Uzak", slug: "uzak", startsAt: new Date(now + 10 * day).toISOString(), endsAt: null },
  { id: "near", title: "Yakın", slug: "yakin", startsAt: new Date(now + day).toISOString(), endsAt: null },
  { id: "old", title: "Eski", slug: "eski", startsAt: new Date(now - 10 * day).toISOString(), endsAt: null },
  { id: "recent", title: "Yeni biten", slug: "yeni-biten", startsAt: new Date(now - day).toISOString(), endsAt: new Date(now - day + 3_600_000).toISOString() },
  { id: "live", title: "Süren", slug: "suren", startsAt: new Date(now - 3_600_000).toISOString(), endsAt: new Date(now + 3_600_000).toISOString() },
];

describe("26/11 #113 bildirimleri açık içerik listeleri", () => {
  it("splits events into current (nearest first) and past (most recent first)", () => {
    const result = splitNotificationEvents(events, now);
    expect(result.current.map((event) => event.id)).toEqual(["live", "near", "far"]);
    expect(result.past.map((event) => event.id)).toEqual(["recent", "old"]);
  });

  it("lists tags, places, accounts and events and turns notifications off from a row", async () => {
    apiMocks.listContentNotifications.mockResolvedValue({
      tags: [{ id: "t1", name: "Yoga", slug: "yoga" }],
      places: [{ id: "p1", name: "Studio", slug: "studio", region: "İstanbul", city: "Kadıköy", country: "Türkiye" }],
      users: [{ id: "u1", name: "Ali", username: "ali" }],
      events: [{ id: "e1", title: "Gece buluşması", slug: "gece", startsAt: "2099-01-01T18:00:00.000Z", endsAt: null }],
    });
    apiMocks.setContentNotification.mockResolvedValue({ enabled: false });
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <LanguageProvider>
          <MemoryRouter>
            <ContentNotificationLists />
          </MemoryRouter>
        </LanguageProvider>
      </QueryClientProvider>,
    );
    expect(await screen.findByRole("heading", { name: "Bildirimleri açık etiketler" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Yoga" }).getAttribute("href")).toBe("/tags/yoga");
    expect(screen.getByRole("link", { name: "Studio" }).getAttribute("href")).toBe("/places/studio");
    expect(screen.getByText(/Kadıköy/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "@ali" }).getAttribute("href")).toBe("/users/ali");
    expect(screen.getByRole("link", { name: "Gece buluşması" }).getAttribute("href")).toBe("/events/gece");
    await userEvent.click(screen.getByRole("tab", { name: "Geçmiş" }));
    expect(screen.getByText("Bildirimlerini açtığın geçmiş etkinlik yok.")).toBeTruthy();
    const tagRow = screen.getByRole("link", { name: "Yoga" }).closest("article")!;
    await userEvent.click(within(tagRow).getByRole("button", { name: "Yoga için bildirimleri kapat" }));
    await waitFor(() => expect(apiMocks.setContentNotification).toHaveBeenCalledWith("tag", "t1", false));
  });
});
