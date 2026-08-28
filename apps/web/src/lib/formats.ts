export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (!digits) return "";
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("90") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+90${digits.slice(1)}`;
  if (digits.length === 10) return `+90${digits}`;
  return `+${digits}`;
}

export function formatPhone(value: string) {
  const normalized = normalizePhone(value);
  const digits = normalized.replace(/\D/g, "").slice(0, 15);

  if (digits.startsWith("90")) {
    const local = digits.slice(2, 12);
    return ["+90", local.slice(0, 3), local.slice(3, 6), local.slice(6, 8), local.slice(8, 10)]
      .filter(Boolean)
      .join(" ");
  }

  return normalized;
}

const countryNames = {
  tr: {
    Turkey: "Türkiye", Germany: "Almanya", Netherlands: "Hollanda", France: "Fransa", Spain: "İspanya", Italy: "İtalya", Greece: "Yunanistan", "United Kingdom": "Birleşik Krallık", "United States": "Amerika Birleşik Devletleri",
  },
  en: {
    Türkiye: "Turkey", Almanya: "Germany", Hollanda: "Netherlands", Fransa: "France", İspanya: "Spain", İtalya: "Italy", Yunanistan: "Greece", "Birleşik Krallık": "United Kingdom", "Amerika Birleşik Devletleri": "United States",
  },
} as const;

export function localizeCountryName(value: string | null | undefined, language: "tr" | "en") {
  if (!value) return value ?? "";
  return (countryNames[language] as Record<string, string>)[value] ?? value;
}

export function localizeCityName(value: string | null | undefined, language: "tr" | "en") {
  if (!value) return value ?? "";
  if (language === "tr" && value === "Istanbul") return "İstanbul";
  if (language === "en" && value === "İstanbul") return "Istanbul";
  return value;
}

function dateParts(value: Date, locale: string, includeYear: boolean) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(includeYear ? { year: "numeric" as const } : {}),
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function timeParts(value: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function formatEventDuration(startsAt: string, endsAt?: string | null, locale = "tr-TR") {
  if (!endsAt) return locale.startsWith("tr") ? "süre belirtilmedi" : "unknown duration";
  const duration = Math.max(0, new Date(endsAt).getTime() - new Date(startsAt).getTime());
  const totalMinutes = Math.round(duration / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor(totalMinutes % 1_440 / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days} ${locale.startsWith("tr") ? "gün" : days === 1 ? "day" : "days"}`);
  if (hours) parts.push(`${hours} ${locale.startsWith("tr") ? "saat" : hours === 1 ? "hour" : "hours"}`);
  if (minutes) parts.push(`${minutes} ${locale.startsWith("tr") ? "dk" : "min"}`);
  return parts.join(", ") || (locale.startsWith("tr") ? "0 dk" : "0 min");
}

export function formatEventDateRange(
  startsAt: string,
  endsAt?: string | null,
  options: { locale?: string; withDuration?: boolean } = {},
) {
  const locale = options.locale ?? "tr-TR";
  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : null;
  const currentYear = new Date().getFullYear();
  const startText = dateParts(start, locale, start.getFullYear() !== currentYear);
  let range = `${startText} – ${locale.startsWith("tr") ? "bitiş belirtilmedi" : "end"}`;

  if (end) {
    const sameDay = start.getFullYear() === end.getFullYear()
      && start.getMonth() === end.getMonth()
      && start.getDate() === end.getDate();
    range = `${startText} – ${sameDay ? timeParts(end, locale) : dateParts(end, locale, end.getFullYear() !== currentYear || end.getFullYear() !== start.getFullYear())}`;
  }

  return options.withDuration
    ? `${range} (${formatEventDuration(startsAt, endsAt, locale)})`
    : range;
}
