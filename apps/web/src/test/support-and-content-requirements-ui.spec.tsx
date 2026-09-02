import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ContentComments } from "../components/ContentComments";
import { ContentMediaGallery } from "../components/ContentMediaGallery";
import { LanguageProvider } from "../lib/i18n";
import { ContactPage } from "../pages/ContactPage";
import { HelpCenterPage } from "../pages/HelpCenterPage";

const apiMocks = vi.hoisted(() => ({
  createContentComment: vi.fn(),
  createUserMessage: vi.fn(),
  deleteContentComment: vi.fn(),
  getUserSession: vi.fn(),
  listContentComments: vi.fn(),
  listContentMedia: vi.fn(),
  listEventParticipants: vi.fn(),
  listFollowing: vi.fn(),
  listGuestLists: vi.fn(),
  listPublicFaqs: vi.fn(),
  listPublicSupportCategories: vi.fn(),
  listReportRules: vi.fn(),
  uploadContentMedia: vi.fn(),
  recordContentShare: vi.fn(),
}));
const guestEntitlement = vi.hoisted(() => ({ canUseGuestLists: false }));

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,cXI=") },
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, ...apiMocks };
});
vi.mock("../lib/useGuestListEntitlement", () => ({
  useGuestListEntitlement: () => guestEntitlement,
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
  guestEntitlement.canUseGuestLists = false;
  apiMocks.getUserSession.mockReturnValue(null);
  apiMocks.listPublicFaqs.mockResolvedValue([]);
  apiMocks.listReportRules.mockResolvedValue([]);
  apiMocks.listPublicSupportCategories.mockResolvedValue([]);
  apiMocks.createUserMessage.mockResolvedValue({ id: "message-1" });
  apiMocks.listContentComments.mockResolvedValue([]);
  apiMocks.listContentMedia.mockResolvedValue([]);
  apiMocks.listEventParticipants.mockResolvedValue([]);
  apiMocks.listFollowing.mockResolvedValue([]);
  apiMocks.listGuestLists.mockResolvedValue([]);
  apiMocks.createContentComment.mockResolvedValue({
    id: "post-1", targetId: "place-1", body: "", likeCount: 0, createdAt: "2026-08-28T00:00:00.000Z",
  });
  apiMocks.deleteContentComment.mockResolvedValue({});
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

  it("üst seviye postun Paylaş düğmesinden paylaşım lightbox'ını açar", async () => {
    apiMocks.getUserSession.mockReturnValue({ id: "member-1", name: "Ada", username: "ada", role: "user", status: "active" });
    apiMocks.listContentComments.mockResolvedValue([{
      id: "post-1", targetId: "place-1", targetType: "place", parentId: null, authorId: "member-2",
      author: { id: "member-2", name: "Deniz", username: "deniz" }, body: "Topluluk buluşması için güzel bir post.",
      likeCount: 2, createdAt: "2026-08-28T00:00:00.000Z", media: [], replies: [{
        id: "reply-1", targetId: "place-1", targetType: "place", parentId: "post-1", authorId: "member-3",
        author: { id: "member-3", name: "Ece", username: "ece", avatarUrl: "/uploads/ece.webp" }, body: "Ben de katılacağım.",
        likeCount: 0, createdAt: "2026-08-28T00:05:00.000Z", replies: [], media: [],
      }],
    }]);
    render(providers(<ContentComments targetId="place-1" targetType="place" title="Mekân postları" />, "/places/demo"));

    await userEvent.click(await screen.findByRole("button", { name: "Paylaş" }));
    expect(screen.getByRole("dialog", { name: "Paylaş" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Bağlantıyı kopyala" })).toBeVisible();
    expect(screen.getByRole("button", { name: "QR kodu" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Ece profilini aç" })).toHaveAttribute("href", "/users/ece");
    expect(screen.getByRole("link", { name: "@ece" })).toHaveAttribute("href", "/users/ece");
    expect(screen.getByText("Ben de katılacağım.")).toBeVisible();
    expect(within(screen.getByText("Ben de katılacağım.").closest("article")!).queryByRole("button", { name: "Paylaş" })).not.toBeInTheDocument();
  });

  it("yönetici post aksiyonlarında mesaj, yasaklama, Guest List, rapor ve silmeyi; yanıtta paylaşım olmadan sunar", async () => {
    guestEntitlement.canUseGuestLists = true;
    apiMocks.getUserSession.mockReturnValue({ id: "manager-1", name: "Ada", username: "ada", role: "user", status: "active" });
    apiMocks.listGuestLists.mockResolvedValue([{ id: "list-1", name: "VIP", members: [] }]);
    apiMocks.listContentComments.mockResolvedValue([{
      id: "post-actions", targetId: "event-1", targetType: "event", parentId: null, authorId: "member-2",
      author: { id: "member-2", name: "Deniz", username: "deniz" }, body: "Etkinlik postu", likeCount: 3,
      createdAt: "2026-08-28T00:00:00.000Z", media: [], replies: [{
        id: "reply-actions", targetId: "event-1", targetType: "event", parentId: "post-actions", authorId: "member-3",
        author: { id: "member-3", name: "Ece", username: "ece" }, body: "Alt yorum", likeCount: 0,
        createdAt: "2026-08-28T00:05:00.000Z", media: [], replies: [],
      }],
    }]);
    const { container } = render(providers(
      <ContentComments canManage organizerId="manager-1" targetId="event-1" targetType="event" title="Etkinlik postları" />,
      "/events/demo",
    ));

    await screen.findByText("Etkinlik postu");
    const post = container.querySelector<HTMLElement>("#post-post-actions")!;
    const postActions = post.querySelector<HTMLElement>(":scope > div > .comment-actions")!;
    expect(within(postActions).getByRole("button", { name: "Paylaş" })).toBeVisible();
    await userEvent.click(within(postActions).getByRole("button", { name: "Yorum aksiyonları" }));
    expect(within(postActions).getByRole("link", { name: "Mesaj gönder" })).toHaveAttribute("href", "/messages?peer=member-2");
    expect(within(postActions).getByRole("button", { name: "Etkinliğe yasakla" })).toBeVisible();
    expect(within(postActions).getByRole("button", { name: "Rapor et" })).toBeVisible();
    expect(within(postActions).getByRole("button", { name: "Sil" })).toBeVisible();
    await userEvent.click(within(postActions).getByRole("button", { name: "Guest List'e ekle" }));
    const guestDialog = await screen.findByRole("dialog", { name: "Misafir listesine ekle" });
    expect(await within(guestDialog).findByText("VIP")).toBeVisible();
    expect(within(guestDialog).getByText("0 kişi")).toBeVisible();

    await userEvent.click(within(postActions).getByRole("button", { name: "Sil" }));
    const deleteDialog = screen.getByRole("dialog", { name: "Yorumu sil" });
    expect(within(deleteDialog).getByText(/kalıcı olarak silinecek/)).toBeVisible();
    await userEvent.click(within(deleteDialog).getByRole("button", { name: "Yorumu sil" }));
    await waitFor(() => expect(apiMocks.deleteContentComment).toHaveBeenCalledWith("post-actions"));

    const reply = post.querySelector<HTMLElement>(".comment-reply")!;
    expect(within(reply).queryByRole("button", { name: "Paylaş" })).not.toBeInTheDocument();
  });
});

describe("etkinlik ve mekân medya galerisi gereksinimleri 142–143", () => {
  it("ilk dört thumbnail'i, kalan medya sayısını ve tam ekran gezinmeyi gösterir", async () => {
    apiMocks.listContentMedia.mockResolvedValue(Array.from({ length: 5 }, (_, index) => ({
      id: `media-${index + 1}`, url: `https://images.example.com/${index + 1}.webp`, type: "image",
      status: "active", contentType: "event", contentId: "event-1", sortOrder: index,
      isProfilePicture: false, createdAt: "2026-08-28T00:00:00.000Z", updatedAt: "2026-08-28T00:00:00.000Z",
    })));
    render(providers(<ContentMediaGallery targetId="event-1" targetType="event" />, "/events/demo"));

    expect(await screen.findByText("+1")).toBeVisible();
    expect(screen.getAllByRole("button", { name: /Görsel .* büyüt/ })).toHaveLength(4);
    await userEvent.click(screen.getByRole("button", { name: "Görsel 4 / 5 büyüt" }));
    expect(screen.getByRole("dialog", { name: "Medya 4 / 5" })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Sonraki" }));
    expect(screen.getByRole("dialog", { name: "Medya 5 / 5" })).toBeVisible();
  });
});
