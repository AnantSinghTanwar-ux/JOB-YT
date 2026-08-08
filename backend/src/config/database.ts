import { Pool, PoolConfig } from 'pg';

const LOG_PREFIX = '[Database]';

// ── SSL Detection ───────────────────────────────────────────────────────────
// Cloud PostgreSQL providers that require SSL by default.
const SSL_HOSTS = ['.railway.app', 'rlwy.net', '.neon.tech', '.supabase.co', '.render.com', '.aws.'];

function shouldEnableSSL(connectionString?: string, host?: string): boolean {
  // Explicit override via env
  if (process.env.DB_SSL === 'true') return true;
  if (process.env.DB_SSL === 'false') return false;

  // Check connection string for sslmode
  if (connectionString && connectionString.includes('sslmode=require')) return true;

  // Check host against known cloud providers
  const targetHost = connectionString || host || '';
  return SSL_HOSTS.some((pattern) => targetHost.includes(pattern));
}

// ── Pool Construction ───────────────────────────────────────────────────────
function buildPoolConfig(): PoolConfig {
  const databaseUrl = process.env.DATABASE_URL;
  const sslConfig = { rejectUnauthorized: false };

  if (databaseUrl) {
    const useSSL = shouldEnableSSL(databaseUrl);
    return {
      connectionString: databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000,
      ssl: useSSL ? sslConfig : undefined,
    };
  }

  const host = process.env.DB_HOST || process.env.PGHOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10);
  const database = process.env.DB_NAME || process.env.PGDATABASE || 'hiring_platform';
  const user = process.env.DB_USER || process.env.PGUSER || 'postgres';
  const password = process.env.DB_PASSWORD || process.env.PGPASSWORD || '';
  const useSSL = shouldEnableSSL(undefined, host);

  return {
    host,
    port,
    database,
    user,
    password,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
    ssl: useSSL ? sslConfig : undefined,
  };
}

const poolConfig = buildPoolConfig();
const pool = new Pool(poolConfig);

// ── Connection Diagnostics ──────────────────────────────────────────────────
function getConnectionDiagnostics(): string {
  if (poolConfig.connectionString) {
    // Parse connection string for safe display (hide password)
    try {
      const url = new URL(poolConfig.connectionString);
      return [
        `  Host:     ${url.hostname}`,
        `  Port:     ${url.port || '5432'}`,
        `  Database: ${url.pathname.replace('/', '') || '(default)'}`,
        `  User:     ${url.username || '(default)'}`,
        `  SSL:      ${poolConfig.ssl ? 'enabled' : 'disabled'}`,
      ].join('\n');
    } catch {
      return `  Connection: (via DATABASE_URL)\n  SSL: ${poolConfig.ssl ? 'enabled' : 'disabled'}`;
    }
  }

  return [
    `  Host:     ${poolConfig.host}`,
    `  Port:     ${poolConfig.port}`,
    `  Database: ${poolConfig.database}`,
    `  User:     ${poolConfig.user}`,
    `  SSL:      ${poolConfig.ssl ? 'enabled' : 'disabled'}`,
  ].join('\n');
}

// ── Connect ─────────────────────────────────────────────────────────────────
export const connectDB = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log(`${LOG_PREFIX} PostgreSQL connected successfully`);
    console.log(getConnectionDiagnostics());
  } catch (error) {
    let reason = String(error);
    if (error instanceof Error) {
      reason = error.message;
      if (error.name === 'AggregateError' && (error as any).errors) {
        reason += ' (' + (error as any).errors.map((e: any) => e.message).join(', ') + ')';
      }
    }

    console.error(`\n${LOG_PREFIX} ═══ PostgreSQL Connection Failed ═══`);
    console.error(getConnectionDiagnostics());
    console.error(`  Reason:   ${reason}`);
    console.error(`${LOG_PREFIX} ════════════════════════════════════\n`);

    if (process.env.REQUIRE_DB !== 'false') {
      console.error(`${LOG_PREFIX} REQUIRE_DB is not 'false' — exiting.`);
      process.exit(1);
    } else {
      console.warn(`${LOG_PREFIX} REQUIRE_DB=false — continuing without database (unsafe for production).`);
    }
  }
};

// ── Idle Error Handler ──────────────────────────────────────────────────────
// Log idle connection errors instead of crashing the entire process.
// The pg Pool automatically removes bad clients and creates new ones.
pool.on('error', (err) => {
  console.error(`${LOG_PREFIX} Unexpected error on idle PostgreSQL client:`, err.message);
  // Do NOT call process.exit() here — the pool self-heals.
});

export default pool;
