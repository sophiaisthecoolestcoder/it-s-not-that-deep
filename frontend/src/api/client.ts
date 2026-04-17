import { Platform } from 'react-native';

const BASE_URL = Platform.select({
  android: 'http://10.0.2.2:8000/api',
  ios: 'http://localhost:8000/api',
  default: 'http://localhost:8000/api',
});

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Employees
  getEmployees: () => request<any[]>('/employees/'),
  getEmployee: (id: number) => request<any>(`/employees/${id}`),
  createEmployee: (data: any) =>
    request<any>('/employees/', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id: number, data: any) =>
    request<any>(`/employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteEmployee: (id: number) =>
    request<void>(`/employees/${id}`, { method: 'DELETE' }),

  // Guests
  getGuests: () => request<any[]>('/guests/'),
  getGuest: (id: number) => request<any>(`/guests/${id}`),
  createGuest: (data: any) =>
    request<any>('/guests/', { method: 'POST', body: JSON.stringify(data) }),
  updateGuest: (id: number, data: any) =>
    request<any>(`/guests/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteGuest: (id: number) =>
    request<void>(`/guests/${id}`, { method: 'DELETE' }),

  // Health
  health: () => request<{ status: string }>('/health'),
};
