import { readFileSync } from "fs";
import { resolve } from "path";
import { permissionsPolicyHeader } from "./permissions-policy";

describe("Permissions-Policy (17/10 #15)", () => {
  it("kamerayı kendi kaynağımız için açık bırakır ve başka özelliği kısıtlamaz", () => {
    expect(permissionsPolicyHeader).toBe("camera=(self)");
    expect(permissionsPolicyHeader).not.toMatch(/camera=\(\)/);
    expect(permissionsPolicyHeader).not.toMatch(/geolocation|microphone|clipboard/);
  });

  it("başlık uygulama açılışında tüm yanıtlara eklenir", () => {
    const main = readFileSync(resolve(__dirname, "../main.ts"), "utf8");
    expect(main).toContain('response.setHeader("Permissions-Policy", permissionsPolicyHeader)');
  });
});
