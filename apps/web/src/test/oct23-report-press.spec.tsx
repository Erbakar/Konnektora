import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ReportDialog } from "../components/ReportDialog";
import { PressKitPage } from "../pages/PressKitPage";
import { LanguageProvider } from "../lib/i18n";
const api=vi.hoisted(()=>({createContentReport:vi.fn().mockResolvedValue({}),listReportRules:vi.fn().mockResolvedValue([])}));
vi.mock("../lib/api",async()=>({...await vi.importActual<typeof import("../lib/api")>("../lib/api"),...api}));
afterEach(cleanup);
function mount(child:React.ReactNode){return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><LanguageProvider><MemoryRouter>{child}</MemoryRouter></LanguageProvider></QueryClientProvider>);}
it("#73 closes the report form and shows a confirmation with a rules link",async()=>{
 const close=vi.fn();mount(<ReportDialog open targetType="tag" targetId="tag" onClose={close}/>);
 fireEvent.change(screen.getByRole("combobox"),{target:{value:"|Spam"}});
 fireEvent.change(screen.getByRole("textbox"),{target:{value:"Tekrarlanan içerik"}});
 fireEvent.submit(screen.getByRole("dialog"));
 expect(await screen.findByRole("dialog",{name:"Şikayetiniz bize ulaştı"})).toBeVisible();
 expect(close).toHaveBeenCalledTimes(1);
 expect(screen.getByRole("link",{name:"Konnektora Kuralları"})).toHaveAttribute("href","/help/rules");
 fireEvent.click(screen.getByRole("button",{name:"Kapat"}));
 expect(screen.queryByRole("dialog",{name:"Şikayetiniz bize ulaştı"})).not.toBeInTheDocument();
});
it("#82 offers logo variants, logoart and a typography guide",()=>{
 mount(<PressKitPage/>);
 const links=screen.getAllByRole("link",{name:"SVG indir"});expect(links).toHaveLength(5);
 expect(links.every(link=>link.hasAttribute("download"))).toBe(true);
 expect(screen.getByRole("heading",{name:"Font ve stil"})).toBeVisible();
});
