const baseUrl = (process.env.SMOKE_BASE_URL ?? "").replace(/\/$/, "");
if (!baseUrl) throw new Error("SMOKE_BASE_URL zorunludur.");

const checks = [
  { path: "/health/live", validate: (data) => data.ok === true },
  { path: "/health/ready", validate: (data) => data.ok === true && data.database === "ready" },
  { path: "/events", validate: (data) => Array.isArray(data.items) || Array.isArray(data) },
  { path: "/faqs", validate: (data) => Array.isArray(data) }
];

for (const check of checks) {
  const response = await fetch(`${baseUrl}${check.path}`, { headers: { "user-agent": "konnektora-smoke/1.0" } });
  if (!response.ok) throw new Error(`${check.path}: HTTP ${response.status}`);
  const data = await response.json();
  if (!check.validate(data)) throw new Error(`${check.path}: beklenmeyen yanıt`);
  process.stdout.write(`OK ${check.path}\n`);
}
