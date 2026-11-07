import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearUserSession, getUserToken, getDiscoveryFeed, requestPhoneVerification, setUserSession } from "../lib/api";
import type { LoginResponse } from "@konnektora/shared";

const session = (id: string, status = "pending") => ({ accessToken: `token-${id}`, user: { id, status, name: id, email: `${id}@example.com`, accountType: "corporate", role: "user" } }) as LoginResponse;
beforeEach(() => { localStorage.clear(); });
afterEach(() => { clearUserSession(); vi.unstubAllGlobals(); });
describe("session isolation", () => {
  it("does not let an old unauthorized request clear a newly registered session", async () => {
    let finish!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; })));
    setUserSession(session("old"));
    const request = requestPhoneVerification("+905551112233");
    const rejected = expect(request).rejects.toMatchObject({ status: 401 });
    setUserSession(session("new"));
    finish(new Response("{}", { status: 401 }));
    await rejected;
    expect(getUserToken()).toBe("token-new");
  });
  it("does not send a pending registration token to the active-member discovery endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    setUserSession(session("new"));
    await getDiscoveryFeed({ scope: "local" }).catch(() => undefined);
    expect(new Headers(fetchMock.mock.calls[0]![1].headers).has("Authorization")).toBe(false);
    expect(getUserToken()).toBe("token-new");
  });
});
