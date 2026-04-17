import { Platform } from 'react-native';
import { storage } from '../utils/storage';
import type { Offer, OfferInput } from '../types/offer';
import type { AuthUser, EmployeeRole } from '../types/auth';
import type { DailyData, StaffMember } from '../types/belegung';
import type { AskAssistantResponse } from '../types/assistant';
import type { Guest } from '../types/guest';
import type { Employee } from '../types/employee';

const BASE_URL = Platform.select({
  android: 'http://10.0.2.2:8000/api',
  ios: 'http://localhost:8000/api',
  default: 'http://localhost:8000/api',
});

const TOKEN_KEY = 'bleiche_auth_token';

export function getToken(): string | null {
  return storage.get(TOKEN_KEY);
}
export function setToken(token: string | null): void {
  if (token) storage.set(TOKEN_KEY, token);
  else storage.remove(TOKEN_KEY);
}

function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  return fetch(`${BASE_URL}${path}`, { ...options, headers }).then(async (res) => {
    if (!res.ok) {
      let message = `${res.status} ${res.statusText}`;
      try {
        const body = await res.json();
        if (body?.detail) message = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
      } catch {
        /* ignore */
      }
      const err = new Error(message) as Error & { status: number };
      err.status = res.status;
      throw err;
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  });
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    username: string;
    role: EmployeeRole;
    employee_id: number | null;
    is_active: boolean;
    created_at: string;
  };
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  me: () => request<AuthUser>('/auth/me'),

  // Employees / guests
  getEmployees: () => request<any[]>('/employees/'),
  getGuests: () => request<any[]>('/guests/'),
  getGuest: (id: number) => request<Guest>(`/guests/${id}`),
  getEmployee: (id: number) => request<Employee>(`/employees/${id}`),

  // Offers
  listOffers: () => request<Offer[]>('/offers/'),
  createOffer: (payload: OfferInput) =>
    request<Offer>('/offers/', { method: 'POST', body: JSON.stringify(payload) }),
  updateOffer: (id: number, payload: Partial<OfferInput>) =>
    request<Offer>(`/offers/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteOffer: (id: number) =>
    request<void>(`/offers/${id}`, { method: 'DELETE' }),
  duplicateOffer: (id: number) =>
    request<Offer>(`/offers/${id}/duplicate`, { method: 'POST' }),
  exportOfferHtml: async (id: number, lang: 'de' | 'en' = 'de') => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}/offers/${id}/export/html?lang=${lang}`, { headers });
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }
    return res.text();
  },

  // Belegung
  listDays: () => request<Array<{ date: string; updated_at: string }>>('/belegung/days'),
  getDay: (date: string) => request<{ id: number; date: string; data: DailyData; updated_at: string }>(`/belegung/days/${date}`),
  upsertDay: (date: string, data: DailyData) =>
    request<{ id: number; date: string; data: DailyData }>(`/belegung/days/${date}`, {
      method: 'PUT',
      body: JSON.stringify({ date, data }),
    }),
  deleteDay: (date: string) => request<void>(`/belegung/days/${date}`, { method: 'DELETE' }),

  // Staff
  listStaff: () => request<StaffMember[]>('/belegung/staff'),
  addStaff: (name: string) =>
    request<StaffMember>('/belegung/staff', { method: 'POST', body: JSON.stringify({ name }) }),
  removeStaff: (id: number) => request<void>(`/belegung/staff/${id}`, { method: 'DELETE' }),

  // LLM
  askAssistant: (question: string, messages: Array<{ role: 'user' | 'assistant'; content: string }> = []) =>
    request<AskAssistantResponse>(
      '/llm/ask',
      { method: 'POST', body: JSON.stringify({ question, messages }) },
    ),
  llmCapabilities: () =>
    request<{ role: string; tools_available: string[] }>('/llm/capabilities'),

  // Health
  health: () => request<{ status: string }>('/health'),
};
