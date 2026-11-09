import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ProductGuide } from "../components/ProductGuide";
import { LanguageProvider } from "../lib/i18n";
afterEach(cleanup);
it("Destek Merkezi rehberi ses kaydı yenilenmiş videoyu (09.11.2026) uyumsuz altyazı olmadan oynatır", () => {
  const { container } = render(<LanguageProvider><ProductGuide kind="help"/></LanguageProvider>);
  expect(container.querySelector("source")).toHaveAttribute("src", "/media/guides/help-20261109.mp4");
  expect(container.querySelector("video")).toHaveAttribute("poster", "/media/guides/help-20261109.jpg");
  expect(container.querySelectorAll("track")).toHaveLength(0);
});
it("diğer rehber videoları değişmez", () => {
  const { container } = render(<LanguageProvider><ProductGuide kind="intro"/></LanguageProvider>);
  expect(container.querySelector("source")).toHaveAttribute("src", "/media/guides/intro-20261012.mp4");
  expect(container.querySelectorAll("track")).toHaveLength(1);
});
