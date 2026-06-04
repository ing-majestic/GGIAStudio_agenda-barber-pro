/**
 * API client — thin fetch wrapper that calls the Express backend.
 * All paths are relative to the same origin (e.g., /api/…).
 * In dev, Vite proxies /api → http://localhost:3001.
 * In prod, Express serves both the static build and /api from the same port.
 *
 * Security: no secrets are sent from the browser; all mutations go to the
 * same-origin backend which is the only party with DB access.
 */

import type { Appointment, Client, Service, BlockedTime, BusinessSettings } from '../types';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err  = new Error(String((body as Record<string, unknown>).error ?? res.statusText)) as Error & { status: number; code?: string; collisions?: unknown[] };
    err.status     = res.status;
    err.code       = String((body as Record<string, unknown>).code ?? '');
    err.collisions = (body as Record<string, unknown>).collisions as unknown[] | undefined;
    throw err;
  }
  return res.json() as Promise<T>;
}

// ── Services ──────────────────────────────────────────────────────────────

export const apiGetServices    = ()                => request<Service[]>('/services');
export const apiCreateService  = (s: Omit<Service, 'id'>) => request<Service>('/services', { method: 'POST', body: JSON.stringify(s) });
export const apiUpdateService  = (s: Service)      => request<Service>(`/services/${s.id}`, { method: 'PUT', body: JSON.stringify(s) });
export const apiDeleteService  = (id: string)      => request<{ success: true }>(`/services/${id}`, { method: 'DELETE' });

// ── Clients ───────────────────────────────────────────────────────────────

export const apiGetClients     = ()                => request<Client[]>('/clients');
export const apiCreateClient   = (c: Omit<Client, 'id'>) => request<Client>('/clients', { method: 'POST', body: JSON.stringify(c) });
export const apiUpdateClient   = (c: Client)       => request<Client>(`/clients/${c.id}`, { method: 'PUT', body: JSON.stringify(c) });
export const apiDeleteClient   = (id: string)      => request<{ success: true }>(`/clients/${id}`, { method: 'DELETE' });

// ── Appointments ──────────────────────────────────────────────────────────

export interface CreateAppointmentPayload {
  clientName:    string;
  clientPhone:   string;
  serviceId:     string;
  date:          string;
  startTime:     string;
  notes?:        string;
  isOverbooked?: boolean;
}

export const apiGetAppointments   = (params?: { date?: string; status?: string }) => {
  const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
  return request<Appointment[]>(`/appointments${qs}`);
};
export const apiCreateAppointment = (payload: CreateAppointmentPayload) =>
  request<Appointment>('/appointments', { method: 'POST', body: JSON.stringify(payload) });
export const apiUpdateAppointment = (appt: Partial<Appointment> & { id: string }) =>
  request<Appointment>(`/appointments/${appt.id}`, { method: 'PUT', body: JSON.stringify(appt) });
export const apiDeleteAppointment = (id: string) =>
  request<{ success: true }>(`/appointments/${id}`, { method: 'DELETE' });

// ── Blocked Times ─────────────────────────────────────────────────────────

export interface CreateBlockedTimePayload {
  label:     string;
  date:      string;
  startTime: string;
  endTime:   string;
}

export const apiGetBlockedTimes   = (params?: { date?: string }) => {
  const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
  return request<BlockedTime[]>(`/blocked-times${qs}`);
};
export const apiCreateBlockedTime = (payload: CreateBlockedTimePayload) =>
  request<BlockedTime>('/blocked-times', { method: 'POST', body: JSON.stringify(payload) });
export const apiDeleteBlockedTime = (id: string) =>
  request<{ success: true }>(`/blocked-times/${id}`, { method: 'DELETE' });

// ── Settings ──────────────────────────────────────────────────────────────

export const apiGetSettings    = ()                        => request<BusinessSettings>('/settings');
export const apiUpdateSettings = (s: BusinessSettings)    => request<BusinessSettings>('/settings', { method: 'PUT', body: JSON.stringify(s) });
