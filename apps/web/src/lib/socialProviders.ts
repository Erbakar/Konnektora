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

function script(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const element = document.createElement("script");
    element.src = src;
    element.async = true;
    element.defer = true;
    element.onload = () => resolve();
    element.onerror = () => reject(new Error("Sağlayıcı yüklenemedi."));
    document.head.appendChild(element);
  });
}

export async function getSocialCredential(
  provider: SocialProvider,
): Promise<string> {
  const providerConfigured =
    provider === "google"
      ? Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)
      : Boolean(import.meta.env.VITE_FACEBOOK_APP_ID);
  if (isMockApiMode || (import.meta.env.DEV && !providerConfigured))
    return `demo-${provider}`;
  if (provider === "google") {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) throw new Error("Google istemci kimliği yapılandırılmamış.");
    await script("https://accounts.google.com/gsi/client");
    return new Promise(
      (resolve, reject) =>
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: { credential?: string }) =>
            response.credential
              ? resolve(response.credential)
              : reject(new Error("Google girişi iptal edildi.")),
        }) ||
        window.google.accounts.id.prompt(
          (notice: any) =>
            notice.isNotDisplayed?.() &&
            reject(new Error("Google giriş penceresi açılamadı.")),
        ),
    );
  }
  const appId = import.meta.env.VITE_FACEBOOK_APP_ID;
  if (!appId) throw new Error("Facebook uygulama kimliği yapılandırılmamış.");
  await script("https://connect.facebook.net/tr_TR/sdk.js");
  window.FB.init({ appId, cookie: true, xfbml: false, version: "v23.0" });
  return new Promise((resolve, reject) =>
    window.FB.login(
      (response: any) =>
        response.authResponse?.accessToken
          ? resolve(response.authResponse.accessToken)
          : reject(new Error("Facebook girişi iptal edildi.")),
      { scope: "public_profile,email" },
    ),
  );
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
  if (
    isMockApiMode ||
    (import.meta.env.DEV && !import.meta.env.VITE_GOOGLE_CLIENT_ID)
  )
    return [
      { name: "Elif Kaya", email: "elif@konnektora.local" },
      { name: "Deniz Arslan", phone: "+905551234567" },
    ];
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("Google istemci kimliği yapılandırılmamış.");
  await script("https://accounts.google.com/gsi/client");
  const token = await new Promise<string>((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/contacts.readonly",
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
