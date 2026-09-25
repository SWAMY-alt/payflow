import express from 'express';
import session from 'express-session';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { initDatabase, getDb } from './db';
import { setupCronScheduler } from './jobs';
import { authRouter, hashPassword } from './routes/auth';
import { businessRouter } from './routes/business';
import { clientsRouter } from './routes/clients';
import { invoicesRouter } from './routes/invoices';
import { recurringRouter } from './routes/recurring';
import { dashboardRouter } from './routes/dashboard';
import { jobsRouter } from './routes/jobs';
import { users, businesses, clients, invoices, payments, invoiceTemplates } from './db/schema';
import { eq } from 'drizzle-orm';

dotenv.config(); // loads cwd .env
dotenv.config({ path: path.resolve(__dirname, '.env') }); // also loads server/.env if present

const app = express();
const PORT = process.env.PORT || 5000;

// Trust Vercel / reverse proxy for secure HTTPS cookies
app.set('trust proxy', 1);

const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

// Security & Parsing Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5173',
  process.env.APP_BASE_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      
      // Allow any vercel deployment preview / production domain
      if (origin.endsWith('.vercel.app')) {
        return callback(null, origin);
      }

      if (allowedOrigins.some((allowed) => origin.startsWith(allowed))) {
        return callback(null, origin);
      }

      // Permissive fallback so frontend can always communicate with API
      return callback(null, origin);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-user-id'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'payflow-super-secure-session-key-2026',
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-domain Vercel deployments
    },
  })
);

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/business', businessRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/recurring', recurringRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/jobs', jobsRouter);

