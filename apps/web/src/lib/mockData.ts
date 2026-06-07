import type { Event, Tag } from "@konnektora/shared";

export const mockTags: Tag[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Startup",
    slug: "startup",
    description: "Early-stage teams, product launches and growth sessions.",
    categoryId: null,
    status: "active",
    usageCount: 4
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Networking",
    slug: "networking",
    description: "Curated community meetings and business connections.",
    categoryId: null,
    status: "active",
    usageCount: 4
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Yatırım",
    slug: "yatirim",
    description: "Investor access, fundraising readiness and capital events.",
    categoryId: null,
    status: "active",
    usageCount: 4
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    name: "Founder",
    slug: "founder",
    description: "Founder circles, matching labs and peer support.",
    categoryId: null,
    status: "active",
    usageCount: 4
  }
];

const tagBySlug = new Map(mockTags.map((tag) => [tag.slug, tag]));

function tag(slug: string): Tag {
  const found = tagBySlug.get(slug);

  if (!found) {
    throw new Error(`Mock tag not found: ${slug}`);
  }

  return found;
}

function event(input: Omit<Event, "status" | "timezone" | "language" | "externalRegistrationUrl">): Event {
  return {
    ...input,
    status: "published",
    timezone: input.city ? "Europe/Istanbul" : "UTC",
    language: "en",
    externalRegistrationUrl: null
  };
}

