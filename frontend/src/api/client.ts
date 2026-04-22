import { Platform } from 'react-native';

import type { AskAssistantResponse } from '../types/assistant';
import type { AuthUser, EmployeeRole } from '../types/auth';
import type { DailyData, StaffMember } from '../types/belegung';
import type {
  Invoice,
  InvoiceCreateInput,
  InvoiceFilters,
  InvoiceSummary,
  InvoiceUpdateInput,
  PaymentMethod,
  Product,
  ProductInput,
  SalesTotals,
} from '../types/cashier';
import type { Employee, EmployeeFilters, EmployeeInput } from '../types/employee';
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
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 20_000;

function mergeSignals(external?: AbortSignal, timeoutMs: number = DEFAULT_TIMEOUT_MS): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), timeoutMs);
  if (!external) {
    return { signal: timeoutController.signal, cleanup: () => clearTimeout(timer) };
  }
  if (external.aborted) {
    timeoutController.abort();
    return { signal: timeoutController.signal, cleanup: () => clearTimeout(timer) };
  }
  const onAbort = () => timeoutController.abort();
  external.addEventListener('abort', onAbort);
  return {
    signal: timeoutController.signal,
    cleanup: () => {
      clearTimeout(timer);
      external.removeEventListener('abort', onAbort);
    },
  };
}

function formatDetail(detail: unknown): string | null {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    // FastAPI validation errors: [{loc, msg, type}, ...]
    const msgs = detail
      .map((d) => (d && typeof d === 'object' && 'msg' in (d as Record<string, unknown>) ? String((d as Record<string, unknown>).msg) : null))
      .filter((m): m is string => !!m);
    if (msgs.length) return msgs.join('; ');
  }
  if (detail && typeof detail === 'object') {
    const msg = (detail as Record<string, unknown>).msg;
    if (typeof msg === 'string') return msg;
  }
  return null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const { signal, cleanup } = mergeSignals(options.signal, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers, signal });
  } catch (err) {
    cleanup();
    if ((err as Error)?.name === 'AbortError') {
      // If caller's own signal fired, surface as AbortError unchanged.
      if (options.signal?.aborted) throw err;
      const timeoutErr = new Error(`Request timed out after ${options.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`) as Error & { status: number };
      timeoutErr.status = 0;
      throw timeoutErr;
    }
    throw err;
  }
  cleanup();

  if (!res.ok) {
    if (res.status === 401 && unauthorizedHandler) {
      unauthorizedHandler();
    }
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      const formatted = formatDetail(body?.detail);
      if (formatted) message = formatted;
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
  expires_in: number;
  user: {
    id: number;
    username: string;
    role: EmployeeRole;
    employee_id: number | null;
    is_active: boolean;
    must_change_password: boolean;
    created_at: string;
    updated_at?: string | null;
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
    request<LoginResponse>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }),

  // Employees / guests
  getEmployees: () => request<Employee[]>('/employees/'),
  listEmployees: (filters?: EmployeeFilters) => {
    const q = new URLSearchParams();
    if (filters?.department) q.set('department', filters.department);
    if (filters?.role) q.set('role', filters.role);
    if (filters?.active !== undefined) q.set('active', String(filters.active));
    if (filters?.search) q.set('search', filters.search);
    const qs = q.toString();
    return request<Employee[]>(`/employees/${qs ? `?${qs}` : ''}`);
  },
  getEmployee: (id: number) => request<Employee>(`/employees/${id}`),
  createEmployee: (payload: EmployeeInput) =>
    request<Employee>('/employees/', { method: 'POST', body: JSON.stringify(payload) }),
  updateEmployee: (id: number, payload: Partial<EmployeeInput>) =>
    request<Employee>(`/employees/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteEmployee: (id: number) => request<void>(`/employees/${id}`, { method: 'DELETE' }),
  getGuests: () => request<Guest[]>('/guests/'),
  getGuest: (id: number) => request<Guest>(`/guests/${id}`),

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

  // Cashier / POS
  listProducts: (params?: { venue?: string; active?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.venue) q.set('venue', params.venue);
    if (params?.active !== undefined) q.set('active', String(params.active));
    const qs = q.toString();
    return request<Product[]>(`/cashier/products${qs ? `?${qs}` : ''}`);
  },
  createProduct: (payload: ProductInput) =>
    request<Product>('/cashier/products', { method: 'POST', body: JSON.stringify(payload) }),
  updateProduct: (id: number, payload: Partial<ProductInput>) =>
    request<Product>(`/cashier/products/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteProduct: (id: number) =>
    request<void>(`/cashier/products/${id}`, { method: 'DELETE' }),

  listInvoices: (filters?: InvoiceFilters) => {
    const q = new URLSearchParams();
    if (filters?.status) q.set('status', filters.status);
    if (filters?.venue) q.set('venue', filters.venue);
    if (filters?.from) q.set('from', filters.from);
    if (filters?.to) q.set('to', filters.to);
    if (filters?.skip !== undefined) q.set('skip', String(filters.skip));
    if (filters?.limit !== undefined) q.set('limit', String(filters.limit));
    const qs = q.toString();
    return request<InvoiceSummary[]>(`/cashier/invoices${qs ? `?${qs}` : ''}`);
  },
  getInvoice: (id: number) => request<Invoice>(`/cashier/invoices/${id}`),
  createInvoice: (payload: InvoiceCreateInput) =>
    request<Invoice>('/cashier/invoices', { method: 'POST', body: JSON.stringify(payload) }),
  updateInvoice: (id: number, payload: InvoiceUpdateInput) =>
    request<Invoice>(`/cashier/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  finalizeInvoice: (id: number, payment_method: PaymentMethod) =>
    request<Invoice>(`/cashier/invoices/${id}/finalize`, {
      method: 'POST',
      body: JSON.stringify({ payment_method }),
    }),
  deleteInvoice: (id: number) =>
    request<void>(`/cashier/invoices/${id}`, { method: 'DELETE' }),
  salesSummary: (from: string, to: string) => {
    const q = new URLSearchParams({ from, to });
    return request<SalesTotals>(`/cashier/summary?${q.toString()}`);
  },

  // Health
  health: () => request<{ status: string }>('/health'),
};
