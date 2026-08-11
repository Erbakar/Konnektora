-- Place identifiers are Prisma String values and are stored as PostgreSQL TEXT.
-- Keep this migration idempotent so a deployment can safely retry it after a
-- failed attempt has been marked as rolled back with `prisma migrate resolve`.
ALTER TABLE "places"
  ADD COLUMN IF NOT EXISTS "visibility" "EventVisibility" NOT NULL DEFAULT 'open';

ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "place_id" TEXT;

-- An earlier failed version created this new, still-empty column as UUID before
-- PostgreSQL rejected its foreign key to places.id (TEXT). Normalize it on retry.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'events'
      AND column_name = 'place_id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE "events"
      ALTER COLUMN "place_id" TYPE TEXT USING "place_id"::text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "events_place_id_starts_at_idx"
  ON "events"("place_id", "starts_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'events_place_id_fkey'
      AND conrelid = 'events'::regclass
  ) THEN
    ALTER TABLE "events"
      ADD CONSTRAINT "events_place_id_fkey"
      FOREIGN KEY ("place_id") REFERENCES "places"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
