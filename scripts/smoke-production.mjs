const baseUrl = (process.env.SMOKE_BASE_URL ?? "").replace(/\/$/, "");
if (!baseUrl) throw new Error("SMOKE_BASE_URL zorunludur.");

async function get(path) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { "user-agent": "konnektora-smoke/2.0" } });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

async function check(path, validate) {
  const data = await get(path);
  if (!validate(data)) throw new Error(`${path}: beklenmeyen yanıt`);
  process.stdout.write(`OK ${path}\n`);
  return data;
}

await check("/health/live", (data) => data.ok === true);
await check("/health/ready", (data) => data.ok === true && data.database === "ready");

const events = await check(
  "/events?page=1&pageSize=15",
  (data) =>
    Array.isArray(data.items) &&
    data.items.length > 0 &&
    data.items.length <= 15 &&
    data.page === 1 &&
    data.pageSize === 15 &&
    data.total >= data.items.length &&
    data.items.every((item) => item.id && item.slug && item.title),
);
await check(
  `/events/${encodeURIComponent(events.items[0].slug)}`,
  (data) => data.id === events.items[0].id && data.slug === events.items[0].slug,
);
if (events.total > 15) {
  await check(
    "/events?page=2&pageSize=15",
    (data) =>
      Array.isArray(data.items) &&
      data.items.length === Math.min(15, events.total - 15) &&
      data.page === 2 &&
      data.pageSize === 15,
  );
}

const places = await check(
  "/places?page=1&pageSize=12",
  (data) =>
    Array.isArray(data.items) &&
    data.items.length > 0 &&
    data.items.length <= 12 &&
    data.items.every((item) => item.id && item.slug && item.name),
);
await check(
  `/places/${encodeURIComponent(places.items[0].slug)}`,
  (data) => data.id === places.items[0].id && data.slug === places.items[0].slug,
);

await check("/announcements", (data) =>
  Array.isArray(data) &&
  data.length > 0 &&
  data.every((item) =>
    [item.title, item.body, item.titleEn, item.bodyEn].every(
      (value) => typeof value === "string" && value.trim().length >= 3,
    ),
  ),
);
await check("/faqs", (data) => Array.isArray(data) && data.length > 0);
