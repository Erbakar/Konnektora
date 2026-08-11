ALTER TABLE "privacy_settings"
  ADD COLUMN IF NOT EXISTS "profile_name_audience" "PrivacyAudience" NOT NULL DEFAULT 'everybody',
  ADD COLUMN IF NOT EXISTS "demographics_audience" "PrivacyAudience" NOT NULL DEFAULT 'everybody',
  ADD COLUMN IF NOT EXISTS "location_audience" "PrivacyAudience" NOT NULL DEFAULT 'everybody',
  ADD COLUMN IF NOT EXISTS "website_audience" "PrivacyAudience" NOT NULL DEFAULT 'everybody',
  ADD COLUMN IF NOT EXISTS "business_audience" "PrivacyAudience" NOT NULL DEFAULT 'everybody';
