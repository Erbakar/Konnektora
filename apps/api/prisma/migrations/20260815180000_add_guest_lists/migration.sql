CREATE TABLE "guest_lists" (
  "id" TEXT NOT NULL,
  "owner_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "guest_lists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "guest_list_members" (
  "id" TEXT NOT NULL,
  "guest_list_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "guest_list_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "guest_lists_owner_id_name_key" ON "guest_lists"("owner_id", "name");
CREATE INDEX "guest_lists_owner_id_updated_at_idx" ON "guest_lists"("owner_id", "updated_at");
CREATE UNIQUE INDEX "guest_list_members_guest_list_id_user_id_key" ON "guest_list_members"("guest_list_id", "user_id");
CREATE INDEX "guest_list_members_user_id_idx" ON "guest_list_members"("user_id");
ALTER TABLE "guest_lists" ADD CONSTRAINT "guest_lists_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guest_list_members" ADD CONSTRAINT "guest_list_members_guest_list_id_fkey" FOREIGN KEY ("guest_list_id") REFERENCES "guest_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guest_list_members" ADD CONSTRAINT "guest_list_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
