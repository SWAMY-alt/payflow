import { eq } from 'drizzle-orm';
import { users, businesses, clients, invoices, payments, invoiceTemplates } from './schema';
import crypto from 'crypto';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function seedDefaultDataIfEmpty(db: any) {
  try {
    const demoEmail = 'owner@payflow.local';

    // 1. Check or create demo user
    let [user] = await db.select().from(users).where(eq(users.email, demoEmail)).limit(1);
    if (!user) {
      console.log('[Seed] Seeding default demo owner: owner@payflow.local');
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
      console.log('[Seed] Seeding default demo business: Apex Design & Electricals');
      [business] = await db
        .insert(businesses)
        .values({
          ownerId: user.id,
          name: 'Apex Design & Electricals',
          gstNumber: '29ABCDE1234F1Z5',
          upiId: 'apexservice@okhdfcbank',
          bankDetails: 'HDFC Bank (•••• 5678) - IFSC: HDFC0001234\nSettlement: Instant RTGS/NEFT\nSecurity: RBI Tokenized Gateway',
          paymentMethod: 'both',
          accountVerified: true,
          paymentToken: 'tok_rzp_live_seed_verified',
          maskedAccount: 'HDFC Bank (•••• 5678) - IFSC: HDFC0001234',
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

      // Invoice 1: Fully Paid (₹15,000)
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
              unitPrice: 1500000,
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

      // Invoice 2: Partially Paid (₹25,000 total, ₹10,000 paid)
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
              unitPrice: 2000000,
              amount: 2000000,
            },
            {
              id: 'item-2',
              description: 'Industrial Safety Circuit Breakers & Earthing',
              quantity: 2,
              unitPrice: 250000,
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

      // Invoice 3: 8 Days Overdue (₹10,000 total, ₹4,000 paid)
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
              unitPrice: 1000000,
              amount: 1000000,
            },
          ],
          subtotal: 1000000,
          lateFeePercent: 0,
          lateFeeAmount: 0,
          totalAmount: 1000000,
          amountPaid: 400000,
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

      // Recurring Template for Client A
      await db.insert(invoiceTemplates).values({
        businessId: business.id,
        clientId: clientA.id,
        lineItems: [
          {
            id: 'rec-1',
            description: 'Monthly Maintenance & Design Support Retainer',
            quantity: 1,
            unitPrice: 1200000,
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

    return { user, business };
  } catch (err: any) {
    console.error('[Seed Error]:', err.message);
  }
}
