const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const hostname = window.location.hostname.toLowerCase();
const isLocalHostname =
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname === "::1";

export const publicSiteOrigin = trimTrailingSlash(
  import.meta.env.VITE_PUBLIC_SITE_URL?.trim() ||
    (isLocalHostname ? window.location.origin : "https://konnektora.com"),
);

export const memberAppOrigin = trimTrailingSlash(
  import.meta.env.VITE_MEMBER_APP_URL?.trim() ||
    (isLocalHostname ? window.location.origin : "https://app.konnektora.com"),
);

function absoluteHref(origin: string, path: string) {
  return new URL(path, `${origin}/`).toString();
}

export function publicSiteHref(path = "/") {
  return absoluteHref(publicSiteOrigin, path);
}

export function memberAppHref(path = "/") {
  return absoluteHref(memberAppOrigin, path);
}

export function isMemberAppHost() {
  return hostname === new URL(memberAppOrigin).hostname.toLowerCase();
}

export function isPublicSiteHost() {
  const publicHostname = new URL(publicSiteOrigin).hostname.toLowerCase();
  return hostname === publicHostname || hostname === `www.${publicHostname}`;
}
