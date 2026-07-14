import { validate } from "class-validator";
import { ChangePasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from "./auth.dto";

describe("auth DTO password policy", () => {
  it("rejects weak passwords for registration", async () => {
    const dto = Object.assign(new RegisterDto(), {
      email: "user@example.com",
      name: "Example User",
      password: "password"
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === "password")).toBe(true);
  });

  it("accepts a strong password for password reset", async () => {
    const dto = Object.assign(new ResetPasswordDto(), {
      token: "valid-token",
      password: "StrongPass!123"
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it("does not apply the new complexity policy to existing-user login", async () => {
    const dto = Object.assign(new LoginDto(), {
      email: "legacy@example.com",
      password: "password"
    });

    await expect(validate(dto)).resolves.toEqual([]);
  });

  it("requires company details for corporate registration", async () => {
    const dto = Object.assign(new RegisterDto(), {
      accountType: "corporate",
      email: "company@example.com",
      name: "Authorized Person",
      password: "StrongPass!123"
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(["companyName", "tradeName", "companyType", "businessCategory"])
    );
  });

  it("enforces complexity on the new password when changing it", async () => {
    const dto = Object.assign(new ChangePasswordDto(), { currentPassword: "CurrentPass!1", newPassword: "weakpass" });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === "newPassword")).toBe(true);
  });
});
