ALTER TABLE "events"
ADD COLUMN "live_url" TEXT,
ADD COLUMN "event_timeline" TEXT,
ADD COLUMN "lineup" JSONB,
ADD COLUMN "ticket_types" JSONB;

CREATE TYPE "TicketTypeStatus" AS ENUM ('active', 'inactive', 'sold_out');
CREATE TYPE "TicketOrderStatus" AS ENUM ('pending', 'paid', 'cancelled', 'refunded', 'partially_refunded');
CREATE TYPE "OwnedTicketStatus" AS ENUM ('active', 'transferred', 'used', 'refunded', 'cancelled');

CREATE TABLE "event_ticket_types" ("id" TEXT PRIMARY KEY, "event_id" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "capacity" INTEGER NOT NULL, "sold_count" INTEGER NOT NULL DEFAULT 0, "price" DECIMAL(10,2) NOT NULL DEFAULT 0, "currency" TEXT NOT NULL DEFAULT 'TRY', "sale_starts_at" TIMESTAMP(3), "sale_ends_at" TIMESTAMP(3), "gate_opens_at" TIMESTAMP(3), "gate_closes_at" TIMESTAMP(3), "status" "TicketTypeStatus" NOT NULL DEFAULT 'active', "sort_order" INTEGER NOT NULL DEFAULT 0, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL);
CREATE TABLE "event_ticket_orders" ("id" TEXT PRIMARY KEY, "event_id" TEXT NOT NULL, "ticket_type_id" TEXT NOT NULL, "buyer_id" TEXT NOT NULL, "payment_id" TEXT UNIQUE, "quantity" INTEGER NOT NULL, "unit_price" DECIMAL(10,2) NOT NULL, "total_amount" DECIMAL(10,2) NOT NULL, "currency" TEXT NOT NULL, "status" "TicketOrderStatus" NOT NULL DEFAULT 'pending', "purchased_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL);
CREATE TABLE "owned_event_tickets" ("id" TEXT PRIMARY KEY, "order_id" TEXT NOT NULL, "event_id" TEXT NOT NULL, "ticket_type_id" TEXT NOT NULL, "owner_id" TEXT NOT NULL, "qr_token_hash" TEXT NOT NULL UNIQUE, "qr_token" TEXT NOT NULL UNIQUE, "status" "OwnedTicketStatus" NOT NULL DEFAULT 'active', "transferred_at" TIMESTAMP(3), "used_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL);
CREATE TABLE "ticket_transfers" ("id" TEXT PRIMARY KEY, "ticket_id" TEXT NOT NULL, "from_user_id" TEXT NOT NULL, "to_user_id" TEXT NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
ALTER TABLE "event_ticket_types" ADD CONSTRAINT "event_ticket_types_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE;
ALTER TABLE "event_ticket_orders" ADD CONSTRAINT "event_ticket_orders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT;
ALTER TABLE "event_ticket_orders" ADD CONSTRAINT "event_ticket_orders_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "event_ticket_types"("id") ON DELETE RESTRICT;
ALTER TABLE "event_ticket_orders" ADD CONSTRAINT "event_ticket_orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT;
ALTER TABLE "event_ticket_orders" ADD CONSTRAINT "event_ticket_orders_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment_transactions"("id") ON DELETE SET NULL;
ALTER TABLE "owned_event_tickets" ADD CONSTRAINT "owned_event_tickets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "event_ticket_orders"("id") ON DELETE RESTRICT;
ALTER TABLE "owned_event_tickets" ADD CONSTRAINT "owned_event_tickets_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT;
ALTER TABLE "owned_event_tickets" ADD CONSTRAINT "owned_event_tickets_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "event_ticket_types"("id") ON DELETE RESTRICT;
ALTER TABLE "owned_event_tickets" ADD CONSTRAINT "owned_event_tickets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT;
ALTER TABLE "ticket_transfers" ADD CONSTRAINT "ticket_transfers_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "owned_event_tickets"("id") ON DELETE RESTRICT;
ALTER TABLE "ticket_transfers" ADD CONSTRAINT "ticket_transfers_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE RESTRICT;
ALTER TABLE "ticket_transfers" ADD CONSTRAINT "ticket_transfers_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT;
CREATE INDEX "event_ticket_types_event_id_status_sort_order_idx" ON "event_ticket_types"("event_id", "status", "sort_order");
CREATE INDEX "event_ticket_orders_buyer_id_created_at_idx" ON "event_ticket_orders"("buyer_id", "created_at");
CREATE INDEX "owned_event_tickets_owner_id_status_created_at_idx" ON "owned_event_tickets"("owner_id", "status", "created_at");
