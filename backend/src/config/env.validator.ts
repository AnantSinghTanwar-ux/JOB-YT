/**
 * Startup Environment Validator
 *
 * Validates all required and optional environment variables before the
 * application starts. Prints a formatted status table and aborts early
 * with a clear error message when critical variables are missing.
 *
 * Categories:
 *   CRITICAL  — Server will NOT start without these.
 *   RECOMMENDED — Server starts, but important features are degraded.
 *   OPTIONAL  — Nice-to-have; warning only when missing.
 */

const LOG_PREFIX = '[Startup]';

interface EnvVarSpec {
  name: string;
  /** If any alternative is set, the requirement is satisfied. */
  alternatives?: string[];
  level: 'CRITICAL' | 'RECOMMENDED' | 'OPTIONAL';
  description: string;
}

const ENV_SPECS: EnvVarSpec[] = [
  // ── Critical ──────────────────────────────────────────────────────────────
  {
    name: 'DATABASE_URL',
    alternatives: ['DB_HOST', 'PGHOST'],
    level: 'CRITICAL',
    description: 'PostgreSQL connection (URL or host-based)',
  },
  {
    name: 'JWT_SECRET',
    level: 'CRITICAL',
    description: 'JSON Web Token signing secret',
  },

  // ── Recommended ───────────────────────────────────────────────────────────
  {
    name: 'REDIS_URL',
    alternatives: ['REDIS_HOST'],
    level: 'RECOMMENDED',
    description: 'Redis connection (queues, caching, rate-limiting)',
  },

  // ── Optional ──────────────────────────────────────────────────────────────
  {
    name: 'GROQ_API_KEY',
    level: 'OPTIONAL',
    description: 'Groq AI text generation',
  },
  {
    name: 'ANTHROPIC_API_KEY',
    alternatives: ['CLAUDE_API_KEY'],
    level: 'OPTIONAL',
    description: 'Claude / Anthropic AI provider',
  },
  {
    name: 'XAI_API_KEY',
    level: 'OPTIONAL',
    description: 'xAI / Grok provider',
  },
  {
    name: 'OPENAI_API_KEY',
    level: 'OPTIONAL',
    description: 'OpenAI provider',
  },
  {
    name: 'OPENAI_MODEL',
    level: 'OPTIONAL',
    description: 'OpenAI model name (default: gpt-4o)',
  },
  {
    name: 'GEMINI_API_KEY',
    level: 'OPTIONAL',
    description: 'Google Gemini provider',
  },
  {
    name: 'HUGGINGFACE_API_KEY',
    alternatives: ['HF_API_KEY'],
    level: 'OPTIONAL',
    description: 'HuggingFace embeddings',
  },
  {
    name: 'SMTP_HOST',
    level: 'OPTIONAL',
    description: 'Email (SMTP) configuration',
  },
  {
    name: 'JUDGE0_API_URL',
    level: 'OPTIONAL',
    description: 'Judge0 code execution engine',
  },
  {
    name: 'JUDGE0_AUTH_TOKEN',
    level: 'OPTIONAL',
    description: 'Judge0 authentication (required for remote)',
  },
  {
    name: 'FIREBASE_ENABLED',
    level: 'OPTIONAL',
    description: 'Firebase push notifications',
  },
  {
    name: 'RAZORPAY_KEY_ID',
    level: 'OPTIONAL',
    description: 'Razorpay payment gateway',
  },
  {
    name: 'CLOUDINARY_CLOUD_NAME',
    level: 'OPTIONAL',
    description: 'Cloudinary media storage',
  },
  {
    name: 'GOOGLE_CLIENT_ID',
    level: 'OPTIONAL',
    description: 'Google OAuth',
  },
  {
    name: 'GITHUB_CLIENT_ID',
    level: 'OPTIONAL',
    description: 'GitHub OAuth',
  },
  {
    name: 'LINKEDIN_CLIENT_ID',
    level: 'OPTIONAL',
    description: 'LinkedIn OAuth',
  },
];

function isSet(spec: EnvVarSpec): boolean {
  if (process.env[spec.name] && process.env[spec.name]!.trim() !== '') {
    return true;
  }
  if (spec.alternatives) {
    return spec.alternatives.some(
      (alt) => process.env[alt] && process.env[alt]!.trim() !== '',
    );
  }
  return false;
}

/**
 * Validates all environment variables and prints a status report.
 * Throws if any CRITICAL variable is missing.
 */
export function validateEnvironment(): void {
  console.log(`\n${LOG_PREFIX} ─── Environment Validation ───────────────────────────`);

  const missing: string[] = [];
  const warnings: string[] = [];

  for (const spec of ENV_SPECS) {
    const present = isSet(spec);
    const altLabel =
      spec.alternatives && spec.alternatives.length > 0
        ? ` (or ${spec.alternatives.join(' / ')})`
        : '';

    if (present) {
      console.log(`  ✓  ${spec.name}${altLabel} — ${spec.description}`);
    } else if (spec.level === 'CRITICAL') {
      console.error(`  ✗  ${spec.name}${altLabel} — ${spec.description}  [CRITICAL]`);
      missing.push(`${spec.name}${altLabel}`);
    } else if (spec.level === 'RECOMMENDED') {
      console.warn(`  ⚠  ${spec.name}${altLabel} — ${spec.description}  [RECOMMENDED]`);
      warnings.push(`${spec.name}${altLabel}`);
    } else {
      console.log(`  ·  ${spec.name}${altLabel} — ${spec.description}  [not set]`);
    }
  }

  console.log(`${LOG_PREFIX} ───────────────────────────────────────────────────────\n`);

  if (warnings.length > 0) {
    console.warn(
      `${LOG_PREFIX} ${warnings.length} recommended variable(s) not set: ${warnings.join(', ')}. ` +
        'Related features will be degraded.',
    );
  }

  if (missing.length > 0) {
    console.error(
      `\n${LOG_PREFIX} FATAL: ${missing.length} critical variable(s) missing: ${missing.join(', ')}.\n` +
        `${LOG_PREFIX} The server cannot start without these. ` +
        'Set them in your .env file or deployment environment.\n',
    );
    process.exit(1);
  }
}
