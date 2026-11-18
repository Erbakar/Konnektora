import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(__dirname, "../styles/nov18-mobile.css"), "utf8");
const main = readFileSync(resolve(__dirname, "../main.tsx"), "utf8");

describe("18/10 mobil yatay kayma", () => {
  it("stil dosyası yüklenir ve liste ızgaraları içeriğe göre genişlemez", () => {
    expect(main).toContain('import "./styles/nov18-mobile.css";');
    const mobile = css.slice(css.indexOf("@media (max-width: 700px)"));
    expect(mobile).toMatch(/\.post-list,\s*\.tag-post-list[\s\S]*grid-template-columns: minmax\(0, 1fr\);/);
    expect(mobile).toMatch(/\.tag-directory-card \{[^}]*max-width: 100%;/);
    expect(mobile).toMatch(/\.tag-directory-card strong \{[^}]*overflow-wrap: anywhere;/);
  });

  it("12/10 #13: ilgili kullanıcı kartında menü sağa itilmez; 06/08 #60: mesaj kutusu odakta büyür", () => {
    expect(css).toMatch(/\.related-user-card > \.row-actions > \.action-menu \{ margin-left: 0; \}/);
    expect(css).toMatch(/\.message-composer textarea:focus \{ min-height: 96px; \}/);
  });
});

