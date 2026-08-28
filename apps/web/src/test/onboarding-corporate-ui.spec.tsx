import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "../lib/i18n";
import { OnboardingPage } from "../pages/OnboardingPage";

const apiMocks = vi.hoisted(() => ({
  getDiscoveryFeed: vi.fn(),
  getMyProfile: vi.fn(),
  getOnboardingStatus: vi.fn(),
  getProfileAffinities: vi.fn(),
  getUserSession: vi.fn(),
  listMemberSuggestions: vi.fn(),
  listProfileMedia: vi.fn(),
  listTags: vi.fn(),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, ...apiMocks };
});

beforeEach(() => {
  apiMocks.getDiscoveryFeed.mockResolvedValue({
    popularMembers: [], newMembers: [], localEvents: [], trendingTags: [], popularPlaces: [],
    activeUserCount: 0, scope: "local", location: "İstanbul", city: "İstanbul", country: "TR", activities: [],
  });
  apiMocks.getUserSession.mockReturnValue({
    id: "business-1",
    name: "Mahmut Tuncer",
    email: "mahmut@example.com",
    role: "user",
    status: "pending",
    accountType: "corporate",
    onboardingCompleted: false,
  });
  apiMocks.getOnboardingStatus.mockResolvedValue({
    completed: false,
    currentStep: { key: "personal_info" },
  });
  apiMocks.getMyProfile.mockResolvedValue({
    id: "business-1",
    name: "Mahmut Tuncer",
    username: "mahmut",
    accountType: "corporate",
    country: null,
    city: null,
    district: "Beyoğlu",
    website: "https://example.com",
    updatedAt: "2026-08-28T00:00:00.000Z",
  });
  apiMocks.getProfileAffinities.mockResolvedValue([]);
  apiMocks.listMemberSuggestions.mockResolvedValue([]);
  apiMocks.listProfileMedia.mockResolvedValue([]);
  apiMocks.listTags.mockResolvedValue([]);
});

describe("kurumsal üyelik onboarding akışı", () => {
  it("üçüncü adımda yalnız firma alanlarını gösterir ve Topluluk adımını tamamen kaldırır", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <LanguageProvider>
          <MemoryRouter><OnboardingPage /></MemoryRouter>
        </LanguageProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Firma bilgileri" })).toBeVisible();
    const progress = screen.getByRole("navigation", { name: "Onboarding adımları" });
    expect(within(progress).getAllByText(/Hesap|Telefon|Firma bilgileri|Profil fotoğrafı|İlgi alanları/)).toHaveLength(5);
    expect(within(progress).queryByText("Topluluk")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Kullanıcı adı" })).toHaveValue("mahmut");
    expect(screen.getByRole("combobox", { name: "Ülke" })).toHaveValue("Türkiye");
    expect(screen.getByRole("combobox", { name: "Şehir" })).toHaveValue("İstanbul");
    expect(screen.getByRole("textbox", { name: "Firmanın ilçesi" })).toHaveValue("Beyoğlu");
    expect(screen.getByRole("textbox", { name: "Web sitesi" })).toHaveValue("https://example.com");
    expect(screen.queryByLabelText("Doğum tarihi")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Cinsiyet" })).not.toBeInTheDocument();
  });
});
