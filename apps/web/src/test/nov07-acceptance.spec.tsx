import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import {cleanup,fireEvent,render,screen,within} from "@testing-library/react";
import {afterEach,beforeEach,describe,it,expect,vi} from "vitest";
import {MemoryRouter} from "react-router-dom";
import {LanguageProvider} from "../lib/i18n";
import {NotificationsPage} from "../pages/NotificationsPage";
import {MediaViewer} from "../components/MediaAlbum";
import {PollCard} from "../components/ContentPoll";
const api=vi.hoisted(()=>({getUserSession:vi.fn(),listMyNotifications:vi.fn(),listProfileTagSuggestions:vi.fn(),markMyNotificationRead:vi.fn(),listReportRules:vi.fn(),voteContentPoll:vi.fn()}));
vi.mock("../lib/api",async()=>({...await vi.importActual<typeof import("../lib/api")>("../lib/api"),...api}));
function mount(child:React.ReactNode){return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}})}><LanguageProvider><MemoryRouter>{child}</MemoryRouter></LanguageProvider></QueryClientProvider>);}
beforeEach(()=>{window.localStorage.clear();api.getUserSession.mockReturnValue({id:"me",name:"Me",role:"user"});api.listProfileTagSuggestions.mockResolvedValue([]);api.listReportRules.mockResolvedValue([]);api.markMyNotificationRead.mockResolvedValue({});});
afterEach(()=>{cleanup();vi.clearAllMocks();});
const poll={id:"p",question:"Hangi gün?",allowMultiple:false,maxChoices:1,allowOpenAnswer:false,audience:"everyone",closesAt:null,closed:false,canVote:true,viewerVoted:true,viewerOptionIds:["o1"],resultsVisible:true,totalVoters:4,eligibleCount:8,participationRate:50,options:[{id:"o1",label:"Cuma",isOpenAnswer:false,votes:1,percent:25},{id:"o2",label:"Cumartesi",isOpenAnswer:false,votes:3,percent:75}]};
describe("07/11 test maddeleri",()=>{
 it("#4 bildirimlerdeki ISO zamanları okunur biçimde gösterir, #25 onay sorulmayan etiket önerisi bildirimini gizler",async()=>{
  api.listMyNotifications.mockResolvedValue([{id:"a",type:"event_changed",title:"Etkinlik bitişi değiştirildi",body:"Eski etkinlik bitişi “2026-11-01T02:00:00.000Z” olan etkinliğin yeni bilgisi “2026-11-01T05:00:00.000Z” olarak değiştirildi.",createdAt:"2026-11-07T10:00:00Z",readAt:null},{id:"b",type:"profile_tag_suggestion",title:"Profilinize yeni etiket önerildi",body:"x",createdAt:"2026-11-07T10:00:00Z",readAt:null}]);
  mount(<NotificationsPage/>);
  const card=(await screen.findByText("Etkinlik bitişi değiştirildi")).closest("article")!;
  expect(card.textContent).not.toMatch(/T02:00:00/);
  expect(card.textContent).toMatch(/01\.11\.2026 \d\d:\d\d/);
  expect(screen.queryByText("Profilinize yeni etiket önerildi")).toBeNull();
 });
 it("#21 anket sonuçlarını çoktan aza sıralar, kullanıcının oyunu ve oranları gösterir",()=>{
  mount(<PollCard poll={poll} kind="event" queryKey={["x"]} tr/>);
  const rows=screen.getAllByRole("listitem");
  expect(rows[0]!.textContent).toContain("Cumartesi");
  expect(rows[1]!.textContent).toContain("senin oyun");
  expect(screen.getByText(/3 oy · %75/)).toBeVisible();
  expect(screen.getByText("%50")).toBeVisible();
  fireEvent.click(screen.getByRole("button",{name:"Oyunu değiştir"}));
  expect(screen.getByRole("button",{name:"Oyumu güncelle"})).toBeVisible();
 });
 it("#17 #18 lightbox numara menüsü ve sahibine göre aksiyonlar",()=>{
  const items=Array.from({length:5},(_,i)=>({id:`m${i}`,type:"image",url:`/uploads/${i}.webp`}));
  const onChange=vi.fn();
  mount(<MediaViewer items={items} index={2} onChange={onChange} onClose={()=>{}} actions={{kind:"profile",canManage:true,avatarMediaId:"m0",onUpload:async()=>{},onMakeAvatar:async()=>{},onDelete:async()=>{}}}/>);
  const viewer=screen.getByRole("dialog");
  fireEvent.click(within(viewer).getByRole("button",{name:/Medya numarası seç/}));
  const options=within(viewer).getAllByRole("option");
  expect(options).toHaveLength(5);expect(options[2]).toHaveAttribute("aria-selected","true");
  fireEvent.click(within(options[4]!).getByRole("button"));expect(onChange).toHaveBeenCalledWith(4);
  fireEvent.click(within(viewer).getByRole("button",{name:/Aksiyonlar/}));
  const names=within(viewer).getAllByRole("menuitem").map(item=>item.textContent);
  expect(names).toEqual(["Resim / video ekle","Profil resmim yap","Medyayı indir","Sil"]);
  expect(document.body.classList.contains("media-viewer-open")).toBe(true);
 });
});

describe("07/11 test maddeleri 28-38",()=>{
 it("#37 anket oy formunda seçim kutuları seçenek metniyle aynı satırda",()=>{
  mount(<PollCard poll={{...poll,viewerVoted:false,resultsVisible:false,viewerOptionIds:[],options:poll.options.map(o=>({...o,votes:null,percent:null}))}} kind="event" queryKey={["x"]} tr/>);
  const choice=screen.getByRole("radio",{name:"Cuma"});
  expect(choice.closest("label")).toHaveClass("content-poll-choice");
  expect(screen.getByRole("button",{name:"Oy ver"})).toBeDisabled();
 });
});
