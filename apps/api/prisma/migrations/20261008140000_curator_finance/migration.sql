-- CreateTable
CREATE TABLE "curator_agreements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "territories" JSONB NOT NULL,
    "rates" JSONB NOT NULL,
    "referrer_id" TEXT,
    "referral_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "bank_name" TEXT,
    "account_name" TEXT,
    "iban" TEXT,
    "payment_details" TEXT,
    "effective_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "curator_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curator_ledger_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "agreement_id" TEXT,
    "payment_id" TEXT,
    "event_id" TEXT,
    "kind" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "held" BOOLEAN NOT NULL DEFAULT false,
    "rate" DECIMAL(5,2),
    "source_key" TEXT NOT NULL,
    "replaces_id" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT,

    CONSTRAINT "curator_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "curator_agreements_user_id_effective_at_idx" ON "curator_agreements"("user_id", "effective_at");

-- CreateIndex
CREATE UNIQUE INDEX "curator_agreements_user_id_version_key" ON "curator_agreements"("user_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "curator_ledger_entries_source_key_key" ON "curator_ledger_entries"("source_key");

-- CreateIndex
CREATE UNIQUE INDEX "curator_ledger_entries_replaces_id_key" ON "curator_ledger_entries"("replaces_id");

-- CreateIndex
CREATE INDEX "curator_ledger_entries_user_id_currency_occurred_at_idx" ON "curator_ledger_entries"("user_id", "currency", "occurred_at");

-- CreateIndex
CREATE INDEX "curator_ledger_entries_event_id_held_idx" ON "curator_ledger_entries"("event_id", "held");

-- AddForeignKey
ALTER TABLE "curator_agreements" ADD CONSTRAINT "curator_agreements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curator_ledger_entries" ADD CONSTRAINT "curator_ledger_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curator_ledger_entries" ADD CONSTRAINT "curator_ledger_entries_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "curator_agreements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curator_ledger_entries" ADD CONSTRAINT "curator_ledger_entries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curator_ledger_entries" ADD CONSTRAINT "curator_ledger_entries_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

