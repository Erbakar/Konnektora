ALTER TABLE "platform_revenues" ADD COLUMN "customer_id" TEXT, ADD COLUMN "held" BOOLEAN NOT NULL DEFAULT false;
UPDATE "platform_revenues" SET "held" = true WHERE "category" IN ('event_gate','sponsorship');
ALTER TABLE "platform_revenues" ADD CONSTRAINT "platform_revenues_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
