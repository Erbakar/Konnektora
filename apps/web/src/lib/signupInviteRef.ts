/**
 * 26/11 #118: "Arkadaşlarını bul & davet et" sayfasındaki "Davet bağlantısını kopyala".
 * Bağlantı üyelik sayfasını "?ref=<davet eden üye>" ile açar; ref saklanır ve kayıt isteğine "inviterId" olarak eklenir.
 * Böylece bağlantıyla üye olan kişi, bağlantı sahibinden davet e-postası almış gibi kaydedilir (bildirimler ve davet eden bilgisi).
 */
const KEY = "konnektora:signup-invite-ref";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function signupInviteLink(userId: string, origin = window.location.origin) {
  return `${origin}/onboarding?ref=${encodeURIComponent(userId)}`;
}

export function captureSignupInviteRef(search = window.location.search) {
  const ref = new URLSearchParams(search).get("ref");
  if (!ref || !UUID.test(ref)) return;
  try { window.localStorage.setItem(KEY, ref); } catch { /* depolama kapalı */ }
}

export function readSignupInviteRef(): string | undefined {
  try {
    const ref = window.localStorage.getItem(KEY);
    return ref && UUID.test(ref) ? ref : undefined;
  } catch { return undefined; }
}

export function clearSignupInviteRef() {
  try { window.localStorage.removeItem(KEY); } catch { /* depolama kapalı */ }
}
