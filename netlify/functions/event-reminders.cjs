// Netlify invokes this every fifteen minutes; event keys make repeated runs safe.
exports.handler = async () => {
  const base = process.env.PUBLIC_APP_URL || process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) throw new Error("Hatırlatma adresi ve otomasyon anahtarı tanımlanmalıdır.");
  const response = await fetch(new URL("/api/automations/event-reminders/run", base), {
    method: "POST", headers: { "x-cron-secret": secret }, signal: AbortSignal.timeout(25000)
  });
  if (!response.ok) throw new Error(`Hatırlatma işlemi başarısız: ${response.status}`);
  return { statusCode: 200 };
};
