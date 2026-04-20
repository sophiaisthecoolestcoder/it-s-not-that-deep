import { Platform } from 'react-native';

import type { AskAssistantResponse } from '../types/assistant';
import type { AuthUser, EmployeeRole } from '../types/auth';
import type { DailyData, StaffMember } from '../types/belegung';
import type { Employee } from '../types/employee';
import type { Guest } from '../types/guest';
import type { Offer, OfferInput } from '../types/offer';
import { storage } from '../utils/storage';

// Injected by webpack DefinePlugin. Fallback to platform defaults for RN dev.
declare const process: { env: { REACT_APP_API_URL?: string } };

const envUrl = typeof process !== 'undefined' ? process?.env?.REACT_APP_API_URL : undefined;

const BASE_URL =
  envUrl ||
  Platform.select({
    android: 'http://10.0.2.2:8000/api',
    ios: 'http://localhost:8000/api',
    default: 'http://localhost:8000/api',
  }) ||
  'http://localhost:8000/api';

const TOKEN_KEY = 'bleiche_auth_token';

export function getToken(): string | null {
  return storage.get(TOKEN_KEY);
}
export function setToken(token: string | null): void {
  if (token) storage.set(TOKEN_KEY, token);
  else storage.remove(TOKEN_KEY);
}

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;
export function onUnauthorized(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

export interface RequestOptions extends RequestInit {
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    if (res.status === 401 && unauthorizedHandler) {
      unauthorizedHandler();
    }
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.detail) {
        message = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
      }
    } catch {
      /* non-JSON response body */
    }
    const err = new Error(message) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    username: string;
    role: EmployeeRole;
    employee_id: number | null;
    is_active: boolean;
    must_change_password: boolean;
    created_at: string;
  };
}

export interface ConversationSummary {
  id: number;
  title: string;
  last_active_at: string;
  created_at: string;
}

export interface ConversationMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  refs?: Array<{ object_type: string; object_id: string; title: string; subtitle?: string; actions?: string[] }>;
  created_at: string;
}

export interface ConversationDetail extends ConversationSummary {
  messages: ConversationMessage[];
}

export interface UsageSummary {
  period_days: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_cost_cents: number;
  requests: number;
}

// ── API object ───────────────────────────────────────────────────────────────

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  me: () => request<AuthUser>('/auth/me'),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }),

  // Employees / guests
  getEmployees: () => request<Employee[]>('/employees/'),
  getGuests: () => request<Guest[]>('/guests/'),
  getGuest: (id: number) => request<Guest>(`/guests/${id}`),
  getEmployee: (id: number) => request<Employee>(`/employees/${id}`),

  // Offers
  listOffers: () => request<Offer[]>('/offers/'),
  getOffer: (id: number) => request<Offer>(`/offers/${id}`),
  createOffer: (payload: OfferInput) =>
    request<Offer>('/offers/', { method: 'POST', body: JSON.stringify(payload) }),
  updateOffer: (id: number, payload: Partial<OfferInput>) =>
    request<Offer>(`/offers/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteOffer: (id: number) => request<void>(`/offers/${id}`, { method: 'DELETE' }),
  duplicateOffer: (id: number) =>
    request<Offer>(`/offers/${id}/duplicate`, { method: 'POST' }),
  exportOfferHtml: async (id: number, lang: 'de' | 'en' = 'de') => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/offers/${id}/export/html?lang=${lang}`, { headers });
    if (!res.ok) {
      if (res.status === 401 && unauthorizedHandler) unauthorizedHandler();
      throw new Error(`${res.status} ${res.statusText}`);
    }
    return res.text();
  },

  // Belegung
  listDays: () => request<Array<{ date: string; updated_at: string }>>('/belegung/days'),
  getDay: (date: string) =>
    request<{ id: number; date: string; data: DailyData; updated_at: string }>(`/belegung/days/${date}`),
  upsertDay: (date: string, data: DailyData) =>
    request<{ id: number; date: string; data: DailyData }>(`/belegung/days/${date}`, {
      method: 'PUT',
      body: JSON.stringify({ date, data }),
    }),
  deleteDay: (date: string) => request<void>(`/belegung/days/${date}`, { method: 'DELETE' }),

  // Staff
  listStaff: () => request<StaffMember[]>('/belegung/staff'),
  addStaff: (name: string) =>
    request<StaffMember>('/belegung/staff', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  removeStaff: (id: number) => request<void>(`/belegung/staff/${id}`, { method: 'DELETE' }),

  // Assistant / conversations
  askAssistant: (question: string, conversationId?: number, signal?: AbortSignal) =>
    request<AskAssistantResponse>('/llm/ask', {
      method: 'POST',
      body: JSON.stringify({
        question,
        ...(conversationId ? { conversation_id: conversationId } : {}),
      }),
      signal,
    }),
  llmCapabilities: () =>
    request<{ role: string; tools_available: string[] }>('/llm/capabilities'),
  listConversations: () => request<ConversationSummary[]>('/conversations/'),
  getConversation: (id: number) => request<ConversationDetail>(`/conversations/${id}`),
  deleteConversation: (id: number) =>
    request<void>(`/conversations/${id}`, { method: 'DELETE' }),
  myUsage: (days = 30) => request<UsageSummary>(`/conversations/usage/me?days=${days}`),

  // Health
  health: () => request<{ status: string }>('/health'),
};
