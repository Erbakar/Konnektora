import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, createEvent, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, Link, MemoryRouter, Route, RouterProvider, Routes } from "react-router-dom";
import { ComposerTips } from "../components/ComposerTips";
import { ContentComments } from "../components/ContentComments";
import { PollComposer, emptyPollDraft } from "../components/ContentPoll";
import { composerDraftKey, readComposerDraft, writeComposerDraft } from "../lib/composerDrafts";
import { LanguageProvider } from "../lib/i18n";
import { MessagesPage } from "../pages/MessagesPage";
import { PressKitPage } from "../pages/PressKitPage";
import { TagsPage } from "../pages/TagsPage";

const apiMocks = vi.hoisted(() => ({
  createContentComment: vi.fn(),
  createTagComment: vi.fn(),
  getContentNotification: vi.fn(),
  getMessagingPermission: vi.fn(),
  getProfileAffinities: vi.fn(),
  getPublicProfileById: vi.fn(),
  getTyping: vi.fn(),
  getUserSession: vi.fn(),
  listContentComments: vi.fn(),
  listConversationMessages: vi.fn(),
  listConversations: vi.fn(),
  listEvents: vi.fn(),
  listFollowing: vi.fn(),
  listMemberSuggestions: vi.fn(),
  listTagComments: vi.fn(),
  listTagRelatedUsers: vi.fn(),
  listTags: vi.fn(),
  markConversationRead: vi.fn(),
  recordContentView: vi.fn(),
  sendPrivateMessage: vi.fn(),
  sendTyping: vi.fn(),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, ...apiMocks };
});
vi.mock("../lib/useGuestListEntitlement", () => ({ useGuestListEntitlement: () => ({ canUseGuestLists: false }) }));

const member = { id: "member-1", name: "Ada", username: "ada", role: "user", status: "active", onboardingCompleted: true };
const css = readFileSync(resolve(__dirname, "../styles/nov17-composer.css"), "utf8");
const mobileCss = css.slice(css.indexOf("@media (max-width: 700px)"));
const desktopCss = css.slice(css.indexOf("@media (min-width: 701px)"), css.indexOf("@media (max-width: 700px)"));

function shell(children: ReactNode) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <LanguageProvider>{children}</LanguageProvider>
    </QueryClientProvider>
  );
}

/** Gerçek uygulamadaki gibi veri yönlendiricisi: sayfadan çıkış sorusu yalnızca burada çalışır. */
function renderRoutes(routes: Array<{ path: string; element: ReactNode }>, initialEntry: string) {
  const router = createMemoryRouter(
    [...routes, { path: "/feed", element: <p>Akış sayfası</p> }].map((route) => ({
      ...route,
      element: <><nav><Link to="/feed">Akışa git</Link><Link to={initialEntry}>Geri dön</Link></nav>{route.element}</>,
    })),
    { initialEntries: [initialEntry] },
  );
  return { router, ...render(shell(<RouterProvider router={router} />)) };
}