// Seed Demo Data Endpoint (allows instant setup for testing all 6 phases)
app.post('/api/demo/seed', async (req, res) => {
  try {
    const db = getDb();
    const demoEmail = 'owner@payflow.local';

    // 1. Check or create demo user
    let [user] = await db.select().from(users).where(eq(users.email, demoEmail)).limit(1);
    if (!user) {
      [user] = await db
        .insert(users)
        .values({
          email: demoEmail,
          passwordHash: hashPassword('password123'),
          fullName: 'Arjun Sharma',
        })
        .returning();
    }

    // 2. Check or create demo business
    let [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerId, user.id))
      .limit(1);

    if (!business) {
      [business] = await db
        .insert(businesses)
        .values({
          ownerId: user.id,
          name: 'Apex Design & Electricals',
          gstNumber: '29ABCDE1234F1Z5',
          upiId: 'apexservice@okhdfcbank',
          bankDetails: 'HDFC Bank\nA/C No: 50200012345678\nIFSC: HDFC0001234\nBranch: Indiranagar, Bengaluru',
          defaultLateFeePercent: 2,
          lateFeeGraceDays: 3,
          notificationChannel: 'both',
          contactPhone: '+91 98765 43210',
          contactEmail: 'billing@apexservice.in',
          address: '42, 100ft Road, Indiranagar, Bengaluru 560038',
        })
        .returning();
    }

    // 3. Create demo clients if none
    const existingClients = await db
      .select()
      .from(clients)
      .where(eq(clients.businessId, business.id));

    let clientA = existingClients[0];
    let clientB = existingClients[1];
    let clientC = existingClients[2];

    if (existingClients.length === 0) {
      [clientA] = await db
        .insert(clients)
        .values({
          businessId: business.id,
          name: 'Rohan Mehra (Tech Studio)',
          contactPhone: '+91 91234 56789',
          contactEmail: 'rohan@techstudio.co',
          notes: 'Regular UI/UX consulting client',
        })
        .returning();

      [clientB] = await db
        .insert(clients)
        .values({
          businessId: business.id,
          name: 'Priya Iyer (Craft Bakery)',
          contactPhone: '+91 98111 22334',
          contactEmail: 'priya@craftbakery.com',
          notes: 'Commercial electrical inspection and lighting maintenance',
        })
        .returning();

      [clientC] = await db
        .insert(clients)
        .values({
          businessId: business.id,
          name: 'Vikram Patel (Green Ventures)',
          contactPhone: '+91 99000 88776',
          contactEmail: 'vikram@greenventures.in',
          notes: 'Solar inverter servicing and maintenance contract',
        })
        .returning();
    }

    // 4. Create demo invoices if none
    const existingInvoices = await db
      .select()
      .from(invoices)
      .where(eq(invoices.businessId, business.id));

    if (existingInvoices.length === 0 && clientA && clientB && clientC) {
      const now = new Date();
      const pastDueDate8Days = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
      const futureDueDate10Days = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

      // Invoice 1: Fully Paid (e.g. ₹15,000)
      const [inv1] = await db
        .insert(invoices)
        .values({
          businessId: business.id,
          clientId: clientA.id,
          invoiceNumber: 'INV-2026-0001',
          lineItems: [
            {
              id: 'item-1',
              description: 'Brand Identity & Design System',
              quantity: 1,
              unitPrice: 1500000, // ₹15,000.00
              amount: 1500000,
            },
          ],
          subtotal: 1500000,
          lateFeePercent: 0,
          lateFeeAmount: 0,
          totalAmount: 1500000,
          amountPaid: 1500000,
          dueDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
          status: 'Paid',
          escalationStatus: 'Normal',
        })
        .returning();

      await db.insert(payments).values({
        businessId: business.id,
        invoiceId: inv1.id,
        amount: 1500000,
        method: 'upi',
        referenceNote: 'UPI Ref 429188291031',
        paidAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
        recordedBy: user.fullName,
      });

      // Invoice 2: Partially Paid (₹25,000 total, ₹10,000 paid, ₹15,000 remaining)
      const [inv2] = await db
        .insert(invoices)
        .values({
          businessId: business.id,
          clientId: clientB.id,
          invoiceNumber: 'INV-2026-0002',
          lineItems: [
            {
              id: 'item-1',
              description: 'Commercial 3-Phase Wiring & Distribution Board',
              quantity: 1,
              unitPrice: 2000000, // ₹20,000.00
              amount: 2000000,
            },
            {
              id: 'item-2',
              description: 'Industrial Safety Circuit Breakers & Earthing',
              quantity: 2,
              unitPrice: 250000, // ₹2,500.00
              amount: 500000,
            },
          ],
          subtotal: 2500000,
          lateFeePercent: 0,
          lateFeeAmount: 0,
          totalAmount: 2500000,
          amountPaid: 1000000,
          dueDate: futureDueDate10Days,
          status: 'Partially Paid',
          escalationStatus: 'Normal',
        })
        .returning();

      await db.insert(payments).values({
        businessId: business.id,
        invoiceId: inv2.id,
        amount: 1000000,
        method: 'bank_transfer',
        referenceNote: 'NEFT Part Payment Advance',
        paidAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        recordedBy: user.fullName,
      });

      // Invoice 3: 8 Days Overdue with Partial Payment — Perfect for Late Fee testing!
      // Total ₹10,000, ₹4,000 paid. Remaining = ₹6,000.
      // 2% late fee on remaining ₹6,000 is ₹120.00 (12,000 paise).
      const [inv3] = await db
        .insert(invoices)
        .values({
          businessId: business.id,
          clientId: clientC.id,
          invoiceNumber: 'INV-2026-0003',
          lineItems: [
            {
              id: 'item-1',
              description: 'Solar Inverter Maintenance & Battery Health Check',
              quantity: 1,
              unitPrice: 1000000, // ₹10,000.00
              amount: 1000000,
            },
          ],
          subtotal: 1000000,
          lateFeePercent: 0,
          lateFeeAmount: 0,
          totalAmount: 1000000,
          amountPaid: 400000, // ₹4,000.00 paid
          dueDate: pastDueDate8Days,
          status: 'Overdue',
          escalationStatus: 'Normal',
        })
        .returning();

      await db.insert(payments).values({
        businessId: business.id,
        invoiceId: inv3.id,
        amount: 400000,
        method: 'upi',
        referenceNote: 'UPI Token Advance',
        paidAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        recordedBy: user.fullName,
      });

      // Recurring Template for Client A (Monthly retainer)
      await db.insert(invoiceTemplates).values({
        businessId: business.id,
        clientId: clientA.id,
        lineItems: [
          {
            id: 'rec-1',
            description: 'Monthly Maintenance & Design Support Retainer',
            quantity: 1,
            unitPrice: 1200000, // ₹12,000.00
            amount: 1200000,
          },
        ],
        frequency: 'monthly',
        nextRunDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        endCondition: 'afterCount',
        endValue: '6',
        generatedCount: 1,
        status: 'active',
      });
    }

    // Set active session for user
    if ((req as any).session) {
      (req as any).session.userId = user.id;
    }

    return res.json({
      success: true,
      message: 'Demo business seeded successfully! You can log in with owner@payflow.local / password123',
      user: { id: user.id, email: user.email, fullName: user.fullName },
      business,
    });
  } catch (err: any) {
    console.error('[Demo:Seed]', err);
    return res.status(500).json({ error: 'Failed to seed demo data', message: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'PayFlow API', time: new Date().toISOString() });
});

// Root route for backend API status and documentation
app.get('/', (req, res) => {
  const clientDistIndex = path.resolve(__dirname, '../client/dist/index.html');
  if (fs.existsSync(clientDistIndex)) {
    return res.sendFile(clientDistIndex);
  }
  return res.json({
    status: 'ok',
    service: 'PayFlow Backend API',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      business: '/api/business',
      clients: '/api/clients',
      invoices: '/api/invoices',
      recurring: '/api/recurring',
      dashboard: '/api/dashboard/summary',
      demoSeed: '/api/demo/seed',
    },
    version: '1.0.0',
    documentation: 'https://github.com/SWAMY-alt/payflow',
  });
});

// Production client serving if built
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.use((req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.resolve(clientDist, 'index.html'));
    });
  }
}

// Start Server (only when not running in serverless Vercel environment)
async function start() {
  try {
    await initDatabase();
    setupCronScheduler();

    app.listen(PORT, () => {
      console.log(`[PayFlow Server] Running on http://localhost:${PORT}`);
    });
  } catch (err: any) {
    console.error('[PayFlow Server] Failed to start:', err);
    process.exit(1);
  }
}

if (!process.env.VERCEL) {
  start();
}

export { app, start };
export default app;
