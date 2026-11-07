import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { AppLayout } from "../components/AppLayout";
import { LanguageProvider } from "../lib/i18n";

vi.mock("../lib/api", () => ({
  getUserSession: () => ({ id: "pending-user", role: "user", status: "pending", onboardingCompleted: false }),
  listConversations: vi.fn(), listMyNotifications: vi.fn(), clearUserSession: vi.fn(),
  markMyNotificationRead: vi.fn(), resolveMediaUrl: vi.fn(), updatePreferredLanguage: vi.fn(),
  USER_SESSION_CHANGED_EVENT: "session-changed",
}));
vi.mock("../components/DialogAccessibilityManager", () => ({ DialogAccessibilityManager: () => null }));
vi.mock("../components/CheckInDecisionDialog", () => ({ CheckInDecisionDialog: () => null }));
afterEach(cleanup);

it.each(["/privacy", "/data-deletion", "/contact", "/terms", "/cookies", "/kvkk", "/information", "/distance-selling", "/pre-information", "/cookie-preferences"])("keeps %s accessible to a member who has not completed signup", (path) => {
  render(<QueryClientProvider client={new QueryClient()}><LanguageProvider><MemoryRouter initialEntries={[path]}><Routes><Route element={<AppLayout />}><Route path={path} element={<h1>Public information</h1>} /><Route path="/onboarding" element={<h1>Complete signup</h1>} /></Route></Routes></MemoryRouter></LanguageProvider></QueryClientProvider>);
  expect(screen.getByRole("heading", { name: "Public information" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Complete signup" })).not.toBeInTheDocument();
});
