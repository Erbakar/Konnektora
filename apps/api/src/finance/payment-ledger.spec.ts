import { BadRequestException } from "@nestjs/common";
import { reverseStoredPayment } from "./payment-ledger";
describe("Ticket payment reversal", () => {
  const payment = { id: "p1", payeeId: "u1", grossAmount: 100, netAmount: 80, refundedAmount: 25, status: "partially_refunded", currency: "TRY", releasedAt: null };
  function client() { return { curatorLedgerEntry: { findMany: jest.fn().mockResolvedValue([]) }, paymentTransaction: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) }, financialAccount: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) } }; }
  it("refunds only the remaining amount and debits held income", async () => {
    const tx = client(); expect(await reverseStoredPayment(tx as never, payment as never)).toBe(75);
    expect(tx.financialAccount.updateMany).toHaveBeenCalledWith({ where: { userId: "u1", preferredCurrency: "TRY", heldBalance: { gte: 60 } }, data: { heldBalance: { decrement: 60 } } });
  });
  it("debits available balance for already released income", async () => {
    const tx = client(); await reverseStoredPayment(tx as never, { ...payment, releasedAt: new Date() } as never);
    expect(tx.financialAccount.updateMany.mock.calls[0][0].data).toEqual({ availableBalance: { decrement: 60 } });
  });
  it("stops concurrent refund or release before moving funds", async () => {
    const tx = client(); tx.paymentTransaction.updateMany.mockResolvedValue({ count: 0 });
    await expect(reverseStoredPayment(tx as never, payment as never)).rejects.toThrow(BadRequestException);
    expect(tx.financialAccount.updateMany).not.toHaveBeenCalled();
  });
  it("does not debit a previously fully refunded payment when its event is cancelled", async () => {
    const tx = client(); expect(await reverseStoredPayment(tx as never, { ...payment, status: "refunded", refundedAmount: 100 } as never)).toBe(0);
    expect(tx.paymentTransaction.updateMany).not.toHaveBeenCalled(); expect(tx.financialAccount.updateMany).not.toHaveBeenCalled();
  });

});
