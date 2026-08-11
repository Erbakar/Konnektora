ALTER TABLE "privacy_settings"
  ADD COLUMN "profile_name_audience" "PrivacyAudience" NOT NULL DEFAULT 'everybody',
  ADD COLUMN "demographics_audience" "PrivacyAudience" NOT NULL DEFAULT 'everybody',
  ADD COLUMN "location_audience" "PrivacyAudience" NOT NULL DEFAULT 'everybody',
  ADD COLUMN "website_audience" "PrivacyAudience" NOT NULL DEFAULT 'everybody',
  ADD COLUMN "business_audience" "PrivacyAudience" NOT NULL DEFAULT 'everybody';