beforeEach(() => {
  window.localStorage.clear();
  apiMocks.getUserSession.mockReturnValue(member);
  apiMocks.listFollowing.mockResolvedValue([]);
  apiMocks.listContentComments.mockResolvedValue([]);
  apiMocks.createContentComment.mockResolvedValue({ id: "post-1" });
  apiMocks.listConversations.mockResolvedValue({
    items: [{
      peer: { id: "peer-1", name: "Deniz", username: "deniz", status: "active", avatarUrl: null },
      lastMessage: { id: "last-1", senderId: "peer-1", recipientId: "member-1", body: "Merhaba", status: "active", createdAt: "2026-08-28T10:00:00.000Z", reactions: [] },
      unreadCount: 0,
      preference: { pinned: false, muted: false, archived: false },
    }, {
      peer: { id: "peer-2", name: "Ece", username: "ece", status: "active", avatarUrl: null },
      lastMessage: { id: "last-2", senderId: "peer-2", recipientId: "member-1", body: "Selam", status: "active", createdAt: "2026-08-27T10:00:00.000Z", reactions: [] },
      unreadCount: 0,
      preference: { pinned: false, muted: false, archived: false },
    }],
    totalUnread: 0,
  });
  apiMocks.listMemberSuggestions.mockResolvedValue([]);
  apiMocks.listConversationMessages.mockResolvedValue({ items: [], page: 1, pageSize: 50, total: 0, hasNextPage: false });
  apiMocks.getTyping.mockResolvedValue({ typing: false });
  apiMocks.sendTyping.mockResolvedValue({ ok: true });
  apiMocks.getPublicProfileById.mockResolvedValue(null);
  apiMocks.markConversationRead.mockResolvedValue({ ok: true });
  apiMocks.getMessagingPermission.mockResolvedValue({ canMessage: true, reason: null });
  apiMocks.sendPrivateMessage.mockResolvedValue({ id: "sent-1", senderId: "member-1", recipientId: "peer-1", body: "Selam", status: "active", createdAt: "2026-08-28T10:05:00.000Z", reactions: [] });
  apiMocks.listTags.mockResolvedValue([{ id: "technology-tag", name: "Teknoloji", slug: "teknoloji", usageCount: 12, eventCount: 0, createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z" }]);
  apiMocks.listTagComments.mockResolvedValue([]);
  apiMocks.listTagRelatedUsers.mockResolvedValue([]);
  apiMocks.listEvents.mockResolvedValue({ items: [], page: 1, pageSize: 1, total: 0, hasNextPage: false });
  apiMocks.recordContentView.mockResolvedValue(undefined);
  apiMocks.getContentNotification.mockResolvedValue({ enabled: false });
  apiMocks.getProfileAffinities.mockResolvedValue([]);
  apiMocks.createTagComment.mockResolvedValue({ id: "tag-post-1" });
  Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: vi.fn() });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("17/10 #10 mobil YouTube / SoundCloud oynatıcıları", () => {
  it("mobilde oynatıcıyı tam genişlikte ve oynatılabilir yükseklikte gösterir, masaüstüne dokunmaz", () => {
    expect(mobileCss).toMatch(/\.embedded-media > iframe,\s*\.embedded-media > \.youtube-preview \{[^}]*aspect-ratio: 16 \/ 9;[^}]*min-height: 0;[^}]*min-width: 0;[^}]*width: 100%;/);
    // 18/10 #1–#3: asgari yükseklik asgari genişliğe dönüşüp kartları ekrandan taşırmasın.
    expect(mobileCss).not.toContain("min-height: 200px");
    expect(mobileCss).toMatch(/\.embedded-media \{[^}]*max-width: none;[^}]*width: 100%;/);
    expect(mobileCss).toMatch(/\.embedded-media\.embedded-audio > iframe \{[^}]*height: 166px;/);
    expect(mobileCss).toMatch(/\.message-bubble:has\(\.embedded-media\) \{[^}]*max-width: 100%;[^}]*width: 100%;/);
    expect(mobileCss).toMatch(/\.content-comments \.admin-list-row > div > \.embedded-media \{[^}]*width: calc\(100% \+ 48px\);/);
    expect(desktopCss).not.toContain("embedded-media");
    expect(css.slice(0, css.indexOf("@media (min-width: 701px)"))).not.toContain("embedded-media");
  });
});

describe("17/10 #18 ipucu bağlantısı ilk dokunuşta açılır", () => {
  it("dokunuş odağı taşımaz (kutu büyüyüp bağlantıyı kaydırmaz) ve ilk tıklama ipuçlarını açar", async () => {
    render(shell(<form><textarea aria-label="Gönderi" /><ComposerTips /></form>));
    const summary = screen.getByText("İpuçları");
    const mouseDown = createEvent.mouseDown(summary);
    fireEvent(summary, mouseDown);
    expect(mouseDown.defaultPrevented).toBe(true);

    await userEvent.click(summary);
    expect(summary.closest("details")).toHaveAttribute("open");
    expect(screen.getByText("@Username")).toBeVisible();
    expect(summary).not.toHaveFocus();
  });
});

