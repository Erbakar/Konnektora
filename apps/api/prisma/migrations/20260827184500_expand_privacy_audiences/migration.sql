ALTER TYPE "PrivacyAudience" ADD VALUE IF NOT EXISTS 'nobody';

ALTER TABLE "privacy_settings"
  ALTER COLUMN "directory_discoverable" SET DEFAULT true,
  ADD COLUMN IF NOT EXISTS "address_audience" "PrivacyAudience" NOT NULL DEFAULT 'everybody',
  ADD COLUMN IF NOT EXISTS "trade_name_audience" "PrivacyAudience" NOT NULL DEFAULT 'everybody';
