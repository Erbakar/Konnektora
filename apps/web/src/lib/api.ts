import {
  adminDashboardSchema,
  eventSchema,
  eventParticipantSchema,
  loginResponseSchema,
  tagSchema,
  type AdminDashboard,
  type Event,
  type EventParticipant,
  type LoginResponse,
  type Tag
} from "@konnektora/shared";
import { z } from "zod";
import { mockEvents, mockTags } from "./mockData";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const USE_MOCK_FALLBACK =
  import.meta.env.PROD && (API_URL.includes("localhost") || API_URL.includes("127.0.0.1"));
const TOKEN_KEY = "konnektora_admin_token";
const MOCK_EVENTS_KEY = "konnektora_mock_events";
const MOCK_TAGS_KEY = "konnektora_mock_tags";
const MOCK_ADMIN_TOKEN = "mock-admin-token";

export const isMockApiMode = USE_MOCK_FALLBACK;

type RequestOptions = RequestInit & {
  auth?: boolean;
};

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function requestJson<T>(path: string, schema: z.ZodType<T>, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (options.auth) {
    const token = getAdminToken();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  try {
    const response = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    if (response.status === 204) {
      return schema.parse(null);
    }

    return schema.parse(await response.json());
  } catch (error) {
    const fallback = getMockResponse(path, schema, options);

    if (fallback !== undefined) {
      return fallback;
    }

    throw error;
  }
}

function getMockResponse<T>(path: string, schema: z.ZodType<T>, options: RequestOptions): T | undefined {
  if (!USE_MOCK_FALLBACK) {
    return undefined;
  }

  const method = options.method?.toUpperCase() ?? "GET";
  const [rawPathname, queryString = ""] = path.split("?");
  const pathname = rawPathname ?? "";

  if (pathname === "/admin/auth/login" && method === "POST") {
    return schema.parse({
      accessToken: MOCK_ADMIN_TOKEN,
      user: {
        id: "99999999-9999-4999-8999-999999999999",
        email: "admin@konnektora.local",
        name: "Konnektora Admin",
        role: "super_admin",
        status: "active"
      }
    });
  }

  if (pathname === "/admin/dashboard" && method === "GET") {
    return schema.parse(getMockDashboard());
  }

  if (pathname === "/admin/tags" && method === "GET") {
    return schema.parse(getStoredTags());
  }

  if (pathname === "/admin/tags" && method === "POST") {
    return schema.parse(createMockTag(parseBody<{ name: string; description?: string }>(options)));
  }

  if (pathname.startsWith("/admin/tags/") && method === "PATCH") {
    return schema.parse(updateMockTag(pathname.slice("/admin/tags/".length), parseBody(options)));
  }

  if (pathname.startsWith("/admin/tags/") && method === "DELETE") {
    return schema.parse(updateMockTag(pathname.slice("/admin/tags/".length), { status: "archived" }));
  }

  if (pathname === "/admin/events" && method === "GET") {
    return schema.parse(getStoredEvents());
  }

  if (pathname === "/admin/events" && method === "POST") {
    return schema.parse(createMockEvent(parseBody<AdminEventInput>(options)));
  }

  if (pathname.startsWith("/admin/events/") && method === "PATCH") {
    return schema.parse(updateMockEvent(pathname.slice("/admin/events/".length), parseBody(options)));
  }

  if (pathname.startsWith("/admin/events/") && method === "DELETE") {
    return schema.parse(updateMockEvent(pathname.slice("/admin/events/".length), { status: "archived" }));
  }

  if (method !== "GET" || options.auth) {
    return undefined;
  }

  if (pathname === "/tags") {
    return schema.parse(getStoredTags().filter((tag) => tag.status === "active"));
  }

  if (pathname === "/events") {
    const params = new URLSearchParams(queryString);
    const selectedTag = params.get("tag");
    const publicEvents = getStoredEvents().filter((eventItem) => eventItem.status === "published");
    const events = selectedTag
      ? publicEvents.filter((eventItem) => eventItem.tags.some((tagItem) => tagItem.slug === selectedTag))
      : publicEvents;

    return schema.parse(events);
  }

  if (pathname.startsWith("/events/")) {
    const slug = decodeURIComponent(pathname.slice("/events/".length));
    const event = getStoredEvents().find((eventItem) => eventItem.status === "published" && eventItem.slug === slug);

    return event ? schema.parse(event) : undefined;
  }

  return undefined;
}

function parseBody<T>(options: RequestOptions): T {
  return options.body ? (JSON.parse(String(options.body)) as T) : ({} as T);
}

function getStoredEvents(): Event[] {
  const storedEvents = readStorage<Event[]>(MOCK_EVENTS_KEY, []);
  const storedIds = new Set(storedEvents.map((event) => event.id));
  return [...storedEvents, ...mockEvents.filter((event) => !storedIds.has(event.id))];
}

function getStoredTags(): Tag[] {
  const storedTags = readStorage<Tag[]>(MOCK_TAGS_KEY, []);
  const storedSlugs = new Set(storedTags.map((tag) => tag.slug));
  return [...storedTags, ...mockTags.filter((tag) => !storedSlugs.has(tag.slug))];
}

function setStoredEvents(events: Event[]) {
  writeStorage(MOCK_EVENTS_KEY, events);
}

function setStoredTags(tags: Tag[]) {
  writeStorage(MOCK_TAGS_KEY, tags);
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getMockDashboard(): AdminDashboard {
  const now = Date.now();
  const events = getStoredEvents();

  return {
    publishedEvents: events.filter((event) => event.status === "published").length,
    draftEvents: events.filter((event) => event.status === "draft").length,
    activeTags: getStoredTags().filter((tag) => tag.status === "active").length,
    upcomingEvents: events.filter((event) => event.status === "published" && new Date(event.startsAt).getTime() >= now)
      .length
  };
}

function createMockTag(input: { name: string; description?: string }): Tag {
  const tags = getStoredTags();
  const tag: Tag = {
    id: createId(),
    name: input.name,
    slug: uniqueSlug(input.name, tags.map((item) => item.slug)),
    description: input.description || null,
    categoryId: null,
    status: "active",
    usageCount: 0
  };

  setStoredTags([tag, ...tags]);
  return tag;
}

function updateMockTag(id: string, input: Partial<Tag>): Tag {
  const tags = getStoredTags();
  const updatedTags = tags.map((tag) => (tag.id === id ? { ...tag, ...input } : tag));
  const updatedTag = updatedTags.find((tag) => tag.id === id);

  if (!updatedTag) {
    throw new Error("Mock tag not found");
  }

  setStoredTags(updatedTags);
  return updatedTag;
}

function createMockEvent(input: AdminEventInput): Event {
  const events = getStoredEvents();
  const event: Event = {
    id: createId(),
    title: input.title,
    slug: uniqueSlug(input.title, events.map((item) => item.slug)),
    summary: input.summary,
    description: input.description,
    status: parseEventStatus(input.status),
    startsAt: input.startsAt,
    endsAt: input.endsAt ?? new Date(new Date(input.startsAt).getTime() + 1000 * 60 * 60 * 2).toISOString(),
    timezone: input.timezone,
    format: parseEventFormat(input.format),
    visibility: parseEventVisibility(input.visibility),
    city: input.city || null,
    country: input.country || null,
    language: input.language,
    organizerName: input.organizerName || "Konnektora Admin",
    externalRegistrationUrl: input.externalRegistrationUrl || null,
    coverImageUrl: input.coverImageUrl || null,
    capacity: input.capacity ?? null,
    tags: getTagsByIds(input.tagIds ?? [])
  };

  setStoredEvents([event, ...events]);
  return event;
}

function updateMockEvent(id: string, input: Partial<AdminEventInput>): Event {
  const events = getStoredEvents();
  const updatedEvents = events.map((event) => {
    if (event.id !== id) {
      return event;
    }

    return {
      ...event,
      title: input.title ?? event.title,
      summary: input.summary ?? event.summary,
      description: input.description ?? event.description,
      status: input.status ? parseEventStatus(input.status) : event.status,
      startsAt: input.startsAt ?? event.startsAt,
      endsAt:
        input.endsAt ??
        (input.startsAt ? new Date(new Date(input.startsAt).getTime() + 1000 * 60 * 60 * 2).toISOString() : event.endsAt),
      timezone: input.timezone ?? event.timezone,
      format: input.format ? parseEventFormat(input.format) : event.format,
      visibility: input.visibility ? parseEventVisibility(input.visibility) : event.visibility,
      city: input.city === undefined ? event.city : input.city || null,
      country: input.country === undefined ? event.country : input.country || null,
      language: input.language ?? event.language,
      organizerName: input.organizerName === undefined ? event.organizerName : input.organizerName || "Konnektora Admin",
      externalRegistrationUrl:
        input.externalRegistrationUrl === undefined ? event.externalRegistrationUrl : input.externalRegistrationUrl || null,
      coverImageUrl: input.coverImageUrl === undefined ? event.coverImageUrl : input.coverImageUrl || null,
      capacity: input.capacity === undefined ? event.capacity : input.capacity ?? null,
      tags: input.tagIds ? getTagsByIds(input.tagIds) : event.tags
    };
  });
  const updatedEvent = updatedEvents.find((event) => event.id === id);

  if (!updatedEvent) {
    throw new Error("Mock event not found");
  }

  setStoredEvents(updatedEvents);
  return updatedEvent;
}

function getTagsByIds(tagIds: string[]): Tag[] {
  const ids = new Set(tagIds);
  return getStoredTags().filter((tag) => ids.has(tag.id));
}

function createId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (char) =>
    (Number(char) ^ ((crypto.getRandomValues(new Uint8Array(1))[0] ?? 0) & (15 >> (Number(char) / 4)))).toString(16)
  );
}

