import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ContentComments } from "../components/ContentComments";
import { MediaViewer } from "../components/MediaAlbum";
import { LanguageProvider } from "../lib/i18n";

const apiMocks = vi.hoisted(() => ({
  createContentComment: vi.fn(),
  getUserSession: vi.fn(),
  listContentComments: vi.fn(),
  listFollowing: vi.fn(),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, ...apiMocks };
});
vi.mock("../lib/useGuestListEntitlement", () => ({ useGuestListEntitlement: () => ({ canUseGuestLists: false }) }));

const css = readFileSync(resolve(__dirname, "../styles/nov23.css"), "utf8");
const member = { id: "member-1", name: "Ada", username: "ada", role: "user", status: "active", onboardingCompleted: true };
const author = { id: "other", name: "Deniz", username: "deniz" };
const post = (id: string, createdAt: string, extra: Record<string, unknown> = {}) => ({ id, targetId: "target", targetType: "event", authorId: "other", author, body: `Metin ${id}`, likeCount: 0, createdAt, replies: [], media: [], ...extra });

function shell(children: ReactNode) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <LanguageProvider><MemoryRouter>{children}</MemoryRouter></LanguageProvider>
    </QueryClientProvider>
  );
}

afterEach(cleanup);

beforeEach(() => {
  window.localStorage.clear();
  apiMocks.getUserSession.mockReturnValue(member);
  apiMocks.listFollowing.mockResolvedValue([]);
  apiMocks.listContentComments.mockResolvedValue([]);
  apiMocks.createContentComment.mockResolvedValue({ id: "new" });
});

