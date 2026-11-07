import { Prisma } from "@prisma/client";

// Approved platform commission. Provider costs are not added to this rate.
export const TICKET_COMMISSION_PERCENT = 5;

export function ticketAmounts(gross: Prisma.Decimal.Value) {
  const amount = new Prisma.Decimal(gross);
  if (!amount.isFinite() || amount.isNegative()) throw new Error("Invalid ticket amount");
  const total = amount.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const fee = total.mul(TICKET_COMMISSION_PERCENT).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  return { gross: total.toNumber(), fee: fee.toNumber(), net: total.minus(fee).toNumber() };
}
