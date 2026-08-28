ALTER TABLE "event_participants"
  ADD COLUMN "check_in_method" TEXT,
  ADD COLUMN "check_in_order" INTEGER,
  ADD COLUMN "check_in_decision_at" TIMESTAMP(3);

ALTER TABLE "place_members"
  ADD COLUMN "check_in_method" TEXT,
  ADD COLUMN "check_in_order" INTEGER,
  ADD COLUMN "check_in_decision_at" TIMESTAMP(3);

CREATE TABLE "event_invitations" (
  "id" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "inviter_id" TEXT NOT NULL,
  "invitee_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "event_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "event_invitations_event_id_inviter_id_invitee_id_key"
  ON "event_invitations"("event_id", "inviter_id", "invitee_id");
CREATE INDEX "event_invitations_event_id_invitee_id_created_at_idx"
  ON "event_invitations"("event_id", "invitee_id", "created_at");

ALTER TABLE "event_invitations"
  ADD CONSTRAINT "event_invitations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "event_invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "event_invitations_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "place_invitations" (
  "id" TEXT NOT NULL,
  "place_id" TEXT NOT NULL,
  "inviter_id" TEXT NOT NULL,
  "invitee_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "place_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "place_invitations_place_id_inviter_id_invitee_id_key"
  ON "place_invitations"("place_id", "inviter_id", "invitee_id");
CREATE INDEX "place_invitations_place_id_invitee_id_created_at_idx"
  ON "place_invitations"("place_id", "invitee_id", "created_at");

ALTER TABLE "place_invitations"
  ADD CONSTRAINT "place_invitations_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "place_invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "place_invitations_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
