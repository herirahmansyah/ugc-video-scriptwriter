import cron from 'node-cron';
import { pool } from './db';
import {
  isEmailConfigured,
  sendTrialReminderEmail,
  sendTrialExpiredEmail,
} from './email';

const REMINDER_WINDOW_DAYS = 2;

/**
 * Idempotent daily job:
 * 1. Trial ending within REMINDER_WINDOW_DAYS -> send H-2 reminder (once).
 * 2. Trial already expired & still trialing -> notify expiry, flip status to 'expired' (once).
 *
 * Emails are only marked "sent" when the provider confirms success,
 * so a failed send is retried on the next run (at-least-once delivery).
 */
export async function runTrialMaintenanceJob(): Promise<{ reminded: number; notified: number }> {
  let reminded = 0;
  let notified = 0;

  // --- 1. H-2 reminders ---
  const toRemind = await pool.query(
    `SELECT s.user_id, s.trial_ends_at, u.email, u.name
     FROM subscriptions s
     JOIN users u ON u.id = s.user_id
     WHERE s.status = 'trialing'
       AND s.trial_ends_at BETWEEN now() AND now() + make_interval(days => $1)
       AND s.trial_reminder_sent_at IS NULL
     LIMIT 100`,
    [REMINDER_WINDOW_DAYS]
  );

  for (const row of toRemind.rows) {
    const daysLeft = Math.max(
      0,
      Math.ceil((new Date(row.trial_ends_at).getTime() - Date.now()) / 86400000)
    );
    const sent = await sendTrialReminderEmail(row.email, row.name, daysLeft, new Date(row.trial_ends_at));
    if (sent) {
      await pool.query(
        'UPDATE subscriptions SET trial_reminder_sent_at = now() WHERE user_id = $1',
        [row.user_id]
      );
      reminded++;
    }
  }

  // --- 2. Expiry notifications ---
  const expired = await pool.query(
    `SELECT s.user_id, u.email, u.name
     FROM subscriptions s
     JOIN users u ON u.id = s.user_id
     WHERE s.status = 'trialing'
       AND s.trial_ends_at < now()
       AND s.expired_notified_at IS NULL
     LIMIT 100`
  );

  for (const row of expired.rows) {
    await pool.query(
      `UPDATE subscriptions
       SET status = 'expired', plan = 'trial', expired_notified_at = now()
       WHERE user_id = $1`,
      [row.user_id]
    );
    // Notification is best-effort; DB state must be correct regardless of email success.
    await sendTrialExpiredEmail(row.email, row.name);
    notified++;
  }

  return { reminded, notified };
}

export function startCronJobs() {
  if (!isEmailConfigured()) {
    console.warn('[cron] Email not configured - maintenance job will run but skip sending.');
  }
  // Runs daily at 02:00 UTC (09:00 WIB).
  cron.schedule('0 2 * * *', async () => {
    try {
      const result = await runTrialMaintenanceJob();
      console.info(`[cron] Trial maintenance done: ${result.reminded} reminded, ${result.notified} notified.`);
    } catch (err) {
      console.error('[cron] Trial maintenance job failed:', err);
    }
  });
  console.log('[cron] Daily trial maintenance job scheduled (02:00 UTC / 09:00 WIB).');
}
