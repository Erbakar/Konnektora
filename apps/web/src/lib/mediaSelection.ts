import { resolveMediaType } from "./mediaPolicy";

/**
 * 26/11 #62.11 / #63 test dönüşü — Postane ve "Gönderiler" yazma alanlarındaki ortak medya seçimi kuralları.
 *
 * Kök nedenler:
 * - Postane seçimi sessizce 6, İlgi Alanı seçimi 9 dosyada kesiyordu (fazlası görünmüyor, "Medya ekle" kayboluyordu).
 * - Seçici HEIC/MOV gibi türleri kabul edip gönderimde reddediyordu; büyük telefon videoları sunucu sınırını aşıyordu.
 *   Gönderim ilk uygun olmayan dosyada durduğu için yalnız ilk birkaç dosya gidiyordu.
 * Artık her dosya seçim anında denetlenir; eklenemeyenler için açık mesaj gösterilir.
 */
export const COMPOSER_MEDIA_MAX_BYTES = 50 * 1024 * 1024;
export const COMPOSER_MEDIA_MAX_FILES = 50;
/** iPhone, listede HEIC olmadığında fotoğrafları kendiliğinden JPG'ye çevirir; bu yüzden HEIC listede yok. */
export const composerMediaAccept = "image/jpeg,image/png,image/webp,image/gif,image/avif,image/bmp,video/mp4,video/webm,video/quicktime";

export type MediaRejection = { file: File; reason: "type" | "size" | "limit" };

const sameFile = (a: File, b: File) => a === b || (a.name === b.name && a.size === b.size && a.lastModified === b.lastModified);

/** Yeni seçilen dosyaları mevcut listeye (seçim sırasıyla, en eski başta) ekler; eklenemeyenleri nedenleriyle döndürür. */
export function mergeMediaSelection(current: File[], picked: File[], options: { max?: number; maxBytes?: number } = {}) {
  const max = options.max ?? COMPOSER_MEDIA_MAX_FILES;
  const maxBytes = options.maxBytes ?? COMPOSER_MEDIA_MAX_BYTES;
  const files = [...current];
  const rejected: MediaRejection[] = [];
  for (const file of picked) {
    if (files.some((existing) => sameFile(existing, file))) continue;
    if (!resolveMediaType(file)) rejected.push({ file, reason: "type" });
    else if (file.size > maxBytes) rejected.push({ file, reason: "size" });
    else if (files.length >= max) rejected.push({ file, reason: "limit" });
    else files.push(file);
  }
  return { files, rejected };
}

/** Eklenemeyen dosyalar için kullanıcıya gösterilecek tek satırlık açıklama. */
export function mediaRejectionNotice(rejected: MediaRejection[], language: "tr" | "en", options: { max?: number; maxBytes?: number } = {}) {
  if (!rejected.length) return "";
  const max = options.max ?? COMPOSER_MEDIA_MAX_FILES;
  const megabytes = Math.round((options.maxBytes ?? COMPOSER_MEDIA_MAX_BYTES) / (1024 * 1024));
  const names = (reason: MediaRejection["reason"]) => rejected.filter((item) => item.reason === reason).map((item) => item.file.name).join(", ");
  const parts: string[] = [];
  if (names("type")) parts.push(language === "tr" ? `Desteklenmeyen dosya türü: ${names("type")}. JPG, PNG, WebP, GIF, AVIF, BMP, MP4, WebM veya MOV seçebilirsiniz.` : `Unsupported file type: ${names("type")}. Choose JPG, PNG, WebP, GIF, AVIF, BMP, MP4, WebM or MOV.`);
  if (names("size")) parts.push(language === "tr" ? `${megabytes} MB'den büyük olduğu için eklenmedi: ${names("size")}.` : `Larger than ${megabytes} MB, not added: ${names("size")}.`);
  if (names("limit")) parts.push(language === "tr" ? `En fazla ${max} medya ekleyebilirsiniz; eklenmeyen: ${names("limit")}.` : `You can add up to ${max} media; not added: ${names("limit")}.`);
  return parts.join(" ");
}

/** Şeritte gösterim sırası: en son seçilen solda, en eski sağda (değerler `files` içindeki konumlardır). */
export function mediaDisplayOrder(count: number) {
  return Array.from({ length: count }, (_, index) => count - 1 - index);
}

/**
 * Küçük resmin üzerindeki yüzde: gönderim sürerken sıradaki dosyalar %0, yüklenen dosya gerçek yüzdesi;
 * yüklemesi biten (100) ya da gönderim dışındaki dosyalarda gösterilmez.
 */
export function mediaProgressLabel(file: File, progress: ReadonlyMap<File, number> | undefined, uploading: boolean) {
  const percent = progress?.get(file) ?? (uploading ? 0 : undefined);
  if (percent === undefined || percent >= 100) return null;
  return Math.max(0, Math.round(percent));
}
