import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "../lib/i18n";
import { MessagesPage } from "../pages/MessagesPage";

const apiMocks = vi.hoisted(() => ({
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
      peer: { id: "peer-1", name: "Deniz", username: "deniz", status: "active" },
      lastMessage: { id: "last-1", senderId: "peer-1", recipientId: "member-1", body: "Merhaba", status: "active", createdAt: "2026-08-28T10:00:00.000Z", reactions: [] },
      unreadCount: 0,
      preference: { pinned: false, muted: false, archived: false },
    }],
    totalUnread: 0,
  });
  apiMocks.listMemberSuggestions.mockResolvedValue([]);
  apiMocks.listConversationMessages.mockResolvedValue({ items: [], page: 1, pageSize: 50, total: 0, hasNextPage: false });
  apiMocks.getTyping.mockResolvedValue({ typing: false });
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
  it("metin olmadan görsel gönderir, medya bağlantısını ikonsuz ve İpuçları ile gösterir", async () => {
    const { container } = render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <LanguageProvider>
          <MemoryRouter initialEntries={["/messages?peer=peer-1"]}><MessagesPage /></MemoryRouter>
        </LanguageProvider>
      </QueryClientProvider>,
    );

    const mediaButton = await screen.findByRole("button", { name: "Fotoğraf/video ekle" });
    expect(mediaButton.querySelector("svg")).not.toBeInTheDocument();
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
});
