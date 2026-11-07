import { BadRequestException } from "@nestjs/common";
// Invitation forms accept country-code numbers with or without a leading +.
export function invitePhone(raw: string) {
  const digits = raw.trim().replace(/[\s().-]/g, "").replace(/^00/, "+");
  const phone = digits.startsWith("+") ? digits : `+${digits}`;
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new BadRequestException("Telefon numarasını ülke koduyla girin.");
  return phone;
}
export function invitePhoneVariants(raw: string) {
  const phone = invitePhone(raw);
  return [phone, phone.slice(1), `00${phone.slice(1)}`];
}
