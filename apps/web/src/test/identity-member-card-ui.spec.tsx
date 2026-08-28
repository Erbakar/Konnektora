import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "../lib/i18n";
import { IdentityPage } from "../pages/IdentityPage";

const apiMocks = vi.hoisted(() => ({
  getMemberPass: vi.fn(),
  getUserSession: vi.fn(),
  listIncomingMemberScans: vi.fn(),
  listMemberScans: vi.fn(),
  rotateMemberPass: vi.fn(),
}));

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,cXI=") },
}));
vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, ...apiMocks };
});
vi.mock("../components/MemberDeviceScanner", () => ({
  MemberDeviceScanner: ({ nfcPayload }: { nfcPayload?: string }) => <section data-testid="member-scanner">{nfcPayload}</section>,
}));

beforeEach(() => {
  apiMocks.getUserSession.mockReturnValue({ id: "member-1", name: "Ada Yılmaz", username: "ada", email: "ada@example.com" });
  apiMocks.getMemberPass.mockResolvedValue({
    version: 3,
    qrPayload: "konnektora://member/card-token",
    nfcPayload: "https://konnektora.com/member/card-token",
    member: { id: "member-1", name: "Ada Yılmaz", username: "ada" },
  });
  apiMocks.listMemberScans.mockResolvedValue([]);
  apiMocks.listIncomingMemberScans.mockResolvedValue([]);
  apiMocks.rotateMemberPass.mockResolvedValue({});
});

describe("üye kimliği ekranı", () => {
  it("onboarding ayrıntıları yerine yalnız üye kartı, tarama ve geçmiş alanlarını gösterir", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <LanguageProvider><MemoryRouter><IdentityPage /></MemoryRouter></LanguageProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Üye kartın" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Üye QR kartın" })).toBeVisible();
    expect(await screen.findByText("https://konnektora.com/member/card-token")).toHaveAttribute("data-testid", "member-scanner");
    expect(screen.getByRole("heading", { name: "Tarama geçmişi" })).toBeVisible();
    expect(screen.queryByText(/Onboarding/i)).not.toBeInTheDocument();
  });
});
