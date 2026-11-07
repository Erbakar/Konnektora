-- AlterTable
ALTER TABLE "billing_profiles" ADD COLUMN     "region" TEXT;

-- CreateTable
CREATE TABLE "finance_invoices" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL,
    "data" BYTEA NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "finance_invoices_payment_id_number_document_type_key" ON "finance_invoices"("payment_id", "number", "document_type");

-- AddForeignKey
ALTER TABLE "finance_invoices" ADD CONSTRAINT "finance_invoices_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

