CREATE TYPE "SocialProvider" AS ENUM ('google', 'facebook');

CREATE TABLE "social_accounts" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "provider" "SocialProvider" NOT NULL,
  "provider_user_id" TEXT NOT NULL,
  "email" TEXT,
  "display_name" TEXT,
  "avatar_url" TEXT,
  "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contact_invites" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "recipient_hash" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contact_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "social_accounts_provider_provider_user_id_key" ON "social_accounts"("provider", "provider_user_id");
CREATE UNIQUE INDEX "social_accounts_user_id_provider_key" ON "social_accounts"("user_id", "provider");
CREATE INDEX "social_accounts_user_id_idx" ON "social_accounts"("user_id");
CREATE INDEX "contact_invites_user_id_created_at_idx" ON "contact_invites"("user_id", "created_at");
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contact_invites" ADD CONSTRAINT "contact_invites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
