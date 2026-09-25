import { Router, Request, Response } from 'express';
import { eq, and, desc, sql, ilike } from 'drizzle-orm';
import { getDb } from '../db';
import { invoices, clients, payments, followUpLogs, invoiceTemplates, businesses } from '../db/schema';
import { requireAuth } from './auth';
import { createInvoiceSchema, recordPaymentSchema } from '../../shared/types';
import { getNextInvoiceNumber } from '../jobs';
import { generateInvoicePdf } from '../services/pdfGenerator';
import { MessageSender } from '../services/messageSender';
import type { Invoice, Business, Client } from '../../shared/types';

export const invoicesRouter = Router();

function requireBusiness(req: Request, res: Response, next: any) {
  const business = (req as any).business;
  if (!business) {
    return res.status(403).json({ error: 'Business profile required.' });
  }
  next();
}

invoicesRouter.use(requireAuth, requireBusiness);

/**
 * List invoices with filters and client information
 */
invoicesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    const db = getDb();
    const statusFilter = req.query.status as string;
    const clientIdFilter = req.query.clientId as string;
    const search = req.query.search as string;

    const conditions = [eq(invoices.businessId, business.id)];

    if (statusFilter && ['Pending', 'Partially Paid', 'Paid', 'Overdue'].includes(statusFilter)) {
      conditions.push(eq(invoices.status, statusFilter));
    }

    if (clientIdFilter) {
      conditions.push(eq(invoices.clientId, clientIdFilter));
    }

    let rows = await db
      .select({
        invoice: invoices,
        client: clients,
      })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(...conditions))
      .orderBy(desc(invoices.createdAt));

    if (search) {
      const lower = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.invoice.invoiceNumber.toLowerCase().includes(lower) ||
          r.client.name.toLowerCase().includes(lower) ||
          r.client.contactEmail.toLowerCase().includes(lower)
      );
    }

    const formatted = rows.map((r) => ({
      ...r.invoice,
      client: r.client,
    }));

    return res.json(formatted);
  } catch (err: any) {
    console.error('[Invoices:List]', err);
    return res.status(500).json({ error: 'Failed to retrieve invoices.' });
  }
});

/**
 * Create new invoice (with optional recurring template generation)
 */
invoicesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    const db = getDb();

    const parsed = createInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { clientId, lineItems, dueDate, notes, isRecurring, recurrence } = parsed.data;

    // Verify client belongs to this business
    const [client] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.businessId, business.id)))
      .limit(1);

    if (!client) {
      return res.status(404).json({ error: 'Client not found or does not belong to your business.' });
    }

    // Calculate subtotal from line items (all in integer paise)
    let subtotal = 0;
    const formattedLineItems = lineItems.map((item, index) => {
      const qty = item.quantity || 1;
      const rate = item.unitPrice || 0;
      const amt = qty * rate;
      subtotal += amt;
      return {
        id: item.id || `item-${index + 1}`,
        description: item.description,
        quantity: qty,
        unitPrice: rate,
        amount: amt,
      };
    });

    const invoiceNumber = await getNextInvoiceNumber(business.id);
    const now = new Date();
    const initialStatus = new Date(dueDate) < now ? 'Overdue' : 'Pending';

    let templateId: string | null = null;

    // Handle recurring billing template creation
    if (isRecurring && recurrence) {
      // Calculate next run date based on frequency
      const nextRun = new Date();
      if (recurrence.frequency === 'weekly') {
        nextRun.setDate(nextRun.getDate() + 7);
      } else {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }

      const [newTemplate] = await db
        .insert(invoiceTemplates)
        .values({
          businessId: business.id,
          clientId: client.id,
          lineItems: formattedLineItems,
          frequency: recurrence.frequency,
          nextRunDate: nextRun,
          endCondition: recurrence.endCondition,
          endValue: recurrence.endValue ? String(recurrence.endValue) : null,
          generatedCount: 1, // First one generated now
          status: 'active',
        })
        .returning();

      templateId = newTemplate.id;
    }

    // Insert invoice
    const [newInvoice] = await db
      .insert(invoices)
      .values({
        businessId: business.id,
        clientId: client.id,
        templateId,
        invoiceNumber,
        lineItems: formattedLineItems,
        subtotal,
        lateFeePercent: 0,
        lateFeeAmount: 0,
        totalAmount: subtotal,
        amountPaid: 0,
        dueDate: new Date(dueDate),
        status: initialStatus,
        escalationStatus: 'Normal',
        notes: notes || null,
      })
      .returning();

    return res.status(201).json({
      ...newInvoice,
      client,
    });
  } catch (err: any) {
    console.error('[Invoices:Create]', err);
    return res.status(500).json({ error: 'Failed to create invoice.' });
  }
});

