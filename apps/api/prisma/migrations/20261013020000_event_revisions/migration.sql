CREATE TABLE "event_revisions" ("id" TEXT PRIMARY KEY, "event_id" TEXT NOT NULL, "actor_id" TEXT, "before" JSONB NOT NULL, "after" JSONB NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "event_revisions_event_id_created_at_idx" ON "event_revisions"("event_id","created_at");
ALTER TABLE "event_revisions" ADD CONSTRAINT "event_revisions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
