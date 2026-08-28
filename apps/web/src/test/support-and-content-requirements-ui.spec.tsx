import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ContentComments } from "../components/ContentComments";
import { LanguageProvider } from "../lib/i18n";
import { ContactPage } from "../pages/ContactPage";
import { HelpCenterPage } from "../pages/HelpCenterPage";

const apiMocks = vi.hoisted(() => ({
  createContentComment: vi.fn(),
  createUserMessage: vi.fn(),
  getUserSession: vi.fn(),
  listContentComments: vi.fn(),
  listFollowing: vi.fn(),
  listGuestLists: vi.fn(),
  listPublicFaqs: vi.fn(),
  listPublicSupportCategories: vi.fn(),
  listReportRules: vi.fn(),
  uploadContentMedia: vi.fn(),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, ...apiMocks };
});
vi.mock("../lib/useGuestListEntitlement", () => ({
  useGuestListEntitlement: () => ({ canUseGuestLists: false }),
}));

function providers(children: ReactNode, initialEntry: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <LanguageProvider>
        <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  apiMocks.getUserSession.mockReturnValue(null);
  apiMocks.listPublicFaqs.mockResolvedValue([]);
  apiMocks.listReportRules.mockResolvedValue([]);
  apiMocks.listPublicSupportCategories.mockResolvedValue([]);
  apiMocks.createUserMessage.mockResolvedValue({ id: "message-1" });
  apiMocks.listContentComments.mockResolvedValue([]);
  apiMocks.listFollowing.mockResolvedValue([]);
  apiMocks.listGuestLists.mockResolvedValue([]);
  apiMocks.createContentComment.mockResolvedValue({
    id: "post-1", targetId: "place-1", body: "", likeCount: 0, createdAt: "2026-08-28T00:00:00.000Z",
  });
  apiMocks.uploadContentMedia.mockResolvedValue({ id: "media-1" });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("destek ve içerik gereksinimleri 125–141", () => {
  it("SSS destek mesajını ayrı inbox türü ve alfabetik konu seçimiyle gönderir", async () => {
    apiMocks.listPublicSupportCategories.mockResolvedValue([
      { id: "category-a", name: "Hesap", slug: "hesap", type: "faq", status: "active" },
      { id: "category-b", name: "Teknik sorun", slug: "teknik-sorun", type: "faq", status: "active" },
    ]);
    render(providers(
      <Routes><Route path="/contact" element={<ContactPage />} /></Routes>,
      "/contact?type=faq",
    ));

    expect(await screen.findByRole("heading", { name: "Destek ekibine yaz" })).toBeVisible();
    expect(apiMocks.listPublicSupportCategories).toHaveBeenCalledWith("faq");
    const subject = screen.getByRole("combobox", { name: "Konu" });
    await waitFor(() => expect(within(subject).getAllByRole("option").map((option) => option.textContent)).toEqual(["Konu seçin", "Hesap", "Teknik sorun"]));
    await userEvent.type(screen.getByRole("textbox", { name: "Ad soyad" }), "Ada Yılmaz");
    await userEvent.type(screen.getByRole("textbox", { name: /^E-posta/ }), "ada@example.com");
    await userEvent.selectOptions(subject, "Hesap");
    await userEvent.type(screen.getByRole("textbox", { name: "Mesaj" }), "Hesabım için desteğe ihtiyacım var.");
    await userEvent.click(screen.getByRole("button", { name: "Mesaj gönder" }));

    await waitFor(() => expect(apiMocks.createUserMessage).toHaveBeenCalled());
    expect(apiMocks.createUserMessage.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      type: "faq", category: "Hesap", name: "Ada Yılmaz", email: "ada@example.com",
    }));
    expect(await screen.findByRole("status")).toHaveTextContent("Mesajınız gönderildi.");
  });

  it("yardım merkezinde Kurallar kartını SSS'den sonra gösterir ve aktif kuralları kategori içinde A-Z açar", async () => {
    apiMocks.listPublicFaqs.mockResolvedValue([{
      id: "faq-1", title: "Hesabımı nasıl güncellerim?", body: "Ayarlar sayfasını açın.", order: 1, status: "active",
      category: { id: "faq-category", name: "Hesap", slug: "hesap", description: "Hesap işlemleri" },
    }]);
    const home = render(providers(
      <Routes><Route path="/help/*" element={<HelpCenterPage />} /></Routes>,
      "/help",
    ));

    const entries = await screen.findAllByRole("link");
    const faqIndex = entries.findIndex((link) => link.getAttribute("href") === "/help/faqs");
    const rulesIndex = entries.findIndex((link) => link.getAttribute("href") === "/help/rules");
    expect(faqIndex).toBeGreaterThanOrEqual(0);
    expect(rulesIndex).toBe(faqIndex + 1);
    home.unmount();

    apiMocks.listReportRules.mockResolvedValue([
      { id: "rule-z", targetType: "event", title: "Zarar verme", description: "Güvenliği ihlal eder.", violationScore: 40, status: "active" },
      { id: "rule-passive", targetType: "event", title: "Pasif kural", description: "Gösterilmemeli.", violationScore: 10, status: "passive" },
      { id: "rule-a", targetType: "event", title: "Ayrımcılık", description: "Ayrımcı içerik yasaktır.", violationScore: 30, status: "active" },
      { id: "rule-post", targetType: "post", title: "Spam", description: "Tekrarlayan içerik yasaktır.", violationScore: 10, status: "active" },
      { id: "rule-message", targetType: "private_message", title: "Taciz", description: "Taciz yasaktır.", violationScore: 50, status: "active" },
    ]);
    render(providers(
      <Routes><Route path="/help/*" element={<HelpCenterPage />} /></Routes>,
      "/help/rules",
    ));

    expect(await screen.findByRole("heading", { name: "Konnektora Kuralları" })).toBeVisible();
    const group = (await screen.findByRole("heading", { name: "Etkinlikler" })).closest("section")!;
    expect(within(group).getAllByRole("group").map((rule) => rule.querySelector("strong")?.textContent)).toEqual(["Ayrımcılık", "Zarar verme"]);
    expect(screen.queryByText("Pasif kural")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Postlar" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Özel mesajlar" })).toBeVisible();
    const rule = within(group).getByText("Ayrımcılık").closest("details")!;
    expect(within(rule).getByText("30 ihlal puanı")).toBeVisible();
    await userEvent.click(within(rule).getByText("Ayrımcılık"));
    expect(within(rule).getByText("Ayrımcı içerik yasaktır.")).toBeVisible();
  });

  it("metin olmadan medya postu gönderir; medya bağlantısında ikon göstermez ve İpuçlarını açar", async () => {
    apiMocks.getUserSession.mockReturnValue({ id: "member-1", name: "Ada", username: "ada", role: "user", status: "active" });
    const { container } = render(providers(
      <ContentComments targetId="place-1" targetType="place" title="Mekân postları" />,
      "/places/demo",
    ));

    const picker = await screen.findByText("Fotoğraf/video ekle");
    expect(picker.closest("label")?.querySelector("svg")).not.toBeInTheDocument();
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const image = new File(["image"], "mekan.webp", { type: "image/webp" });
    fireEvent.change(input, { target: { files: [image] } });
    expect(screen.getByRole("button", { name: "Gönder" })).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: "Gönder" }));

    await waitFor(() => expect(apiMocks.createContentComment).toHaveBeenCalledWith("place", "place-1", ""));
    expect(apiMocks.uploadContentMedia).toHaveBeenCalledWith("place_comment", "post-1", image);
    await userEvent.click(screen.getByText("İpuçları"));
    expect(screen.getByText("“görünen etiket|gidilecek etiket”")).toBeVisible();
    expect(screen.getByText("“bağlantının adı|https://ornek.com”")).toBeVisible();
    expect(screen.getByText("email@domain.com")).toBeVisible();
    expect(screen.getByText("@Username")).toBeVisible();
    expect(screen.getByText(/YouTube ve SoundCloud/)).toBeVisible();
  });
});
