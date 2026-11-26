import type { UserRole } from "@prisma/client";

/**
 * 26/11 #82-5 / #128: küratörler de topluluk üyesidir. Üye arama, "Üyeler" listeleri, öneriler ve takip
 * yalnız `role: "user"` ile süzüldüğünde küratör hesapları bulunamıyor / takip edilemiyordu.
 */
export const MEMBER_ROLES: UserRole[] = ["user", "curator"];
