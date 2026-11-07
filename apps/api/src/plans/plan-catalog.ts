export type PlanDefinition = { name: string; price: number; events: number | null; tags: number | null; invites: number | null; messages: number | null; sixHours: number | null; profileViews: number | null; advanced: boolean; guest: boolean };
export type PlanCatalog = Record<string, Record<string, PlanDefinition>>;
const base = { sixHours: null, profileViews: null, advanced: true, guest: false };
export const defaultPlanCatalog: PlanCatalog = {
 individual: {
  free: { ...base, name: "Free", price: 0, events: 4, tags: 3, invites: 300, messages: 20, sixHours: 15, profileViews: 2, advanced: false },
  premium: { ...base, name: "Premium", price: 4, events: 8, tags: 5, invites: 500, messages: 50 },
  platinum: { ...base, name: "Platinum", price: 7, events: null, tags: 10, invites: 1000, messages: 100, guest: true },
 },
 corporate: {
  free: { ...base, name: "Free", price: 0, events: 2, tags: 5, invites: 300, messages: 20, sixHours: 15, profileViews: 2, advanced: false },
  pro: { ...base, name: "Pro", price: 19, events: 4, tags: 20, invites: 1000, messages: 50, guest: true },
  venue: { ...base, name: "Venue", price: 49, events: null, tags: 100, invites: 5000, messages: 500, guest: true },
  festival: { ...base, name: "Festival", price: 399, events: null, tags: null, invites: 50000, messages: 1000, guest: true },
 },
 researcher: {
  starter: { ...base, name: "Starter", price: 49, events: 0, tags: 50, invites: 0, messages: 0 },
  explorer: { ...base, name: "Explorer", price: 99, events: 0, tags: 200, invites: 0, messages: 0 },
  enterprise: { ...base, name: "Enterprise", price: 299, events: 0, tags: null, invites: 0, messages: 0 },
 },
};
