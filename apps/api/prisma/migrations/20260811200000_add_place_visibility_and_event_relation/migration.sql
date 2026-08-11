ALTER TABLE "places" ADD COLUMN "visibility" "EventVisibility" NOT NULL DEFAULT 'open';
ALTER TABLE "events" ADD COLUMN "place_id" UUID;
CREATE INDEX "events_place_id_starts_at_idx" ON "events"("place_id", "starts_at");
ALTER TABLE "events" ADD CONSTRAINT "events_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;
