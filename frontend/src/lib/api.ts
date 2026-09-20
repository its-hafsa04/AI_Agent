export type User = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  timezone: string;
};

export type ChatMessage = { role: 'user' | 'assistant'; content: string };
export type ChatSession = { id: string; title: string | null; history: ChatMessage[]; status: 'ACTIVE' | 'ARCHIVED' };
export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type Appointment = {
  id: string;
  title: string;
  notes: string | null;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
};

type AuthResponse = { user: User; token: string };

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const apiUrl = import.meta.env.VITE_API_URL ?? 'https://ai-agent-umber-six.vercel.app';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('appointment_token');
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new ApiError(body.error ?? 'Something went wrong. Please try again.', response.status);
  }
  return body as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  signup: (name: string, email: string, password: string) =>
    request<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
  me: () => request<{ user: User }>('/api/auth/me'),
  createChatSession: () => request<{ session: ChatSession }>('/api/chat/sessions', { method: 'POST', body: JSON.stringify({}) }),
  getChatSession: (id: string) => request<{ session: ChatSession }>(`/api/chat/sessions/${id}`),
  listAppointments: () => request<{ appointments: Appointment[] }>('/api/appointments'),
  getAppointment: (id: string) => request<{ appointment: Appointment }>(`/api/appointments/${id}`),
  createAppointment: (input: { title: string; notes?: string; startsAt: string; endsAt: string }) =>
    request<{ appointment: Appointment }>('/api/appointments', { method: 'POST', body: JSON.stringify(input) }),
  updateAppointment: (id: string, input: { status: AppointmentStatus }) =>
    request<{ appointment: Appointment }>(`/api/appointments/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
};