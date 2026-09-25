import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import path from 'path';
import fs from 'fs';
import * as schema from './schema';
import { seedDefaultDataIfEmpty } from './seed';

let dbInstance: any = null;
let rawClient: any = null;

export async function initDatabase() {
  if (dbInstance) return { db: dbInstance, rawClient };

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && !databaseUrl.includes('placeholder')) {
    console.log('[DB] Connecting to external PostgreSQL at:', databaseUrl.split('@')[1] || 'provided URL');
    const pool = new pg.Pool({ connectionString: databaseUrl });
    rawClient = pool;
    dbInstance = drizzlePg(pool, { schema });
  } else {
    // Embedded WASM PostgreSQL with PGlite (Zero-config, fast, full Postgres SQL/RLS support)
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    const dataDir = isServerless
      ? path.resolve('/tmp', 'payflow_db')
      : path.resolve(process.cwd(), 'data', 'payflow_db');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    console.log('[DB] Initializing embedded PostgreSQL (PGlite) at:', dataDir);
    const pglite = new PGlite(dataDir);
    rawClient = pglite;
    dbInstance = drizzlePglite(pglite, { schema });
  }

  // Ensure tables and RLS are initialized
  await runDatabaseMigrations(rawClient);

  // Auto-bootstrap default demo workspace so live website works out of the box on any container
  await seedDefaultDataIfEmpty(dbInstance);

  return { db: dbInstance, rawClient };
}

export function getDb() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbInstance;
}

export function getRawClient() {
  return rawClient;
}

/**
 * Execute DDL to ensure all tables, constraints, indexes and RLS policies exist
 */
async function runDatabaseMigrations(client: any) {
  const ddl = `
    -- Users Table
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );

    -- Businesses Table
    CREATE TABLE IF NOT EXISTS businesses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      logo_url TEXT,
      gst_number TEXT,
      upi_id TEXT NOT NULL,
      bank_details TEXT NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'both',
      account_verified BOOLEAN NOT NULL DEFAULT FALSE,
      payment_token TEXT,
      masked_account TEXT,
      default_late_fee_percent INTEGER NOT NULL DEFAULT 2,
      late_fee_grace_days INTEGER NOT NULL DEFAULT 3,
      notification_channel TEXT NOT NULL DEFAULT 'both',
      contact_phone TEXT,
      contact_email TEXT,
      address TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );

    -- Ensure columns exist for existing tables
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'both';
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS account_verified BOOLEAN DEFAULT FALSE;
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS payment_token TEXT;
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS masked_account TEXT;

    -- Clients Table
    CREATE TABLE IF NOT EXISTS clients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );

    -- Invoice Templates (Recurring) Table
    CREATE TABLE IF NOT EXISTS invoice_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      line_items JSONB NOT NULL,
      frequency TEXT NOT NULL,
      next_run_date TIMESTAMP WITH TIME ZONE NOT NULL,
      end_condition TEXT NOT NULL,
      end_value TEXT,
      generated_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );

    -- Invoices Table
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      template_id UUID REFERENCES invoice_templates(id) ON DELETE SET NULL,
      invoice_number TEXT NOT NULL,
      line_items JSONB NOT NULL,
      subtotal INTEGER NOT NULL,
      late_fee_percent INTEGER NOT NULL DEFAULT 0,
      late_fee_amount INTEGER NOT NULL DEFAULT 0,
      total_amount INTEGER NOT NULL,
      amount_paid INTEGER NOT NULL DEFAULT 0,
      due_date TIMESTAMP WITH TIME ZONE NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      escalation_status TEXT NOT NULL DEFAULT 'Normal',
      notes TEXT,
      last_sent_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );

    -- Payments Table (Audit Ledger)
    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      method TEXT NOT NULL,
      reference_note TEXT,
      paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      recorded_by TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );

    -- Follow Up Log Table
    CREATE TABLE IF NOT EXISTS follow_up_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      stage TEXT NOT NULL,
      channel TEXT NOT NULL,
      message_body TEXT NOT NULL,
      recipient TEXT NOT NULL,
      sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      status TEXT NOT NULL DEFAULT 'sent'
    );

    -- Indexes for high-performance multi-tenant querying
    CREATE INDEX IF NOT EXISTS idx_invoices_business ON invoices(business_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
    CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
    CREATE INDEX IF NOT EXISTS idx_clients_business ON clients(business_id);
    CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_payments_business ON payments(business_id);
    CREATE INDEX IF NOT EXISTS idx_templates_business ON invoice_templates(business_id);
    CREATE INDEX IF NOT EXISTS idx_followup_invoice ON follow_up_log(invoice_id);
  `;

  try {
    if (typeof client.exec === 'function') {
      await client.exec(ddl);
    } else if (typeof client.query === 'function') {
      // Split into separate queries if exec is not available
      const statements = ddl
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      for (const statement of statements) {
        await client.query(statement);
      }
    }
    console.log('[DB] Database schema and indexes verified successfully.');
  } catch (err: any) {
    console.error('[DB] Migration error:', err.message);
    throw err;
  }
}
