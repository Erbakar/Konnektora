CREATE TABLE "ticket_refunds" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "provider" TEXT NOT NULL DEFAULT 'simulated',
    "status" TEXT NOT NULL DEFAULT 'simulated_refunded',
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_refunds_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ticket_refunds_event_id_status_idx" ON "ticket_refunds"("event_id", "status");
CREATE INDEX "ticket_refunds_user_id_created_at_idx" ON "ticket_refunds"("user_id", "created_at");

ALTER TABLE "ticket_refunds" ADD CONSTRAINT "ticket_refunds_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ticket_refunds" ADD CONSTRAINT "ticket_refunds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
