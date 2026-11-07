import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { LanguageProvider } from "../lib/i18n";
import { PolicyPage } from "../pages/PolicyPage";

vi.mock("../lib/api", () => ({
  getFallbackPolicy: () => ({ type: "terms", title: "Old terms", body: "Old CMS content", publishedAt: "2026-09-29T00:00:00Z" }),
  getPolicy: vi.fn().mockResolvedValue({ type: "terms", title: "Old terms", body: "Old CMS content", publishedAt: "2026-09-29T00:00:00Z" }),
}));

it("keeps completed terms visible when an older published CMS policy loads", async () => {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LanguageProvider><MemoryRouter><PolicyPage type="terms" /></MemoryRouter></LanguageProvider></QueryClientProvider>);
  expect(await screen.findByRole("heading", { name: "Hizmetin kapsamı ve iletişim" })).toBeInTheDocument();
  expect(screen.queryByText("Old CMS content")).not.toBeInTheDocument();
});

it("shows the new project About content instead of an older CMS draft", async () => {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LanguageProvider><MemoryRouter><PolicyPage type="about" /></MemoryRouter></LanguageProvider></QueryClientProvider>);
  expect(await screen.findByRole("heading", { name: "Konnektora’nın arkasında".replace("’", "'") })).toBeInTheDocument();
  expect(screen.queryByText("Old CMS content")).not.toBeInTheDocument();
});
