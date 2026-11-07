const curatorDefaultRates = { event_gate: 50, sponsorship: 30, ticket_commission: 30, extra_invite: 30, extra_message: 30, event_banner_ad: 30, tag_sponsorship_ad: 30, tag_theme_ad: 30 };
import { CuratorFinanceService } from "./curator-finance.service";

describe("curator agreement versions", () => {
  const curatorAgreement = { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn() };
  const user = { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() };
  const tx = { curatorAgreement, user, $queryRaw: jest.fn() };
  const service = new CuratorFinanceService({ $transaction: (fn: (value: typeof tx) => unknown) => fn(tx) } as never);
  beforeEach(() => {
    jest.clearAllMocks();
    user.findUnique.mockResolvedValue({ id: "curator-1", role: "curator", status: "active" });
    curatorAgreement.findFirst.mockResolvedValue({ version: 2, rates: { extra_invite: 20 } });
    curatorAgreement.findMany.mockResolvedValue([]);
    curatorAgreement.create.mockImplementation(({ data }) => data);
  });
  it("adds an agreement version with the approved new rates without rewriting past entries", async () => {
    const rates = Object.fromEntries(Object.entries(curatorDefaultRates).filter(([key]) => key !== "referral"));
    const result = await service.saveAgreement("curator-1", { active: true, territories: [{ country: "Türkiye", city: "İstanbul" }], rates }, { id: "admin-1" } as never);
    expect(result).toMatchObject({ version: 3, rates: { extra_invite: 30, extra_message: 30, event_banner_ad: 30, tag_sponsorship_ad: 30, tag_theme_ad: 30 } });
    expect(curatorAgreement.create).toHaveBeenCalledTimes(1);
  });
  it("allows a curator without assigned territory and clears the legacy city", async () => {
    await service.saveAgreement("curator-1", { active: true, territories: [], rates: {} }, { id: "admin-1" } as never);
    expect(user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { role: "curator", curatorCity: null } }));
    expect(curatorAgreement.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ territories: [] }) }));
  });
});
