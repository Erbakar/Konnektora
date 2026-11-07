import { PlaceInviteManagementPage } from "../pages/InviteManagementPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LanguageProvider } from "../lib/i18n";
import { SettingsSectionPage } from "../pages/SettingsCenterPage";
import { BusinessLandingPage } from "../pages/BusinessLandingPage";
import { StorePage } from "../pages/StorePage";
import { FeedPage } from "../pages/FeedPage";
const api = vi.hoisted(() => ({ getPlace: vi.fn(), listPlaceMembers: vi.fn(), listSentPlaceInvitations: vi.fn(), listPlaceCheckInHistory: vi.fn(), getUserSession: vi.fn(), getPrivacySettings: vi.fn(), listBlocks: vi.fn(), listMyEvents: vi.fn(), getMembership: vi.fn(), getPlanCatalog: vi.fn(), listProfileMedia: vi.fn(), reorderProfileMedia: vi.fn(), getDiscoveryFeed: vi.fn(), listSocialPosts: vi.fn(), listAnnouncements: vi.fn(), listFollowing: vi.fn() }));
vi.mock("../lib/api", async () => ({ ...await vi.importActual<typeof import("../lib/api")>("../lib/api"), ...api }));
vi.mock("../lib/useGuestListEntitlement", () => ({ useGuestListEntitlement: () => ({ canUseGuestLists: false }) }));
const me = { id: "11111111-1111-4111-8111-111111111111", accountType: "individual", name: "Ada", role: "user" };
const activity = { id: "22222222-2222-4222-8222-222222222222", activityId: "comment-1", kind: "event", title: "Konser", href: "/events/konser", action: "Etkinliğe ileti yazdı", occurredAt: "2026-10-15T12:00:00Z", ownerId: me.id, actor: { ...me, username: "ada", avatarUrl: null }, place: { name: "Salon", slug: "salon" }, canManageContent: false };
function mount(child: React.ReactNode, initial = "/") { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><LanguageProvider><MemoryRouter initialEntries={[initial]}>{child}</MemoryRouter></LanguageProvider></QueryClientProvider>); }
beforeEach(() => { localStorage.clear(); api.getUserSession.mockReturnValue(me); api.listMyEvents.mockResolvedValue([]); api.listBlocks.mockResolvedValue([]); api.listAnnouncements.mockResolvedValue([]); api.listFollowing.mockResolvedValue([]); api.listSocialPosts.mockResolvedValue({ items: [] }); api.getPrivacySettings.mockResolvedValue({ profileNameAudience: "nobody", demographicsAudience: "nobody" }); api.getDiscoveryFeed.mockResolvedValue({ activities: [] }); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("#2 hides personal-name and demographics controls only for corporate accounts", async () => {
 api.getUserSession.mockReturnValue({ ...me, accountType: "corporate" }); mount(<SettingsSectionPage section="privacy"/>);
 await screen.findByText("Gizliliği kaydet"); expect(screen.queryByText("Ad soyad görünürlüğü")).not.toBeInTheDocument(); expect(screen.queryByText("Yaş ve cinsiyet görünürlüğü")).not.toBeInTheDocument();
});
it("#2 preserves individual name visibility settings", async () => { mount(<SettingsSectionPage section="privacy"/>); expect(await screen.findByText("Ad soyad görünürlüğü")).toBeInTheDocument(); });
it.each([[null, "/onboarding?type=corporate"], [me, "/settings/business"], [{ ...me, accountType: "corporate" }, "/settings/business"]])("#22 chooses the correct destination for account %j", (user, href) => { api.getUserSession.mockReturnValue(user); mount(<BusinessLandingPage/>); expect(screen.getAllByRole("link", { name: user?.accountType === "corporate" ? "İşletme merkezine git" : "Kurumsal hesap oluştur" })[0]).toHaveAttribute("href", href); });
it("#23 routes billing through wallet verification", () => { api.getUserSession.mockReturnValue({ ...me, accountType: "corporate" }); mount(<SettingsSectionPage section="business"/>); expect(screen.getByRole("link", { name: "Fatura ve vergi bilgileri" })).toHaveAttribute("href", "/settings/billing"); });
it("#24 expands the active plan and shows remaining quotas and end date", async () => {
 api.getPlanCatalog.mockResolvedValue({ plans: { individual: { premium: { name: "Premium" } }, corporate: {}, researcher: {} } }); api.getMembership.mockResolvedValue({ member: { plan: "premium" }, business: { plan: "free" }, limits: { events: 8, tags: 5, invites: 500, messages: 20, sixHours: 6 }, chats: { daily: 7, recent: 2 }, used: { events: 3, tags: 2 }, period: { end: "2026-10-31T12:00:00Z" }, eventInvites: [] }); mount(<StorePage/>);
 const section = await screen.findByLabelText("Paket kullanımın"); expect(section.querySelector("summary")).toHaveTextContent("Premium"); expect(section).not.toHaveAttribute("open"); fireEvent.click(section.querySelector("summary")!); expect(section).toHaveAttribute("open"); expect(section).toHaveTextContent("Kalan etkinlik hakkı: 5"); expect(section).toHaveTextContent("Kalan farklı etiket analizi: 3"); expect(section).toHaveTextContent("31.10.2026"); expect(section).toHaveTextContent("Son 24 saat için kalan yeni sohbet: 13"); expect(section).toHaveTextContent("Son 6 saat için kalan yeni sohbet: 4");
});
it("#15 sends the dropped profile-media order while preserving the profile photo", async () => {
 api.listProfileMedia.mockResolvedValue([{ id: "photo", url: "/photo.png", type: "image", isProfilePicture: true }, { id: "a", url: "/a.png", type: "image" }, { id: "b", url: "/b.png", type: "image" }]); api.reorderProfileMedia.mockResolvedValue([]); mount(<SettingsSectionPage section="profile-pictures"/>);
 const images = await screen.findAllByAltText("Profil medyası"); const cards = images.map(i => i.closest("article")!); expect(cards[0]).toHaveAttribute("draggable", "false"); fireEvent.dragStart(cards[2]!); fireEvent.drop(cards[1]!); await waitFor(() => expect(api.reorderProfileMedia).toHaveBeenCalledWith(["photo", "b", "a"], expect.anything()));
});
it("feed links actor, event and place, expands long posts and does not offer to delete the event for a post author", async () => {
 api.getDiscoveryFeed.mockResolvedValue({ activities: [{ ...activity, body: "A".repeat(300) + "SON", media: [] }] }); mount(<FeedPage/>); expect(await screen.findByRole("link", { name: "Konser" })).toHaveAttribute("href", "/events/konser"); expect(screen.getByRole("link", { name: "Salon" })).toHaveAttribute("href", "/places/salon"); expect(screen.getByRole("link", { name: "@ada" })).toHaveAttribute("href", "/users/ada"); expect(screen.queryByRole("button", { name: "Sil" })).not.toBeInTheDocument(); expect(screen.queryByText(/SON/)).not.toBeInTheDocument(); fireEvent.click(screen.getByText("Daha fazla")); expect(screen.getByText(/SON/)).toBeInTheDocument();
});
it("feed shows five linked interests, then expands the rest", async () => {
 api.getDiscoveryFeed.mockResolvedValue({ activities: [{ ...activity, kind: "tag", title: "", tags: Array.from({ length: 7 }, (_, i) => ({ id: String(i), name: `Etiket${i}`, slug: `etiket${i}` })) }] }); mount(<FeedPage/>); await screen.findByText("#Etiket0"); expect(screen.queryByText("#Etiket5")).not.toBeInTheDocument(); fireEvent.click(screen.getByText("Daha fazla")); expect(screen.getByRole("link", { name: "#Etiket6" })).toHaveAttribute("href", "/tags/etiket6");
});

it("#12 and #14 shows provisional contact details but no role selector on place check-in", async () => {
 api.getPlace.mockResolvedValue({id:"place",slug:"studio",name:"Studio",createdById:me.id}); api.listSentPlaceInvitations.mockResolvedValue([]); api.listPlaceCheckInHistory.mockResolvedValue([]);
 api.listPlaceMembers.mockResolvedValue([{userId:"member",role:"member",status:"accepted",createdAt:new Date().toISOString(),user:{id:"member",name:"Member",email:"member@example.com",status:"active"}},{userId:"guest",role:"member",status:"invited",createdAt:new Date().toISOString(),user:{id:"guest",name:"Davetli",phone:"+905551234567",email:"phone@invite.konnektora.local",status:"invited"}}]);
 mount(<Routes><Route path="/places/:slug/invites" element={<PlaceInviteManagementPage/>}/></Routes>, "/places/studio/invites#check-in");
 expect(await screen.findByText("+905551234567")).toBeInTheDocument(); expect(screen.queryByRole("combobox",{name:"Üye rolü"})).not.toBeInTheDocument(); expect(screen.getByRole("button",{name:"Pasaport kontrol"})).toBeInTheDocument();
});

it("#29 opens the dedicated business centre with a single corporate CTA", () => {
 api.getUserSession.mockReturnValue({...me,accountType:"corporate"}); mount(<BusinessLandingPage/>);
 const links=screen.getAllByRole("link",{name:"İşletme merkezine git"});expect(links).toHaveLength(1);expect(links[0]).toHaveAttribute("href","/settings/business");
});
it("#30 includes the payment-provider fee in the total five-percent commission", () => {
 mount(<BusinessLandingPage/>);expect(screen.getByText(/ödeme sağlayıcısının işlem ücreti dahil toplam %5/)).toBeInTheDocument();expect(screen.queryByText(/işlem ücreti ayrıca uygulanır/)).not.toBeInTheDocument();
});
