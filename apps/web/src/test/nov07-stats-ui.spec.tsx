import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InteractionStatsPage } from "../pages/InteractionStatsPage";
import { LanguageProvider } from "../lib/i18n";

const api = vi.hoisted(() => ({ getInteractionStats: vi.fn(), getPlaceAnalyticsReferences: vi.fn(), listTags: vi.fn(), getTagStats: vi.fn(), getPublicProfileById: vi.fn() }));
vi.mock("../lib/api", () => api);
afterEach(cleanup);

function renderStats(path: string) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LanguageProvider><MemoryRouter initialEntries={[path]}><Routes><Route path="/stats/:targetType/:targetId" element={<InteractionStatsPage/>}/></Routes></MemoryRouter></LanguageProvider></QueryClientProvider>);
}

describe("07/11 istatistik grafikleri", () => {
  it("mekânda yoğunluk haritası, dönemsel en dolu/boş etkinlikler, ortak etiketler, sosyalleşme ve geri bağlantısını gösterir (#79–#84, #96)", async () => {
    api.getPlaceAnalyticsReferences.mockResolvedValue([]);
    api.listTags.mockResolvedValue([]);
    api.getInteractionStats.mockResolvedValue({
      views: 300, detailViews: 120, members: 40, checkedIn: 20, viewsLast7d: 30, viewsLast30d: 90, commentsLast7d: 3, commentsLast30d: 8,
      density_cum_20: 80, density_cmt_22: 40,
      fullEvent1m_caz_gecesi: 92, emptyEvent1m_sabah_atolyesi: 12, fullEvent12m_yilbasi: 100,
      fullEventTag1m_caz: 2,
      profileExchanges: 14, profileExchangers: 9, profileExchangeRate: 45, profileExchangesPerPerson: 0.7, exchangeMethod_qr: 10, exchangeMethod_nfc: 4,
      memberInterest7d_muzik: 5, visitorInterest30d_sinema: 3,
    });
    renderStats(`/stats/place/p1?${new URLSearchParams({ name: "Datli Maya", back: "/places/datli-maya" })}`);
    expect(await screen.findByRole("link", { name: "Datli Maya mekânına geri dön" })).toHaveAttribute("href", "/places/datli-maya");
    expect(await screen.findByRole("heading", { name: "Mekân yoğunluğu" })).toBeVisible();
    expect(screen.getByRole("cell", { name: "100%" })).toHaveAttribute("title", expect.stringContaining("Cum 20:00"));
    expect(screen.getByRole("heading", { name: "En dolu etkinlikler" })).toBeVisible();
    expect(screen.getByText("Caz Gecesi")).toBeVisible();
    await userEvent.click(screen.getAllByRole("tab", { name: "Son 12 ay" })[0]!);
    expect(screen.getByText("Yilbasi")).toBeVisible();
    expect(screen.getByRole("heading", { name: "En dolu geçen etkinliklerin ortak etiketleri" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Sosyalleşme analizi" })).toBeVisible();
    expect(screen.getByText("QR: 10 · NFC: 4")).toBeVisible();
    const audience = screen.getByRole("combobox", { name: "Kitle" });
    expect(within(audience).getByRole("option", { name: "Üyeler ilgi alanları" })).toBeInTheDocument();
    expect(screen.getByText("Muzik")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Dönem toplamları" })).toBeVisible();
  });

  it("etkinlikte line-up tıklamaları ve bilet türü doluluğunu tabloyla gösterir (#73, #75)", async () => {
    api.getInteractionStats.mockResolvedValue({ views: 10, detailViews: 5, lineupClick_dj_ada: 7, ticketTypeSold_genel_giris: 220, ticketTypeOccupancy_genel_giris: 83, ticketTypeRevenue_genel_giris: 8800 });
    renderStats("/stats/event/e1");
    expect(await screen.findByRole("heading", { name: "Line-up'ta en çok tıklananlar" })).toBeVisible();
    expect(screen.getByText("Dj Ada")).toBeVisible();
    const row = screen.getByRole("row", { name: /Genel Giris/ });
    expect(within(row).getByText("%83")).toBeVisible();
    expect(within(row).getByText("8.800 TRY")).toBeVisible();
  });

  it("etikette Geçmiş etkinliği Yaklaşan etkinlikten, USD ortalama fiyatı satılan biletten hemen sonra gösterir (#69)", async () => {
    api.listTags.mockResolvedValue([]);
    api.getTagStats.mockResolvedValue({ views: 5, ticketsSold: 12, upcomingEvents: 2, pastEvents: 4, averageTicketPriceUsd: 7.5 });
    renderStats("/stats/tag/t1");
    await screen.findByRole("heading", { name: "Diğer ölçümler" });
    const labels = [...document.querySelectorAll(".stats-metric-grid article span")].map((item) => item.textContent);
    expect(labels.indexOf("Geçmiş etkinlik")).toBe(labels.indexOf("Yaklaşan etkinlik") - 1);
    expect(labels.indexOf("Ortalama bilet fiyatı (USD)")).toBe(labels.indexOf("Satılan bilet") + 1);
    expect(screen.getByText("$7,50")).toBeVisible();
  });
});