describe("26/11 #104 Gönderiler widget'ı yayınla düğmesi", () => {
  it("Etkinlik / Mekân Detay'da 'Yayınla' yazar, yükleme sürdükçe 'Yayınlanıyor…' olur", async () => {
    let finish: (value: { id: string }) => void = () => {};
    apiMocks.createContentComment.mockReturnValue(new Promise((done) => { finish = done; }));
    render(shell(<ContentComments targetId="event-1" targetType="event" title="Gönderiler" />));
    await userEvent.type(await screen.findByPlaceholderText("Yorum yaz…"), "Merhaba");
    expect(screen.queryByRole("button", { name: "Gönder" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Yayınla" }));
    expect(await screen.findByRole("button", { name: "Yayınlanıyor…" })).toBeDisabled();
    finish({ id: "new" });
    expect(await screen.findByRole("button", { name: "Yayınla" })).toBeInTheDocument();
  });
});

describe("26/11 #111 gönderi kartı aksiyonları", () => {
  it("yorum yoksa 'Yorum yap', varsa 'N yorum'; ikonlar İlgi Alanı kartıyla aynı boyutta", async () => {
    apiMocks.listContentComments.mockResolvedValue([
      post("a", "2026-11-20T10:00:00Z"),
      post("b", "2026-11-21T10:00:00Z", { likeCount: 3, replies: [post("r1", "2026-11-21T11:00:00Z", { parentId: "b" })] }),
    ]);
    const { container } = render(shell(<ContentComments targetId="event-1" targetType="event" title="Gönderiler" />));
    const first = await screen.findByText("Metin a");
    const cardA = first.closest("article")!;
    const cardB = screen.getByText("Metin b").closest("article")!;
    expect(within(cardA).getByRole("button", { name: "Yorum yap" })).toBeInTheDocument();
    expect(screen.queryByText(/^0 yorum$/)).not.toBeInTheDocument();
    expect(within(cardB).getByRole("button", { name: "1 yorum" })).toBeInTheDocument();
    expect(within(cardB).getByRole("button", { name: "Beğen (3)" })).toHaveTextContent("3");
    const actionIcons = [...container.querySelectorAll(".comment-actions > button svg")];
    expect(actionIcons.length).toBeGreaterThan(0);
    actionIcons.forEach((icon) => expect(icon).toHaveAttribute("width", "17"));
    expect(container.querySelector(".comment-action-menu > summary svg")).toHaveAttribute("width", "19");
    expect(css).toMatch(/\.comment-actions > :where\(button, a\),\n\.comment-actions > \.comment-action-menu > summary \{ font-size: inherit; color: inherit;/);
  });
});

describe("26/11 #115 İlgi Alanı gönderi yorumları", () => {
  it("başlık ve sayı göstermez, eskiden yeniye listeler, Etkinlik Detay'daki sade 'Yanıtla' kutusunu kullanır", async () => {
    apiMocks.listContentComments.mockResolvedValue([
      post("yeni", "2026-11-22T10:00:00Z", { targetType: "tag_comment" }),
      post("eski", "2026-11-20T10:00:00Z", { targetType: "tag_comment" }),
    ]);
    const onClose = vi.fn();
    const { container } = render(shell(<ContentComments targetId="tag-post-1" targetType="tag_comment" title="Gönderi yorumları" onClose={onClose} />));
    await screen.findByText("Metin eski");
    expect(screen.queryByText("Gönderi yorumları")).not.toBeInTheDocument();
    expect(screen.queryByText(/^\d+ yorum$/)).not.toBeInTheDocument();
    expect(container.querySelector(".admin-form, .admin-list")).toBeNull();
    const bodies = [...container.querySelectorAll(".comment-replies .post-copy")].map((node) => node.textContent);
    expect(bodies).toEqual(["Metin eski", "Metin yeni"]);
    const form = screen.getByRole("textbox", { name: "Yanıtını yaz" }).closest("form")!;
    expect(form).toHaveClass("comment-inline-editor");
    expect(within(form).queryByText("Resim / video ekle")).not.toBeInTheDocument();
    expect(form.querySelector(".composer-tips")).toBeNull();
    expect(within(form).queryByRole("button", { name: "Yayınla" })).not.toBeInTheDocument();
    await userEvent.type(screen.getByRole("textbox", { name: "Yanıtını yaz" }), "Katılıyorum");
    await userEvent.click(within(form).getByRole("button", { name: "Yanıtla" }));
    await waitFor(() => expect(apiMocks.createContentComment).toHaveBeenCalledWith("tag_comment", "tag-post-1", "Katılıyorum"));
    await userEvent.click(within(form).getByRole("button", { name: "Vazgeç" }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("26/11 #83 Medya Detay lightbox", () => {
  const actions = { kind: "post" as const, canManage: true, target: { type: "event_comment", id: "c1" } };
  it("açıklama alanı kalemin yerinde, medyanın hemen üstünde açılır; resmin üzerine binmez", async () => {
    render(shell(<MediaViewer items={[{ id: "m1", type: "image", url: "/a.jpg", caption: null }]} index={0} onChange={() => {}} onClose={() => {}} actions={actions} />));
    const pencil = screen.getByRole("button", { name: "Açıklama yaz" });
    const stage = pencil.closest(".album-media-stage")!;
    expect(stage.firstElementChild).toBe(pencil);
    await userEvent.click(pencil);
    const form = screen.getByPlaceholderText("Açıklama giriniz...").closest("form")!;
    expect(stage.firstElementChild).toBe(form);
    expect(form.nextElementSibling).toHaveClass("album-image-frame");
    expect(css).toMatch(/\.album-caption, \.album-caption-form \{ position: static;[^}]*background: transparent; font-size: inherit; font-weight: 700;/);
  });

  it("'Resmi kırp' seçilince belirgin bir 'Kırp' onay düğmesi çıkar", async () => {
    render(shell(<MediaViewer items={[{ id: "m1", type: "image", url: "/a.jpg" }]} index={0} onChange={() => {}} onClose={() => {}} actions={actions} />));
    await userEvent.click(screen.getByRole("button", { name: "Aksiyonlar" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Resmi kırp" }));
    const confirm = screen.getByRole("button", { name: "Kırp" });
    expect(confirm).toHaveClass("album-crop-confirm");
    expect(screen.getByRole("button", { name: "Vazgeç" })).toBeInTheDocument();
    expect(css).toMatch(/\.album-crop-actions \{ position: relative; z-index: 4;/);
    expect(css).toMatch(/\.album-image-frame\.is-cropping \{ overflow: hidden; \}/);
  });
});
