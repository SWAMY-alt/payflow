import { Router, Request, Response } from 'express';
import { eq, and, sql, desc, gte, lte } from 'drizzle-orm';
import { getDb } from '../db';
import { invoices, payments, clients } from '../db/schema';
import { requireAuth } from './auth';

export const dashboardRouter = Router();

function requireBusiness(req: Request, res: Response, next: any) {
  const business = (req as any).business;
  if (!business) {
    return res.status(403).json({ error: 'Business profile required.' });
  }
  next();
}

dashboardRouter.use(requireAuth, requireBusiness);

/**
 * Get dashboard summary metrics and activity
 */
dashboardRouter.get('/summary', async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    const db = getDb();
    const now = new Date();

    // 1. Total Outstanding (Sum of remaining balance for unpaid / partial / overdue invoices)
    const allInvoices = await db
      .select({
        id: invoices.id,
        totalAmount: invoices.totalAmount,
        amountPaid: invoices.amountPaid,
        status: invoices.status,
        escalationStatus: invoices.escalationStatus,
        lateFeeAmount: invoices.lateFeeAmount,
        dueDate: invoices.dueDate,
      })
      .from(invoices)
      .where(eq(invoices.businessId, business.id));

    let totalOutstanding = 0;
    let overdueCount = 0;
    let lateFeesRecovered = 0;
    let paidCount = 0;
    let partialCount = 0;
    let pendingCount = 0;
    let needsAttentionCount = 0;

    for (const inv of allInvoices) {
      const remaining = Math.max(0, inv.totalAmount - inv.amountPaid);
      const isPastDue = now > new Date(inv.dueDate);

      if (inv.status === 'Paid') {
        paidCount++;
        // If invoice is fully paid, any late fee was fully recovered
        lateFeesRecovered += inv.lateFeeAmount || 0;
      } else if (inv.status === 'Partially Paid') {
        partialCount++;
        totalOutstanding += remaining;
        if (isPastDue) overdueCount++;
        // If partially paid, calculate proportion or recovered late fee if paid portion exceeds base
        if (inv.amountPaid > 0 && inv.lateFeeAmount > 0) {
          const baseSubtotal = inv.totalAmount - inv.lateFeeAmount;
          if (inv.amountPaid > baseSubtotal) {
            lateFeesRecovered += inv.amountPaid - baseSubtotal;
          }
        }
      } else {
        // Pending or Overdue
        totalOutstanding += remaining;
        if (inv.status === 'Overdue' || isPastDue) {
          overdueCount++;
        } else {
          pendingCount++;
        }
      }

      if (inv.escalationStatus === 'Needs Attention') {
        needsAttentionCount++;
      }
    }

    // 2. Collected This Month (Sum of all positive payments in current calendar month minus reversals)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthPayments = await db
      .select({
        amount: payments.amount,
      })
      .from(payments)
      .where(
        and(
          eq(payments.businessId, business.id),
          gte(payments.paidAt, startOfMonth),
          lte(payments.paidAt, endOfMonth)
        )
      );

    const collectedThisMonth = monthPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

    // 3. Recent 5 Invoices
    const recentInvoicesRows = await db
      .select({
        invoice: invoices,
        client: clients,
      })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(eq(invoices.businessId, business.id))
      .orderBy(desc(invoices.createdAt))
      .limit(5);

    const recentInvoices = recentInvoicesRows.map((r) => ({
      ...r.invoice,
      client: r.client,
    }));

    // 4. Recent 5 Payments
    const recentPaymentsRows = await db
      .select({
        payment: payments,
        invoiceNumber: invoices.invoiceNumber,
        clientName: clients.name,
      })
      .from(payments)
      .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(eq(payments.businessId, business.id))
      .orderBy(desc(payments.paidAt))
      .limit(5);

    const recentPayments = recentPaymentsRows.map((r) => ({
      ...r.payment,
      invoiceNumber: r.invoiceNumber,
      clientName: r.clientName,
    }));

    return res.json({
      totalOutstanding,
      collectedThisMonth: Math.max(0, collectedThisMonth),
      overdueCount,
      lateFeesRecovered,
      totalInvoicesCount: allInvoices.length,
      paidCount,
      partialCount,
      pendingCount,
      needsAttentionCount,
      recentInvoices,
      recentPayments,
    });
  } catch (err: any) {
    console.error('[Dashboard:Summary]', err);
    return res.status(500).json({ error: 'Failed to retrieve dashboard summary.' });
  }
});
