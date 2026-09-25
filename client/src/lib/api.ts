import type {
  Business,
  BusinessSetupInput,
  Client,
  ClientInput,
  CreateInvoiceInput,
  DashboardSummary,
  FollowUpLog,
  Invoice,
  InvoiceTemplate,
  Payment,
  RecordPaymentInput,
  User,
} from '../../../shared/types';

const BASE_URL = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!res.ok) {
    let errorMsg = 'An unexpected error occurred';
    try {
      const errorData = await res.json();
      errorMsg = errorData.error || errorData.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  // Handle empty or 204 responses
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  return {} as T;
}

export const api = {
  // Auth
  auth: {
    register: (data: { email: string; password: string; fullName: string }) =>
      request<{ user: User; hasBusiness: boolean }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (data: { email: string; password: string }) =>
      request<{ user: User; business: Business | null; hasBusiness: boolean }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
    me: () => request<{ user: User; business: Business | null; hasBusiness: boolean }>('/auth/me'),
  },

  // Business
  business: {
    get: () => request<Business>('/business'),
    setup: (data: BusinessSetupInput) =>
      request<Business>('/business/setup', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateSettings: (data: BusinessSetupInput) =>
      request<Business>('/business/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // Clients
  clients: {
    list: (search?: string) =>
      request<(Client & { invoiceCount: number; totalOutstanding: number })[]>(
        `/clients${search ? `?search=${encodeURIComponent(search)}` : ''}`
      ),
    get: (id: string) => request<Client & { invoices: Invoice[] }>(`/clients/${id}`),
    create: (data: ClientInput) =>
      request<Client>('/clients', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: ClientInput) =>
      request<Client>(`/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/clients/${id}`, {
        method: 'DELETE',
      }),
  },

  // Invoices
  invoices: {
    list: (params?: { status?: string; clientId?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.status && params.status !== 'All') q.append('status', params.status);
      if (params?.clientId) q.append('clientId', params.clientId);
      if (params?.search) q.append('search', params.search);
      const queryStr = q.toString();
      return request<Invoice[]>(`/invoices${queryStr ? `?${queryStr}` : ''}`);
    },
    get: (id: string) =>
      request<Invoice & { payments: Payment[]; followUps: FollowUpLog[] }>(`/invoices/${id}`),
    create: (data: CreateInvoiceInput) =>
      request<Invoice>('/invoices', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    recordPayment: (id: string, data: RecordPaymentInput) =>
      request<{ payment: Payment; invoice: Invoice }>(`/invoices/${id}/payments`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    reversePayment: (id: string, data: { amount: number; reason: string }) =>
      request<{ payment: Payment; invoice: Invoice }>(`/invoices/${id}/payments/reversal`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    send: (id: string) =>
      request<{ success: boolean; whatsAppUrl: string; message: string; emailDetails: any }>(
        `/invoices/${id}/send`,
        { method: 'POST' }
      ),
    getPdfUrl: (id: string) => `${BASE_URL}/invoices/${id}/pdf`,
    getPreviewPdfUrl: (id: string) => `${BASE_URL}/invoices/${id}/preview-pdf`,
  },

  // Recurring
  recurring: {
    list: () => request<InvoiceTemplate[]>('/recurring'),
    create: (data: any) =>
      request<InvoiceTemplate>('/recurring', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateStatus: (id: string, status: 'active' | 'paused' | 'cancelled') =>
      request<InvoiceTemplate>(`/recurring/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  },

  // Dashboard
  dashboard: {
    summary: () => request<DashboardSummary>('/dashboard/summary'),
  },

  // Automation / Cron Jobs
  jobs: {
    runAll: () => request<{ success: boolean; results: any[] }>('/jobs/run-all', { method: 'POST' }),
    runLateFee: () => request<{ success: boolean; result: any }>('/jobs/run-late-fee', { method: 'POST' }),
    runFollowUp: () => request<{ success: boolean; result: any }>('/jobs/run-follow-up', { method: 'POST' }),
    runRecurring: () => request<{ success: boolean; result: any }>('/jobs/run-recurring', { method: 'POST' }),
    getLogs: () => request<FollowUpLog[]>('/jobs/logs'),
  },

  // Demo Seeding
  demo: {
    seed: () =>
      request<{ success: boolean; message: string; user: User; business: Business }>('/demo/seed', {
        method: 'POST',
      }),
  },
};
