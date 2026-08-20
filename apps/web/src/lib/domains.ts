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

function absoluteHref(origin: string, path: string) {
  return new URL(path, `${origin}/`).toString();
}

export function publicSiteHref(path = "/") {
  return absoluteHref(publicSiteOrigin, path);
}
