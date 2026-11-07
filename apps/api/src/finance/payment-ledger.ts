import { requireSandboxEnvironment } from "./payment-availability";
import { reverseCuratorCommission } from "../curator-finance/curator-accrual";
import { BadRequestException } from "@nestjs/common";
import { PaymentStatus, Prisma, type PaymentTransaction } from "@prisma/client";

export function remainingPaymentNet(payment: { grossAmount: unknown; netAmount: unknown; refundedAmount: unknown }) {
  const gross = Number(payment.grossAmount);
  return gross > 0 ? Math.round(Number(payment.netAmount) * Math.max(0, gross - Number(payment.refundedAmount)) / gross * 100) / 100 : 0;
}
export async function reverseStoredPayment(tx: Prisma.TransactionClient, payment: PaymentTransaction) {
  if (payment.status === PaymentStatus.refunded && Number(payment.refundedAmount) >= Number(payment.grossAmount)) return 0;
  if (![PaymentStatus.succeeded, PaymentStatus.partially_refunded].includes(payment.status as "succeeded" | "partially_refunded")) throw new BadRequestException("Ödeme iade edilebilir durumda değil.");
  requireSandboxEnvironment();
  const amount = Number(payment.grossAmount) - Number(payment.refundedAmount);
  if (amount <= 0) throw new BadRequestException("Ödeme daha önce iade edildi.");
  const claimed = await tx.paymentTransaction.updateMany({ where: { id: payment.id, status: payment.status, refundedAmount: payment.refundedAmount, releasedAt: payment.releasedAt }, data: { status: PaymentStatus.refunded, refundedAmount: payment.grossAmount } });
  if (!claimed.count) throw new BadRequestException("Ödeme başka bir işlemle değişti. Güncel kayıtları yükleyin.");
  const balance = payment.releasedAt ? "availableBalance" : "heldBalance";
  const reversal = remainingPaymentNet(payment);
  const debited = await tx.financialAccount.updateMany({ where: { userId: payment.payeeId, preferredCurrency: payment.currency, [balance]: { gte: reversal } }, data: { [balance]: { decrement: reversal } } });
  if (!debited.count) throw new BadRequestException("İade için organizatör bakiyesi yetersiz veya para birimi uyumsuz.");
  await reverseCuratorCommission(tx, payment, amount);
  return amount;
}
