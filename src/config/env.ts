import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET ?? 'change-me-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '10m',
  databaseUrl: process.env.DATABASE_URL ?? '',
  /** Max ms to wait when opening a new pool connection (fail fast if Postgres is down). */
  dbConnectionTimeoutMs: Number(process.env.DB_CONNECTION_TIMEOUT_MS ?? 10_000),
  /** Max ms a single query may run before the client aborts it. */
  dbQueryTimeoutMs: Number(process.env.DB_QUERY_TIMEOUT_MS ?? 10_000),
  /** Max ms an unused pooled connection stays open before the pool closes it. */
  dbIdleTimeoutMs: Number(process.env.DB_IDLE_TIMEOUT_MS ?? 30_000),
  locationsFile: process.env.LOCATIONS_FILE ?? 'data/locations.json',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  // Rate limit for the PUT /locations/:id write endpoint (configurable, with safe defaults).
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX ?? 100),
  rateLimitTimeWindow: process.env.RATE_LIMIT_TIME_WINDOW ?? '1 minute',
  searchDefaultLimit: Number(process.env.SEARCH_DEFAULT_LIMIT ?? 20),
};
