CREATE TYPE "ProfileVerificationStatus" AS ENUM ('pending', 'approved', 'rejected');
ALTER TABLE "users" ADD COLUMN "profile_verified_at" TIMESTAMP(3);

CREATE TABLE "profile_verifications" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "reference_media_id" TEXT NOT NULL,
  "selfie_url" TEXT NOT NULL,
  "challenge" TEXT NOT NULL,
  "status" "ProfileVerificationStatus" NOT NULL DEFAULT 'pending',
  "provider" TEXT NOT NULL DEFAULT 'manual',
  "face_match_score" DOUBLE PRECISION,
  "liveness_score" DOUBLE PRECISION,
  "decision_reason" TEXT,
  "reviewed_by_id" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "profile_verifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "profile_verifications_user_id_created_at_idx" ON "profile_verifications"("user_id", "created_at");
CREATE INDEX "profile_verifications_status_created_at_idx" ON "profile_verifications"("status", "created_at");
ALTER TABLE "profile_verifications" ADD CONSTRAINT "profile_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "profile_verifications" ADD CONSTRAINT "profile_verifications_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
