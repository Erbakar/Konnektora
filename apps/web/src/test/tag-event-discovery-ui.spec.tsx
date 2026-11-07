import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LanguageProvider } from "../lib/i18n";
import { TagsPage } from "../pages/TagsPage";

const apiMocks = vi.hoisted(() => ({
  getUserSession: vi.fn(),
  updateProfileAffinities: vi.fn().mockResolvedValue([]),
  listFollowing: vi.fn().mockResolvedValue([]),
  getContentNotification: vi.fn().mockResolvedValue({enabled:false}),
  getProfileAffinities: vi.fn().mockResolvedValue([]),
  listEvents: vi.fn(),
  listTagComments: vi.fn(),
  listTagRelatedUsers: vi.fn(),
  listTags: vi.fn(),
  recordContentView: vi.fn(),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, ...apiMocks };
});

vi.mock("../lib/useGuestListEntitlement", () => ({useGuestListEntitlement: () => ({canUseGuestLists:false})}));
afterEach(cleanup);
beforeEach(() => {
  apiMocks.getUserSession.mockReturnValue(null);
  apiMocks.listTags.mockResolvedValue([{
    id: "technology-tag", name: "Teknoloji", slug: "teknoloji", usageCount: 12, eventCount: 7,
    createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z",
  }]);
  apiMocks.listTagComments.mockResolvedValue([]);
  apiMocks.listTagRelatedUsers.mockResolvedValue([]);
  apiMocks.listEvents.mockResolvedValue({ items: [], page: 1, pageSize: 1, total: 7, hasNextPage: true });
  apiMocks.recordContentView.mockResolvedValue(undefined);
});

describe("ilgi alanı etkinlik bağlantısı", () => {
  it("gelecek/halen süren etkinlik sayısını kişiler ile yorumlar arasında gösterip filtreli listeye bağlar", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={client}>
        <LanguageProvider>
          <MemoryRouter initialEntries={["/tags/teknoloji"]}>
            <Routes><Route path="/tags/:slug" element={<TagsPage />} /></Routes>
          </MemoryRouter>
        </LanguageProvider>
      </QueryClientProvider>,
    );

    const notice = await screen.findByRole("link", { name: "7 ilişkili etkinlik bulundu." });
    expect(notice).toHaveAttribute("href", "/events?tag=teknoloji");
    expect(apiMocks.listEvents.mock.calls[0]?.[0].get("tag")).toBe("teknoloji");
    expect(apiMocks.listEvents.mock.calls[0]?.[0].get("dateFrom")).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const people = screen.getByRole("heading", { name: "Profiline ekleyen kişiler" }).closest("section")!;
    const comments = screen.getByRole("heading", { name: "Bu etiketteki gönderiler" }).closest("section")!;
    expect(people.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(notice.compareDocumentPosition(comments) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector(".tag-related-events-notice")).toBe(notice);
  });
});

it("13/10 #6 shows an icon on the tag-post unfollow action", async () => {
 apiMocks.getUserSession.mockReturnValue({id:"viewer",name:"Viewer"}); apiMocks.listFollowing.mockResolvedValue([{id:"author"}]); apiMocks.listTagComments.mockResolvedValue([{id:"post",body:"Test post",createdAt:new Date().toISOString(),likeCount:0,author:{id:"author",name:"Ada",username:"ada"}}]);
 render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><LanguageProvider><MemoryRouter initialEntries={["/tags/teknoloji"]}><Routes><Route path="/tags/:slug" element={<TagsPage/>}/></Routes></MemoryRouter></LanguageProvider></QueryClientProvider>);
 const menu=await screen.findByLabelText("Gönderi işlemleri"); fireEvent.click(menu);
 expect((await screen.findAllByRole("button",{name:"Takibi bırak"})).find(button => !button.classList.contains("follow-star"))!.querySelector("svg")).not.toBeNull();
});

it("23/10 #25 removes an already selected sentiment while retaining other interests", async () => {
 apiMocks.getUserSession.mockReturnValue({id:"viewer",name:"Viewer"});
 apiMocks.getProfileAffinities.mockResolvedValue([{tag:{id:"technology-tag"},sentiment:"ok"},{tag:{id:"other"},sentiment:"like"}]);
 render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><LanguageProvider><MemoryRouter initialEntries={["/tags/teknoloji"]}><Routes><Route path="/tags/:slug" element={<TagsPage/>}/></Routes></MemoryRouter></LanguageProvider></QueryClientProvider>);
 const button=await screen.findByRole("button",{name:"Kararsızım"});
 fireEvent.click(button);
 await vi.waitFor(()=>expect(apiMocks.updateProfileAffinities).toHaveBeenCalledWith([{tagId:"other",sentiment:"like"}]));
});
