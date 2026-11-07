export const companyTypes: Record<string, [string, string]> = {
  sole_proprietorship: ["Şahıs firması", "Sole proprietorship"], limited_or_corporation: ["Limited / Anonim", "Limited company / corporation"], association: ["Dernek", "Association"], foundation: ["Vakıf", "Foundation"], public_body: ["Kamu kurumu", "Public body"], other: ["Diğer", "Other"],
};
export const businessCategories: Record<string, [string, string]> = {
  event_organizer: ["Etkinlik organizatörü", "Event organiser"], restaurant_bar_cafe: ["Restoran / Bar / Kafe", "Restaurant / Bar / Café"], night_club: ["Gece kulübü", "Nightclub"], university_club: ["Üniversite kulübü", "University club"], ngo: ["STK", "NGO"], brand: ["Marka", "Brand"], tourism_company: ["Turizm şirketi", "Tourism company"], sports_club: ["Spor kulübü", "Sports club"], other: ["Diğer", "Other"],
};
export function businessLabel(value: string, language: "tr" | "en", choices = businessCategories) { return choices[value]?.[language === "tr" ? 0 : 1] ?? value; }
