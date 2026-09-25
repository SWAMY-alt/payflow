import { z } from 'zod';

// ==========================================
// 1. Zod Schemas
// ==========================================

export const invoiceLineItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  unitPrice: z.number().int().nonnegative('Unit price must be non-negative in paise'), // stored in paise
});

export type InvoiceLineItem = z.infer<typeof invoiceLineItemSchema> & {
  amount?: number; // quantity * unitPrice
};

export const createInvoiceSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  lineItems: z.array(invoiceLineItemSchema).min(1, 'At least one line item is required'),
  dueDate: z.coerce.date(),
  notes: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurrence: z.object({
    frequency: z.enum(['weekly', 'monthly']),
    endCondition: z.enum(['never', 'afterCount', 'onDate']),
    endValue: z.union([z.number(), z.string(), z.coerce.date()]).optional(),
  }).optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const recordPaymentSchema = z.object({
  amount: z.number().int().positive('Amount must be positive in paise'), // in paise
  method: z.enum(['upi', 'bank_transfer', 'cash', 'card', 'other']),
  referenceNote: z.string().optional(),
  paidAt: z.coerce.date().default(() => new Date()),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const businessSetupSchema = z.object({
  name: z.string().min(2, 'Business name must be at least 2 characters'),
  logoUrl: z.string().url().optional().or(z.literal('')),
  gstNumber: z.string().optional().or(z.literal('')),
  upiId: z.string().min(3, 'Valid UPI ID is required (e.g., name@bank)'),
  bankDetails: z.string().min(5, 'Bank account & IFSC details are required'),
  defaultLateFeePercent: z.number().int().min(0).max(100).default(2),
  lateFeeGraceDays: z.number().int().min(0).max(90).default(3),
  notificationChannel: z.enum(['whatsapp', 'email', 'both']).default('both'),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
  address: z.string().optional(),
});

export type BusinessSetupInput = z.infer<typeof businessSetupSchema>;

export const clientSchema = z.object({
  name: z.string().min(2, 'Client name is required'),
  contactPhone: z.string().min(7, 'Valid contact phone is required'),
  contactEmail: z.string().email('Valid email is required'),
  notes: z.string().optional().or(z.literal('')),
});

export type ClientInput = z.infer<typeof clientSchema>;

export const authRegisterSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Full name is required'),
});

export const authLoginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

// ==========================================
// 2. Domain Models & Status Types
// ==========================================

export type InvoiceStatus = 'Pending' | 'Partially Paid' | 'Paid' | 'Overdue';
export type EscalationStatus = 'Normal' | 'Needs Attention';
export type RecurringStatus = 'active' | 'paused' | 'cancelled';
export type FollowUpStage = 'due' | '3day' | '7day';
export type PaymentMethod = 'upi' | 'bank_transfer' | 'cash' | 'card' | 'other';

export interface User {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
}

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  logoUrl?: string | null;
  gstNumber?: string | null;
  upiId: string;
  bankDetails: string;
  defaultLateFeePercent: number;
  lateFeeGraceDays: number;
  notificationChannel: 'whatsapp' | 'email' | 'both';
  contactPhone?: string | null;
  contactEmail?: string | null;
  address?: string | null;
  createdAt: string;
}

export interface Client {
  id: string;
  businessId: string;
  name: string;
  contactPhone: string;
  contactEmail: string;
  notes?: string | null;
  createdAt: string;
}

export interface Invoice {
  id: string;
  businessId: string;
  clientId: string;
  templateId?: string | null;
  invoiceNumber: string;
  lineItems: InvoiceLineItem[];
  subtotal: number; // in paise
  lateFeePercent: number;
  lateFeeAmount: number; // in paise
  totalAmount: number; // in paise (subtotal + lateFeeAmount)
  amountPaid: number; // in paise
  dueDate: string;
  status: InvoiceStatus;
  escalationStatus: EscalationStatus;
  notes?: string | null;
  lastSentAt?: string | null;
  createdAt: string;
  // joined fields
  client?: Client;
}

export interface Payment {
  id: string;
  businessId: string;
  invoiceId: string;
  amount: number; // in paise
  method: PaymentMethod;
  referenceNote?: string | null;
  paidAt: string;
  recordedBy: string;
  createdAt: string;
}

export interface InvoiceTemplate {
  id: string;
  businessId: string;
  clientId: string;
  lineItems: InvoiceLineItem[];
  frequency: 'weekly' | 'monthly';
  nextRunDate: string;
  endCondition: 'never' | 'afterCount' | 'onDate';
  endValue?: string | null;
  generatedCount: number;
  status: RecurringStatus;
  createdAt: string;
  client?: Client;
}

export interface FollowUpLog {
  id: string;
  businessId: string;
  invoiceId: string;
  stage: FollowUpStage;
  channel: 'whatsapp' | 'email' | 'both';
  messageBody: string;
  recipient: string;
  sentAt: string;
  status: 'sent' | 'flagged_needs_attention';
  invoiceNumber?: string;
  clientName?: string;
}

export interface DashboardSummary {
  totalOutstanding: number; // paise
  collectedThisMonth: number; // paise
  overdueCount: number;
  lateFeesRecovered: number; // paise
  totalInvoicesCount: number;
  paidCount: number;
  partialCount: number;
  pendingCount: number;
  needsAttentionCount: number;
  recentInvoices: Invoice[];
  recentPayments: (Payment & { invoiceNumber: string; clientName: string })[];
}

// ==========================================
// 3. Currency / Monetary Precision Helpers
// ==========================================

/**
 * Format paise to standard INR currency string (e.g. 150000 -> "₹1,500.00")
 */
export function formatPaise(paise: number, includeSymbol = true): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = (absPaise / 100).toFixed(2);
  const parts = rupees.split('.');
  // Indian numbering format: e.g. 1,00,000.00
  let intPart = parts[0];
  const decPart = parts[1];
  
  if (intPart.length > 3) {
    const lastThree = intPart.substring(intPart.length - 3);
    const otherNumbers = intPart.substring(0, intPart.length - 3);
    intPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }
  
  const formatted = `${intPart}.${decPart}`;
  const prefix = isNegative ? '-' : '';
  return includeSymbol ? `${prefix}₹${formatted}` : `${prefix}${formatted}`;
}

/**
 * Convert rupee string/number to integer paise (e.g. "150.50" -> 15050)
 */
export function rupeeToPaise(rupees: number | string): number {
  if (typeof rupees === 'string') {
    const cleaned = rupees.replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    if (isNaN(num)) return 0;
    return Math.round(num * 100);
  }
  return Math.round(rupees * 100);
}

/**
 * Convert paise to numeric rupees (e.g. 15050 -> 150.5)
 */
export function paiseToRupee(paise: number): number {
  return paise / 100;
}
