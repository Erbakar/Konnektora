import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UsernameField } from "../components/UsernameField";
import { LanguageProvider } from "../lib/i18n";
const api = vi.hoisted(() => ({ checkAvailability: vi.fn() }));
vi.mock("../lib/api", () => api);
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("Username availability", () => {
  it("requires a username, rejects unavailable names and permits the account's current name", async () => {
    api.checkAvailability.mockResolvedValue({ usernameAvailable: false });
    render(<LanguageProvider><form><UsernameField initialValue="ada"/></form></LanguageProvider>);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.checkValidity()).toBe(true);
    fireEvent.change(input, { target: { value: "" } });
    expect(input.checkValidity()).toBe(false);
    fireEvent.change(input, { target: { value: "taken" } });
    await screen.findByText("Kullanıcı adı kullanımda.");
    expect(input.checkValidity()).toBe(false);
    fireEvent.change(input, { target: { value: "ada" } });
    expect(input.checkValidity()).toBe(true);
  });
  it("ignores an older availability response after the value changes", async () => {
    let finish: (value: { usernameAvailable: boolean }) => void = () => {};
    api.checkAvailability.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue({ usernameAvailable: true });
    render(<LanguageProvider><UsernameField initialValue="ada"/></LanguageProvider>);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "old-name" } });
    await waitFor(() => expect(api.checkAvailability).toHaveBeenCalledWith({ username: "old-name" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "new-name" } });
    await screen.findByText("Kullanıcı adı uygun.");
    finish({ usernameAvailable: false });
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(screen.queryByText("Kullanıcı adı kullanımda.")).not.toBeInTheDocument();
  });
});
