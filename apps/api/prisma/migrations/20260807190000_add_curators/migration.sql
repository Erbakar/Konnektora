ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'curator';
ALTER TABLE "users" ADD COLUMN "curator_city" TEXT;
CREATE TABLE "curator_applications" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "country" TEXT,
  "motivation" TEXT NOT NULL,
  "cv_url" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "curator_applications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "curator_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "curator_applications_status_created_at_idx" ON "curator_applications"("status", "created_at");
CREATE INDEX "curator_applications_city_idx" ON "curator_applications"("city");
