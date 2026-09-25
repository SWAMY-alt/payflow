import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { businesses } from '../db/schema';
import { requireAuth } from './auth';
import { businessSetupSchema } from '../../shared/types';

export const businessRouter = Router();

/**
 * One-time business profile setup
 */
businessRouter.post('/setup', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const existingBusiness = (req as any).business;

    if (existingBusiness) {
      return res.status(400).json({ error: 'Business profile already exists for this account.' });
    }

    const parsed = businessSetupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const db = getDb();
    const data = parsed.data;

    const [newBusiness] = await db
      .insert(businesses)
      .values({
        ownerId: user.id,
        name: data.name,
        logoUrl: data.logoUrl || null,
        gstNumber: data.gstNumber || null,
        upiId: data.upiId,
        bankDetails: data.bankDetails,
        defaultLateFeePercent: data.defaultLateFeePercent ?? 2,
        lateFeeGraceDays: data.lateFeeGraceDays ?? 3,
        notificationChannel: data.notificationChannel ?? 'both',
        contactPhone: data.contactPhone || null,
        contactEmail: data.contactEmail || user.email,
        address: data.address || null,
      })
      .returning();

    // Attach to session
    (req as any).business = newBusiness;

    return res.status(201).json(newBusiness);
  } catch (err: any) {
    console.error('[Business:Setup]', err);
    return res.status(500).json({ error: 'Failed to create business profile.' });
  }
});

/**
 * Get current business profile
 */
businessRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const business = (req as any).business;
  if (!business) {
    return res.status(404).json({ error: 'Business profile not set up yet.' });
  }
  return res.json(business);
});

/**
 * Update business settings
 */
businessRouter.put('/settings', requireAuth, async (req: Request, res: Response) => {
  try {
    const business = (req as any).business;
    if (!business) {
      return res.status(404).json({ error: 'Business profile not found.' });
    }

    const parsed = businessSetupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const db = getDb();
    const data = parsed.data;

    const [updated] = await db
      .update(businesses)
      .set({
        name: data.name,
        logoUrl: data.logoUrl || null,
        gstNumber: data.gstNumber || null,
        upiId: data.upiId,
        bankDetails: data.bankDetails,
        defaultLateFeePercent: data.defaultLateFeePercent,
        lateFeeGraceDays: data.lateFeeGraceDays,
        notificationChannel: data.notificationChannel,
        contactPhone: data.contactPhone || null,
        contactEmail: data.contactEmail || null,
        address: data.address || null,
      })
      .where(eq(businesses.id, business.id))
      .returning();

    return res.json(updated);
  } catch (err: any) {
    console.error('[Business:Update]', err);
    return res.status(500).json({ error: 'Failed to update business settings.' });
  }
});
