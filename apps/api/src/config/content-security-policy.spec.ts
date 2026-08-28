import { contentSecurityPolicyDirectives } from "./content-security-policy";

describe("content security policy", () => {
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