/**
 * Get single invoice with client, payment ledger, and follow-up log
 */
invoicesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    const db = getDb();
    const invoiceId = req.params.id;

    const [row] = await db
      .select({
        invoice: invoices,
        client: clients,
      })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(eq(invoices.id, invoiceId), eq(invoices.businessId, business.id)))
      .limit(1);

    if (!row) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    // Fetch chronological payment ledger
    const ledger = await db
      .select()
      .from(payments)
      .where(eq(payments.invoiceId, invoiceId))
      .orderBy(payments.paidAt);

    // Fetch follow-up history
    const followUps = await db
      .select()
      .from(followUpLogs)
      .where(eq(followUpLogs.invoiceId, invoiceId))
      .orderBy(desc(followUpLogs.sentAt));

    return res.json({
      ...row.invoice,
      client: row.client,
      payments: ledger,
      followUps,
    });
  } catch (err: any) {
    console.error('[Invoices:Get]', err);
    return res.status(500).json({ error: 'Failed to retrieve invoice details.' });
  }
});

/**
 * Record a payment (auditable ledger, rejects overpayment, recalculates status)
 */
invoicesRouter.post('/:id/payments', async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    const user = (req as any).user;
    const db = getDb();
    const invoiceId = req.params.id;

    const parsed = recordPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { amount, method, referenceNote, paidAt } = parsed.data;

    // Fetch current invoice
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.businessId, business.id)))
      .limit(1);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const currentPaid = invoice.amountPaid || 0;
    const totalAmount = invoice.totalAmount;
    const remainingBalance = totalAmount - currentPaid;

    // Reject payment exceeding total amount
    if (amount > remainingBalance) {
      return res.status(400).json({
        error: `Payment of ₹${(amount / 100).toFixed(2)} exceeds remaining balance of ₹${(remainingBalance / 100).toFixed(2)}. Overpayments require credit account adjustments.`,
      });
    }

    // Insert payment record (insert-only audit ledger)
    const [newPayment] = await db
      .insert(payments)
      .values({
        businessId: business.id,
        invoiceId: invoice.id,
        amount,
        method,
        referenceNote: referenceNote || null,
        paidAt: new Date(paidAt),
        recordedBy: user.fullName || user.email,
      })
      .returning();

    // Recalculate invoice status & amountPaid
    const newAmountPaid = currentPaid + amount;
    let newStatus = invoice.status;
    let newEscalation = invoice.escalationStatus;

    if (newAmountPaid >= totalAmount) {
      newStatus = 'Paid';
      newEscalation = 'Normal'; // Cleared
    } else if (newAmountPaid > 0) {
      newStatus = 'Partially Paid';
    } else {
      newStatus = new Date(invoice.dueDate) < new Date() ? 'Overdue' : 'Pending';
    }

    const [updatedInvoice] = await db
      .update(invoices)
      .set({
        amountPaid: newAmountPaid,
        status: newStatus,
        escalationStatus: newEscalation,
      })
      .where(eq(invoices.id, invoice.id))
      .returning();

    return res.status(201).json({
      payment: newPayment,
      invoice: updatedInvoice,
    });
  } catch (err: any) {
    console.error('[Invoices:RecordPayment]', err);
    return res.status(500).json({ error: 'Failed to record payment.' });
  }
});

/**
 * Reversing entry for payment correction (auditable adjustment)
 */
