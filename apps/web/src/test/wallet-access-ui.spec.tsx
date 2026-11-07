import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WalletPage } from "../pages/WalletPage";
import { LanguageProvider } from "../lib/i18n";
const api=vi.hoisted(()=>({getUserSession:vi.fn(),requestWalletCode:vi.fn(),verifyWalletCode:vi.fn(),closeWallet:vi.fn()}));
vi.mock("../lib/api",()=>api);
vi.mock("../pages/FinancePage",()=>({FinancePage:()=> <div>Protected balances</div>}));
vi.mock("../components/CuratorLedger",()=>({CuratorLedger:()=> <div>Protected ledger</div>}));
function mount(){return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><LanguageProvider><MemoryRouter><WalletPage/></MemoryRouter></LanguageProvider></QueryClientProvider>);}
beforeEach(()=>{vi.resetAllMocks();api.closeWallet.mockResolvedValue({ok:true});api.getUserSession.mockReturnValue({id:"u",accountType:"corporate",role:"user"});});afterEach(cleanup);
describe("wallet entry",()=>{
 it("does not render balances before successful verification and locks on demand",async()=>{api.requestWalletCode.mockResolvedValue({expiresAt:new Date(Date.now()+180000).toISOString(),phoneHint:"•••• 2233"});api.verifyWalletCode.mockResolvedValue({expiresAt:new Date(Date.now()+900000).toISOString()});mount();expect(screen.queryByText("Protected balances")).not.toBeInTheDocument();fireEvent.click(screen.getByRole("button",{name:/SMS kodu gönder|Send SMS code/}));fireEvent.change(await screen.findByLabelText(/8 haneli kod|8-digit code/),{target:{value:"12345678"}});fireEvent.click(screen.getByRole("button",{name:/Cüzdanı aç|Open wallet/}));expect(await screen.findByText("Protected balances")).toBeInTheDocument();fireEvent.click(screen.getByRole("button",{name:/Cüzdanı kilitle|Lock wallet/}));expect(screen.queryByText("Protected balances")).not.toBeInTheDocument();expect(api.closeWallet).toHaveBeenCalled();});
 it("keeps protected content hidden when the provider is unavailable",async()=>{api.requestWalletCode.mockRejectedValue(new Error("SMS servisi yapılandırılmamış"));mount();fireEvent.click(screen.getByRole("button",{name:/SMS kodu gönder|Send SMS code/}));expect(await screen.findByRole("alert")).toHaveTextContent("SMS servisi yapılandırılmamış");expect(screen.queryByText("Protected balances")).not.toBeInTheDocument();});
 it("does not offer SMS access to individual accounts",()=>{api.getUserSession.mockReturnValue({id:"u",accountType:"individual",role:"user"});mount();expect(screen.queryByRole("button",{name:/SMS kodu gönder|Send SMS code/})).not.toBeInTheDocument();expect(api.requestWalletCode).not.toHaveBeenCalled();});
});
