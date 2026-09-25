import { Router, Request, Response } from 'express';
import { eq, and, sql, desc, ilike, or } from 'drizzle-orm';
import { getDb } from '../db';
import { clients, invoices } from '../db/schema';
import { requireAuth } from './auth';
import { clientSchema } from '../../shared/types';

export const clientsRouter = Router();

// Middleware to ensure user has a business profile
function requireBusiness(req: Request, res: Response, next: any) {
  const business = (req as any).business;
  if (!business) {
    return res.status(403).json({ error: 'Business setup required before managing clients.' });
  }
  next();
}

clientsRouter.use(requireAuth, requireBusiness);

/**
 * List all clients for business
 */
clientsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    const db = getDb();
    const search = req.query.search as string;

    let query = db
      .select({
        id: clients.id,
        businessId: clients.businessId,
        name: clients.name,
        contactPhone: clients.contactPhone,
        contactEmail: clients.contactEmail,
        notes: clients.notes,
        createdAt: clients.createdAt,
      })
      .from(clients)
      .where(
        search
          ? and(
              eq(clients.businessId, business.id),
              or(
                ilike(clients.name, `%${search}%`),
                ilike(clients.contactEmail, `%${search}%`),
                ilike(clients.contactPhone, `%${search}%`)
              )
            )
          : eq(clients.businessId, business.id)
      )
      .orderBy(desc(clients.createdAt));

    const clientList = await query;

    // Fetch invoice statistics per client
    const invoiceStats = await db
      .select({
        clientId: invoices.clientId,
        invoiceCount: sql<number>`count(*)`,
        totalOutstanding: sql<number>`sum(${invoices.totalAmount} - ${invoices.amountPaid})`,
      })
      .from(invoices)
      .where(eq(invoices.businessId, business.id))
      .groupBy(invoices.clientId);

    const statsMap = new Map();
    for (const stat of invoiceStats) {
      statsMap.set(stat.clientId, {
        invoiceCount: Number(stat.invoiceCount || 0),
        totalOutstanding: Number(stat.totalOutstanding || 0),
      });
    }

    const enhancedClients = clientList.map((c) => {
      const stats = statsMap.get(c.id) || { invoiceCount: 0, totalOutstanding: 0 };
      return {
        ...c,
        invoiceCount: stats.invoiceCount,
        totalOutstanding: Math.max(0, stats.totalOutstanding),
      };
    });

    return res.json(enhancedClients);
  } catch (err: any) {
    console.error('[Clients:List]', err);
    return res.status(500).json({ error: 'Failed to retrieve clients.' });
  }
});

/**
 * Create new client
 */
clientsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    const parsed = clientSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const db = getDb();
    const data = parsed.data;

    const [newClient] = await db
      .insert(clients)
      .values({
        businessId: business.id,
        name: data.name,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
        notes: data.notes || null,
      })
      .returning();

    return res.status(201).json(newClient);
  } catch (err: any) {
    console.error('[Clients:Create]', err);
    return res.status(500).json({ error: 'Failed to create client.' });
  }
});

/**
 * Get client details + their invoices
 */
clientsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    const db = getDb();
    const clientId = req.params.id;

    const [client] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.businessId, business.id)))
      .limit(1);

    if (!client) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    const clientInvoices = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.clientId, clientId), eq(invoices.businessId, business.id)))
      .orderBy(desc(invoices.createdAt));

    return res.json({
      ...client,
      invoices: clientInvoices,
    });
  } catch (err: any) {
    console.error('[Clients:Get]', err);
    return res.status(500).json({ error: 'Failed to retrieve client details.' });
  }
});

/**
 * Update client
 */
clientsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    const clientId = req.params.id;

    const parsed = clientSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const db = getDb();
    const data = parsed.data;

    const [updated] = await db
      .update(clients)
      .set({
        name: data.name,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
        notes: data.notes || null,
      })
      .where(and(eq(clients.id, clientId), eq(clients.businessId, business.id)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    return res.json(updated);
  } catch (err: any) {
    console.error('[Clients:Update]', err);
    return res.status(500).json({ error: 'Failed to update client.' });
  }
});

/**
 * Delete client
 */
clientsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    const clientId = req.params.id;
    const db = getDb();

    // Check if client has invoices
    const invs = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(and(eq(invoices.clientId, clientId), eq(invoices.businessId, business.id)))
      .limit(1);

    if (invs.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete client with existing invoices. Archive or keep for financial audit records.',
      });
    }

    const [deleted] = await db
      .delete(clients)
      .where(and(eq(clients.id, clientId), eq(clients.businessId, business.id)))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.error('[Clients:Delete]', err);
    return res.status(500).json({ error: 'Failed to delete client.' });
  }
});
