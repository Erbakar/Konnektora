import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmbeddedMedia } from "../components/EmbeddedMedia";
import { RichText } from "../components/RichText";
import { LanguageProvider } from "../lib/i18n";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("post içi YouTube ve SoundCloud oynatıcıları", () => {
  it("oynatıcı varken uzun medya URL'sini post metninde tekrar göstermez", () => {
    render(<LanguageProvider><p><RichText hideEmbeddableUrls text="Önerim: https://youtu.be/AbCdEf12345 ve https://on.soundcloud.com/Konnektora123" /></p></LanguageProvider>);

    expect(screen.getByText(/Önerim:/)).toBeInTheDocument();
    expect(screen.queryByText("https://youtu.be/AbCdEf12345")).not.toBeInTheDocument();
    expect(screen.queryByText("https://on.soundcloud.com/Konnektora123")).not.toBeInTheDocument();
  });

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

  it("SoundCloud kısa bağlantısını oEmbed'in doğruladığı oynatıcı adresiyle gösterir", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        title: "Konnektora Audio Recap",
        html: '<iframe src="https://w.soundcloud.com/player/?visual=true&amp;url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F123"></iframe>',
      }),
    }));
    render(<LanguageProvider><EmbeddedMedia text="Dinle https://on.soundcloud.com/Konnektora123)." /></LanguageProvider>);

    const link = await screen.findByRole("link", { name: "Konnektora Audio Recap" });
    expect(link).toHaveAttribute("href", "https://on.soundcloud.com/Konnektora123");
    await waitFor(() => expect(screen.getByTitle("Konnektora Audio Recap")).toHaveAttribute(
      "src",
      "https://w.soundcloud.com/player/?visual=true&url=https%3A%2F%2Fapi.soundcloud.com%2Ftracks%2F123",
    ));
  });
});
