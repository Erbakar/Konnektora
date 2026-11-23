/** 23/11 #9: anlaşmanın referans küratörleri; yeni "referrers" alanı yoksa eski tekil alanlardan okunur. */
export type AgreementReferrer = { referrerId: string; referralRate: number };
export function agreementReferrers(contract: { referrers?: unknown; referrerId?: string | null; referralRate?: unknown }): AgreementReferrer[] {
  const list = Array.isArray(contract.referrers)
    ? (contract.referrers as Array<{ referrerId?: unknown; referralRate?: unknown }>)
        .filter((row) => typeof row?.referrerId === "string" && row.referrerId)
        .map((row) => ({ referrerId: String(row.referrerId), referralRate: Number(row.referralRate ?? 0) }))
    : [];
  if (list.length) return list;
  return contract.referrerId ? [{ referrerId: contract.referrerId, referralRate: Number(contract.referralRate ?? 0) }] : [];
}
export const totalReferralRate = (contract: Parameters<typeof agreementReferrers>[0]) => agreementReferrers(contract).reduce((sum, row) => sum + row.referralRate, 0);
