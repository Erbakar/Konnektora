import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminFinancePanel } from "../components/AdminFinancePanel";
const api = vi.hoisted(() => ({ listAdminFinanceAccounts: vi.fn(), listAdminFinancePayouts: vi.fn(), listAdminFinanceTransactions: vi.fn(), listHeldFinanceEvents: vi.fn().mockResolvedValue([]), releaseHeldFinanceEvent: vi.fn() }));
vi.mock("../lib/api", () => api);
afterEach(cleanup);
describe("Admin financial records", () => {
  it("shows actual account and transaction amounts and keeps bank integration read-only", async () => {
    api.listAdminFinanceAccounts.mockResolvedValue([{ userId: "u1", user: { name: "Ada", email: "ada@example.com", accountType: "corporate" }, preferredCurrency: "TRY", kycStatus: "approved", availableBalance: 100, pendingBalance: 40, bankProvider: "Bank", bankAccountLabel: "Business", bankAccountLast4: "1234" }]);
    api.listAdminFinancePayouts.mockResolvedValue([]);
    api.listAdminFinanceTransactions.mockResolvedValue([{ id: "t1", event: { title: "Sunset", slug: "sunset" }, payer: { name: "Deniz" }, payee: { name: "Ada" }, grossAmount: 50, platformFee: 5, netAmount: 45, refundedAmount: 0, currency: "TRY", status: "succeeded", createdAt: new Date() }]);
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><AdminFinancePanel/></MemoryRouter></QueryClientProvider>);
    await screen.findByText("Bank · Business · ****1234");
    expect(screen.getByRole("link", { name: "Sunset" })).toHaveAttribute("href", "/events/sunset");
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /Öde|Havale|Banka.*kaydet/ })).not.toBeInTheDocument();
  });
  it("allows release only after the 72-hour eligibility date and calls the selected event", async () => {
    api.listAdminFinanceAccounts.mockResolvedValue([]); api.listAdminFinancePayouts.mockResolvedValue([]); api.listAdminFinanceTransactions.mockResolvedValue([]);
    api.listHeldFinanceEvents.mockResolvedValue([
      { id: "future", title: "Yeni etkinlik", slug: "future", status: "published", eligibleAt: new Date(Date.now() + 86_400_000), totals: [{ currency: "TRY", amount: 80 }] },
      { id: "ready", title: "Tamamlanan etkinlik", slug: "ready", status: "published", eligibleAt: new Date(Date.now() - 1000), totals: [{ currency: "TRY", amount: 40 }] },
      { id: "cancelled", title: "İptal etkinlik", slug: "cancelled", status: "archived", eligibleAt: new Date(0), totals: [{ currency: "TRY", amount: 10 }] },
    ]); api.releaseHeldFinanceEvent.mockResolvedValue({ released: 1 });
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><AdminFinancePanel/></MemoryRouter></QueryClientProvider>);
    await screen.findByText("Tamamlanan etkinlik");
    const buttons = screen.getAllByRole("button", { name: "Geliri serbest bırak" });
    expect(buttons[0]).toBeDisabled(); expect(buttons[1]).toBeEnabled(); expect(buttons[2]).toBeDisabled();
    fireEvent.click(buttons[1]!); await waitFor(() => expect(api.releaseHeldFinanceEvent).toHaveBeenCalledWith("ready", expect.anything()));
  });

});
