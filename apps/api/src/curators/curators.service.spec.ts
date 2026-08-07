import { ForbiddenException } from "@nestjs/common";
import { CuratorsService } from "./curators.service";
describe("CuratorsService", () => {
  const event = { findMany: jest.fn() }; const place = { findMany: jest.fn() }; const user = { findMany: jest.fn() }; const paymentTransaction = { aggregate: jest.fn() }; const curatorApplication = { create: jest.fn() };
  const service = new CuratorsService({ event, place, user, paymentTransaction, curatorApplication } as never);
  beforeEach(() => { jest.clearAllMocks(); event.findMany.mockResolvedValue([]); place.findMany.mockResolvedValue([]); user.findMany.mockResolvedValue([]); paymentTransaction.aggregate.mockResolvedValue({ _sum: { platformFee: 25, netAmount: 475 }, _count: { _all: 2 } }); });
  it("rejects non-curator users", async () => { await expect(service.dashboard({ role: "user", city: "İstanbul" } as never)).rejects.toBeInstanceOf(ForbiddenException); });
  it("limits curator data to the assigned city", async () => { const result = await service.dashboard({ role: "curator", city: "Ankara", curatorCity: "İstanbul" } as never); expect(result.city).toBe("İstanbul"); expect(event.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ city: { equals: "İstanbul", mode: "insensitive" } }) })); expect(result.revenue.platformRevenue).toBe(25); });
});
