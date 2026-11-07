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
