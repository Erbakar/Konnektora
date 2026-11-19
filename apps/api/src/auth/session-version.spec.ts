import { UnauthorizedException } from "@nestjs/common";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { OptionalJwtAuthGuard } from "./optional-jwt-auth.guard";

describe("23/10 #18 password session revocation", () => {
  it.each([JwtAuthGuard, OptionalJwtAuthGuard])("rejects old sessions after a password change (%p)", async Guard => {
    const jwt = { verifyAsync: jest.fn().mockResolvedValue({ sub: "user", sessionVersion: 0 }) };
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ id: "user", status: "active", sessionVersion: 1 }) } };
    const guard = new Guard(jwt as never, prisma as never);
    const request = { headers: { authorization: "Bearer old" } };
    const context = { switchToHttp: () => ({ getRequest: () => request }) } as never;
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    jwt.verifyAsync.mockResolvedValue({ sub: "user", sessionVersion: 1 });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    jwt.verifyAsync.mockResolvedValue({ sub: "user" } as never);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe("19/11 #7 expired admin/user token", () => {
  const context = (request: object) => ({ switchToHttp: () => ({ getRequest: () => request }) }) as never;
  it("explains that the session expired instead of reporting an invalid token", async () => {
    const expired = Object.assign(new Error("jwt expired"), { name: "TokenExpiredError" });
    const guard = new JwtAuthGuard({ verifyAsync: jest.fn().mockRejectedValue(expired) } as never, {} as never);
    await expect(guard.canActivate(context({ headers: { authorization: "Bearer old" } }))).rejects.toThrow("Oturumunuz sona erdi. Yeniden giriş yapın.");
  });
  it("keeps the invalid token message for tampered tokens", async () => {
    const guard = new JwtAuthGuard({ verifyAsync: jest.fn().mockRejectedValue(new Error("invalid signature")) } as never, {} as never);
    await expect(guard.canActivate(context({ headers: { authorization: "Bearer bad" } }))).rejects.toThrow("Geçersiz token.");
  });
});
