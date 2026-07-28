import { ServiceUnavailableException } from "@nestjs/common";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  const prisma = { $queryRaw: jest.fn() };
  const config = { get: jest.fn((key: string) => key === "RESEND_API_KEY" || key === "EMAIL_FROM") };
  const controller = new HealthController(prisma as never, config as never);

  beforeEach(() => jest.clearAllMocks());

  it("reports liveness without external dependencies", () => {
    expect(controller.live()).toMatchObject({ ok: true, service: "konnektora-api" });
  });

  it("reports database and provider readiness", async () => {
    prisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    await expect(controller.ready()).resolves.toMatchObject({ ok: true, database: "ready", providers: { email: true, sms: false, push: false } });
  });

  it("fails readiness when the database cannot be reached", async () => {
    prisma.$queryRaw.mockRejectedValue(new Error("offline"));
    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
