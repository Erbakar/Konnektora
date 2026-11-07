ALTER TABLE "financial_accounts" ADD COLUMN "held_balance" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "payment_transactions" ADD COLUMN "released_at" TIMESTAMP(3), ADD COLUMN "released_by_id" TEXT;
-- Existing succeeded payments were already credited to available balance. Preserve that history.
UPDATE "payment_transactions" SET "released_at" = COALESCE("paid_at", "updated_at") WHERE "status" IN ('succeeded', 'partially_refunded', 'refunded');
CREATE INDEX "payment_transactions_event_id_released_at_idx" ON "payment_transactions"("event_id", "released_at");
