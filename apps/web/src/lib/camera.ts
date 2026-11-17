// 17/10 #15: kamera açma hatalarını ayrıştırır. Tarayıcı; kamera yoksa, izin daha önce engellendiyse,
// işletim sistemi tarayıcıya kamera izni vermiyorsa veya sayfa bir izin politikasıyla kısıtlandıysa
// izin penceresini HİÇ göstermeden getUserMedia çağrısını reddeder. Bu durumların her biri ayrı mesaj alır.

export type CameraFailureReason = "insecure" | "unsupported" | "policy" | "denied" | "no_camera" | "in_use" | "unknown";

export class CameraAccessError extends Error {
  constructor(readonly reason: CameraFailureReason, readonly cause?: unknown) {
    super(`camera:${reason}`);
    this.name = "CameraAccessError";
  }
}

type PolicyDocument = Document & {
  permissionsPolicy?: { allowsFeature?: (feature: string) => boolean };
  featurePolicy?: { allowsFeature?: (feature: string) => boolean };
};

/** Permissions-Policy / Feature-Policy kamerayı bu belge için kapatmışsa true döner. */
export function cameraBlockedByPolicy(doc: Document = document) {
  const policy = (doc as PolicyDocument).permissionsPolicy ?? (doc as PolicyDocument).featurePolicy;
  try {
    return policy?.allowsFeature ? policy.allowsFeature("camera") === false : false;
  } catch {
    return false;
  }
}

export function classifyCameraError(error: unknown, blockedByPolicy = cameraBlockedByPolicy()): CameraFailureReason {
  const name = error && typeof error === "object" && "name" in error ? String((error as { name: unknown }).name) : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") return blockedByPolicy ? "policy" : "denied";
  if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") return "no_camera";
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") return "in_use";
  return "unknown";
}

/**
 * Kamerayı açar. İlk deneme tercih edilen kısıtlarla yapılır; cihaz bu kısıtları karşılayamıyorsa
 * (ör. ön kamera yok) en yalın `video: true` isteğiyle bir kez daha denenir.
 */
export async function openCamera(preferred: MediaTrackConstraints = { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }): Promise<MediaStream> {
  if (typeof window !== "undefined" && window.isSecureContext === false) throw new CameraAccessError("insecure");
  if (!navigator.mediaDevices?.getUserMedia) throw new CameraAccessError("unsupported");
  if (cameraBlockedByPolicy()) throw new CameraAccessError("policy");
  try {
    return await navigator.mediaDevices.getUserMedia({ video: preferred, audio: false });
  } catch (firstError) {
    const firstReason = classifyCameraError(firstError);
    if (firstReason !== "no_camera") throw new CameraAccessError(firstReason, firstError);
    try {
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } catch (secondError) {
      throw new CameraAccessError(classifyCameraError(secondError), secondError);
    }
  }
}

export function cameraErrorMessage(reason: CameraFailureReason, language: "tr" | "en") {
  const tr = language === "tr";
  switch (reason) {
    case "denied":
      return tr
        ? "Kamera izni verilmemiş. Tarayıcı izin penceresini göstermediyse izin daha önce engellenmiştir: adres çubuğundaki kilit / kamera simgesinden bu site için kameraya izin ver, cihazının gizlilik ayarlarında tarayıcının kamera erişimini aç ve tekrar dene."
        : "Camera permission was not granted. If the browser did not ask, access was blocked earlier: allow the camera for this site from the lock / camera icon in the address bar, enable camera access for your browser in your device privacy settings, then try again.";
    case "no_camera":
      return tr
        ? "Bu cihazda kullanılabilir bir kamera bulunamadı. Kameralı bir cihaz kullan veya bir kamera bağlayıp tekrar dene."
        : "No usable camera was found on this device. Use a device with a camera or connect one and try again.";
    case "policy":
      return tr
        ? "Kamera bu sayfada güvenlik politikası nedeniyle engellenmiş. Sayfayı uygulama içi tarayıcı yerine doğrudan Chrome veya Safari’de aç; sorun sürerse destek ekibine yaz."
        : "The camera is blocked on this page by a security policy. Open the page directly in Chrome or Safari instead of an in-app browser; contact support if the problem continues.";
    case "in_use":
      return tr
        ? "Kamera başlatılamadı. Kamerayı kullanan başka bir uygulama veya sekme varsa kapatıp tekrar dene."
        : "The camera could not be started. Close any other app or tab that is using the camera and try again.";
    case "insecure":
      return tr
        ? "Kamera yalnızca güvenli (HTTPS) bağlantıda açılabilir. Sayfayı https:// adresiyle aç."
        : "The camera can only be opened over a secure (HTTPS) connection. Open the page with an https:// address.";
    case "unsupported":
      return tr
        ? "Bu tarayıcı kamera erişimini desteklemiyor. Güncel Chrome, Safari, Firefox veya Edge ile tekrar dene."
        : "This browser does not support camera access. Try again with a current version of Chrome, Safari, Firefox or Edge.";
    default:
      return tr
        ? "Kamera açılamadı. Sayfayı yenileyip tekrar dene."
        : "The camera could not be opened. Refresh the page and try again.";
  }
}
