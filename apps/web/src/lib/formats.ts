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
