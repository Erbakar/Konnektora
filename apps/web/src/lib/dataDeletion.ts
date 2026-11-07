export const DATA_DELETION_CATEGORY = "Veri silme talebi";
export const DATA_REQUEST_RESPONSE_DAYS = 30;

export function dataRequestResponseDeadline(createdAt?: string | Date): Date | null {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (!Number.isFinite(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + DATA_REQUEST_RESPONSE_DAYS);
  return date;
}

export function formatDataRequestDate(date: Date, language: "tr" | "en" = "tr") {
  return new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-GB", { dateStyle: "long", timeZone: "Europe/Istanbul" }).format(date);
}
