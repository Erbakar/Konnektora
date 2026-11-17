import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InteractionStatsPage, changeLabel } from "../pages/InteractionStatsPage";
import { seriesBucketLabel, seriesBucketStarts } from "../components/StatsCharts";
import { fillDailySeries } from "../lib/analyticsSeries";
import { LanguageProvider } from "../lib/i18n";

const api = vi.hoisted(() => ({ getInteractionStats: vi.fn(), getPlaceAnalyticsReferences: vi.fn(), listTags: vi.fn(), getTagStats: vi.fn(), getTagStatsOrigin: vi.fn(), getPublicProfileById: vi.fn() }));
vi.mock("../lib/api", () => api);
afterEach(cleanup);
vi.setConfig({ testTimeout: 20_000 });

// 17 Kasım 2026 Salı 15:30 (Türkiye)
const nowMs = Date.UTC(2026, 10, 17, 12, 30);
const tsNow = Math.floor(nowMs / 1000);

function renderStats(path: string) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LanguageProvider><MemoryRouter initialEntries={[path]}><Routes><Route path="/stats/:targetType/:targetId" element={<InteractionStatsPage/>}/></Routes></MemoryRouter></LanguageProvider></QueryClientProvider>);
}
const panelOf = (heading: HTMLElement) => heading.closest("section") as HTMLElement;
const axisLabels = (panel: HTMLElement) => [...panel.querySelectorAll(".axis-x")].map((item) => item.textContent);

