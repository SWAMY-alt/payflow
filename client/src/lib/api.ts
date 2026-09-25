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
} from '../shared/types';

const DEFAULT_PROD_BACKEND = 'https://payflow-gamma-green.vercel.app';
const API_HOST = (
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app') ? DEFAULT_PROD_BACKEND : '')
).replace(/\/$/, '');
const BASE_URL = `${API_HOST}/api`;

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const storedUserId = typeof window !== 'undefined' ? localStorage.getItem('payflow_user_id') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (storedUserId && !headers['x-user-id']) {
    headers['x-user-id'] = storedUserId;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
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
    register: async (data: { email: string; password: string; fullName: string }) => {
      const res = await request<{ user: User; hasBusiness: boolean }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (res.user?.id && typeof window !== 'undefined') {
        localStorage.setItem('payflow_user_id', res.user.id);
      }
      return res;
    },
    login: async (data: { email: string; password: string }) => {
      const res = await request<{ user: User; business: Business | null; hasBusiness: boolean }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (res.user?.id && typeof window !== 'undefined') {
        localStorage.setItem('payflow_user_id', res.user.id);
      }
      return res;
    },
    logout: async () => {
      try {
        await request<{ success: boolean }>('/auth/logout', { method: 'POST' });
      } finally {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('payflow_user_id');
        }
      }
      return { success: true };
    },
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
    connectBank: () =>
      request<{
        success: boolean;
        order_id: string;
        provider: string;
        compliance: string;
        mode: string;
        key_id: string;
        callback_url: string;
      }>('/business/bank/connect', { method: 'POST' }),
    verifyBank: (payload: { bankName?: string; last4?: string; ifsc?: string }) =>
      request<{
        success: boolean;
        payment_token: string;
        masked_account: string;
        account_verified: boolean;
        verified_at: string;
        provider: string;
      }>('/business/bank/verify', {
        method: 'POST',
        body: JSON.stringify(payload),
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
    seed: async () => {
      const res = await request<{ success: boolean; message: string; user: User; business: Business }>('/demo/seed', {
        method: 'POST',
      });
      if (res.user?.id && typeof window !== 'undefined') {
        localStorage.setItem('payflow_user_id', res.user.id);
      }
      return res;
    },
  },
};
