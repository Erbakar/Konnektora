import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppLayout } from "../components/AppLayout";
import { LanguageProvider } from "../lib/i18n";

vi.mock("../lib/api", () => ({
  getUserSession: () => null,
  listConversations: vi.fn(), listMyNotifications: vi.fn(), clearUserSession: vi.fn(),
  markMyNotificationRead: vi.fn(), resolveMediaUrl: vi.fn(), updatePreferredLanguage: vi.fn(),
  USER_SESSION_CHANGED_EVENT: "session-changed",
}));
vi.mock("../components/DialogAccessibilityManager", () => ({ DialogAccessibilityManager: () => null }));
vi.mock("../components/CheckInDecisionDialog", () => ({ CheckInDecisionDialog: () => null }));
afterEach(cleanup);

function mount(path: string) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <LanguageProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/admin" element={<h1>Backoffice page</h1>} />
              <Route path="/events" element={<h1>Events page</h1>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

describe("17/10 #1 — end-user chrome on backoffice routes", () => {
  it("hides the end-user header, mobile navigation and footer under /admin", () => {
    const { container } = mount("/admin?section=reports");

    expect(screen.getByRole("heading", { name: "Backoffice page" })).toBeInTheDocument();
    expect(container.querySelector(".corp-topbar")).toHaveAttribute("hidden");
    expect(container.querySelector(".corp-mobile-menu")).toHaveAttribute("hidden");
    expect(container.querySelector(".mobile-tab-bar")).toHaveAttribute("hidden");
    expect(container.querySelector(".site-footer")).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Ana navigasyon" })).not.toBeInTheDocument();
  });

  it("keeps the end-user header and footer everywhere else", () => {
    const { container } = mount("/events");

    expect(container.querySelector(".corp-topbar")).not.toHaveAttribute("hidden");
    expect(container.querySelector(".mobile-tab-bar")).not.toHaveAttribute("hidden");
    expect(screen.getByRole("navigation", { name: "Ana navigasyon" })).toBeInTheDocument();
    expect(container.querySelector(".site-footer")).not.toBeNull();
  });
});
