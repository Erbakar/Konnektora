import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "../lib/i18n";
import { MessagesPage } from "../pages/MessagesPage";

const apiMocks = vi.hoisted(() => ({
  getPublicProfileById: vi.fn(),
  getTyping: vi.fn(),
  getUserSession: vi.fn(),
  listConversationMessages: vi.fn(),
  listConversations: vi.fn(),
  listMemberSuggestions: vi.fn(),
  markConversationRead: vi.fn(),
  sendPrivateMessage: vi.fn(),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, ...apiMocks };
});

beforeEach(() => {
  window.localStorage.clear();
  apiMocks.getUserSession.mockReturnValue({
    id: "member-1", name: "Ada", username: "ada", role: "user", status: "active", onboardingCompleted: true,
  });
  apiMocks.listConversations.mockResolvedValue({
    items: [{
      peer: { id: "peer-1", name: "Deniz", username: "deniz", status: "active", avatarUrl: "/uploads/deniz.webp" },
      lastMessage: { id: "last-1", senderId: "peer-1", recipientId: "member-1", body: "Merhaba", status: "active", createdAt: "2026-08-28T10:00:00.000Z", reactions: [] },
      unreadCount: 0,
      preference: { pinned: false, muted: false, archived: false },
    }],
    totalUnread: 0,
  });
  apiMocks.listMemberSuggestions.mockResolvedValue([{
    id: "peer-2", name: "Ece", username: "ece", avatarUrl: "/uploads/ece.webp", accountType: "individual",
    city: "İstanbul", country: "Türkiye", followerCount: 3, commonTagCount: 1, following: false,
  }]);
  apiMocks.listConversationMessages.mockResolvedValue({ items: [], page: 1, pageSize: 50, total: 0, hasNextPage: false });
  apiMocks.getTyping.mockResolvedValue({ typing: false });
  apiMocks.getPublicProfileById.mockResolvedValue(null);
  apiMocks.markConversationRead.mockResolvedValue({ ok: true });
  apiMocks.sendPrivateMessage.mockResolvedValue({
    id: "media-message", senderId: "member-1", recipientId: "peer-1", body: "", status: "active",
    attachmentUrl: "/uploads/photo.webp", attachmentType: "image/webp", attachmentName: "photo.webp",
    createdAt: "2026-08-28T10:05:00.000Z", reactions: [],
  });
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:preview") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: vi.fn() });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("özel mesaj medya gereksinimleri 139–141", () => {
  it("yeni kurumsal konuşmada kullanıcı adı altında marka adını gösterir", async () => {
    apiMocks.listConversations.mockResolvedValue({ items: [], totalUnread: 0 });
    apiMocks.listMemberSuggestions.mockResolvedValue([]);
    apiMocks.getPublicProfileById.mockResolvedValue({ id: "peer-1", username: "marka", name: "Temsilci Adı", accountType: "corporate", companyName: "Test Markası", media: [] });
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LanguageProvider><MemoryRouter initialEntries={["/messages?peer=peer-1"]}><MessagesPage /></MemoryRouter></LanguageProvider></QueryClientProvider>);
    expect(await screen.findByText("Test Markası")).toBeVisible();
    expect(screen.getByRole("link", { name: "@marka" })).toBeVisible();
    expect(screen.queryByText("Temsilci Adı")).not.toBeInTheDocument();
  });

  it("metin olmadan görsel gönderir, medya ikonunu ve İpuçlarını gösterir", async () => {
    const { container } = render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <LanguageProvider>
          <MemoryRouter initialEntries={["/messages?peer=peer-1"]}><MessagesPage /></MemoryRouter>
        </LanguageProvider>
      </QueryClientProvider>,
    );

    const mediaButton = await screen.findByRole("button", { name: "Fotoğraf/video ekle" });
    expect(container.querySelector<HTMLImageElement>(".conversation-avatar img")?.src).toMatch(/\/uploads\/deniz\.webp$/);
    expect(container.querySelector<HTMLImageElement>(".thread-peer-avatar img")?.src).toMatch(/\/uploads\/deniz\.webp$/);
    expect(mediaButton.querySelector("svg")).toBeInTheDocument();
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const image = new File(["image"], "photo.webp", { type: "image/webp" });
    fireEvent.change(input, { target: { files: [image] } });
    await userEvent.click(screen.getByRole("button", { name: "Gönder" }));

    await waitFor(() => expect(apiMocks.sendPrivateMessage).toHaveBeenCalledWith("peer-1", "", { replyToId: undefined, attachment: image }));
    await userEvent.click(screen.getByText("İpuçları"));
    expect(screen.getByText("@Username")).toBeVisible();
    expect(screen.getByText(/YouTube ve SoundCloud/)).toBeVisible();
  });

  it("aynı yüklemedeki metinsiz medyaları tek kolajda birleştirir", async () => {
    apiMocks.listConversationMessages.mockResolvedValue({
      items: [
        { id: "media-1", senderId: "member-1", recipientId: "peer-1", body: "", status: "active", attachmentUrl: "/uploads/one.webp", attachmentType: "image/webp", attachmentName: "one.webp", createdAt: "2026-08-28T10:05:00.000Z", reactions: [] },
        { id: "media-2", senderId: "member-1", recipientId: "peer-1", body: "", status: "active", attachmentUrl: "/uploads/two.webp", attachmentType: "image/webp", attachmentName: "two.webp", createdAt: "2026-08-28T10:05:15.000Z", reactions: [] },
      ],
      page: 1, pageSize: 50, total: 2, hasNextPage: false,
    });
    const { container } = render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <LanguageProvider><MemoryRouter initialEntries={["/messages?peer=peer-1"]}><MessagesPage /></MemoryRouter></LanguageProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(container.querySelector(".message-media-collage-2")).toBeInTheDocument());
    expect(container.querySelectorAll(".message-media-collage-2 img")).toHaveLength(2);
    expect(container.querySelector(".message-bubble > p")).not.toBeInTheDocument();
  });

  it("yeni konuşma önerilerinde kullanıcının profil fotoğrafını gösterir", async () => {
    const { container } = render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <LanguageProvider><MemoryRouter initialEntries={["/messages"]}><MessagesPage /></MemoryRouter></LanguageProvider>
      </QueryClientProvider>,
    );

    await userEvent.click(await screen.findByPlaceholderText("Kullanıcı adı veya ad yaz…"));
    expect(await screen.findByRole("button", { name: /@ece/ })).toBeVisible();
    expect(container.querySelector<HTMLImageElement>(".message-result-avatar img")?.src).toMatch(/\/uploads\/ece\.webp$/);
  });
});

