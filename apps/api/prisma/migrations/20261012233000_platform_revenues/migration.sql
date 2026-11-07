CREATE TABLE "platform_revenues" (
 "id" TEXT PRIMARY KEY, "source_key" TEXT NOT NULL, "category" TEXT NOT NULL,
 "amount" DECIMAL(12,2) NOT NULL, "refunded_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
 "currency" TEXT NOT NULL, "country" TEXT NOT NULL, "city" TEXT NOT NULL, "region" TEXT,
 "event_id" TEXT, "description" TEXT NOT NULL, "occurred_at" TIMESTAMP(3) NOT NULL,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "created_by_id" TEXT NOT NULL
);
CREATE UNIQUE INDEX "platform_revenues_source_key_key" ON "platform_revenues"("source_key");
ALTER TABLE "curator_ledger_entries" ADD COLUMN "revenue_id" TEXT;
ALTER TABLE "curator_ledger_entries" ADD CONSTRAINT "curator_ledger_entries_revenue_id_fkey" FOREIGN KEY ("revenue_id") REFERENCES "platform_revenues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "events" ADD COLUMN "region" TEXT;
