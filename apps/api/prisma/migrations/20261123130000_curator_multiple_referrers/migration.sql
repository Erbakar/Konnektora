-- 23/11 #9: küratör anlaşmasında birden fazla referans küratör.
ALTER TABLE "curator_agreements" ADD COLUMN "referrers" JSONB NOT NULL DEFAULT '[]';
UPDATE "curator_agreements"
SET "referrers" = jsonb_build_array(jsonb_build_object('referrerId', "referrer_id", 'referralRate', "referral_rate"))
WHERE "referrer_id" IS NOT NULL;