describe("17/11 istatistik sayfaları", () => {
  it("dönem kovalarını ve eksen etiketlerini sekmeye göre üretir", () => {
    expect(seriesBucketStarts("24h", nowMs)).toHaveLength(24);
    expect(seriesBucketLabel("24h", seriesBucketStarts("24h", nowMs)[23]!, "tr")).toBe("15:00");
    expect(seriesBucketStarts("7d", nowMs).map((start) => seriesBucketLabel("7d", start, "tr"))).toEqual(["Çar", "Per", "Cum", "Cmt", "Paz", "Pzt", "Sal"]);
    expect(seriesBucketLabel("30d", seriesBucketStarts("30d", nowMs)[29]!, "tr")).toBe("17.11");
    expect(seriesBucketLabel("30d", seriesBucketStarts("30d", nowMs)[0]!, "tr")).toBe("19.10");
    expect(seriesBucketStarts("12m", nowMs).map((start) => seriesBucketLabel("12m", start, "tr"))).toEqual(["Ara", "Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas"]);
    expect(seriesBucketLabel("12m", seriesBucketStarts("12m", nowMs)[11]!, "tr", true)).toBe("Kasım 2026");
  });

  it("değişim oranını -%25 / +%33 biçiminde yazar ve günlük seriyi sıfırla doldurur", () => {
    expect(changeLabel(3, 4, "tr")).toBe("-%25");
    expect(changeLabel(4, 3, "tr")).toBe("+%33");
    expect(changeLabel(2, 2, "tr")).toBe("%0");
    expect(changeLabel(2, 0, "tr")).toBe("yeni");
    expect(changeLabel(0, 0, "tr")).toBe("—");
    const filled = fillDailySeries([["2026-11-15", 4]], "views", nowMs);
    expect(filled).toHaveLength(30);
    expect(filled[0]).toEqual(["2026-10-19", 0]);
    expect(filled[27]).toEqual(["2026-11-15", 4]);
    expect(filled[29]).toEqual(["2026-11-17", 0]);
    expect(fillDailySeries([], "views", nowMs)).toHaveLength(30);
    expect(fillDailySeries([["2026-11-10", 2]], "ticketOrders", nowMs)).toEqual([["2026-11-09", 0], ["2026-11-10", 2]]);
  });

  it("etikette dönem grafiğini saat/gün/tarih/ay kovalarıyla çizer; diğer dönem toplamları grafik, yapıştırılma halkası, oluşturulma kutusu ve check-in ısı haritası (#66, #114–#117)", async () => {
    api.listTags.mockResolvedValue([]);
    api.getTagStatsOrigin.mockResolvedValue({ mode: "other", username: "deniz" });
    api.getTagStats.mockResolvedValue({
      views: 40, followers: 6, likes: 5, ok: 1, dislikes: 2, tsNow,
      likeLast24h: 2, likeLast7d: 3, viewsLast24h: 7, interestLast7d: 4, commentsLast30d: 2,
      ts_like_24h_23: 2, ts_like_7d_6: 2, ts_like_7d_3: 1, ts_like_30d_29: 2, ts_like_12m_11: 3, ts_ok_12m_9: 1, ts_dislike_24h_20: 1,
      ts_views_24h_23: 7, ts_interest_7d_6: 4, ts_comments_30d_10: 2, ts_commentLikes_12m_11: 5,
      stickBy_kendisi: 4, stickBy_bir_baskasi: 2, suggestGender_belirtmek_istemiyor: 1, suggestGender_erkekler: 3, suggestGender_kadinlar: 5,
      checkinHeat_cum_20: 6, checkinHeat_cmt_0: 3,
    });
    renderStats(`/stats/tag/t1?${new URLSearchParams({ name: "Caz", back: "/tags/caz" })}`);
    const panel = panelOf(await screen.findByRole("heading", { name: "Yeni değerlendirmelerin dönemlere göre değişimi" }));
    // 24 saat: son 24 saatin saat dilimleri — "24 Saat, 7 Gün…" eksende yazmaz.
    expect(axisLabels(panel)).toContain("15:00");
    expect(axisLabels(panel)).not.toContain("7 Gün");
    expect(axisLabels(panel).every((label) => /^\d{2}:00$/.test(label ?? ""))).toBe(true);
    expect(within(panel).getByRole("img").getAttribute("aria-label")).toContain("15:00 2");
    await userEvent.click(within(panel).getByRole("tab", { name: "7 Gün" }));
    expect(axisLabels(panel)).toEqual(["Çar", "Per", "Cum", "Cmt", "Paz", "Pzt", "Sal"]);
    expect(panel.querySelector(".stats-period-cards strong")?.textContent).toBe("3");
    await userEvent.click(within(panel).getByRole("tab", { name: "30 Gün" }));
    expect(axisLabels(panel)).toContain("17.11");
    await userEvent.click(within(panel).getByRole("tab", { name: "12 Ay" }));
    expect(axisLabels(panel)).toEqual(["Ara", "Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas"]);
    // #114: tablo yerine çizgi grafik.
    const other = panelOf(screen.getByRole("heading", { name: "Diğer dönem toplamları" }));
    expect(other.querySelector("svg.stats-period-svg")).not.toBeNull();
    expect([...other.querySelectorAll(".stats-period-cards span")].map((item) => item.textContent)).toEqual(["Görüntülenme", "Yeni ilgi", "Post ve yorum", "Post-yorum beğeni"]);
    expect(within(other).getAllByRole("tab").map((item) => item.textContent)).toEqual(["24 Saat", "7 Gün", "30 Gün", "12 Ay"]);
    expect(screen.queryByText("Son 24 saatte görüntülenme")).toBeNull();
    // #115: başlığı açılır menü olan "Etiket yapıştırılma" halkası.
    const stick = screen.getByRole("combobox", { name: "Etiket yapıştırılma" });
    expect(within(stick).getAllByRole("option").map((item) => item.textContent)).toEqual(["Etiketi kim profiline yapıştırdı", "Kimler daha çok ekleme teklifi ediyor"]);
    const stickPanel = panelOf(stick);
    expect(within(stickPanel).getByText("Kendisi yapıştırdı")).toBeVisible();
    expect(within(stickPanel).getByText("Bir başkası yapıştırdı")).toBeVisible();
    await userEvent.selectOptions(stick, "Kimler daha çok ekleme teklifi ediyor");
    for (const label of ["Belirtmek istemiyor", "Erkekler", "Kadınlar"]) expect(within(stickPanel).getByText(label)).toBeVisible();
    // #116
    const origin = (await screen.findByText("Nasıl oluşturuldu")).closest("article") as HTMLElement;
    expect(within(origin).getByText("deniz başkasının profilinde")).toBeVisible();
    // #117
    const heat = panelOf(screen.getByRole("heading", { name: "Bu etikete sahip etkinliklerde ortalama check-in zamanı" }));
    expect(within(heat).getByRole("cell", { name: "100%" })).toHaveAttribute("title", expect.stringContaining("Cum 20:00"));
    expect(within(heat).getByRole("cell", { name: "50%" })).toHaveAttribute("title", expect.stringContaining("Cmt 00:00"));
    expect(screen.queryByText("Ts Like 24h 23")).toBeNull();
    expect(screen.queryByText("Tsnow")).toBeNull();
  });

  it("mekânda dört serili dönem grafiği, her zaman görünen en dolu/boş listeler, check-in ısı haritası, günlük çizgi ve etiket değerlendirmesi (#80, #82, #83, #104, #105, #112)", async () => {
    api.getPlaceAnalyticsReferences.mockResolvedValue([]);
    api.listTags.mockResolvedValue([]);
    api.getInteractionStats.mockResolvedValue({
      views: 300, detailViews: 120, members: 40, tsNow, viewsLast7d: 30, commentsLast7d: 3,
      ts_views_7d_6: 12, ts_comments_7d_5: 3, ts_members_7d_4: 2, ts_inviteShare_7d_6: 5,
      viewsDay_2026_11_16: 9,
      memberInterest7d_muzik: 5, memberInterestLike7d_muzik: 4, memberInterestDislike7d_muzik: 1, memberInterestLikePrev7d_muzik: 3, memberInterestDislikePrev7d_muzik: 4, memberInterestRevenue_muzik: 1250,
      placeTagInterest7d_caz: 0, placeTagInterest30d_caz: 2, placeTagInterestOk30d_caz: 2,
    });
    renderStats(`/stats/place/p1?${new URLSearchParams({ name: "Mini Müzikhol", back: "/places/mini-muzikhol" })}`);
    const panel = panelOf(await screen.findByRole("heading", { name: "Dönem toplamları" }));
    expect([...panel.querySelectorAll(".stats-period-cards span")].map((item) => item.textContent)).toEqual(["Görüntülenme", "Post ve yorum", "Mekâna üye olmak", "Davet ve paylaşım"]);
    await userEvent.click(within(panel).getByRole("tab", { name: "7 Gün" }));
    expect([...panel.querySelectorAll(".stats-period-cards strong")].map((item) => item.textContent)).toEqual(["12", "3", "2", "5"]);
    expect(axisLabels(panel)).toEqual(["Çar", "Per", "Cum", "Cmt", "Paz", "Pzt", "Sal"]);
    // #82, #83: veri yokken de bölümler görünür.
    for (const name of ["En dolu etkinlikler", "En boş etkinlikler"]) {
      const list = panelOf(screen.getByRole("heading", { name }));
      expect(within(list).getAllByRole("tab").map((item) => item.textContent)).toEqual(["Son 1 ay", "Son 3 ay", "Son 12 ay"]);
      expect(within(list).getByText("Bu dönemde doluluk oranı hesaplanabilen, gerçekleşmiş etkinlik yok.")).toBeVisible();
    }
    expect(within(panelOf(screen.getByRole("heading", { name: "En dolu geçen etkinliklerin ortak etiketleri" }))).getByText("Bu dönemin en dolu etkinliklerinde ortak etiket yok.")).toBeVisible();
    // #105
    expect(screen.getByRole("heading", { name: "Mekân yoğunluğu" })).toBeVisible();
    expect(within(panelOf(screen.getByRole("heading", { name: "Mekândaki etkinliklerde ortalama check-in saatleri" }))).getByText("Henüz check-in kaydı yok.")).toBeVisible();
    // #104
    expect(screen.queryByText("Zaman çizgisi için en az iki güne ait ölçüm gerekli.")).toBeNull();
    const daily = screen.getByRole("heading", { name: "Günlük görüntülenmeler (UTC)" }).closest("article") as HTMLElement;
    expect(daily.querySelector("svg.stats-line-chart polyline")?.getAttribute("points")?.split(" ")).toHaveLength(30);
    expect(within(daily).getByText("2026-11-16: 9")).toBeVisible();
    // #112
    const audience = screen.getByRole("combobox", { name: "Kitle" });
    expect(within(audience).getAllByRole("option").map((item) => item.textContent)).toEqual(["Üyeler ilgi alanları", "Ziyaretçiler ilgi alanları", "Mekân etiketlerini değerlendir"]);
    const row = screen.getByRole("row", { name: /Muzik/ });
    expect(within(row).getByText("1.250 TL")).toBeVisible();
    expect(within(row).getByRole("cell", { name: "Beğenen: 4 (+%33)" })).toBeVisible();
    expect(within(row).getByRole("cell", { name: "Kararsız: 0 (—)" })).toBeVisible();
    expect(within(row).getByRole("cell", { name: "Beğenmeyen: 1 (-%75)" })).toBeVisible();
    await userEvent.selectOptions(audience, "Mekân etiketlerini değerlendir");
    expect(within(screen.getByRole("row", { name: /Caz/ })).getByRole("cell", { name: "Beğenen: 0 (—)" })).toBeVisible();
    await userEvent.click(within(panelOf(audience)).getByRole("tab", { name: "Son 1 ay" }));
    expect(within(screen.getByRole("row", { name: /Caz/ })).getByRole("cell", { name: "Kararsız: 2 (yeni)" })).toBeVisible();
  });

  it("etkinlikte halka grafiğin açıklaması başlığa göre değişir, bilet kartları, günlük çizgi ve program değerlendirmesi (#72, #75, #103, #111)", async () => {
    api.listTags.mockResolvedValue([]);
    api.getInteractionStats.mockResolvedValue({
      views: 10, detailViews: 5, decision_etkinlik_gunu: 4, source_app_search: 3, checkInHour_20_22: 2, shareChannel_whatsapp: 1,
      ticketTypeSold_genel_giris: 220, ticketTypeOccupancy_genel_giris: 83, ticketTypeRevenue_genel_giris: 8800, ticketTypeKonnektora_genel_giris: 1,
      ticketTypeSold_vip: 0, ticketTypeOccupancy_vip: 0, ticketTypeKonnektora_vip: 1, ticketTypeSold_kapi: 12,
      programInterest7d_daft_punk: 2, programInterestLike7d_daft_punk: 2, programInterest7d_tiesto: 0, programInterestRevenue_daft_punk: 400,
    });
    renderStats(`/stats/event/e1?${new URLSearchParams({ name: "Daft Punk & Tiesto Night", back: "/events/daft-punk" })}`);
    const chart = await screen.findByRole("combobox", { name: "Grafik" });
    const donut = panelOf(chart);
    expect(within(donut).getByText("Katılımcıların katılım kararını etkinlikten ne kadar önce verdiği")).toBeVisible();
    await userEvent.selectOptions(chart, "Keşif kaynakları");
    expect(within(donut).getByText("Kullanıcıların bu içeriği hangi kanaldan keşfettiği")).toBeVisible();
    expect(within(donut).queryByText("Katılımcıların katılım kararını etkinlikten ne kadar önce verdiği")).toBeNull();
    await userEvent.selectOptions(chart, "Check-in saatleri");
    expect(within(donut).getByText("Katılımcıların check-in yaptığı saat aralıkları")).toBeVisible();
    await userEvent.selectOptions(chart, "Paylaşım kanalları");
    expect(within(donut).getByText("Bu içeriğin hangi kanallarda paylaşıldığı")).toBeVisible();
    // #75: yalnız Konnektora'da satılmak üzere tanımlanan bilet türleri kart olarak.
    const tickets = panelOf(screen.getByRole("heading", { name: "Satılan bilet türü" }));
    expect(within(tickets).queryByRole("table")).toBeNull();
    expect(within(tickets).getAllByRole("article").map((item) => item.getAttribute("aria-label"))).toEqual(["Genel Giris", "Vip"]);
    expect(within(within(tickets).getByRole("article", { name: "Genel Giris" })).getByText("%83")).toBeVisible();
    expect(within(tickets).queryByText("Kapi")).toBeNull();
    // #103
    expect(screen.queryByText("Zaman çizgisi için en az iki güne ait ölçüm gerekli.")).toBeNull();
    expect(document.querySelector("svg.stats-line-chart polyline")).not.toBeNull();
    // #111
    const audience = screen.getByRole("combobox", { name: "Kitle" });
    expect(within(audience).getAllByRole("option").map((item) => item.textContent)).toEqual(["Katılımcılar ilgi alanları", "Ziyaretçiler ilgi alanları", "Etkinlik programı ve etiketlerini değerlendir"]);
    await userEvent.selectOptions(audience, "Etkinlik programı ve etiketlerini değerlendir");
    expect(within(screen.getByRole("row", { name: /Daft Punk/ })).getByText("400 TL")).toBeVisible();
    expect(within(screen.getByRole("row", { name: /Daft Punk/ })).getByRole("cell", { name: "Beğenen: 2 (yeni)" })).toBeVisible();
    expect(screen.getByRole("row", { name: /Tiesto/ })).toBeVisible();
  });

  it("etkinlikte Konnektora bileti yoksa tablo yerine bilgilendirme metni gösterir (#75)", async () => {
    api.listTags.mockResolvedValue([]);
    api.getInteractionStats.mockResolvedValue({ views: 10, detailViews: 5, ticketTypeSold_kapi: 12 });
    renderStats("/stats/event/e2");
    const tickets = panelOf(await screen.findByRole("heading", { name: "Satılan bilet türü" }));
    expect(within(tickets).getByText("Bu etkinlik için Konnektora'da satılan bir bilet tanımlanmamıştır.")).toBeVisible();
    expect(within(tickets).queryByRole("table")).toBeNull();
    expect(within(tickets).queryByRole("article")).toBeNull();
  });

  it("profilde 24 saat/7 gün/30 gün/12 ay sekmeli dört serili grafik, geri bağlantısı, popüler etkinlikler, ısı haritaları ve yeni ilgi alanı seçenekleri (#85, #106–#109, #113)", async () => {
    api.listTags.mockResolvedValue([]);
    api.getPublicProfileById.mockResolvedValue({
      events: [{ title: "Yılbaşı Partisi", href: "/events/yilbasi-partisi" }],
      stats: {
        profileViews: 50, followers: 8, tsNow, profileViewsLast7d: 9, followersLast7d: 2,
        ts_views_24h_23: 4, ts_followers_7d_6: 2, ts_postEngagement_30d_29: 6, ts_commentLikes_12m_11: 3,
        popularAttendees1m_yilbasi_partisi: 120, popularAttendees12m_caz_gecesi: 80, popularCapacity1m_yilbasi_partisi: 200,
        density_cum_20: 10, checkinHeat_cum_22: 5,
        eventAttendeeInterest7d_muzik: 3, eventProgramInterest7d_caz: 1,
      },
    });
    renderStats(`/stats/user/u1?${new URLSearchParams({ name: "ada", back: "/users/ada" })}`);
    expect(await screen.findByRole("link", { name: "ada kullanıcısına geri dön" })).toHaveAttribute("href", "/users/ada");
    const panel = panelOf(await screen.findByRole("heading", { name: "Dönem toplamları" }));
    expect(within(panel).getAllByRole("tab").map((item) => item.textContent)).toEqual(["24 Saat", "7 Gün", "30 Gün", "12 Ay"]);
    expect([...panel.querySelectorAll(".stats-period-cards span")].map((item) => item.textContent)).toEqual(["Profil görüntülenme sayısı", "Profil takipçi sayısı", "Postlarına aldığı yorum ve beğeni", "Yorumlarına aldığı beğeni"]);
    await userEvent.click(within(panel).getByRole("tab", { name: "12 Ay" }));
    expect(axisLabels(panel).at(-1)).toBe("Kas");
    expect([...panel.querySelectorAll(".stats-period-cards strong")].map((item) => item.textContent)).toEqual(["0", "0", "0", "3"]);
    // #107
    expect(screen.queryByText("Zaman çizgisi için en az iki güne ait ölçüm gerekli.")).toBeNull();
    expect(document.querySelector("svg.stats-line-chart polyline")).not.toBeNull();
    // #108
    const popular = screen.getByRole("combobox", { name: "En popüler etkinlikler" });
    expect(within(popular).getAllByRole("option").map((item) => item.textContent)).toEqual(["Katılımcı sayısına göre top 10 popüler etkinlikler", "Bilet kapasitesine göre top 10 popüler etkinlikler"]);
    const popularPanel = panelOf(popular);
    expect(within(popularPanel).getAllByRole("tab").map((item) => item.textContent)).toEqual(["Son 1 ay", "Son 3 ay", "Son 12 ay"]);
    expect(await within(popularPanel).findByRole("link", { name: "Yılbaşı Partisi" })).toHaveAttribute("href", "/events/yilbasi-partisi");
    expect(within(popularPanel).getByText("120")).toBeVisible();
    await userEvent.selectOptions(popular, "Bilet kapasitesine göre top 10 popüler etkinlikler");
    expect(within(popularPanel).getByText("200")).toBeVisible();
    await userEvent.click(within(popularPanel).getByRole("tab", { name: "Son 3 ay" }));
    expect(within(popularPanel).getByText("Bu dönemde gerçekleşen etkinlik yok.")).toBeVisible();
    // #109
    expect(within(panelOf(screen.getByRole("heading", { name: "Etkinliklerinin yoğunluğu" }))).getByRole("cell", { name: "100%" })).toHaveAttribute("title", expect.stringContaining("Cum 20:00"));
    expect(within(panelOf(screen.getByRole("heading", { name: "Kurucusu olduğu etkinliklerde ortalama check-in saatleri" }))).getByRole("cell", { name: "100%" })).toHaveAttribute("title", expect.stringContaining("Cum 22:00"));
    // #113
    const audience = screen.getByRole("combobox", { name: "Kitle" });
    expect(within(audience).getAllByRole("option").map((item) => item.textContent)).toEqual(["Takipçi ilgi alanları", "Ziyaretçi ilgi alanları", "Etkinliklerimin katılımcılarını değerlendir", "Etkinliklerimin programları ve etiketlerini değerlendir"]);
    await userEvent.selectOptions(audience, "Etkinliklerimin katılımcılarını değerlendir");
    expect(screen.getByRole("row", { name: /Muzik/ })).toBeVisible();
    await userEvent.selectOptions(audience, "Etkinliklerimin programları ve etiketlerini değerlendir");
    expect(screen.getByRole("row", { name: /Caz/ })).toBeVisible();
  }, 20_000);
});
