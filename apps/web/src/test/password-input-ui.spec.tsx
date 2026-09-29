import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PasswordInput } from "../components/FormInputs";
import { LanguageProvider } from "../lib/i18n";

describe("şifre alanı görünürlük denetimi", () => {
  it("şifreyi kullanıcı istediğinde gösterir ve yeniden gizler", async () => {
    render(<LanguageProvider><label>Şifre<PasswordInput name="password" /></label></LanguageProvider>);
    const input = screen.getByLabelText("Şifre");
    expect(input).toHaveAttribute("type", "password");
    await userEvent.click(screen.getByRole("button", { name: "Şifreyi göster" }));
    expect(input).toHaveAttribute("type", "text");
    await userEvent.click(screen.getByRole("button", { name: "Şifreyi gizle" }));
    expect(input).toHaveAttribute("type", "password");
  });
});
