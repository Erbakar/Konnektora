import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import {cleanup,fireEvent,render,screen,waitFor,within} from "@testing-library/react";
import {afterEach,beforeEach,describe,it,expect,vi} from "vitest";
import {MemoryRouter} from "react-router-dom";
import {LanguageProvider} from "../lib/i18n";
import {NotificationsPage} from "../pages/NotificationsPage";
import {MediaAlbum} from "../components/MediaAlbum";
const api=vi.hoisted(()=>({getUserSession:vi.fn(),listMyNotifications:vi.fn(),listProfileTagSuggestions:vi.fn(),markMyNotificationRead:vi.fn(),listReportRules:vi.fn()}));
vi.mock("../lib/api",async()=>({...await vi.importActual<typeof import("../lib/api")>("../lib/api"),...api}));
function mount(child:React.ReactNode){return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}})}><LanguageProvider><MemoryRouter>{child}</MemoryRouter></LanguageProvider></QueryClientProvider>);}
beforeEach(()=>{window.localStorage.clear();api.getUserSession.mockReturnValue({id:"me",name:"Me"});api.listProfileTagSuggestions.mockResolvedValue([]);api.listReportRules.mockResolvedValue([]);api.markMyNotificationRead.mockResolvedValue({});});
afterEach(()=>{cleanup();vi.clearAllMocks();vi.unstubAllGlobals();window.history.replaceState({},"","/");});
describe("12/10 notification and shared media acceptance",()=>{
 it("etiket önerisi sonucunda hem etiket hem kullanıcı profilini bağlar",async()=>{
  api.listMyNotifications.mockResolvedValue([{id:"tag-result",type:"profile_tag_suggestion_result",title:"Etiket öneriniz kabul edildi",body:"@ada profiline “”Canlı Müzik|canli-muzik“” etiketi için gönderdiğiniz öneri kabul edildi.",targetUrl:"/users/id/ada-id",createdAt:"2026-10-24T08:00:00Z",readAt:null}]);
  mount(<NotificationsPage/>);
  expect(await screen.findByRole("link",{name:"Canlı Müzik"})).toHaveAttribute("href","/tags/canli-muzik");
  expect(screen.getByRole("link",{name:"@ada"})).toHaveAttribute("href","/users/ada");
 });
 it("includes manager invitations in pending and links the inviter and known content",async()=>{
  window.history.replaceState({},"","/notifications?tab=waiting");
  api.listMyNotifications.mockResolvedValue([{id:"n",type:"place_manager",title:"Mekân yöneticiliği daveti",body:"@ada, Studio mekânına davet etti.",targetLabel:"Studio",targetUrl:"/places/studio",createdAt:"2026-10-12T12:00:00Z",readAt:null}]);
  mount(<NotificationsPage/>);
  expect(await screen.findByRole("link",{name:"Studio"})).toHaveAttribute("href","/places/studio");
  expect(screen.getByRole("link",{name:"@ada"})).toHaveAttribute("href","/users/ada");
 });
 it("23/10 #76 sorts notifications newest first without mutating the response",async()=>{
  const items=[{id:"old",type:"mention",title:"Eski bildirim",body:"Eski",createdAt:"2026-10-20T12:00:00Z",readAt:null},{id:"new",type:"mention",title:"Yeni bildirim",body:"Yeni",createdAt:"2026-10-23T12:00:00Z",readAt:null}];
  api.listMyNotifications.mockResolvedValue(items);
  const {container}=mount(<NotificationsPage/>);await screen.findByText("Yeni bildirim");
  expect([...container.querySelectorAll("[data-notification-id]")].map(node=>node.getAttribute("data-notification-id"))).toEqual(["new","old"]);
  expect(items.map(item=>item.id)).toEqual(["old","new"]);
 });
 it("23/10 #12 advances the album by clicking a photo",()=>{
  mount(<MediaAlbum items={[{id:"a",type:"image",url:"/a.jpg"},{id:"b",type:"image",url:"/b.jpg"}]}/>);
  fireEvent.click(screen.getByRole("button",{name:"Medya 1 / 2"}));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("img"));
  expect(screen.getByRole("dialog",{name:"Medya 2 / 2"})).toBeVisible();
 });
 it("marks only visible unread notifications, once",async()=>{
  let observe:IntersectionObserverCallback=()=>{};
  vi.stubGlobal("IntersectionObserver",class {constructor(cb:IntersectionObserverCallback){observe=cb;}observe(){}unobserve(){}disconnect(){}});
  const items=[{id:"n",type:"place_invite",title:"Davetiye",body:"Studio",targetLabel:"Studio",targetUrl:"/places/studio",createdAt:"2026-10-12T12:00:00Z",readAt:null}];
  api.listMyNotifications.mockResolvedValue(items);
  const {container}=mount(<NotificationsPage/>);await screen.findByText("Davetiye");
  const target=container.querySelector('[data-notification-id="n"]')!;
  observe([{target,isIntersecting:false}] as IntersectionObserverEntry[],{} as IntersectionObserver);expect(api.markMyNotificationRead).not.toHaveBeenCalled();
  observe([{target,isIntersecting:true}] as IntersectionObserverEntry[],{} as IntersectionObserver);
  observe([{target,isIntersecting:true}] as IntersectionObserverEntry[],{} as IntersectionObserver);
  await waitFor(()=>expect(api.markMyNotificationRead).toHaveBeenCalledTimes(1));expect(api.markMyNotificationRead).toHaveBeenCalledWith("n");
 });
 it("groups excess media, browses the entire album and reports the selected item",async()=>{
  const items=Array.from({length:9},(_,i)=>({id:`m${i}`,type:"image",url:`/uploads/${i}.webp`}));
  mount(<MediaAlbum items={items}/>);
  expect(screen.getByText("+5")).toBeVisible();expect(screen.getAllByRole("button",{name:/Medya/})).toHaveLength(4);
  fireEvent.click(screen.getByRole("button",{name:"Medya 4 / 9"}));
  fireEvent.keyDown(screen.getByRole("dialog"),{key:"ArrowRight"});
  const viewer=screen.getByRole("dialog",{name:"Medya 5 / 9"});expect(within(viewer).getByText("5 / 9")).toBeVisible();
  expect(within(viewer).getByRole("img")).toHaveAttribute("src",expect.stringContaining("/uploads/4.webp"));
  fireEvent.click(within(viewer).getByRole("button",{name:/Aksiyonlar/}));expect(within(viewer).getByRole("menuitem",{name:/Medyayı indir/})).toBeVisible();
  fireEvent.click(within(viewer).getByRole("menuitem",{name:/Rapor et/}));expect(await screen.findByRole("dialog",{name:/Rapor/i})).toBeVisible();
 });
});