describe("17/10 #22 Postahane", () => {
  function renderMessages(entry = "/messages?peer=peer-1") {
    return renderRoutes([{ path: "/messages", element: <MessagesPage /> }], entry);
  }

  it("#22.1 yeni konuşma önerilerinde profil resmi ile kullanıcı adı arasına boşluk koyar", () => {
    expect(css).toMatch(/\.message-search-results \.message-user-result \{ column-gap: 12px; \}/);
  });

  it("#22.2 mesaj almak istemeyen kullanıcıda yazma alanını baştan pasifleştirir ve açıklamayı gösterir", async () => {
    apiMocks.getMessagingPermission.mockResolvedValue({ canMessage: false, reason: "privacy" });
    const { container } = renderMessages();

    expect(await screen.findByText("Bu kullanıcı özel mesaj almak istemiyor.")).toBeVisible();
    expect(apiMocks.getMessagingPermission).toHaveBeenCalledWith("peer-1");
    expect(screen.getByRole("textbox", { name: "Mesaj" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Gönder" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Fotoğraf/video ekle" })).toBeDisabled();
    expect(container.querySelector<HTMLInputElement>('input[type="file"]')).toBeDisabled();
    expect(container.querySelector(".advanced-composer")).toHaveClass("is-closed");
    fireEvent.submit(container.querySelector(".advanced-composer")!);
    expect(apiMocks.sendPrivateMessage).not.toHaveBeenCalled();
    expect(screen.queryByText(/Gönderim tamamlanamadı/)).not.toBeInTheDocument();
  });

  it("#22.2 izin varken yazma alanı açıktır ve uyarı görünmez", async () => {
    renderMessages();
    const box = await screen.findByRole("textbox", { name: "Mesaj" });
    await waitFor(() => expect(apiMocks.getMessagingPermission).toHaveBeenCalledWith("peer-1"));
    expect(box).toBeEnabled();
    expect(screen.getByRole("button", { name: "Gönder" })).toBeEnabled();
    expect(screen.queryByText("Bu kullanıcı özel mesaj almak istemiyor.")).not.toBeInTheDocument();
  });

  it("#22.3 gönderilmeyen mesajı konuşmaya özel taslak olarak saklar, çıkarken sorar ve geri dönünce yükler", async () => {
    const { router } = renderMessages();
    await userEvent.type(await screen.findByRole("textbox", { name: "Mesaj" }), "Yarın görüşelim mi?");
    expect(readComposerDraft(composerDraftKey("member-1", "message", "peer-1"))).toBe("Yarın görüşelim mi?");
    expect(readComposerDraft(composerDraftKey("member-1", "message", "peer-2"))).toBe("");

    await userEvent.click(screen.getByRole("link", { name: "Akışa git" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Bir mesaj taslağı yazdınız. Silinsin mi yoksa taslak olarak kalmaya devam mı etsin?");
    expect(router.state.location.pathname).toBe("/messages");
    await userEvent.click(screen.getByRole("button", { name: "Taslak olarak dursun" }));
    expect(await screen.findByText("Akış sayfası")).toBeVisible();

    await userEvent.click(screen.getByRole("link", { name: "Geri dön" }));
    expect(await screen.findByRole("textbox", { name: "Mesaj" })).toHaveValue("Yarın görüşelim mi?");

    // Başka konuşmaya geçmek de bu konuşmadan çıkmaktır; "Sil" taslağı temizler.
    await userEvent.click(screen.getByRole("button", { name: /@ece/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Sil" }));
    await waitFor(() => expect(router.state.location.search).toBe("?peer=peer-2"));
    expect(readComposerDraft(composerDraftKey("member-1", "message", "peer-1"))).toBe("");
    expect(await screen.findByRole("textbox", { name: "Mesaj" })).toHaveValue("");
  });

  it("#22.3 mesaj gönderilince taslak silinir ve çıkışta soru sorulmaz", async () => {
    renderMessages();
    await userEvent.type(await screen.findByRole("textbox", { name: "Mesaj" }), "Selam");
    await userEvent.click(screen.getByRole("button", { name: "Gönder" }));
    await waitFor(() => expect(apiMocks.sendPrivateMessage).toHaveBeenCalledWith("peer-1", "Selam", { replyToId: undefined }));
    await waitFor(() => expect(readComposerDraft(composerDraftKey("member-1", "message", "peer-1"))).toBe(""));
    await userEvent.click(screen.getByRole("link", { name: "Akışa git" }));
    expect(await screen.findByText("Akış sayfası")).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("#26.2–3 medya düğmesi masaüstünde ikon + bağlantı, mobilde İlgi Alanı tarzı düğmedir", async () => {
    renderMessages();
    const button = await screen.findByRole("button", { name: "Fotoğraf/video ekle" });
    expect(button.querySelector("svg")).toBeInTheDocument();
    expect(button.querySelector(".composer-media-label")).toHaveTextContent("Resim / video ekle");
    expect(desktopCss).toMatch(/\.advanced-composer > button\.message-media-action \{[^}]*background: transparent;[^}]*color: #2b664d;[^}]*padding: 0;/);
    expect(mobileCss).toMatch(/\.advanced-composer > button\.message-media-action \{[^}]*background: #e7eee5;[^}]*min-height: var\(--action-height, 44px\);/);
    expect(mobileCss).toMatch(/\.advanced-composer > button\.message-media-action \.composer-media-label \{[^}]*clip: rect\(0 0 0 0\);/);
  });
});

describe("17/10 #23 gönderi taslağı", () => {
  it("draft anahtarı kullanıcıya ve hedefe özeldir", () => {
    writeComposerDraft(composerDraftKey("u1", "event", "e1"), "taslak");
    expect(readComposerDraft(composerDraftKey("u1", "event", "e1"))).toBe("taslak");
    expect(readComposerDraft(composerDraftKey("u2", "event", "e1"))).toBe("");
    expect(readComposerDraft(composerDraftKey("u1", "place", "e1"))).toBe("");
    expect(composerDraftKey(undefined, "event", "e1")).toBeNull();
    writeComposerDraft(composerDraftKey("u1", "event", "e1"), "   ");
    expect(readComposerDraft(composerDraftKey("u1", "event", "e1"))).toBe("");
  });

  it("Etkinlik Detay: taslağı saklar, sayfadan çıkarken sorar, 'Taslak olarak dursun' ile geri dönünce yükler, 'Sil' ile temizler", async () => {
    renderRoutes([{ path: "/events/demo", element: <ContentComments targetId="event-1" targetType="event" title="Gönderiler" /> }], "/events/demo");
    await userEvent.type(await screen.findByPlaceholderText("Yorum yaz…"), "Harika bir geceydi");
    expect(readComposerDraft(composerDraftKey("member-1", "event", "event-1"))).toBe("Harika bir geceydi");

    await userEvent.click(screen.getByRole("link", { name: "Akışa git" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Bir gönderi taslağı yazdınız. Silinsin mi yoksa taslak olarak kalmaya devam mı etsin?");
    await userEvent.click(screen.getByRole("button", { name: "Taslak olarak dursun" }));
    expect(await screen.findByText("Akış sayfası")).toBeVisible();

    await userEvent.click(screen.getByRole("link", { name: "Geri dön" }));
    expect(await screen.findByPlaceholderText("Yorum yaz…")).toHaveValue("Harika bir geceydi");

    await userEvent.click(screen.getByRole("link", { name: "Akışa git" }));
    await userEvent.click(await screen.findByRole("button", { name: "Sil" }));
    expect(await screen.findByText("Akış sayfası")).toBeVisible();
    expect(readComposerDraft(composerDraftKey("member-1", "event", "event-1"))).toBe("");
    await userEvent.click(screen.getByRole("link", { name: "Geri dön" }));
    expect(await screen.findByPlaceholderText("Yorum yaz…")).toHaveValue("");
  });

  it("Mekân Detay: gönderi yayınlanınca taslak silinir; taslak yokken çıkışta soru sorulmaz", async () => {
    renderRoutes([{ path: "/places/demo", element: <ContentComments targetId="place-1" targetType="place" title="Gönderiler" /> }], "/places/demo");
    await userEvent.type(await screen.findByPlaceholderText("Yorum yaz…"), "Kahvesi çok iyi");
    expect(readComposerDraft(composerDraftKey("member-1", "place", "place-1"))).toBe("Kahvesi çok iyi");
    await userEvent.click(screen.getByRole("button", { name: "Yayınla" }));
    await waitFor(() => expect(apiMocks.createContentComment).toHaveBeenCalledWith("place", "place-1", "Kahvesi çok iyi"));
    await waitFor(() => expect(readComposerDraft(composerDraftKey("member-1", "place", "place-1"))).toBe(""));
    await userEvent.click(screen.getByRole("link", { name: "Akışa git" }));
    expect(await screen.findByText("Akış sayfası")).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("İlgi Alanı Detay: taslağı ilgi alanına özel saklar, çıkarken sorar ve geri dönünce yükler", async () => {
    renderRoutes([{ path: "/tags/:slug", element: <TagsPage /> }], "/tags/teknoloji");
    const box = await screen.findByPlaceholderText(/#Teknoloji hakkında/);
    await userEvent.type(box, "Yeni çıkan araçlar");
    expect(readComposerDraft(composerDraftKey("member-1", "tag", "teknoloji"))).toBe("Yeni çıkan araçlar");

    await userEvent.click(screen.getByRole("link", { name: "Akışa git" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Bir gönderi taslağı yazdınız.");
    await userEvent.click(screen.getByRole("button", { name: "Taslak olarak dursun" }));
    expect(await screen.findByText("Akış sayfası")).toBeVisible();
    await userEvent.click(screen.getByRole("link", { name: "Geri dön" }));
    expect(await screen.findByPlaceholderText(/#Teknoloji hakkında/)).toHaveValue("Yeni çıkan araçlar");

    await userEvent.click(screen.getByRole("button", { name: "Yayınla" }));
    await waitFor(() => expect(apiMocks.createTagComment).toHaveBeenCalledWith("technology-tag", "Yeni çıkan araçlar"));
    await waitFor(() => expect(readComposerDraft(composerDraftKey("member-1", "tag", "teknoloji"))).toBe(""));
  });

  it("veri yönlendiricisi olmayan ortamda (eski testler) bileşen sorunsuz çalışır", async () => {
    render(shell(<MemoryRouter initialEntries={["/events/demo"]}><Routes><Route path="/events/demo" element={<ContentComments targetId="event-1" targetType="event" title="Gönderiler" />} /></Routes></MemoryRouter>));
    await userEvent.type(await screen.findByPlaceholderText("Yorum yaz…"), "Taslak");
    expect(readComposerDraft(composerDraftKey("member-1", "event", "event-1"))).toBe("Taslak");
  });
});

describe("17/10 #25 anket formu kapatma düğmesi", () => {
  it("X ikonunun sağında 'Vazgeç' etiketi taşır; etiket yalnızca mobilde görünür", async () => {
    const onRemove = vi.fn();
    render(<PollComposer draft={emptyPollDraft()} kind="event" onChange={vi.fn()} onRemove={onRemove} tr />);
    const remove = screen.getByRole("button", { name: "Anketi kaldır" });
    expect(remove.querySelector("svg")).toBeInTheDocument();
    expect(remove.querySelector("svg")!.nextElementSibling).toHaveTextContent("Vazgeç");
    expect(remove.closest(".poll-composer-legend")).toHaveTextContent("Anket ayarları");
    await userEvent.click(remove);
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(css).toMatch(/\.poll-composer-remove-label \{ display: none; \}/);
    expect(mobileCss).toMatch(/\.poll-composer-remove-label \{ display: inline; \}/);
    expect(mobileCss).toMatch(/\.poll-composer legend \.poll-composer-remove \{[^}]*align-items: center;[^}]*min-height: 36px;/);
  });
});

describe("17/10 #26 gönderi yaz kutusundaki düğmeler", () => {
  it("#26.1 Etkinlik / Mekân Detay: mobilde Gönder'in sağında 44px ikon düğmeleri ve ardından İpuçları", async () => {
    const { container } = render(shell(<MemoryRouter><ContentComments targetId="event-1" targetType="event" title="Gönderiler" /></MemoryRouter>));
    const form = (await screen.findByPlaceholderText("Yorum yaz…")).closest("form")!;
    expect(form).toHaveClass("content-post-composer");
    const order = [...form.children].map((node) => node.className.split(" ")[0] || node.tagName.toLowerCase());
    expect(order.slice(0, 5)).toEqual(["textarea", "primary-action", "comment-media-picker", "comment-poll-toggle", "composer-tips"]);
    expect(screen.getByLabelText("Resim / video ekle")).toBeInTheDocument();
    const poll = screen.getByRole("button", { name: "Anket ekle" });
    expect(poll.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelector(".comment-media-picker svg")).toBeInTheDocument();
    expect(mobileCss).toMatch(/form\.content-post-composer > \.composer-link \{[^}]*height: 44px;[^}]*width: 44px;/);
    expect(mobileCss).toMatch(/form\.content-post-composer > \.composer-link > span \{[^}]*clip: rect\(0 0 0 0\);/);
    expect(desktopCss).not.toContain("content-post-composer");
  });

  it("#26.1 diğer sayfalardaki (ilgi alanı gönderi yorumları) yazma alanı değişmez", async () => {
    render(shell(<MemoryRouter><ContentComments targetId="tag-post-1" targetType="tag_comment" title="Gönderi yorumları" /></MemoryRouter>));
    // 26/11 #115: ilgi alanı gönderi yorumlarında Etkinlik Detay'daki sade yanıt kutusu kullanılır.
    const form = (await screen.findByRole("textbox", { name: "Yanıtını yaz" })).closest("form")!;
    expect(form).not.toHaveClass("content-post-composer");
    expect(screen.queryByRole("button", { name: "Anket ekle" })).not.toBeInTheDocument();
  });

  it("#26.2 İlgi Alanı Detay: medya düğmesi masaüstünde ikon + bağlantı, mobilde aynı ikon düğmesi", async () => {
    render(shell(<MemoryRouter initialEntries={["/tags/teknoloji"]}><Routes><Route path="/tags/:slug" element={<TagsPage />} /></Routes></MemoryRouter>));
    const input = await screen.findByLabelText("Resim/video ekle");
    const label = input.closest("label")!;
    expect(label).toHaveClass("secondary-action", "tag-composer-media");
    expect(label.querySelector("svg")).toBeInTheDocument();
    expect(label.querySelector(".composer-media-label")).toHaveTextContent("Resim / video ekle");
    expect(desktopCss).toMatch(/\.tag-post-composer \.tag-composer-media,[^{]*\{[^}]*background: transparent;[^}]*color: #2b664d;/);
    expect(mobileCss).toMatch(/\.tag-post-composer \.tag-composer-media \.composer-media-label,[^{]*\{[^}]*clip: rect\(0 0 0 0\);/);
  });
});

describe("10/11 #94 Basın Kiti logoart'ları", () => {
  const logoarts = [
    ["logoart-light-pattern", "Logoart · açık desen"],
    ["logoart-slate-network", "Logoart · gri ağ"],
    ["logoart-dark-grid", "Logoart · koyu yeşil desen"],
    ["logoart-slate-marks", "Logoart · gri zeminde amblemler"],
    ["logoart-constellation", "Logoart · takımyıldız"],
  ] as const;

  it("5 yeni logoart'ı önizleme görseli ve SVG + PNG indirme bağlantısıyla gösterir; dosyalar yayın klasöründedir", () => {
    render(shell(<MemoryRouter><PressKitPage /></MemoryRouter>));
    for (const [file, title] of logoarts) {
      const card = screen.getByRole("heading", { name: title }).closest("article")!;
      expect(card.querySelector("img")).toHaveAttribute("src", `/brand/press/${file}.svg`);
      expect(card.querySelector("img")).toHaveAttribute("alt", title);
      const [svg, png] = [...card.querySelectorAll<HTMLAnchorElement>("a[download]")];
      expect(svg).toHaveAttribute("href", `/brand/press/${file}.svg`);
      expect(png).toHaveAttribute("href", `/brand/press/${file}.png`);
      for (const extension of ["svg", "png"]) {
        expect(existsSync(resolve(__dirname, `../../public/brand/press/${file}.${extension}`))).toBe(true);
      }
      expect(readFileSync(resolve(__dirname, `../../public/brand/press/${file}.svg`), "utf8")).toContain("<svg");
    }
  });
});
