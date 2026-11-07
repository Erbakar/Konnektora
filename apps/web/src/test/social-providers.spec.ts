import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("../lib/api", () => ({ isMockApiMode: false }));
import { getSocialCredential } from "../lib/socialProviders";

afterEach(() => vi.unstubAllEnvs());

describe("social provider configuration", () => {
  it.each(["google", "facebook"] as const)("does not silently sign into a demo %s account", async (provider) => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "");
    vi.stubEnv("VITE_FACEBOOK_APP_ID", "");
    await expect(getSocialCredential(provider)).rejects.toThrow("henüz etkinleştirilmedi");
  });
});
