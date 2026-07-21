ALTER TABLE "private_messages" ADD COLUMN "read_at" TIMESTAMP(3);

CREATE INDEX "private_messages_recipient_id_read_at_created_at_idx"
ON "private_messages"("recipient_id", "read_at", "created_at");
