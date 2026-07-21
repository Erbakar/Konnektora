CREATE TYPE "PlaceMemberStatus" AS ENUM ('invited', 'accepted', 'declined', 'banned');
CREATE TYPE "PlaceMemberRole" AS ENUM ('member', 'manager', 'organizer');

CREATE TABLE "place_members" (
  "place_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "status" "PlaceMemberStatus" NOT NULL DEFAULT 'invited',
  "role" "PlaceMemberRole" NOT NULL DEFAULT 'member',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "place_members_pkey" PRIMARY KEY ("place_id", "user_id")
);

CREATE TABLE "place_follows" (
  "place_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "place_follows_pkey" PRIMARY KEY ("place_id", "user_id")
);

CREATE INDEX "place_members_user_id_status_idx" ON "place_members"("user_id", "status");
CREATE INDEX "place_members_place_id_role_status_idx" ON "place_members"("place_id", "role", "status");
CREATE INDEX "place_follows_user_id_created_at_idx" ON "place_follows"("user_id", "created_at");

ALTER TABLE "place_members" ADD CONSTRAINT "place_members_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "place_members" ADD CONSTRAINT "place_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "place_follows" ADD CONSTRAINT "place_follows_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "place_follows" ADD CONSTRAINT "place_follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
