import { publicName } from "./public-name";

describe("public names", () => {
  it("never returns a restricted personal name to cards and message peers", () => {
    for (const profileNameAudience of ["nobody", "following", "network"]) {
      expect(publicName({ name: "Private Full Name", username: "member", privacySettings: { profileNameAudience } })).toBe("member");
    }
  });
  it("does not expose contact details used as the name of an unregistered invitee", () => {
    expect(publicName({ name: "+905551234567", status: "invited" })).toBe("Davetli");
    expect(publicName({ name: "private@example.com", status: "invited" })).toBe("Davetli");
  });
  it("uses a neutral label for a private member without a username", () => {
    expect(publicName({ name: "Private Full Name", privacySettings: { profileNameAudience: "nobody" } })).toBe("Konnektora üyesi");
  });
  it("uses the company name for corporate profiles", () => {
    expect(publicName({ name: "Account Operator", accountType: "corporate", companyName: "Studio", privacySettings: { profileNameAudience: "nobody" } })).toBe("Studio");
  });
});
