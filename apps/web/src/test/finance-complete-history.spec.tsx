import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FinanceHistory } from "../components/FinanceHistory";
import { CuratorLedger } from "../components/CuratorLedger";
import { LanguageProvider } from "../lib/i18n";
const api = vi.hoisted(() => ({ getFinanceTransactionsPage: vi.fn(), getCuratorLedger: vi.fn() }));
const exportExcel = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("../lib/api", () => api);
vi.mock("../lib/financeExport", () => ({ downloadFinanceExcel: exportExcel }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function show(element: React.ReactNode) { render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LanguageProvider><MemoryRouter>{element}</MemoryRouter></LanguageProvider></QueryClientProvider>); }
describe("Complete financial histories", () => {
 it("exports beyond the initial 200 transactions with the same snapshot", async () => {
  const row = { id: "t1", eventId: "e1", event: { title: "Night", slug: "night" }, payer: { id: "payer", name: "Ada" }, payee: { id: "seller", name: "Deniz" }, grossAmount: 100, platformFee: 5, netAmount: 95, refundedAmount: 0, currency: "TRY", status: "succeeded", createdAt: new Date() };
  api.getFinanceTransactionsPage.mockImplementation(async (query: URLSearchParams) => { const page = Number(query.get("page") ?? "1"); const size = Number(query.get("pageSize") ?? "100"); return { items: Array.from({ length: page === 1 ? size : 1 }, (_, index) => ({ ...row, id: `${page}-${index}` })), total: 201, page, pageSize: size }; });
  show(<FinanceHistory/>); await screen.findByText("1 · 201 kayıt"); fireEvent.click(screen.getByRole("button", { name: "Filtrelenen tüm kayıtları Excel indir" }));
  await waitFor(() => expect(exportExcel).toHaveBeenCalled()); const sheets = exportExcel.mock.calls[0]![0]; expect(sheets[0].rows).toHaveLength(201);
  const pages = api.getFinanceTransactionsPage.mock.calls.filter(([query]) => query.has("snapshot")); expect(pages).toHaveLength(2); expect(pages[0]![0].get("snapshot")).toBe(pages[1]![0].get("snapshot"));
  expect(screen.getAllByRole("link", { name: "Ada" })[0]).toHaveAttribute("href", "/users/id/payer");
 });
 it("shows separate curator currencies and keeps member ledger read-only", async () => {
  api.getCuratorLedger.mockResolvedValue({ items: [{ id: "l1", kind: "income", category: "ticket_commission", description: "Commission", amount: 5, currency: "TRY", balance: 5, held: true, sourceKey: "payment:1", occurredAt: new Date(), event: { title: "Night", slug: "night" } }], total: 1, page: 1, pageSize: 100, balances: { TRY: { available: 0, held: 5, total: 5 }, EUR: { available: 30, held: 0, total: 30 } } });
  show(<CuratorLedger/>); await screen.findByText("Commission"); expect(screen.getByText("Kullanılabilir: 30.00")).toBeInTheDocument(); expect(screen.getByText("Blokeli: 5.00")).toBeInTheDocument(); expect(screen.queryByRole("button", { name: "Düzelt" })).not.toBeInTheDocument(); expect(api.getCuratorLedger.mock.calls[0]![1]).toBeUndefined();
 });
});
