ALTER TABLE "private_messages" ADD COLUMN "reply_to_id" TEXT;
ALTER TABLE "private_messages" ADD COLUMN "attachment_url" TEXT;
ALTER TABLE "private_messages" ADD COLUMN "attachment_type" TEXT;
ALTER TABLE "private_messages" ADD COLUMN "attachment_name" TEXT;
ALTER TABLE "private_messages" ADD COLUMN "attachment_size" INTEGER;
ALTER TABLE "private_messages" ADD COLUMN "edited_at" TIMESTAMP(3);
ALTER TABLE "private_messages" ADD COLUMN "deleted_at" TIMESTAMP(3);

CREATE TABLE "message_reactions" (
  "message_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("message_id", "user_id", "emoji")
);

CREATE TABLE "conversation_preferences" (
  "user_id" TEXT NOT NULL,
  "peer_id" TEXT NOT NULL,
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "muted" BOOLEAN NOT NULL DEFAULT false,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "conversation_preferences_pkey" PRIMARY KEY ("user_id", "peer_id")
);

CREATE INDEX "message_reactions_message_id_idx" ON "message_reactions"("message_id");
CREATE INDEX "conversation_preferences_user_id_archived_pinned_idx" ON "conversation_preferences"("user_id", "archived", "pinned");
ALTER TABLE "private_messages" ADD CONSTRAINT "private_messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "private_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "private_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversation_preferences" ADD CONSTRAINT "conversation_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
