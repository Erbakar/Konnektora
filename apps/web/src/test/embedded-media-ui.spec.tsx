import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmbeddedMedia } from "../components/EmbeddedMedia";
import { LanguageProvider } from "../lib/i18n";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("post içi YouTube ve SoundCloud oynatıcıları", () => {
  it("YouTube başlığını gösterir, önizlemeyi oynatıcıya çevirir ve live URL'sini destekler", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ title: "Konnektora Community Session" }),
    }));
    render(<LanguageProvider><EmbeddedMedia text="İzle: https://www.youtube.com/live/AbCdEf12345." /></LanguageProvider>);

    expect(await screen.findByRole("link", { name: "Konnektora Community Session" })).toHaveAttribute(
      "href",
      "https://www.youtube.com/live/AbCdEf12345",
    );
    await userEvent.click(screen.getByRole("button", { name: /Konnektora Community Session önizlemesi/ }));
    expect(screen.getByTitle("Konnektora Community Session")).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/AbCdEf12345?autoplay=1",
    );
  });

  it("SoundCloud başlığını ve sayfa içi oynatıcıyı gösterir", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ title: "Konnektora Audio Recap" }),
    }));
    render(<LanguageProvider><EmbeddedMedia text="Dinle https://soundcloud.com/example/konnektora)." /></LanguageProvider>);

    const link = await screen.findByRole("link", { name: "Konnektora Audio Recap" });
    expect(link).toHaveAttribute("href", "https://soundcloud.com/example/konnektora");
    await waitFor(() => expect(screen.getByTitle("Konnektora Audio Recap")).toHaveAttribute(
      "src",
      expect.stringContaining("https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fexample%2Fkonnektora"),
    ));
  });
});
