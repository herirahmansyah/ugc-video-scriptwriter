import type { Request, Response, NextFunction } from 'express';
import { pool } from './db';
import type { SubscriptionRow } from './db';

export type Feature = 'script' | 'image' | 'video';

// Monthly quotas. Trial = total for the whole trial period; PRO = per calendar month.
export const QUOTAS: Record<Feature, { trial: number; pro: number }> = {
  script: { trial: 10, pro: 300 },
  image: { trial: 5, pro: 50 },
  video: { trial: 1, pro: 3 },
};

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7); // 'YYYY-MM'
}

export function isPro(sub: SubscriptionRow): boolean {
  return sub.status === 'active' && !!sub.current_period_end && sub.current_period_end > new Date();
}

async function getCount(userId: string, feature: Feature, period: string): Promise<number> {
  const res = await pool.query(
    'SELECT count FROM usage_counters WHERE user_id = $1 AND feature = $2 AND period = $3',
    [userId, feature, period]
  );
  return res.rows[0]?.count ?? 0;
}

export async function recordUsage(userId: string, feature: Feature, sub: SubscriptionRow): Promise<void> {
  const period = isPro(sub) ? currentMonth() : 'trial';
  await pool.query(
    `INSERT INTO usage_counters (user_id, feature, period, count)
     VALUES ($1, $2, $3, 1)
     ON CONFLICT (user_id, feature, period)
     DO UPDATE SET count = usage_counters.count + 1`,
    [userId, feature, period]
  );
}

export async function getUsageSummary(
  userId: string,
  sub: SubscriptionRow
): Promise<Record<Feature, { used: number; limit: number }>> {
  const pro = isPro(sub);
  const summary = {} as Record<Feature, { used: number; limit: number }>;
  for (const feature of Object.keys(QUOTAS) as Feature[]) {
    const period = pro ? currentMonth() : 'trial';
    summary[feature] = {
      used: await getCount(userId, feature, period),
      limit: pro ? QUOTAS[feature].pro : QUOTAS[feature].trial,
    };
  }
  return summary;
}

export function requireQuota(feature: Feature) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.authUser || !req.subscription) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const sub = req.subscription;
      const limit = isPro(sub) ? QUOTAS[feature].pro : QUOTAS[feature].trial;
      const period = isPro(sub) ? currentMonth() : 'trial';
      const used = await getCount(req.authUser.id, feature, period);

      if (used >= limit) {
        return res.status(429).json({
          error:
            limit === QUOTAS[feature].trial
              ? `Kuota trial Anda untuk fitur ini sudah habis (${limit}x). Upgrade ke PRO untuk lebih banyak.`
              : `Kuota bulanan Anda untuk fitur ini sudah habis (${limit}x). Kuota reset setiap awal bulan.`,
          code: 'QUOTA_EXCEEDED',
        });
      }
      next();
    } catch (err) {
      console.error('Quota check failed:', err);
      return res.status(500).json({ error: 'Gagal memeriksa kuota.' });
    }
  };
}
