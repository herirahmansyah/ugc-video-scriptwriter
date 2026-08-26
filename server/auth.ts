import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getOrCreateSubscription, isAccessActive, type SubscriptionRow } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authUser?: AuthUser;
      subscription?: SubscriptionRow;
    }
  }
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; email: string; name?: string };
    req.authUser = { id: payload.sub, email: payload.email, name: (payload as any).name || '' };
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export async function requireAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.authUser) return res.status(401).json({ error: 'Unauthorized' });
  const sub = await getOrCreateSubscription(req.authUser.id);
  if (!isAccessActive(sub)) {
    return res.status(402).json({
      error: 'Masa trial Anda sudah berakhir. Silakan berlangganan untuk melanjutkan.',
      code: 'TRIAL_EXPIRED',
    });
  }
  req.subscription = sub;
  next();
}
