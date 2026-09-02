CREATE TABLE "guest_list_shares" (
    "id" TEXT NOT NULL,
    "guest_list_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_list_shares_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "guest_list_shares_guest_list_id_user_id_key"
ON "guest_list_shares"("guest_list_id", "user_id");

CREATE INDEX "guest_list_shares_user_id_created_at_idx"
ON "guest_list_shares"("user_id", "created_at");

ALTER TABLE "guest_list_shares"
ADD CONSTRAINT "guest_list_shares_guest_list_id_fkey"
FOREIGN KEY ("guest_list_id") REFERENCES "guest_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "guest_list_shares"
ADD CONSTRAINT "guest_list_shares_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
