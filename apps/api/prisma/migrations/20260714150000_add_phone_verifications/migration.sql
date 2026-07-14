ALTER TABLE "users"
ADD COLUMN "phone_verified" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

CREATE TABLE "phone_verifications" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "code_hash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "phone_verifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "phone_verifications_user_id_phone_created_at_idx"
ON "phone_verifications"("user_id", "phone", "created_at");

CREATE INDEX "phone_verifications_expires_at_idx"
ON "phone_verifications"("expires_at");

ALTER TABLE "phone_verifications"
ADD CONSTRAINT "phone_verifications_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
