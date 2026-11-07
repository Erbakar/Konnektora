import { injectSocialPreview } from "../../packages/shared/src/socialPreview.ts";

export default async (request, context) => {
  if (request.method !== "GET" || !/WhatsApp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|TelegramBot/i.test(request.headers.get("user-agent") ?? "")) return;
  const url = new URL(request.url);
  const match = /^\/(events|places|tags|users)\/(?:id\/)?([^/]+)\/?$/.exec(url.pathname);
  if (!match) return;
  const type = match[1] === "users" && url.pathname.startsWith("/users/id/") ? "user-id" : { events: "event", places: "place", tags: "tag", users: "user" }[match[1]];
  const response = await context.next();
  if (!response.headers.get("content-type")?.includes("text/html")) return response;
  let preview;
  try {
    const metadata = await fetch(new URL(`/api/social-preview/${type}/${match[2]}`, url.origin), { signal: AbortSignal.timeout(5000) });
    if (!metadata.ok) return response;
    preview = await metadata.json();
    if (!["title", "description", "image", "path"].every(key => typeof preview[key] === "string")) return response;
  } catch { return response; }
  const html = await response.text();
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("etag");
  headers.set("cache-control", "no-store");
  return new Response(injectSocialPreview(html, preview, url.origin), { status: response.status, headers });
};
export const config = { path: ["/events/*", "/places/*", "/tags/*", "/users/*"] };
