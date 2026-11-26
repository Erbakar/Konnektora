import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MediaPicker } from "../components/MediaPicker";
import { normalizeMediaFile } from "../lib/mediaPolicy";
import { COMPOSER_MEDIA_MAX_BYTES, composerMediaAccept, mediaDisplayOrder, mediaProgressLabel, mediaRejectionNotice, mergeMediaSelection } from "../lib/mediaSelection";

const image = (name: string, size = 10, type = "image/jpeg") => {
  const file = new File(["x"], name, { type, lastModified: 1 });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

describe("26/11 #62.11 / #63 test dönüşü — ortak medya seçimi kuralları", () => {
  it("seçimi 6 ya da 9 dosyada kesmez; 20 dosyanın tamamı eklenir", () => {
    const picked = Array.from({ length: 20 }, (_, index) => image(`p${index}.jpg`));
    const { files, rejected } = mergeMediaSelection([], picked);
    expect(files).toHaveLength(20);
    expect(rejected).toEqual([]);
  });

  it("sonradan yapılan seçim mevcut listeye eklenir, aynı dosya ikinci kez eklenmez", () => {
    const first = image("a.jpg");
    const second = image("b.jpg");
    const { files } = mergeMediaSelection([first], [second, image("a.jpg")]);
    expect(files).toEqual([first, second]);
  });

  it("desteklenmeyen tür, büyük dosya ve sınır aşımı seçim anında nedenleriyle bildirilir", () => {
    const heic = image("IMG_1.HEIC", 10, "image/heic");
    const big = image("video.mov", COMPOSER_MEDIA_MAX_BYTES + 1, "video/quicktime");
    const extra = image("c.jpg");
    const { files, rejected } = mergeMediaSelection([image("a.jpg")], [heic, big, extra], { max: 1 });
    expect(files).toHaveLength(1);
    expect(rejected.map((item) => item.reason)).toEqual(["type", "size", "limit"]);
    const notice = mediaRejectionNotice(rejected, "tr", { max: 1 });
    expect(notice).toContain("Desteklenmeyen dosya türü: IMG_1.HEIC");
    expect(notice).toContain("50 MB'den büyük olduğu için eklenmedi: video.mov");
    expect(notice).toContain("En fazla 1 medya ekleyebilirsiniz; eklenmeyen: c.jpg");
  });

  it("iPhone videoları (MOV) kabul edilir; HEIC seçici listesinde yok ki iPhone JPG'ye çevirsin", () => {
    expect(mergeMediaSelection([], [image("clip.MOV", 1000, "video/quicktime")]).files).toHaveLength(1);
    expect(normalizeMediaFile(new File(["v"], "clip.mov")).type).toBe("video/quicktime");
    expect(composerMediaAccept).toContain("video/quicktime");
    expect(composerMediaAccept).not.toContain("heic");
  });

  it("şerit sırası en son seçilenden en eskiye", () => {
    expect(mediaDisplayOrder(4)).toEqual([3, 2, 1, 0]);
  });

  it("gönderim sürerken sıradakiler %0, yüklenen gerçek yüzde, biten dosyada yüzde yok", () => {
    const [a, b, c] = [image("a.jpg"), image("b.jpg"), image("c.jpg")];
    const progress = new Map([[a, 100], [b, 95]]);
    expect(mediaProgressLabel(a, progress, true)).toBeNull();
    expect(mediaProgressLabel(b, progress, true)).toBe(95);
    expect(mediaProgressLabel(c, progress, true)).toBe(0);
    expect(mediaProgressLabel(c, new Map(), false)).toBeNull();
  });
});

describe("MediaPicker bileşeni", () => {
  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:preview") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  });

  function Harness({ initial, progress, uploading = false }: { initial: File[]; progress?: Map<File, number>; uploading?: boolean }) {
    const [files, setFiles] = useState(initial);
    return <MediaPicker files={files} language="tr" onChange={setFiles} progress={progress} uploading={uploading}/>;
  }

  it("tüm seçilenleri yeniden eskiye listeler; başta ve sonda 'Medya ekle' kartı vardır", () => {
    const files = Array.from({ length: 8 }, (_, index) => image(`p${index}.jpg`));
    const { container } = render(<Harness initial={files}/>);
    const items = [...container.querySelectorAll(".media-picker-item img")].map((node) => node.getAttribute("alt"));
    expect(items).toEqual(["p7.jpg", "p6.jpg", "p5.jpg", "p4.jpg", "p3.jpg", "p2.jpg", "p1.jpg", "p0.jpg"]);
    const strip = container.querySelector(".media-picker")!;
    expect(strip.firstElementChild).toHaveClass("media-picker-add");
    expect(strip.lastElementChild).toHaveClass("media-picker-add");
    expect(screen.getAllByRole("button", { name: "Medya ekle" })).toHaveLength(2);
  });

  it("dosya yüklenirken de yeni medya eklenebilir; dosya girişi sıfırlanır", () => {
    const first = image("a.jpg");
    const { container } = render(<Harness initial={[first]} uploading/>);
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    expect(input).not.toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Medya ekle" })[0]).not.toBeDisabled();
    fireEvent.change(input, { target: { files: [image("b.jpg"), image("c.mp4", 100, "video/mp4")] } });
    expect(container.querySelectorAll(".media-picker-item")).toHaveLength(3);
    expect(input.value).toBe("");
  });

  it("yükleme yüzdesi küçük resmin üzerinde görünür, biten dosyada kaybolur", () => {
    const [a, b] = [image("a.jpg"), image("b.jpg")];
    const { container } = render(<Harness initial={[a, b]} progress={new Map([[a, 100], [b, 95]])} uploading/>);
    const badges = container.querySelectorAll(".media-picker-progress");
    expect(badges).toHaveLength(1);
    expect(badges[0]).toHaveTextContent("%95");
    expect(badges[0]).toHaveAccessibleName("Yükleniyor %95");
  });

  it("desteklenmeyen dosya için seçim anında açık uyarı verir", () => {
    const { container } = render(<Harness initial={[]}/>);
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [image("IMG.HEIC", 10, "image/heic")] } });
    expect(screen.getByRole("alert")).toHaveTextContent("Desteklenmeyen dosya türü: IMG.HEIC");
  });

  it("şerit yatay kayar, kartlar sabit kare; okunmamış sayısı kırmızı tam daire", () => {
    const css = readFileSync(resolve(__dirname, "../styles/nov26-media.css"), "utf8");
    expect(css).toMatch(/\.media-picker \{[^}]*flex-wrap: nowrap;[^}]*overflow-x: auto;/);
    expect(css).toMatch(/\.media-picker > \.media-picker-add \{[^}]*aspect-ratio: 1 \/ 1;[^}]*flex: 0 0 132px;/);
    expect(css).toMatch(/\.conversation-card \.conversation-unread \{[^}]*background: #dc2626;[^}]*border-radius: 50%;[^}]*height: 20px;[^}]*width: 20px;/);
  });
});
