export function ticketWindowText(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
  kind: "sale" | "gate",
  language: "tr" | "en",
) {
  if (!startsAt && !endsAt) return "";
  const locale = language === "tr" ? "tr-TR" : "en-GB";
  const format = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  const start = startsAt ? format(startsAt) : "";
  const end = endsAt ? format(endsAt) : "";
  if (language === "tr") {
    if (kind === "sale") {
      if (start && end) return `${start} ile ${end} arasında bu bilet alınabilir.`;
      if (start) return `${start} tarihi itibarıyla bu bilet alınabilir.`;
      return `${end} tarihine kadar bu bilet alınabilir.`;
    }
    if (start && end) return `${start} ile ${end} arasında giriş yapmalısınız.`;
    if (start) return `${start} zamanından sonra giriş yapmalısınız.`;
    return `${end} zamanından önce giriş yapmalısınız.`;
  }
  if (kind === "sale") {
    if (start && end) return `This ticket is available between ${start} and ${end}.`;
    if (start) return `This ticket is available from ${start}.`;
    return `This ticket is available until ${end}.`;
  }
  if (start && end) return `Enter between ${start} and ${end}.`;
  if (start) return `Enter after ${start}.`;
  return `Enter before ${end}.`;
}

