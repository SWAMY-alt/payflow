import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { users, businesses } from '../db/schema';
import { authLoginSchema, authRegisterSchema } from '../../shared/types';

export const authRouter = Router();

// Simple, secure scrypt password hashing
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password: string, combinedHash: string): boolean {
  const [salt, key] = combinedHash.split(':');
  if (!salt || !key) return false;
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

// Authentication Middleware
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;
  const userId = session?.userId || req.headers['x-user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId as string)).limit(1);

  if (!user) {
    return res.status(401).json({ error: 'User session invalid.' });
  }

  // Find business associated with this owner
  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.ownerId, user.id))
    .limit(1);

  (req as any).user = user;
  (req as any).business = business || null;

  next();
}

/**
 * Register a new user
 */
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const parsed = authRegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { email, password, fullName } = parsed.data;
    const db = getDb();

    // Check if email already registered
    const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = hashPassword(password);
    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        fullName,
      })
      .returning();

    // Store in session
    if ((req as any).session) {
      (req as any).session.userId = newUser.id;
    }

    return res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
      },
      hasBusiness: false,
    });
  } catch (err: any) {
    console.error('[Auth:Register]', err);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

/**
 * Login existing user
 */
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = authLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { email, password } = parsed.data;
    const db = getDb();

    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if ((req as any).session) {
      (req as any).session.userId = user.id;
    }

    // Check if business profile exists
    const [business] = await db.select().from(businesses).where(eq(businesses.ownerId, user.id)).limit(1);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
      business: business || null,
      hasBusiness: !!business,
    });
  } catch (err: any) {
    console.error('[Auth:Login]', err);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

/**
 * Current user & business profile check
 */
authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const business = (req as any).business;

  return res.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
    },
    business: business || null,
    hasBusiness: !!business,
  });
});

/**
 * Logout
 */
authRouter.post('/logout', (req: Request, res: Response) => {
  if ((req as any).session) {
    (req as any).session.destroy(() => {
      res.clearCookie('connect.sid');
      return res.json({ success: true });
    });
  } else {
    return res.json({ success: true });
  }
});
