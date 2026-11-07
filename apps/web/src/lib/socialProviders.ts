import type { Contact, SocialProvider } from "@konnektora/shared";
import { isMockApiMode } from "./api";

declare global {
  interface Window {
    google?: any;
    FB?: any;
    fbAsyncInit?: () => void;
  }
  interface Navigator {
    contacts?: {
      select(
        properties: string[],
        options: { multiple: boolean },
      ): Promise<Array<{ name?: string[]; email?: string[]; tel?: string[] }>>;
    };
  }
}

const scripts = new Map<string, Promise<void>>();
function script(src: string) {
  const existing = scripts.get(src);
  if (existing) return existing;
  const promise = new Promise<void>((resolve, reject) => {
    const element = document.createElement("script");
    const timeout = window.setTimeout(() => fail(), 15000);
    const fail = () => {
      window.clearTimeout(timeout);
      element.remove();
      scripts.delete(src);
      reject(new Error("Giriş sağlayıcısı yüklenemedi. Yeniden deneyin."));
    };
    element.src = src;
    element.async = true;
    element.onload = () => { window.clearTimeout(timeout); resolve(); };
    element.onerror = fail;
    document.head.appendChild(element);
  });
  scripts.set(src, promise);
  return promise;
}

export function prepareSocialProviders() {
  if (import.meta.env.VITE_GOOGLE_CLIENT_ID) void script("https://accounts.google.com/gsi/client").catch(() => undefined);
  if (import.meta.env.VITE_FACEBOOK_APP_ID) void prepareFacebook().catch(() => undefined);
}
async function prepareFacebook() {
  await script("https://connect.facebook.net/tr_TR/sdk.js");
  window.FB.init({ appId: import.meta.env.VITE_FACEBOOK_APP_ID, cookie: true, xfbml: false, version: "v23.0" });
}

export async function getSocialCredential(provider: SocialProvider): Promise<string> {
  if (isMockApiMode) return `demo-${provider}`;
  if (provider === "google") {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) throw new Error("Google ile giriş henüz etkinleştirilmedi. E-posta ile devam edebilirsiniz.");
    await script("https://accounts.google.com/gsi/client");
    return new Promise((resolve, reject) => {
      const dialog = document.createElement("dialog");
      dialog.className = "social-login-dialog";
      dialog.setAttribute("aria-label", "Google ile devam et");
      const title = document.createElement("h2");
      title.textContent = "Google ile devam et";
      const target = document.createElement("div");
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = "Vazgeç";
      dialog.append(title, target, cancel);
      document.body.append(dialog);
      const previousFocus = document.activeElement;
      const finish = (credential?: string) => {
        clearTimeout(timeout);
        dialog.close();
        dialog.remove();
        if (previousFocus instanceof HTMLElement) previousFocus.focus();
        if (credential) resolve(credential);
        else reject(new Error("Google girişi tamamlanmadı. Yeniden deneyebilirsiniz."));
      };
      const timeout = window.setTimeout(() => finish(), 180000);
      cancel.onclick = () => finish();
      dialog.oncancel = (event) => { event.preventDefault(); finish(); };
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential?: string }) => finish(response.credential),
      });
      window.google.accounts.id.renderButton(target, { type: "standard", theme: "outline", size: "large", text: "continue_with" });
      dialog.showModal();
    });
  }
  if (!import.meta.env.VITE_FACEBOOK_APP_ID) throw new Error("Facebook ile giriş henüz etkinleştirilmedi. E-posta ile devam edebilirsiniz.");
  // Preloading preserves the user gesture required by popup blockers.
  if (!window.FB) {
    await prepareFacebook();
    throw new Error("Facebook hazır. Devam etmek için düğmeye yeniden basın.");
  }
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("Facebook girişi tamamlanmadı. Yeniden deneyin.")), 180000);
    window.FB.login((response: any) => {
      clearTimeout(timeout);
      if (response.authResponse?.accessToken) resolve(response.authResponse.accessToken);
      else reject(new Error("Facebook girişi iptal edildi veya izin verilmedi."));
    }, { scope: "public_profile,email", auth_type: "rerequest" });
  });
}

export async function pickPhoneContacts(): Promise<Contact[]> {
  if (!navigator.contacts)
    throw new Error("Bu tarayıcı telefon rehberi seçimini desteklemiyor.");
  const selected = await navigator.contacts.select(["name", "email", "tel"], {
    multiple: true,
  });
  return selected.flatMap((item) => {
    const name = item.name?.[0] || "İsimsiz kişi";
    return [
      ...(item.email ?? []).map((email) => ({ name, email })),
      ...(item.tel ?? []).map((phone) => ({ name, phone })),
    ];
  });
}

export async function pickGoogleContacts(): Promise<Contact[]> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("Google istemci kimliği yapılandırılmamış.");
  await script("https://accounts.google.com/gsi/client");
  const token = await new Promise<string>((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/contacts.readonly",
      error_callback: () => reject(new Error("Google kişi erişimi tamamlanmadı. İzin penceresi kapatıldı veya erişim engellendi; davet gönderilmedi.")),
      callback: (response: any) =>
        response.access_token
          ? resolve(response.access_token)
          : reject(new Error("Google Contacts izni verilmedi.")),
    });
    client.requestAccessToken();
  });
  const response = await fetch(
    "https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers&pageSize=500",
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw new Error("Google rehberi alınamadı.");
  const data = (await response.json()) as any;
  return (data.connections ?? []).flatMap((person: any) => {
    const name = person.names?.[0]?.displayName || "İsimsiz kişi";
    return [
      ...(person.emailAddresses ?? []).map((item: any) => ({
        name,
        email: item.value,
      })),
      ...(person.phoneNumbers ?? []).map((item: any) => ({
        name,
        phone: item.value,
      })),
    ];
  });
}
