import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { AdminGuard } from "./admin.guard";

function createContext(request: Record<string, unknown> = {}) {
  return {
    switchToHttp: () => ({
      getRequest: () => request
    }),
    getHandler: jest.fn(),
    getClass: jest.fn()
  } as unknown as ExecutionContext;
}

describe("AdminGuard", () => {
  const createGuard = (requiredPermissions: string[] = []) => {
    const jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({ sub: "admin-1", role: "admin" })
    } as unknown as JwtService;
    const prisma = {
      user: {
        findUnique: jest.fn()
      }
    };
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(requiredPermissions)
    } as unknown as Reflector;

    return {
      guard: new AdminGuard(jwtService, prisma as never, reflector),
      prisma
    };
  };

  it("allows super admins without checking role group permissions", async () => {
    const { guard, prisma } = createGuard(["roles.manage"]);
    const request = { headers: { authorization: "Bearer token" } };

    prisma.user.findUnique.mockResolvedValueOnce({
      id: "admin-1",
      role: "super_admin",
      status: "active"
    });

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
  });

  it("allows admins when their role group has the required permission", async () => {
    const { guard, prisma } = createGuard(["reports.manage"]);
    const request = { headers: { authorization: "Bearer token" } };

    prisma.user.findUnique
      .mockResolvedValueOnce({ id: "admin-1", role: "admin", status: "active" })
      .mockResolvedValueOnce({
        id: "admin-1",
        role: "admin",
        status: "active",
        adminRoleGroup: { permissions: ["reports.manage"] }
      });

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
  });

  it("rejects admins when their role group is missing the required permission", async () => {
    const { guard, prisma } = createGuard(["events.manage"]);
    const request = { headers: { authorization: "Bearer token" } };

    prisma.user.findUnique
      .mockResolvedValueOnce({ id: "admin-1", role: "admin", status: "active" })
      .mockResolvedValueOnce({
        id: "admin-1",
        role: "admin",
        status: "active",
        adminRoleGroup: { permissions: ["reports.manage"] }
      });

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
