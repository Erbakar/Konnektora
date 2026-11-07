export type SocialPreview = { title: string; description: string; image: string; path: string };
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
export function injectSocialPreview(html: string, preview: SocialPreview, origin: string) {
  const url = new URL(preview.path, origin);
  if (url.origin !== new URL(origin).origin) return html;
  const title = escapeHtml(`${preview.title} | Konnektora`);
  const description = escapeHtml(preview.description.slice(0, 600));
  const image = escapeHtml(preview.image);
  const canonical = escapeHtml(url.toString());
  const tags = `<title>${title}</title><meta name="description" content="${description}"><meta property="og:type" content="website"><meta property="og:site_name" content="Konnektora"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:image" content="${image}"><meta property="og:url" content="${canonical}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${image}"><link rel="canonical" href="${canonical}">`;
  return html.replace(/<title>[\s\S]*?<\/title>/gi, "").replace(/<meta\s+[^>]*(?:name=["'](?:description|twitter:[^"']*)["']|property=["']og:[^"']*["'])[^>]*>/gi, "").replace(/<link\s+[^>]*rel=["']canonical["'][^>]*>/gi, "").replace(/<\/head>/i, `${tags}</head>`);
}
