import { UnauthorizedException } from "@nestjs/common";
import { OptionalJwtAuthGuard } from "./optional-jwt-auth.guard";

describe("OptionalJwtAuthGuard", () => {
  const context = (authorization?: string) => {
    const request = { headers: authorization ? { authorization } : {} } as { headers: Record<string, string>; user?: unknown };
    return {
      request,
      executionContext: { switchToHttp: () => ({ getRequest: () => request }) } as never
    };
  };

  it("allows anonymous public requests", async () => {
    const guard = new OptionalJwtAuthGuard({ verifyAsync: jest.fn() } as never, { user: { findUnique: jest.fn() } } as never);
    const { executionContext } = context();
    await expect(guard.canActivate(executionContext)).resolves.toBe(true);
  });

  it("attaches an active user when a valid token is supplied", async () => {
    const jwt = { verifyAsync: jest.fn().mockResolvedValue({ sub: "user-1" }) };
    const user = { id: "user-1", status: "active" };
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user) } };
    const guard = new OptionalJwtAuthGuard(jwt as never, prisma as never);
    const { request, executionContext } = context("Bearer valid-token");

    await expect(guard.canActivate(executionContext)).resolves.toBe(true);
    expect(request.user).toBe(user);
  });

  it("rejects an invalid supplied token", async () => {
    const guard = new OptionalJwtAuthGuard(
      { verifyAsync: jest.fn().mockRejectedValue(new Error("invalid")) } as never,
      { user: { findUnique: jest.fn() } } as never
    );
    const { executionContext } = context("Bearer invalid-token");
    await expect(guard.canActivate(executionContext)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
