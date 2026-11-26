export const contentMediaExtensions: Record<string,string> = {"image/jpeg":".jpg","image/png":".png","image/webp":".webp","image/gif":".gif","image/avif":".avif","image/bmp":".bmp","video/mp4":".mp4","video/webm":".webm","video/quicktime":".mov"};
export const contentMediaHelp = "Desteklenen medya türleri: JPG, PNG, WebP, GIF, AVIF, BMP, MP4, WebM ve MOV.";
/**
 * 26/11 #62.11 / #63 test dönüşü: Postane ve "Gönderiler" yazma alanlarında seçilen her dosya için üst sınır.
 * Telefonla çekilen videolar 10–15 MB'yi kolayca aşıyordu; sunucu bunları reddettiği için yalnız ilk dosyalar gidiyordu.
 * Web tarafındaki ortak medya seçici aynı sınırı seçim anında kullanıcıya bildirir.
 */
export const composerMediaMaxBytes = 50 * 1024 * 1024;