it("#4 loads all pages of a long conversation in chronological order without duplicate messages", async () => {
 const all=Array.from({length:120},(_,i)=>({id:`long-${i}`,senderId:"peer-1",recipientId:"member-1",body:`Uzun mesaj ${i+1}`,status:"active",createdAt:new Date(2026,9,1,12,i).toISOString(),reactions:[]}));
 apiMocks.listConversationMessages.mockImplementation(async (_peer,page=1)=>({items:all.slice(Math.max(0,120-page*50),120-(page-1)*50),page,pageSize:50,total:120,hasNextPage:page*50<120}));
 render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><LanguageProvider><MemoryRouter initialEntries={["/messages?peer=peer-1"]}><MessagesPage/></MemoryRouter></LanguageProvider></QueryClientProvider>);
 await screen.findByText("Uzun mesaj 120"); expect(screen.queryByText("Uzun mesaj 1")).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:"Önceki mesajları yükle"}));await screen.findByText("Uzun mesaj 21");
 fireEvent.click(screen.getByRole("button",{name:"Önceki mesajları yükle"}));await screen.findByText("Uzun mesaj 1");
 expect(screen.getAllByText(/^Uzun mesaj \d+$/)).toHaveLength(120);expect(screen.queryByRole("button",{name:"Önceki mesajları yükle"})).not.toBeInTheDocument();
 expect(screen.getByText("Uzun mesaj 1").compareDocumentPosition(screen.getByText("Uzun mesaj 120")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
 expect(apiMocks.listConversationMessages).toHaveBeenCalledWith("peer-1",3);
});
