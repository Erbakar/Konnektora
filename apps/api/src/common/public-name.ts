import { audienceAllows } from "./privacy-context";
type Identity = { id?: string; status?: string; name: string; username?: string | null; accountType?: string; companyName?: string | null; privacySettings?: { profileNameAudience?: string } | null };
// A restricted personal name must never be sent in public cards or message peers.
export function publicName(user: Identity) {
  if (user.status === "invited") return "Davetli";
  if (user.accountType === "corporate" && user.companyName) return user.companyName;
  if (!audienceAllows(user.id, user.privacySettings?.profileNameAudience ?? "everybody")) return user.username || "Konnektora üyesi";
  return user.name;
}
