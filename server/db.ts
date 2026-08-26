import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
});

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'trial',
  status TEXT NOT NULL DEFAULT 'trialing',
  trial_ends_at TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ,
  midtrans_order_id TEXT,
  trial_reminder_sent_at TIMESTAMPTZ,
  expired_notified_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

export async function initDb() {
  await pool.query(SCHEMA);
}

export interface SubscriptionRow {
  user_id: string;
  plan: string;
  status: string;
  trial_ends_at: Date;
  current_period_end: Date | null;
  midtrans_order_id: string | null;
}

export async function getOrCreateSubscription(userId: string): Promise<SubscriptionRow> {
  const existing = await pool.query(
    'SELECT * FROM subscriptions WHERE user_id = $1',
    [userId]
  );
  if (existing.rows.length > 0) return existing.rows[0];

  const trialEnds = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const created = await pool.query(
    `INSERT INTO subscriptions (user_id, plan, status, trial_ends_at)
     VALUES ($1, 'trial', 'trialing', $2)
     ON CONFLICT (user_id) DO NOTHING
     RETURNING *`,
    [userId, trialEnds]
  );
  if (created.rows.length > 0) return created.rows[0];
  const again = await pool.query('SELECT * FROM subscriptions WHERE user_id = $1', [userId]);
  return again.rows[0];
}

export function isAccessActive(sub: SubscriptionRow): boolean {
  if (sub.status === 'active' && sub.current_period_end && sub.current_period_end > new Date()) {
    return true;
  }
  return new Date() < sub.trial_ends_at;
}
