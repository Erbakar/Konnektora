ALTER TABLE "event_participants"
ADD COLUMN "check_in_token_hash" TEXT,
ADD COLUMN "check_in_token_issued_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "event_participants_check_in_token_hash_key"
ON "event_participants"("check_in_token_hash");
