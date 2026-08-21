export type ServiceErrorKind =
  | "network"
  | "timeout"
  | "authentication"
  | "permission"
  | "validation"
  | "conflict"
  | "not-found"
  | "rate-limit"
  | "server"
  | "unknown";

export type ServiceErrorPresentation = {
  kind: ServiceErrorKind;
  title: string;
  message: string;
  retryable: boolean;
  status?: number;
};

type ErrorShape = {
  message?: unknown;
  name?: unknown;
  status?: unknown;
};

const technicalMessagePattern =
  /api request failed|failed to fetch|fetch failed|networkerror|internal server error|prisma|econn|stack|syntaxerror|zod|must be a uuid|property .* should not exist|unexpected token|load failed/i;

const knownMessages: Array<[RegExp, string]> = [
  [
    /geçersiz kullanıcı hesabı|invalid credentials|unauthorized/i,
    "E-posta veya şifre doğru değil. Bilgilerini kontrol edip yeniden dene.",
  ],
  [
    /bu (email|e-posta) adresi zaten kullanılıyor/i,
    "Bu e-posta adresiyle zaten bir hesap var. Giriş yapmayı deneyebilirsin.",
  ],
  [
    /bu telefon numarası zaten kullanılıyor/i,
    "Bu telefon numarası başka bir hesapta kullanılıyor. Farklı bir numara deneyebilirsin.",
  ],
  [
    /kod geçersiz veya süresi dolmuş|kod hatalı/i,
    "Kod doğru değil veya süresi dolmuş. Yeni bir kod oluşturup tekrar dene.",
  ],
  [
    /yeni kod istemeden önce/i,
    "Yeni kod istemeden önce kısa bir süre beklemen gerekiyor.",
  ],
  [
    /e-posta servisi yapılandırılmamış|mail provider|e-posta sağlayıcısı/i,
    "E-posta şu anda gönderilemedi. Birkaç dakika sonra yeniden dene veya telefon doğrulamasıyla devam et.",
  ],
  [
    /zorunlu onboarding adımları eksik/i,
    "Devam etmek için önce eksik profil adımlarını tamamla.",
  ],
  [
    /mevcut şifre hatalı|current password does not match/i,
    "Mevcut şifren doğru değil. Kontrol edip yeniden dene.",
  ],
];

function errorShape(error: unknown): ErrorShape {
  return error && typeof error === "object" ? (error as ErrorShape) : {};
}

function errorStatus(error: unknown) {
  const status = errorShape(error).status;
  return typeof status === "number" && Number.isFinite(status)
    ? status
    : undefined;
}

function rawMessage(error: unknown) {
  if (typeof error === "string") return error.trim();
  const message = errorShape(error).message;
  return typeof message === "string" ? message.trim() : "";
}

function friendlyBackendMessage(message: string) {
  if (!message) return undefined;

  for (const [pattern, replacement] of knownMessages) {
    if (pattern.test(message)) return replacement;
  }

  const looksTurkishAndActionable =
    /[çğıöşü]|\b(bu|hesap|kullanıcı|şifre|telefon|kod|davet|etkinlik|mekân|profil|işlem|alan|bilgi|e-posta)\b/i.test(
      message,
    );

  if (
    looksTurkishAndActionable &&
    !technicalMessagePattern.test(message) &&
    message.length <= 220
  ) {
    return message.replace(/\bemail\b/gi, "e-posta");
  }

  return undefined;
}

export function getServiceErrorPresentation(
  error: unknown,
  fallback = "İşlem tamamlanamadı. Bilgilerini kontrol edip yeniden dene.",
): ServiceErrorPresentation {
  const shape = errorShape(error);
  const name = typeof shape.name === "string" ? shape.name : "";
  const message = rawMessage(error);
  const status = errorStatus(error);
  const safeDetail = friendlyBackendMessage(message);
  const offline =
    typeof navigator !== "undefined" && navigator.onLine === false;

  if (offline || (!status && /network|fetch|load failed/i.test(message))) {
    return {
      kind: "network",
      title: "Bağlantı kurulamadı",
      message:
        "İnternet bağlantını kontrol et. Bağlantı geri geldiğinde yeniden deneyebilirsin.",
      retryable: true,
    };
  }

  if (name === "AbortError" || /timeout|timed out|zaman aşımı/i.test(message)) {
    return {
      kind: "timeout",
      title: "İşlem biraz uzun sürdü",
      message:
        "Servisten zamanında yanıt alınamadı. Bilgilerin kaybolmadı; yeniden deneyebilirsin.",
      retryable: true,
      status,
    };
  }

  if (status === 401) {
    return {
      kind: "authentication",
      title: "Giriş bilgilerini kontrol et",
      message:
        safeDetail ??
        "Oturumun sona ermiş olabilir. Yeniden giriş yapıp işlemi tekrar dene.",
      retryable: true,
      status,
    };
  }

  if (status === 403) {
    return {
      kind: "permission",
      title: "Bu işlem için izin gerekiyor",
      message:
        safeDetail ??
        "Hesabının bu işlemi yapma yetkisi bulunmuyor. Hesap türünü veya erişimlerini kontrol et.",
      retryable: false,
      status,
    };
  }

  if (status === 404) {
    return {
      kind: "not-found",
      title: "İçerik bulunamadı",
      message:
        safeDetail ??
        "Aradığın içerik kaldırılmış, taşınmış veya artık erişilebilir olmayabilir.",
      retryable: false,
      status,
    };
  }

  if (status === 409) {
    return {
      kind: "conflict",
      title: "Bu bilgi zaten kullanılıyor",
      message:
        safeDetail ??
        "Girdiğin bilgiler mevcut bir kayıtla çakışıyor. Bilgileri değiştirip yeniden dene.",
      retryable: false,
      status,
    };
  }

  if (status === 400 || status === 422) {
    return {
      kind: "validation",
      title: "Bazı bilgileri kontrol et",
      message:
        safeDetail ??
        "Formdaki eksik veya hatalı alanları düzelttikten sonra yeniden deneyebilirsin.",
      retryable: false,
      status,
    };
  }

  if (status === 413) {
    return {
      kind: "validation",
      title: "Dosya boyutu çok büyük",
      message: "Daha küçük bir dosya seçip yeniden yüklemeyi dene.",
      retryable: false,
      status,
    };
  }

  if (status === 429) {
    return {
      kind: "rate-limit",
      title: "Biraz bekleyelim",
      message:
        "Kısa sürede çok fazla istek gönderildi. Birkaç dakika sonra yeniden dene.",
      retryable: true,
      status,
    };
  }

  if (status === 502 || status === 503 || status === 504) {
    return {
      kind: "server",
      title: "Servis geçici olarak meşgul",
      message:
        "Konnektora şu anda bu işlemi tamamlayamıyor. Birkaç dakika sonra yeniden deneyebilirsin.",
      retryable: true,
      status,
    };
  }

  if (status && status >= 500) {
    return {
      kind: "server",
      title: "Beklenmeyen bir servis sorunu oluştu",
      message:
        "İşlem tamamlanamadı. Biraz sonra yeniden dene; sorun sürerse destek ekibine ulaşabilirsin.",
      retryable: true,
      status,
    };
  }

  return {
    kind: "unknown",
    title: "İşlem tamamlanamadı",
    message: safeDetail ?? fallback,
    retryable: true,
    status,
  };
}

export function getServiceErrorMessage(error: unknown, fallback?: string) {
  return getServiceErrorPresentation(error, fallback).message;
}
