import { Router, Request, Response } from 'express';
import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../db';
import { invoiceTemplates, clients } from '../db/schema';
import { requireAuth } from './auth';

export const recurringRouter = Router();

function requireBusiness(req: Request, res: Response, next: any) {
  const business = (req as any).business;
  if (!business) {
    return res.status(403).json({ error: 'Business profile required.' });
  }
  next();
}

recurringRouter.use(requireAuth, requireBusiness);

/**
 * List all recurring invoice templates
 */
recurringRouter.get('/', async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    const db = getDb();

    const rows = await db
      .select({
        template: invoiceTemplates,
        client: clients,
      })
      .from(invoiceTemplates)
      .innerJoin(clients, eq(invoiceTemplates.clientId, clients.id))
      .where(eq(invoiceTemplates.businessId, business.id))
      .orderBy(desc(invoiceTemplates.createdAt));

    const formatted = rows.map((r) => ({
      ...r.template,
      client: r.client,
    }));

    return res.json(formatted);
  } catch (err: any) {
    console.error('[Recurring:List]', err);
    return res.status(500).json({ error: 'Failed to retrieve recurring templates.' });
  }
});

/**
 * Create standalone recurring template
 */
recurringRouter.post('/', async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    const db = getDb();
    const { clientId, lineItems, frequency, startDate, endCondition, endValue } = req.body;

    if (!clientId || !lineItems || !lineItems.length || !frequency) {
      return res.status(400).json({ error: 'Missing required recurring template fields.' });
    }

    const nextRun = startDate ? new Date(startDate) : new Date();

    const [newTemplate] = await db
      .insert(invoiceTemplates)
      .values({
        businessId: business.id,
        clientId,
        lineItems,
        frequency,
        nextRunDate: nextRun,
        endCondition: endCondition || 'never',
        endValue: endValue ? String(endValue) : null,
        generatedCount: 0,
        status: 'active',
      })
      .returning();

    return res.status(201).json(newTemplate);
  } catch (err: any) {
    console.error('[Recurring:Create]', err);
    return res.status(500).json({ error: 'Failed to create recurring template.' });
  }
});

/**
 * Update recurring template status (pause / resume / cancel)
 */
recurringRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    const db = getDb();
    const templateId = req.params.id;
    const { status } = req.body;

    if (!status || !['active', 'paused', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Status must be active, paused, or cancelled.' });
    }

    const [updated] = await db
      .update(invoiceTemplates)
      .set({ status })
      .where(and(eq(invoiceTemplates.id, templateId), eq(invoiceTemplates.businessId, business.id)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Template not found.' });
    }

    return res.json(updated);
  } catch (err: any) {
    console.error('[Recurring:UpdateStatus]', err);
    return res.status(500).json({ error: 'Failed to update recurring template status.' });
  }
});