export const mockEvents: Event[] = [
  event({
    id: "aaaaaaaa-0001-4000-8000-000000000001",
    title: "Global Startup Demo Night",
    slug: "global-startup-demo-night",
    summary: "Early-stage startup teams present their products inside a curated closed community.",
    description:
      "Founders run five-minute demos, collect product feedback and meet investors in a moderated networking flow managed inside Konnektora.",
    startsAt: "2026-07-04T18:00:00.000Z",
    endsAt: "2026-07-04T21:00:00.000Z",
    format: "hybrid",
    visibility: "open",
    city: "London",
    country: "United Kingdom",
    organizerName: "Konnektora Labs",
    coverImageUrl: "https://images.unsplash.com/photo-1556761175-b413da4baf72",
    capacity: 120,
    tags: [tag("startup")]
  }),
  event({
    id: "aaaaaaaa-0002-4000-8000-000000000002",
    title: "AI Product Builders Breakfast",
    slug: "ai-product-builders-breakfast",
    summary: "A morning session for founders and product teams building AI products.",
    description:
      "Closed community members discuss discovery, customer interviews and go-to-market decisions. Organizers approve attendance requests from the guest list.",
    startsAt: "2026-07-08T08:30:00.000Z",
    endsAt: "2026-07-08T11:00:00.000Z",
    format: "offline",
    visibility: "approval_required",
    city: "Amsterdam",
    country: "Netherlands",
    organizerName: "Konnektora Product Circle",
    coverImageUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4",
    capacity: 48,
    tags: [tag("startup")]
  }),
  event({
    id: "aaaaaaaa-0003-4000-8000-000000000003",
    title: "SaaS Growth Office Hours",
    slug: "saas-growth-office-hours",
    summary: "A closed office-hours session for SaaS founders focused on growth and retention.",
    description:
      "Participants bring their metrics, work through problems in small groups and get practical feedback from experienced operators.",
    startsAt: "2026-07-12T16:00:00.000Z",
    endsAt: "2026-07-12T18:30:00.000Z",
    format: "online",
    visibility: "invite_only",
    city: null,
    country: null,
    organizerName: "Konnektora SaaS Guild",
    coverImageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978",
    capacity: 60,
    tags: [tag("startup")]
  }),
  event({
    id: "aaaaaaaa-0004-4000-8000-000000000004",
    title: "Climate Tech Founder Roundtable",
    slug: "climate-tech-founder-roundtable",
    summary: "A roundtable on funding, regulation and pilot customers for climate tech startups.",
    description:
      "Global founders discuss climate tech financing, enterprise pilot programs and community support for international expansion.",
    startsAt: "2026-07-17T17:30:00.000Z",
    endsAt: "2026-07-17T20:00:00.000Z",
    format: "hybrid",
    visibility: "approval_required",
    city: "Berlin",
    country: "Germany",
    organizerName: "Konnektora Climate",
    coverImageUrl: "https://images.unsplash.com/photo-1497366811353-6870744d04b2",
    capacity: 80,
    tags: [tag("startup")]
  }),
  event({
    id: "bbbbbbbb-0001-4000-8000-000000000001",
    title: "Founders & Operators Mixer",
    slug: "founders-operators-mixer",
    summary: "A fast-paced mixer for founders, operators and community leaders.",
    description:
      "Participants are grouped by interest tags so they can meet relevant people quickly and continue follow-up inside Konnektora.",
    startsAt: "2026-07-05T18:30:00.000Z",
    endsAt: "2026-07-05T21:30:00.000Z",
    format: "offline",
    visibility: "open",
    city: "New York",
    country: "United States",
    organizerName: "Konnektora NYC",
    coverImageUrl: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622",
    capacity: 150,
    tags: [tag("networking")]
  }),
  event({
    id: "bbbbbbbb-0002-4000-8000-000000000002",
    title: "Remote Builders Social",
    slug: "remote-builders-social",
    summary: "A location-independent social event for remote builders and operators.",
    description:
      "The online event uses breakout rooms organized around project goals, collaboration interests and current startup challenges.",
    startsAt: "2026-07-09T15:00:00.000Z",
    endsAt: "2026-07-09T17:00:00.000Z",
    format: "online",
    visibility: "open",
    city: null,
    country: null,
    organizerName: "Konnektora Remote",
    coverImageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f",
    capacity: 200,
    tags: [tag("networking")]
  }),
  event({
    id: "bbbbbbbb-0003-4000-8000-000000000003",
    title: "Investor Coffee Chats",
    slug: "investor-coffee-chats",
    summary: "Curated one-to-one coffee chats between founders and investors.",
    description:
      "Participants apply with short profiles. Organizers approve matches and manage invited or accepted statuses through the guest list.",
    startsAt: "2026-07-15T09:00:00.000Z",
    endsAt: "2026-07-15T12:00:00.000Z",
    format: "hybrid",
    visibility: "approval_required",
    city: "Paris",
    country: "France",
    organizerName: "Konnektora Capital",
    coverImageUrl: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7",
    capacity: 70,
    tags: [tag("networking")]
  }),
  event({
    id: "bbbbbbbb-0004-4000-8000-000000000004",
    title: "Community Leaders Dinner",
    slug: "community-leaders-dinner",
    summary: "An invite-only dinner for global community managers and ecosystem builders.",
    description:
      "Community leaders share moderation practices, event quality standards and safety patterns for offline gatherings.",
    startsAt: "2026-07-22T19:00:00.000Z",
    endsAt: "2026-07-22T22:00:00.000Z",
    format: "offline",
    visibility: "invite_only",
    city: "Lisbon",
    country: "Portugal",
    organizerName: "Konnektora Community",
    coverImageUrl: "https://images.unsplash.com/photo-1528605248644-14dd04022da1",
    capacity: 32,
    tags: [tag("networking")]
  }),
  event({
    id: "cccccccc-0001-4000-8000-000000000001",
    title: "Seed Funding Readiness Clinic",
    slug: "seed-funding-readiness-clinic",
    summary: "A practical clinic for startups preparing pitch, metrics and data room material.",
    description:
      "Founders review fundraising readiness with experts and leave with a clearer investor narrative and next-step checklist.",
    startsAt: "2026-07-06T14:00:00.000Z",
    endsAt: "2026-07-06T17:00:00.000Z",
    format: "online",
    visibility: "approval_required",
    city: null,
    country: null,
    organizerName: "Konnektora Capital",
    coverImageUrl: "https://images.unsplash.com/photo-1551836022-d5d88e9218df",
    capacity: 90,
    tags: [tag("yatirim")]
  }),
  event({
    id: "cccccccc-0002-4000-8000-000000000002",
    title: "Angel Investor AMA",
    slug: "angel-investor-ama",
    summary: "A Q&A session with angel investors on deal evaluation and early funding.",
    description:
      "Members submit questions in advance. Organizers group topics and keep the live session focused on practical decisions.",
    startsAt: "2026-07-11T16:30:00.000Z",
    endsAt: "2026-07-11T18:00:00.000Z",
    format: "online",
    visibility: "open",
    city: null,
    country: null,
    organizerName: "Konnektora Angels",
    coverImageUrl: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85",
    capacity: 180,
    tags: [tag("yatirim")]
  }),
  event({
    id: "cccccccc-0003-4000-8000-000000000003",
    title: "VC Reverse Pitch",
    slug: "vc-reverse-pitch",
    summary: "VC funds present their thesis and investment criteria to founders.",
    description:
      "Investors take the stage and founders choose which funds they want to meet based on sector fit and stage alignment.",
    startsAt: "2026-07-19T17:00:00.000Z",
    endsAt: "2026-07-19T20:00:00.000Z",
    format: "hybrid",
    visibility: "approval_required",
    city: "San Francisco",
    country: "United States",
    organizerName: "Konnektora VC Network",
    coverImageUrl: "https://images.unsplash.com/photo-1559136555-9303baea8ebd",
    capacity: 110,
    tags: [tag("yatirim")]
  }),
  event({
    id: "cccccccc-0004-4000-8000-000000000004",
    title: "Impact Capital Roundtable",
    slug: "impact-capital-roundtable",
    summary: "A focused roundtable for impact investors and social venture founders.",
    description:
      "Participants discuss impact measurement, capital structures and global expansion for mission-driven companies.",
    startsAt: "2026-07-27T15:00:00.000Z",
    endsAt: "2026-07-27T18:00:00.000Z",
    format: "offline",
    visibility: "invite_only",
    city: "Copenhagen",
    country: "Denmark",
    organizerName: "Konnektora Impact",
    coverImageUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d",
    capacity: 40,
    tags: [tag("yatirim")]
  }),
  event({
    id: "dddddddd-0001-4000-8000-000000000001",
    title: "Solo Founder Accountability Sprint",
    slug: "solo-founder-accountability-sprint",
    summary: "A weekly goal-setting and accountability session for solo founders.",
    description:
      "Founders share weekly targets, pair with peers and use attendance history to maintain consistent progress.",
    startsAt: "2026-07-03T13:00:00.000Z",
    endsAt: "2026-07-03T15:00:00.000Z",
    format: "online",
    visibility: "open",
    city: null,
    country: null,
    organizerName: "Konnektora Founder Club",
    coverImageUrl: "https://images.unsplash.com/photo-1497366754035-f200968a6e72",
    capacity: 75,
    tags: [tag("founder")]
  }),
  event({
    id: "dddddddd-0002-4000-8000-000000000002",
    title: "Founder Mental Load Circle",
    slug: "founder-mental-load-circle",
    summary: "A private circle for founders to discuss stress, loneliness and decision load.",
    description:
      "The session uses invite-only visibility and a small guest list to protect quality, privacy and psychological safety.",
    startsAt: "2026-07-13T18:00:00.000Z",
    endsAt: "2026-07-13T20:00:00.000Z",
    format: "online",
    visibility: "invite_only",
    city: null,
    country: null,
    organizerName: "Konnektora Founder Care",
    coverImageUrl: "https://images.unsplash.com/photo-1543269865-cbf427effbad",
    capacity: 24,
    tags: [tag("founder")]
  }),
  event({
    id: "dddddddd-0003-4000-8000-000000000003",
    title: "Co-Founder Matching Lab",
    slug: "co-founder-matching-lab",
    summary: "A controlled matching lab for people looking to build a new company together.",
    description:
      "Participants are matched by skills, interests and working style. Organizers approve profiles before the session.",
    startsAt: "2026-07-20T16:00:00.000Z",
    endsAt: "2026-07-20T19:00:00.000Z",
    format: "hybrid",
    visibility: "approval_required",
    city: "Toronto",
    country: "Canada",
    organizerName: "Konnektora Matching",
    coverImageUrl: "https://images.unsplash.com/photo-1556761175-4b46a572b786",
    capacity: 64,
    tags: [tag("founder")]
  }),
  event({
    id: "dddddddd-0004-4000-8000-000000000004",
    title: "Founder Story Night",
    slug: "founder-story-night",
    summary: "A story night where founders share failures, pivots and growth lessons.",
    description:
      "Short stage talks are followed by small-group conversations. Tag links help members discover related events afterwards.",
    startsAt: "2026-07-29T18:00:00.000Z",
    endsAt: "2026-07-29T21:00:00.000Z",
    format: "offline",
    visibility: "open",
    city: "Istanbul",
    country: "Turkey",
    organizerName: "Konnektora Stories",
    coverImageUrl: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678",
    capacity: 100,
    tags: [tag("founder")]
  })
];
