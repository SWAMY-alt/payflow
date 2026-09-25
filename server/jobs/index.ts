import cron from 'node-cron';
import { eq, and, sql, lte, or } from 'drizzle-orm';
import { getDb } from '../db';
import { invoices, businesses, clients, invoiceTemplates, followUpLogs } from '../db/schema';
import { MessageSender } from '../services/messageSender';
import { generateInvoicePdf } from '../services/pdfGenerator';
import type { Invoice, Business, Client } from '../../shared/types';

export interface JobExecutionResult {
  jobName: string;
  processedCount: number;
  details: string[];
  timestamp: string;
}

/**
 * Helper to compute consecutive invoice number for a business
 */
export async function getNextInvoiceNumber(businessId: string): Promise<string> {
  const db = getDb();
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(invoices)
    .where(eq(invoices.businessId, businessId));

  const count = Number(countResult[0]?.count || 0) + 1;
  const year = new Date().getFullYear();
  return `INV-${year}-${String(count).padStart(4, '0')}`;
}

/**
 * 1. LATE FEE PASS
 * For every invoice past due with grace days passed:
 * Calculate fee strictly on the REMAINING balance (total_amount - amount_paid),
 * NOT on original total.
 */
export async function runLateFeeCheck(): Promise<JobExecutionResult> {
  const db = getDb();
  const now = new Date();
  const details: string[] = [];
  let processedCount = 0;

  console.log(`[Cron:LateFee] Starting late fee pass at ${now.toISOString()}...`);

  // Fetch all pending / partial / overdue invoices that are not fully paid
  const candidateInvoices = await db
    .select({
      invoice: invoices,
      business: businesses,
    })
    .from(invoices)
    .innerJoin(businesses, eq(invoices.businessId, businesses.id))
    .where(
      and(
        sql`${invoices.amountPaid} < ${invoices.totalAmount}`,
        lte(invoices.dueDate, now)
      )
    );

  for (const { invoice, business } of candidateInvoices) {
    const dueDate = new Date(invoice.dueDate);
    const graceDays = business.lateFeeGraceDays ?? 3;
    const gracePeriodEnd = new Date(dueDate.getTime() + graceDays * 24 * 60 * 60 * 1000);

    const isPastDue = now > dueDate;
    const isPastGrace = now > gracePeriodEnd;

    // Update status to Overdue if past due date
    let newStatus = invoice.status;
    if (isPastDue && invoice.status !== 'Overdue') {
      newStatus = 'Overdue';
    }

    // Check if late fee should be applied (grace period passed and no fee yet applied)
    if (isPastGrace && business.defaultLateFeePercent > 0 && invoice.lateFeeAmount === 0) {
      // Critical requirement: Calculate strictly on remaining balance!
      const remainingBalance = Math.max(0, invoice.totalAmount - invoice.amountPaid);
      const feePercent = business.defaultLateFeePercent;
      const calculatedFeePaise = Math.round(remainingBalance * (feePercent / 100));

      if (calculatedFeePaise > 0) {
        const updatedTotal = invoice.totalAmount + calculatedFeePaise;
        const currentLineItems = (invoice.lineItems as any[]) || [];
        const feeLineItem = {
          id: `fee-${Date.now()}`,
          description: `Late Payment Penalty (${feePercent}% on remaining balance of ${(remainingBalance / 100).toFixed(2)})`,
          quantity: 1,
          unitPrice: calculatedFeePaise,
          amount: calculatedFeePaise,
        };

        await db
          .update(invoices)
          .set({
            lateFeePercent: feePercent,
            lateFeeAmount: calculatedFeePaise,
            totalAmount: updatedTotal,
            lineItems: [...currentLineItems, feeLineItem],
            status: 'Overdue',
          })
          .where(eq(invoices.id, invoice.id));

        processedCount++;
        const msg = `Applied ${feePercent}% late fee of ₹${(calculatedFeePaise / 100).toFixed(2)} to invoice ${invoice.invoiceNumber} (remaining balance was ₹${(remainingBalance / 100).toFixed(2)})`;
        details.push(msg);
        console.log(`[Cron:LateFee] ${msg}`);
      }
    } else if (newStatus !== invoice.status) {
      // Just update status to Overdue
      await db
        .update(invoices)
        .set({ status: 'Overdue' })
        .where(eq(invoices.id, invoice.id));
      details.push(`Updated invoice ${invoice.invoiceNumber} status to Overdue`);
    }
  }

  return {
    jobName: 'Late Fee Pass',
    processedCount,
    details,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 2. FOLLOW-UP DISPATCH PASS
 * Escalating schedule:
 * - Stage 1: Due date reminder ('due')
 * - Stage 2: 3 days overdue ('3day')
 * - Stage 3: 7+ days overdue ('7day') -> Flags "Needs Attention", halts client messages
 */
export async function runFollowUpDispatch(): Promise<JobExecutionResult> {
  const db = getDb();
  const now = new Date();
  const details: string[] = [];
  let processedCount = 0;

  console.log(`[Cron:FollowUp] Starting follow-up dispatch pass at ${now.toISOString()}...`);

  // Unpaid or partially paid invoices
  const unpaidInvoices = await db
    .select({
      invoice: invoices,
      business: businesses,
      client: clients,
    })
    .from(invoices)
    .innerJoin(businesses, eq(invoices.businessId, businesses.id))
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .where(sql`${invoices.amountPaid} < ${invoices.totalAmount}`);

  for (const { invoice, business, client } of unpaidInvoices) {
    const dueDate = new Date(invoice.dueDate);
    const diffMs = now.getTime() - dueDate.getTime();
    const daysDiff = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    // Fetch existing follow-up stages already sent for this invoice
    const existingLogs = await db
      .select({ stage: followUpLogs.stage })
      .from(followUpLogs)
      .where(eq(followUpLogs.invoiceId, invoice.id));

    const sentStages = new Set(existingLogs.map((l) => l.stage));

    // STAGE 3: 7+ Days Overdue (Escalation)
    if (daysDiff >= 7) {
      if (!sentStages.has('7day')) {
        // Flag invoice "Needs Attention"
        await db
          .update(invoices)
          .set({ escalationStatus: 'Needs Attention' })
          .where(eq(invoices.id, invoice.id));

        const alertNote = MessageSender.build7DayEscalationNote(
          invoice as any,
          business as any,
          client as any
        );

        // Record escalation alert in follow_up_log
        await db.insert(followUpLogs).values({
          businessId: business.id,
          invoiceId: invoice.id,
          stage: '7day',
          channel: 'email',
          messageBody: alertNote,
          recipient: business.contactEmail || business.ownerId,
          status: 'flagged_needs_attention',
        });

        processedCount++;
        const msg = `Flagged invoice ${invoice.invoiceNumber} as 'Needs Attention' (7+ days overdue, automated messages halted)`;
        details.push(msg);
        console.log(`[Cron:FollowUp] ${msg}`);
      }
      // CRITICAL: Prompt rule: "No further automated message sent past this point"
      continue;
    }

    // STAGE 2: 3 Days Overdue
    if (daysDiff >= 3 && !sentStages.has('3day')) {
      const result = await MessageSender.dispatchInvoiceNotification({
        stage: '3day',
        invoice: invoice as any,
        business: business as any,
        client: client as any,
      });

      await db.insert(followUpLogs).values({
        businessId: business.id,
        invoiceId: invoice.id,
        stage: '3day',
        channel: business.notificationChannel as any,
        messageBody: result.message,
        recipient: client.contactPhone || client.contactEmail,
        status: 'sent',
      });

      processedCount++;
      const msg = `Sent 3-day overdue reminder for invoice ${invoice.invoiceNumber} to ${client.name}`;
      details.push(msg);
      console.log(`[Cron:FollowUp] ${msg}`);
      continue;
    }

    // STAGE 1: Due Date Reminder (on or around due date: 0 <= daysDiff < 3)
    if (daysDiff >= 0 && daysDiff < 3 && !sentStages.has('due')) {
      const result = await MessageSender.dispatchInvoiceNotification({
        stage: 'due',
        invoice: invoice as any,
        business: business as any,
        client: client as any,
      });

      await db.insert(followUpLogs).values({
        businessId: business.id,
        invoiceId: invoice.id,
        stage: 'due',
        channel: business.notificationChannel as any,
        messageBody: result.message,
        recipient: client.contactPhone || client.contactEmail,
        status: 'sent',
      });

      processedCount++;
      const msg = `Sent due-date reminder for invoice ${invoice.invoiceNumber} to ${client.name}`;
      details.push(msg);
      console.log(`[Cron:FollowUp] ${msg}`);
    }
  }

  return {
    jobName: 'Follow-up Dispatch Pass',
    processedCount,
    details,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 3. RECURRING INVOICE GENERATION PASS
 * For each active template whose next_run_date <= now:
 * - Generate new invoice with sequential invoice number
 * - Calculate subtotal and total
 * - Advance next_run_date
 * - Check end condition (never, afterCount, onDate)
 */
export async function runRecurringGeneration(): Promise<JobExecutionResult> {
  const db = getDb();
  const now = new Date();
  const details: string[] = [];
  let processedCount = 0;

  console.log(`[Cron:Recurring] Starting recurring invoice generation pass at ${now.toISOString()}...`);

  // Active templates due for generation
  const activeTemplates = await db
    .select({
      template: invoiceTemplates,
      business: businesses,
      client: clients,
    })
    .from(invoiceTemplates)
    .innerJoin(businesses, eq(invoiceTemplates.businessId, businesses.id))
    .innerJoin(clients, eq(invoiceTemplates.clientId, clients.id))
    .where(
      and(
        eq(invoiceTemplates.status, 'active'),
        lte(invoiceTemplates.nextRunDate, now)
      )
    );

  for (const { template, business, client } of activeTemplates) {
    const invoiceNumber = await getNextInvoiceNumber(template.businessId);

    // Calculate subtotal from template line items
    const lineItems = (template.lineItems as any[]) || [];
    let subtotal = 0;
    const formattedLineItems = lineItems.map((item, idx) => {
      const qty = item.quantity || 1;
      const rate = item.unitPrice || 0;
      const amt = qty * rate;
      subtotal += amt;
      return {
        id: item.id || `item-${idx + 1}`,
        description: item.description,
        quantity: qty,
        unitPrice: rate,
        amount: amt,
      };
    });

    // Default due date: 14 days from generation date (or frequency length)
    const dueDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Create the new invoice
    const [newInvoice] = await db
      .insert(invoices)
      .values({
        businessId: template.businessId,
        clientId: template.clientId,
        templateId: template.id,
        invoiceNumber,
        lineItems: formattedLineItems,
        subtotal,
        lateFeePercent: 0,
        lateFeeAmount: 0,
        totalAmount: subtotal,
        amountPaid: 0,
        dueDate,
        status: 'Pending',
        escalationStatus: 'Normal',
        notes: `Auto-generated from recurring template #${template.id.slice(0, 8)} (${template.frequency})`,
      })
      .returning();

    const newGeneratedCount = template.generatedCount + 1;

    // Calculate next run date
    const currentRun = new Date(template.nextRunDate);
    let nextRun = new Date(currentRun);
    if (template.frequency === 'weekly') {
      nextRun.setDate(nextRun.getDate() + 7);
    } else {
      // Monthly
      nextRun.setMonth(nextRun.getMonth() + 1);
    }

    // Check end conditions
    let newStatus = 'active';
    if (template.endCondition === 'afterCount' && template.endValue) {
      const maxCount = parseInt(template.endValue, 10);
      if (newGeneratedCount >= maxCount) {
        newStatus = 'cancelled';
        details.push(`Template #${template.id.slice(0, 8)} reached max count of ${maxCount}, marking cancelled.`);
      }
    } else if (template.endCondition === 'onDate' && template.endValue) {
      const cutoffDate = new Date(template.endValue);
      if (nextRun > cutoffDate) {
        newStatus = 'cancelled';
        details.push(`Template #${template.id.slice(0, 8)} passed cutoff date ${template.endValue}, marking cancelled.`);
      }
    }

    // Update template with new nextRunDate and count
    await db
      .update(invoiceTemplates)
      .set({
        nextRunDate: nextRun,
        generatedCount: newGeneratedCount,
        status: newStatus,
      })
      .where(eq(invoiceTemplates.id, template.id));

    processedCount++;
    const msg = `Generated recurring invoice ${newInvoice.invoiceNumber} for client ${client.name} (₹${(subtotal / 100).toFixed(2)})`;
    details.push(msg);
    console.log(`[Cron:Recurring] ${msg}`);
  }

  return {
    jobName: 'Recurring Invoice Pass',
    processedCount,
    details,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Execute all 3 passes sequentially
 */
export async function runAllJobs(): Promise<JobExecutionResult[]> {
  const lateFeeResult = await runLateFeeCheck();
  const followUpResult = await runFollowUpDispatch();
  const recurringResult = await runRecurringGeneration();

  return [lateFeeResult, followUpResult, recurringResult];
}

/**
 * Setup daily cron scheduler (runs at 00:05 AM every day)
 */
export function setupCronScheduler() {
  // Run every day at 00:05
  cron.schedule('5 0 * * *', async () => {
    console.log('[Scheduler] Executing scheduled daily PayFlow passes...');
    try {
      await runAllJobs();
      console.log('[Scheduler] Daily passes completed successfully.');
    } catch (err: any) {
      console.error('[Scheduler] Error in daily passes:', err.message);
    }
  });

  console.log('[Scheduler] Daily cron scheduled at 00:05 every day.');
}
