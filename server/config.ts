import dotenv from 'dotenv';

dotenv.config();

const INSECURE_DEFAULT_JWT = 'dev-secret-change-me';

interface CheckResult {
  fatal: string[];
  warnings: string[];
}

/**
 * Fail-fast configuration validation.
 * - Production: refuses to boot when security- or billing-critical secrets are
 *   missing/insecure. Feature-level gaps (Gemini/Midtrans/Resend) only warn,
 *   so a partial outage of third-party keys never masks a deploy mistake.
 * - Non-production: warns only, keeps DX frictionless.
 */
export function validateConfig(env: NodeJS.ProcessEnv = process.env): CheckResult {
  const fatal: string[] = [];
  const warnings: string[] = [];
  const isProd = env.NODE_ENV === 'production';

  // --- Security-critical ---
  if (!env.DATABASE_URL) {
    fatal.push('DATABASE_URL is required.');
  }
  if (
    !env.JWT_SECRET ||
    env.JWT_SECRET === INSECURE_DEFAULT_JWT ||
    env.JWT_SECRET.length < 32
  ) {
    if (isProd) {
      fatal.push(
        'JWT_SECRET must be set to a unique random string of at least 32 characters in production.'
      );
    } else {
      warnings.push('JWT_SECRET is missing/default/short - tokens are NOT secure. Dev only.');
    }
  }

  // --- Feature-critical (warn only, degrade gracefully) ---
  if (!env.GEMINI_API_KEY) {
    (isProd ? fatal : warnings).push('GEMINI_API_KEY is not set - all AI endpoints will fail.');
  }

  if (isProd && !env.MIDTRANS_SERVER_KEY) {
    warnings.push('MIDTRANS_SERVER_KEY is not set - subscription checkout will fail.');
  }
  if (isProd && !env.RESEND_API_KEY) {
    warnings.push('RESEND_API_KEY is not set - trial reminder emails will be skipped.');
  }

  return { fatal, warnings };
}

export function enforceConfig(): void {
  const { fatal, warnings } = validateConfig();

  for (const w of warnings) {
    console.warn(`[config] WARNING: ${w}`);
  }

  if (fatal.length > 0) {
    for (const f of fatal) {
      console.error(`[config] FATAL: ${f}`);
    }
    throw new Error(
      `Refusing to start due to invalid configuration (${fatal.length} fatal issue(s)).`
    );
  }
}
