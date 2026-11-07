import { describe, expect, it } from "vitest";
import { normalizeMediaFile } from "../lib/mediaPolicy";
describe("media selection",()=>{
 it.each([["picture.AVIF","image/avif"],["picture.bmp","image/bmp"],["video.webm","video/webm"],["photo.jpeg","image/jpeg"]])("recognizes %s when a device supplies no MIME type",(name,type)=>{
  const file=normalizeMediaFile(new File(["sample"],name));expect(file.type).toBe(type);expect(file.name).toBe(name);expect(file.size).toBe(6);
 });
 it("explains the supported types for an unsupported upload",()=>expect(()=>normalizeMediaFile(new File(["sample"],"image.svg",{type:"image/svg+xml"}))).toThrow(/JPG.*PNG.*WebP.*GIF.*AVIF.*BMP.*MP4.*WebM/));
});
