ALTER TABLE "phone_verifications" ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'new_phone', ADD COLUMN "previous_phone" TEXT;
