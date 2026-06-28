CREATE TYPE "UserMessageType" AS ENUM ('faq', 'account_freeze', 'write_to_us');
CREATE TYPE "UserMessageStatus" AS ENUM ('unread', 'read');

CREATE TABLE "user_messages" (
    "id" TEXT NOT NULL,
    "type" "UserMessageType" NOT NULL,
    "category" TEXT,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "body" TEXT NOT NULL,
    "status" "UserMessageStatus" NOT NULL DEFAULT 'unread',
    "app_version" TEXT,
    "system_info" TEXT,
    "read_at" TIMESTAMP(3),
    "read_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_messages_type_status_created_at_idx" ON "user_messages"("type", "status", "created_at");
CREATE INDEX "user_messages_email_idx" ON "user_messages"("email");
CREATE INDEX "user_messages_user_id_idx" ON "user_messages"("user_id");

ALTER TABLE "user_messages" ADD CONSTRAINT "user_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "user_messages" ADD CONSTRAINT "user_messages_read_by_fkey" FOREIGN KEY ("read_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
