CREATE TABLE "plan_usage" (
 "id" TEXT PRIMARY KEY, "user_id" TEXT NOT NULL, "kind" TEXT NOT NULL,
 "scope" TEXT NOT NULL, "target_id" TEXT NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "plan_usage_user_id_kind_scope_target_id_key" ON "plan_usage"("user_id","kind","scope","target_id");
CREATE INDEX "plan_usage_user_id_kind_created_at_idx" ON "plan_usage"("user_id","kind","created_at");
-- Existing creations count in their original period; do not reset usage on rollout.
INSERT INTO "plan_usage" ("id","user_id","kind","scope","target_id","created_at")
SELECT 'event:'||e.id,e.created_by,'event','',e.id,e.created_at FROM events e JOIN users u ON u.id=e.created_by
WHERE NOT (u.account_type='corporate' AND
 CASE WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(e.ticket_types) t WHERE COALESCE(t->>'status','active')<>'inactive')
 THEN NOT EXISTS (SELECT 1 FROM jsonb_array_elements(e.ticket_types) t WHERE COALESCE(t->>'status','active')<>'inactive' AND COALESCE((t->>'price')::numeric,0)<=0)
 ELSE e.price>0 END);
-- Historical invitations from the creator have an unambiguous organizer role.
INSERT INTO "plan_usage" ("id","user_id","kind","scope","target_id","created_at")
SELECT 'invite:'||i.id,e.created_by,'invite',e.id,i.invitee_id,i.created_at
FROM event_invitations i JOIN events e ON e.id=i.event_id
WHERE i.inviter_id=e.created_by;
CREATE TABLE "wallet_access" (
 "user_id" TEXT PRIMARY KEY, "code_hash" TEXT, "code_expires_at" TIMESTAMP(3),
 "session_hash" TEXT, "phone" TEXT, "sent_at" TIMESTAMP(3), "failures" INTEGER NOT NULL DEFAULT 0,
 "locked_until" TIMESTAMP(3), "grant_hash" TEXT, "grant_expires_at" TIMESTAMP(3)
);

ALTER TABLE "plan_usage" ADD CONSTRAINT "plan_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wallet_access" ADD CONSTRAINT "wallet_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
