import { UnauthorizedException } from "@nestjs/common";
import { OnboardingJwtAuthGuard } from "./onboarding-jwt-auth.guard";

describe("OnboardingJwtAuthGuard", () => {
  const createContext = () => {
    const request = { headers: { authorization: "Bearer onboarding-token" } } as Record<string, any>;
    return {
      request,
      context: {
        switchToHttp: () => ({ getRequest: () => request }),
      },
    };
  };

  it.each(["pending", "active"])("allows %s members to complete phone verification", async (status) => {
    const jwt = { verifyAsync: jest.fn().mockResolvedValue({ sub: "user-1", role: "user" }) };
    const user = { id: "user-1", role: "user", status };
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user) } };
    const guard = new OnboardingJwtAuthGuard(jwt as never, prisma as never);
    const { context, request } = createContext();

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(request.user).toBe(user);
  });

  it("keeps blocked account states out of onboarding", async () => {
    const jwt = { verifyAsync: jest.fn().mockResolvedValue({ sub: "user-1", role: "user" }) };
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ id: "user-1", status: "suspended" }) } };
    const guard = new OnboardingJwtAuthGuard(jwt as never, prisma as never);

    await expect(guard.canActivate(createContext().context as never)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
