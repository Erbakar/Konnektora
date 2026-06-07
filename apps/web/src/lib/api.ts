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
  if (!USE_MOCK_FALLBACK || options.method || options.auth) {
    return undefined;
  }

  const [rawPathname, queryString = ""] = path.split("?");
  const pathname = rawPathname ?? "";

  if (pathname === "/tags") {
    return schema.parse(mockTags);
  }

  if (pathname === "/events") {
    const params = new URLSearchParams(queryString);
    const selectedTag = params.get("tag");
    const events = selectedTag
      ? mockEvents.filter((eventItem) => eventItem.tags.some((tagItem) => tagItem.slug === selectedTag))
      : mockEvents;

    return schema.parse(events);
  }

  if (pathname.startsWith("/events/")) {
    const slug = decodeURIComponent(pathname.slice("/events/".length));
    const event = mockEvents.find((eventItem) => eventItem.slug === slug);

    return event ? schema.parse(event) : undefined;
  }

  return undefined;
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
  timezone: string;
  format: string;
  visibility?: string;
  city?: string;
  country?: string;
  language: string;
  externalRegistrationUrl?: string;
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
