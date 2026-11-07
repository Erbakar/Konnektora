import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import type { LoginResponse } from "@konnektora/shared";
import { AccountPage } from "../pages/AccountPage";
import { LanguageProvider } from "../lib/i18n";
import { getUserToken, listMyEvents, listSocialAccounts, getPrivacySettings, getProfileVerification } from "../lib/api";

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, listTags: vi.fn().mockResolvedValue([]), listMyEvents: vi.fn(), listSocialAccounts: vi.fn(), getPrivacySettings: vi.fn(), getProfileVerification: vi.fn() };
});
vi.mock("../components/SocialAuthButtons", () => ({
  SocialAuthButtons: ({ onSuccess }: { onSuccess: (response: LoginResponse) => void }) => <button onClick={() => onSuccess({ accessToken: "verified-provider-token", user: { id: "new-user", name: "Ada", email: "ada@example.com", status: "pending", accountType: "individual", role: "user", onboardingCompleted: false } } as LoginResponse)}>Complete provider login</button>,
}));
afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks(); });

it("keeps the verified social session while a new member moves from login into onboarding", async () => {
  localStorage.clear();
  render(<QueryClientProvider client={new QueryClient()}><LanguageProvider><MemoryRouter initialEntries={["/login"]}><Routes><Route path="/login" element={<AccountPage initialMode="login" />} /><Route path="/onboarding" element={<h1>Complete profile</h1>} /><Route path="/settings" element={<h1>Account settings</h1>} /></Routes></MemoryRouter></LanguageProvider></QueryClientProvider>);
  await userEvent.click(screen.getByRole("button", { name: "Complete provider login" }));
  await screen.findByRole("heading", { name: "Complete profile" });
  expect(getUserToken()).toBe("verified-provider-token");
  for (const memberRequest of [listMyEvents, listSocialAccounts, getPrivacySettings, getProfileVerification]) expect(memberRequest).not.toHaveBeenCalled();
});
