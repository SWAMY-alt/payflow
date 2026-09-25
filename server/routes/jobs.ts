import { Router, Request, Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '../db';
import { followUpLogs, invoices, clients } from '../db/schema';
import { requireAuth } from './auth';
import {
  runAllJobs,
  runLateFeeCheck,
  runFollowUpDispatch,
  runRecurringGeneration,
} from '../jobs';

export const jobsRouter = Router();

jobsRouter.use(requireAuth);

/**
 * Run all scheduled passes immediately
 */
jobsRouter.post('/run-all', async (req: Request, res: Response) => {
  try {
    const results = await runAllJobs();
    return res.json({
      success: true,
      message: 'All scheduled jobs executed successfully.',
      results,
    });
  } catch (err: any) {
    console.error('[Jobs:RunAll]', err);
    return res.status(500).json({ error: 'Failed to execute scheduled jobs.', message: err.message });
  }
});

/**
 * Run only the late fee check pass
 */
jobsRouter.post('/run-late-fee', async (req: Request, res: Response) => {
  try {
    const result = await runLateFeeCheck();
    return res.json({
      success: true,
      result,
    });
  } catch (err: any) {
    console.error('[Jobs:RunLateFee]', err);
    return res.status(500).json({ error: 'Failed to execute late fee check.', message: err.message });
  }
});

/**
 * Run only the follow-up dispatch pass
 */
jobsRouter.post('/run-follow-up', async (req: Request, res: Response) => {
  try {
    const result = await runFollowUpDispatch();
    return res.json({
      success: true,
      result,
    });
  } catch (err: any) {
    console.error('[Jobs:RunFollowUp]', err);
    return res.status(500).json({ error: 'Failed to execute follow-up dispatch.', message: err.message });
  }
});

/**
 * Run only the recurring invoice generation pass
 */
jobsRouter.post('/run-recurring', async (req: Request, res: Response) => {
  try {
    const result = await runRecurringGeneration();
    return res.json({
      success: true,
      result,
    });
  } catch (err: any) {
    console.error('[Jobs:RunRecurring]', err);
    return res.status(500).json({ error: 'Failed to execute recurring generation.', message: err.message });
  }
});

/**
 * Get recent follow-up activity logs for the current business
 */
jobsRouter.get('/logs', async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    if (!business) {
      return res.status(403).json({ error: 'Business setup required.' });
    }

    const db = getDb();
    const logs = await db
      .select({
        log: followUpLogs,
        invoiceNumber: invoices.invoiceNumber,
        clientName: clients.name,
      })
      .from(followUpLogs)
      .innerJoin(invoices, eq(followUpLogs.invoiceId, invoices.id))
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(eq(followUpLogs.businessId, business.id))
      .orderBy(desc(followUpLogs.sentAt))
      .limit(50);

    const formatted = logs.map((l) => ({
      ...l.log,
      invoiceNumber: l.invoiceNumber,
      clientName: l.clientName,
    }));

    return res.json(formatted);
  } catch (err: any) {
    console.error('[Jobs:GetLogs]', err);
    return res.status(500).json({ error: 'Failed to retrieve follow-up logs.' });
  }
});
