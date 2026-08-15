import { validateEnvironment } from "./validate-environment";

describe("validateEnvironment", () => {
  it("does not require production providers during development", () => {
    expect(validateEnvironment({ NODE_ENV: "development" })).toEqual({ NODE_ENV: "development" });
  });

  it("rejects an incomplete production environment", () => {
    expect(() => validateEnvironment({ NODE_ENV: "production" })).toThrow("DATABASE_URL");
  });

  it("accepts a complete production environment", () => {
    const config = { NODE_ENV: "production", DATABASE_URL: "postgresql://db", JWT_SECRET: "a".repeat(32), WEB_ORIGIN: "https://konnektora.netlify.app", PUBLIC_APP_URL: "https://konnektora.netlify.app" };
    expect(validateEnvironment(config)).toBe(config);
  });
});
