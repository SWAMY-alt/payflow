import { pgTable, text, integer, timestamp, uuid, jsonb, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { InvoiceLineItem } from '../../shared/types';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const businesses = pgTable('businesses', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  logoUrl: text('logo_url'),
  gstNumber: text('gst_number'),
  upiId: text('upi_id').notNull(),
  bankDetails: text('bank_details').notNull(),
  paymentMethod: text('payment_method').default('both'),
  accountVerified: boolean('account_verified').default(false),
  paymentToken: text('payment_token'),
  maskedAccount: text('masked_account'),
  defaultLateFeePercent: integer('default_late_fee_percent').default(2).notNull(),
  lateFeeGraceDays: integer('late_fee_grace_days').default(3).notNull(),
  notificationChannel: text('notification_channel').default('both').notNull(),
  contactPhone: text('contact_phone'),
  contactEmail: text('contact_email'),
  address: text('address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const clients = pgTable('clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id),
  name: text('name').notNull(),
  contactPhone: text('contact_phone').notNull(),
  contactEmail: text('contact_email').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const invoiceTemplates = pgTable('invoice_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id),
  clientId: uuid('client_id').notNull().references(() => clients.id),
  lineItems: jsonb('line_items').$type<InvoiceLineItem[]>().notNull(),
  frequency: text('frequency').notNull(), // 'weekly' | 'monthly'
  nextRunDate: timestamp('next_run_date').notNull(),
  endCondition: text('end_condition').notNull(), // 'never' | 'afterCount' | 'onDate'
  endValue: text('end_value'),
  generatedCount: integer('generated_count').default(0).notNull(),
  status: text('status').default('active').notNull(), // 'active' | 'paused' | 'cancelled'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id),
  clientId: uuid('client_id').notNull().references(() => clients.id),
  templateId: uuid('template_id').references(() => invoiceTemplates.id),
  invoiceNumber: text('invoice_number').notNull(),
  lineItems: jsonb('line_items').$type<InvoiceLineItem[]>().notNull(),
  subtotal: integer('subtotal').notNull(), // in paise
  lateFeePercent: integer('late_fee_percent').default(0).notNull(),
  lateFeeAmount: integer('late_fee_amount').default(0).notNull(), // in paise
  totalAmount: integer('total_amount').notNull(), // in paise
  amountPaid: integer('amount_paid').default(0).notNull(), // in paise
  dueDate: timestamp('due_date').notNull(),
  status: text('status').default('Pending').notNull(), // 'Pending' | 'Partially Paid' | 'Paid' | 'Overdue'
  escalationStatus: text('escalation_status').default('Normal').notNull(), // 'Normal' | 'Needs Attention'
  notes: text('notes'),
  lastSentAt: timestamp('last_sent_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id),
  amount: integer('amount').notNull(), // in paise (insert-only)
  method: text('method').notNull(), // 'upi' | 'bank_transfer' | 'cash' | 'card' | 'other'
  referenceNote: text('reference_note'),
  paidAt: timestamp('paid_at').defaultNow().notNull(),
  recordedBy: text('recorded_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const followUpLogs = pgTable('follow_up_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id),
  stage: text('stage').notNull(), // 'due' | '3day' | '7day'
  channel: text('channel').notNull(), // 'whatsapp' | 'email' | 'both'
  messageBody: text('message_body').notNull(),
  recipient: text('recipient').notNull(),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  status: text('status').default('sent').notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  business: one(businesses, {
    fields: [users.id],
    references: [businesses.ownerId],
  }),
}));

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  owner: one(users, {
    fields: [businesses.ownerId],
    references: [users.id],
  }),
  clients: many(clients),
  invoices: many(invoices),
  templates: many(invoiceTemplates),
  payments: many(payments),
  followUpLogs: many(followUpLogs),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  business: one(businesses, {
    fields: [clients.businessId],
    references: [businesses.id],
  }),
  invoices: many(invoices),
  templates: many(invoiceTemplates),
}));

export const invoiceTemplatesRelations = relations(invoiceTemplates, ({ one, many }) => ({
  business: one(businesses, {
    fields: [invoiceTemplates.businessId],
    references: [businesses.id],
  }),
  client: one(clients, {
    fields: [invoiceTemplates.clientId],
    references: [clients.id],
  }),
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  business: one(businesses, {
    fields: [invoices.businessId],
    references: [businesses.id],
  }),
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  template: one(invoiceTemplates, {
    fields: [invoices.templateId],
    references: [invoiceTemplates.id],
  }),
  payments: many(payments),
  followUpLogs: many(followUpLogs),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  business: one(businesses, {
    fields: [payments.businessId],
    references: [businesses.id],
  }),
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
}));

export const followUpLogsRelations = relations(followUpLogs, ({ one }) => ({
  business: one(businesses, {
    fields: [followUpLogs.businessId],
    references: [businesses.id],
  }),
  invoice: one(invoices, {
    fields: [followUpLogs.invoiceId],
    references: [invoices.id],
  }),
}));
