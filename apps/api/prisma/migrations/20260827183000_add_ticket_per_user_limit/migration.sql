ALTER TABLE "event_ticket_types" ADD COLUMN "per_user_limit" INTEGER;

ALTER TABLE "event_ticket_types"
ADD CONSTRAINT "event_ticket_types_per_user_limit_check"
CHECK ("per_user_limit" IS NULL OR "per_user_limit" > 0);
