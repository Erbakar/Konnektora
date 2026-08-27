ALTER TABLE "event_ticket_types"
ADD COLUMN "sales_platform" TEXT NOT NULL DEFAULT 'door',
ADD COLUMN "external_sales_url" TEXT;
