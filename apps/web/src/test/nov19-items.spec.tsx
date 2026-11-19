import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScoreChip, scoreTooltip } from "../components/ScoreChip";
import { ADMIN_SESSION_EXPIRED_EVENT, findCuratorCandidates, getAdminToken, setAdminToken } from "../lib/api";

const css = readFileSync(resolve(__dirname, "../styles/nov19.css"), "utf8");
const main = readFileSync(resolve(__dirname, "../main.tsx"), "utf8");

describe("19/11 #7: süresi dolan yönetici oturumu", () => {
  afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
  const respond = (message: string) => vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message, statusCode: 401 }), { status: 401, headers: { "Content-Type": "application/json" } })));

  it("token geçersizse oturumu kapatır ve panele giriş ekranını gösterme olayı yollar", async () => {
    setAdminToken("expired-token");
    respond("Oturumunuz sona erdi. Yeniden giriş yapın.");
    const listener = vi.fn();
    window.addEventListener(ADMIN_SESSION_EXPIRED_EVENT, listener);
    await expect(findCuratorCandidates("ada")).rejects.toThrow("Oturumunuz sona erdi");
    expect(getAdminToken()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(ADMIN_SESSION_EXPIRED_EVENT, listener);
  });

  it("yalnız yetki eksikse (oturum geçerli) oturumu kapatmaz", async () => {
    setAdminToken("valid-token");
    respond("Bu işlem için yetki gerekli.");
    await expect(findCuratorCandidates("ada")).rejects.toThrow("yetki gerekli");
    expect(getAdminToken()).toBe("valid-token");
  });
});

describe("19/11 #8 ve #9: üye kartları", () => {
  it("stil dosyası yüklenir; avatar ad satırıyla aynı hizada (üstte) durur", () => {
    expect(main).toContain('import "./styles/nov19.css";');
    expect(css).toMatch(/\.community-card > :first-child,\s*\.related-user-card > :first-child \{ align-self: start; \}/);
  });

  it("uyum kutucuğu üzerine gelince/dokununca siyah açıklama baloncuğu açar", async () => {
    render(<ScoreChip kind="overall" label="Genel uyum" tr><strong>%21</strong></ScoreChip>);
    const chip = screen.getByRole("button", { name: /Genel uyum/ });
    expect(chip).toHaveAttribute("data-tooltip", scoreTooltip("overall", true));
    expect(chip).not.toHaveClass("tooltip-open");
    await userEvent.click(chip);
    expect(chip).toHaveClass("tooltip-open");
    await userEvent.click(chip);
    expect(chip).not.toHaveClass("tooltip-open");
    expect(css).toMatch(/\.compatibility-score\.has-score-tip:hover::after/);
    expect(css).toContain("background: #15291f;");
  });

  it("her kutucuk türü için Türkçe ve İngilizce açıklama vardır", () => {
    for (const kind of ["overall", "eventPartner", "attendees", "eventMatch", "placeMatch", "shared"] as const) {
      expect(scoreTooltip(kind, true).length).toBeGreaterThan(20);
      expect(scoreTooltip(kind, false).length).toBeGreaterThan(20);
    }
  });
});
