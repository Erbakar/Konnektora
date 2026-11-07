import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PlanAdmin } from "../components/PlanAdmin";
const api=vi.hoisted(()=>({getPlanCatalog:vi.fn(),getPlanHistory:vi.fn().mockResolvedValue([]),findCuratorCandidates:vi.fn().mockResolvedValue([{id:"member",name:"Ada",username:"ada"}]),grantPlanGift:vi.fn().mockResolvedValue({gifts:{}}),updatePlanCatalog:vi.fn().mockResolvedValue({})}));
vi.mock("../lib/api",()=>api);
afterEach(()=>{cleanup();vi.clearAllMocks();});
const plan={name:"Premium",price:4,events:8,tags:5,invites:500,messages:50,sixHours:null,profileViews:null,advanced:true,guest:false};
function setup(){api.getPlanCatalog.mockResolvedValue({revision:7,plans:{individual:{premium:plan},corporate:{pro:{...plan,name:"Pro"}},researcher:{starter:{...plan,name:"Starter"}}}});render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><PlanAdmin/></QueryClientProvider>);}
it("sends the catalog revision and preserves unlimited quotas",async()=>{
 setup();await screen.findByRole("option",{name:"Premium"});fireEvent.change(screen.getAllByLabelText("Fiyat (USD / 31 gün)")[0]!,{target:{value:"6"}});fireEvent.click(screen.getByRole("button",{name:"Paketleri kaydet"}));
 await waitFor(()=>expect(api.updatePlanCatalog).toHaveBeenCalledWith(expect.objectContaining({revision:7,plans:expect.objectContaining({individual:{premium:{...plan,price:6}}})}),expect.anything()));
});
it("grants a selected user a timed gift with an audit reason",async()=>{
 setup();await screen.findByRole("option",{name:"Premium"});fireEvent.change(screen.getByLabelText("Üye ara"),{target:{value:"ada"}});await screen.findByRole("option",{name:"Ada · @ada"});fireEvent.change(screen.getByLabelText("Üye",{exact:true}),{target:{value:"member"}});fireEvent.change(screen.getByLabelText("Süre"),{target:{value:"2"}});fireEvent.change(screen.getByLabelText("Birim"),{target:{value:"weeks"}});fireEvent.change(screen.getByLabelText("Açıklama"),{target:{value:"Beta denemesi"}});fireEvent.click(screen.getByRole("button",{name:"Uygula"}));
 await waitFor(()=>expect(api.grantPlanGift).toHaveBeenCalledWith("member",{audience:"individual",plan:"premium",duration:2,unit:"weeks",reason:"Beta denemesi",revoke:false}));
});