invoicesRouter.post('/:id/payments/reversal', async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    const user = (req as any).user;
    const db = getDb();
    const invoiceId = req.params.id;
    const { amount, reason } = req.body;

    if (!amount || amount <= 0 || !reason) {
      return res.status(400).json({ error: 'Positive reversal amount and reason are required.' });
    }

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.businessId, business.id)))
      .limit(1);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    if (amount > invoice.amountPaid) {
      return res.status(400).json({
        error: `Cannot reverse more than total paid amount of ₹${(invoice.amountPaid / 100).toFixed(2)}.`,
      });
    }

    // Insert negative payment entry to reverse
    const [reversalPayment] = await db
      .insert(payments)
      .values({
        businessId: business.id,
        invoiceId: invoice.id,
        amount: -amount, // Negative for reversal
        method: 'other',
        referenceNote: `[REVERSAL] ${reason}`,
        paidAt: new Date(),
        recordedBy: user.fullName || user.email,
      })
      .returning();

    const newAmountPaid = invoice.amountPaid - amount;
    let newStatus = invoice.status;
    if (newAmountPaid >= invoice.totalAmount) {
      newStatus = 'Paid';
    } else if (newAmountPaid > 0) {
      newStatus = 'Partially Paid';
    } else {
      newStatus = new Date(invoice.dueDate) < new Date() ? 'Overdue' : 'Pending';
    }

    const [updatedInvoice] = await db
      .update(invoices)
      .set({
        amountPaid: newAmountPaid,
        status: newStatus,
      })
      .where(eq(invoices.id, invoice.id))
      .returning();

    return res.status(201).json({
      payment: reversalPayment,
      invoice: updatedInvoice,
    });
  } catch (err: any) {
    console.error('[Invoices:Reversal]', err);
    return res.status(500).json({ error: 'Failed to process payment reversal.' });
  }
});

/**
 * Trigger send/resend invoice notification (WhatsApp link & Email)
 */
invoicesRouter.post('/:id/send', async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    const db = getDb();
    const invoiceId = req.params.id;

    const [row] = await db
      .select({
        invoice: invoices,
        client: clients,
      })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(eq(invoices.id, invoiceId), eq(invoices.businessId, business.id)))
      .limit(1);

    if (!row) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    // Generate PDF for attachment
    const pdfBuffer = await generateInvoicePdf(
      row.invoice as any,
      business as any,
      row.client as any
    );

    const result = await MessageSender.dispatchInvoiceNotification({
      stage: 'initial',
      invoice: row.invoice as any,
      business: business as any,
      client: row.client as any,
      pdfBuffer,
    });

    // Update last_sent_at
    await db
      .update(invoices)
      .set({ lastSentAt: new Date() })
      .where(eq(invoices.id, invoiceId));

    // Log the notification
    await db.insert(followUpLogs).values({
      businessId: business.id,
      invoiceId: row.invoice.id,
      stage: 'due',
      channel: business.notificationChannel as any,
      messageBody: result.message,
      recipient: row.client.contactPhone || row.client.contactEmail,
      status: 'sent',
    });

    return res.json({
      success: true,
      whatsAppUrl: result.whatsAppUrl,
      message: result.message,
      emailDetails: result.emailDetails,
    });
  } catch (err: any) {
    console.error('[Invoices:Send]', err);
    return res.status(500).json({ error: 'Failed to send invoice notification.' });
  }
});

/**
 * Download generated PDF
 */
invoicesRouter.get('/:id/pdf', async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    const db = getDb();
    const invoiceId = req.params.id;

    const [row] = await db
      .select({
        invoice: invoices,
        client: clients,
      })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(eq(invoices.id, invoiceId), eq(invoices.businessId, business.id)))
      .limit(1);

    if (!row) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const ledger = await db
      .select()
      .from(payments)
      .where(eq(payments.invoiceId, invoiceId))
      .orderBy(payments.paidAt);

    const pdfBytes = await generateInvoicePdf(
      row.invoice as any,
      business as any,
      row.client as any,
      ledger as any
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Invoice-${row.invoice.invoiceNumber}.pdf"`
    );
    return res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error('[Invoices:PDF]', err);
    return res.status(500).json({ error: 'Failed to generate invoice PDF.' });
  }
});

/**
 * Preview PDF in browser
 */
invoicesRouter.get('/:id/preview-pdf', async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    const db = getDb();
    const invoiceId = req.params.id;

    const [row] = await db
      .select({
        invoice: invoices,
        client: clients,
      })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(eq(invoices.id, invoiceId), eq(invoices.businessId, business.id)))
      .limit(1);

    if (!row) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const ledger = await db
      .select()
      .from(payments)
      .where(eq(payments.invoiceId, invoiceId))
      .orderBy(payments.paidAt);

    const pdfBytes = await generateInvoicePdf(
      row.invoice as any,
      business as any,
      row.client as any,
      ledger as any
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="Invoice-${row.invoice.invoiceNumber}.pdf"`
    );
    return res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error('[Invoices:PreviewPDF]', err);
    return res.status(500).json({ error: 'Failed to generate invoice PDF preview.' });
  }
});
