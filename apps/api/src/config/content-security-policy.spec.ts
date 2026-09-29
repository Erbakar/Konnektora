import { contentSecurityPolicyDirectives } from "./content-security-policy";

describe("content security policy", () => {
  it("allows Google Identity Services and the People API used by Google Contacts", () => {
    expect(contentSecurityPolicyDirectives.scriptSrc).toContain(
      "https://accounts.google.com/gsi/client",
    );
    expect(contentSecurityPolicyDirectives.frameSrc).toContain(
      "https://accounts.google.com/gsi/",
    );
    expect(contentSecurityPolicyDirectives.connectSrc).toEqual(
      expect.arrayContaining([
        "https://accounts.google.com/gsi/",
        "https://people.googleapis.com",
      ]),
    );
  });

  it("allows the Cloudflare Web Analytics beacon without widening script access", () => {
    expect(contentSecurityPolicyDirectives.scriptSrc).toContain(
      "https://static.cloudflareinsights.com",
    );
    expect(contentSecurityPolicyDirectives.connectSrc).toContain(
      "https://cloudflareinsights.com",
    );
  });

  it("allows the exact YouTube and SoundCloud origins used by embedded posts", () => {
    expect(contentSecurityPolicyDirectives.frameSrc).toEqual(
      expect.arrayContaining([
        "https://www.youtube-nocookie.com",
        "https://w.soundcloud.com",
      ]),
    );
    expect(contentSecurityPolicyDirectives.connectSrc).toEqual(
      expect.arrayContaining([
        "https://www.youtube.com",
        "https://soundcloud.com",
      ]),
    );
  });
});
