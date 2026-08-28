import { validate } from "class-validator";
import { CuratorApplicationDto } from "./curators.dto";

function application(cvUrl: string) {
  return Object.assign(new CuratorApplicationDto(), {
    name: "Ada Yılmaz",
    email: "ada@example.com",
    city: "İstanbul",
    motivation: "Şehrimde nitelikli topluluk etkinlikleri düzenlemek ve yerel ağı büyütmek istiyorum.",
    cvUrl,
  });
}

describe("CuratorApplicationDto", () => {
  it("accepts a valid CV URL from any web domain", async () => {
    await expect(validate(application("https://portfolio.example.com/ada"))).resolves.toHaveLength(0);
  });

  it("rejects text that is not a URL", async () => {
    const errors = await validate(application("portfolio linkim"));
    expect(errors.some((error) => error.property === "cvUrl")).toBe(true);
  });
});
