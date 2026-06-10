CREATE TABLE "admin_role_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_role_groups_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "users" ADD COLUMN "admin_role_group_id" TEXT;

ALTER TABLE "users" ADD CONSTRAINT "users_admin_role_group_id_fkey" FOREIGN KEY ("admin_role_group_id") REFERENCES "admin_role_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
