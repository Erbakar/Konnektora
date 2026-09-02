import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../lib/i18n";
import { SettingsSectionPage } from "../pages/SettingsCenterPage";

const apiMocks = vi.hoisted(() => ({
  getUserSession: vi.fn(),
  upgradeCorporateAccount: vi.fn(),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, ...apiMocks };
});

describe("business account settings", () => {
  it("collects company classification and location with the requested field types", async () => {
    apiMocks.getUserSession.mockReturnValue({
      id: "member-1",
      name: "Ada",
      role: "user",
      accountType: "individual",
      city: null,
      country: null,
    });
    apiMocks.upgradeCorporateAccount.mockReturnValue(new Promise(() => undefined));
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <LanguageProvider>
          <MemoryRouter>
            <SettingsSectionPage section="business" />
          </MemoryRouter>
        </LanguageProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByLabelText("Şirket türü")).toBeInstanceOf(HTMLSelectElement);
    expect(screen.getByLabelText("İşletme kategorisi")).toBeInstanceOf(HTMLSelectElement);
    expect(screen.getByLabelText("Firmanın ülkesi")).toBeInstanceOf(HTMLSelectElement);
    expect(screen.getByLabelText("Firmanın şehri (opsiyonel)")).not.toBeRequired();
    expect(screen.getByLabelText("Firmanın ilçesi (opsiyonel)")).toBeInstanceOf(HTMLInputElement);
    expect(screen.getByLabelText("Firmanın açık adresi (opsiyonel)")).toBeInstanceOf(HTMLInputElement);

    await userEvent.type(screen.getByLabelText("İşletme adı"), "Konnektora");
    await userEvent.type(screen.getByLabelText("Ticari unvan"), "Konnektora Teknoloji Ltd.");
    await userEvent.selectOptions(screen.getByLabelText("Şirket türü"), "limited_or_corporation");
    await userEvent.selectOptions(screen.getByLabelText("İşletme kategorisi"), "event_organizer");
    await userEvent.selectOptions(screen.getByLabelText("Firmanın ülkesi"), "Türkiye");
    await userEvent.selectOptions(screen.getByLabelText("Firmanın şehri (opsiyonel)"), "İstanbul");
    await userEvent.type(screen.getByLabelText("Firmanın ilçesi (opsiyonel)"), "Beyoğlu");
    await userEvent.type(screen.getByLabelText("Firmanın açık adresi (opsiyonel)"), "İstiklal Caddesi 10");
    await userEvent.click(screen.getByRole("button", { name: "Kurumsal hesaba geç" }));

    await waitFor(() => expect(apiMocks.upgradeCorporateAccount).toHaveBeenCalledWith({
      companyName: "Konnektora",
      tradeName: "Konnektora Teknoloji Ltd.",
      companyType: "limited_or_corporation",
      businessCategory: "event_organizer",
      country: "Türkiye",
      city: "İstanbul",
      district: "Beyoğlu",
      address: "İstiklal Caddesi 10",
    }));
  });
});