function uniqueSlug(value: string, usedSlugs: string[]) {
  const baseSlug =
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ı/g, "i")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "event";
  const used = new Set(usedSlugs);
  let slug = baseSlug;
  let index = 2;

  while (used.has(slug)) {
    slug = `${baseSlug}-${index}`;
    index += 1;
  }

  return slug;
}

function parseEventStatus(value?: string): Event["status"] {
  return value === "published" || value === "cancelled" || value === "archived" ? value : "draft";
}

function parseEventFormat(value?: string): Event["format"] {
  return value === "offline" || value === "hybrid" ? value : "online";
}

function parseEventVisibility(value?: string): Event["visibility"] {
  return value === "approval_required" || value === "invite_only" ? value : "open";
}

export function listEvents(params?: URLSearchParams): Promise<Event[]> {
  const query = params?.toString();
  return requestJson(`/events${query ? `?${query}` : ""}`, z.array(eventSchema));
}

export function getEvent(slug: string): Promise<Event> {
  return requestJson(`/events/${slug}`, eventSchema);
}

export function listTags(): Promise<Tag[]> {
  return requestJson("/tags", z.array(tagSchema));
}

export function adminLogin(email: string, password: string): Promise<LoginResponse> {
  return requestJson("/admin/auth/login", loginResponseSchema, {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function getAdminDashboard(): Promise<AdminDashboard> {
  return requestJson("/admin/dashboard", adminDashboardSchema, { auth: true });
}

export function listAdminEvents(): Promise<Event[]> {
  return requestJson("/admin/events", z.array(eventSchema), { auth: true });
}

export function listAdminTags(): Promise<Tag[]> {
  return requestJson("/admin/tags", z.array(tagSchema), { auth: true });
}

export function createAdminTag(input: { name: string; description?: string }): Promise<Tag> {
  return requestJson("/admin/tags", tagSchema, {
    auth: true,
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateAdminTag(id: string, input: { name?: string; description?: string }): Promise<Tag> {
  return requestJson(`/admin/tags/${id}`, tagSchema, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function archiveAdminTag(id: string): Promise<Tag> {
  return requestJson(`/admin/tags/${id}`, tagSchema, {
    auth: true,
    method: "DELETE"
  });
}

export function archiveAdminEvent(id: string): Promise<Event> {
  return requestJson(`/admin/events/${id}`, eventSchema, {
    auth: true,
    method: "DELETE"
  });
}

export type AdminEventInput = {
  title: string;
  summary: string;
  description: string;
  startsAt: string;
  endsAt?: string;
  timezone: string;
  format: string;
  visibility?: string;
  city?: string;
  country?: string;
  language: string;
  organizerName?: string;
  externalRegistrationUrl?: string;
  coverImageUrl?: string;
  capacity?: number;
  status?: string;
  tagIds?: string[];
};

export function updateAdminEvent(id: string, input: Partial<AdminEventInput>): Promise<Event> {
  return requestJson(`/admin/events/${id}`, eventSchema, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function createAdminEvent(input: AdminEventInput): Promise<Event> {
  return requestJson("/admin/events", eventSchema, {
    auth: true,
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function createUserEvent(input: AdminEventInput): Promise<Event> {
  return requestJson("/events", eventSchema, {
    auth: true,
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function listEventParticipants(eventId: string): Promise<EventParticipant[]> {
  return requestJson(`/events/${eventId}/participants`, z.array(eventParticipantSchema), { auth: true });
}

export function requestEventAttendance(eventId: string): Promise<EventParticipant> {
  return requestJson(`/events/${eventId}/attend`, eventParticipantSchema, {
    auth: true,
    method: "POST"
  });
}

export function inviteEventParticipant(
  eventId: string,
  input: { userId: string; role?: string }
): Promise<EventParticipant> {
  return requestJson(`/events/${eventId}/invite`, eventParticipantSchema, {
    auth: true,
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateEventParticipantStatus(
  eventId: string,
  userId: string,
  status: string
): Promise<EventParticipant> {
  return requestJson(`/events/${eventId}/participants/${userId}`, eventParticipantSchema, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

export function checkInEventParticipant(eventId: string, userId: string): Promise<EventParticipant> {
  return requestJson(`/events/${eventId}/participants/${userId}/check-in`, eventParticipantSchema, {
    auth: true,
    method: "POST"
  });
}
