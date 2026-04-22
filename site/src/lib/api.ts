/**
 * Public API client for the marketing site.
 *
 * All endpoints hit `/api/public/*` — unauthenticated, rate-limited, read-only.
 * The site NEVER talks to the authenticated platform routes.
 *
 * PUBLIC_API_BASE_URL is injected by Vite at build time. `PUBLIC_` prefix is
 * Astro's convention for "safe to expose to the browser".
 */

const BASE = import.meta.env.PUBLIC_API_BASE_URL || "http://localhost:8000";

export interface PublicEvent {
  event_id: number;
  title: string;
  description: string | null;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  is_all_day: boolean;
  location: string | null;
  audience_scope: string;
  is_recurring: boolean;
  is_exception_override: boolean;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(`Public API ${path} → ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export function listPublicEvents(upcomingDays = 90): Promise<PublicEvent[]> {
  const q = new URLSearchParams({ upcoming_days: String(upcomingDays) });
  return request<PublicEvent[]>(`/api/public/events?${q.toString()}`);
}

export function publicHealth(): Promise<{ status: string }> {
  return request("/api/public/health");
}
