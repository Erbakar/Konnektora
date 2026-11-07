// Memory only: a reload or leaving the wallet requires verification again.
let grant: { token: string; authorization: string; expiresAt: number } | null = null;
export function setWalletGrant(token: string, authorization: string, expiresAt: string) { grant = { token, authorization, expiresAt: Date.parse(expiresAt) }; }
export function clearWalletGrant() { grant = null; }
export function walletHeader(authorization: string) { return grant && grant.authorization === authorization && grant.expiresAt > Date.now() ? grant.token : ""; }
