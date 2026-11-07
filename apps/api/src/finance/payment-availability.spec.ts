import { ServiceUnavailableException } from "@nestjs/common";
import { requireSandboxEnvironment } from "./payment-availability";
import { FinanceService } from "./finance.service";
describe("Live payments cannot be simulated", () => {
 const original = process.env.NODE_ENV;
 afterEach(() => { process.env.NODE_ENV = original; });
 it("blocks sandbox processing in production", () => { process.env.NODE_ENV = "production"; expect(requireSandboxEnvironment).toThrow(ServiceUnavailableException); delete process.env.NODE_ENV; expect(requireSandboxEnvironment).toThrow(ServiceUnavailableException); });
 it("allows local sandbox acceptance tests", () => { process.env.NODE_ENV = "test"; expect(requireSandboxEnvironment).not.toThrow(); });
 it("does not upgrade a paid plan without a real charge in production", async () => { process.env.NODE_ENV = "production"; const prisma = { user: { update: jest.fn() } }; const finance = new FinanceService(prisma as never); await expect(finance.changeMemberPlan({ id: "u1" } as never, { plan: "premium", paymentMethodToken: "pm_fake-token" })).rejects.toThrow(ServiceUnavailableException); expect(prisma.user.update).not.toHaveBeenCalled(); });
});
