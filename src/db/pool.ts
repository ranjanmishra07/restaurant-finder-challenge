import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function createPool(): pg.Pool {
  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  pool = new Pool({
    connectionString: env.databaseUrl,
    connectionTimeoutMillis: env.dbConnectionTimeoutMs,
    query_timeout: env.dbQueryTimeoutMs,
    idleTimeoutMillis: env.dbIdleTimeoutMs,
  });
  return pool;
}

export function getPool(): pg.Pool {
  if (!pool) {
    throw new Error('Database pool is not initialized. Call createPool() first.');
  }
  return pool;
}

/** Fail fast at startup if Postgres is unreachable (runs before the server listens). */
export async function verifyDatabaseConnection(dbPool: pg.Pool): Promise<void> {
  await dbPool.query('SELECT 1');
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/*
 * Pool timeout settings (see env: DB_CONNECTION_TIMEOUT_MS, DB_QUERY_TIMEOUT_MS,
 * DB_IDLE_TIMEOUT_MS)
 *
 * Why required:
 * Without these, an unhealthy Postgres can leave API requests hanging indefinitely
 * (live test: paused Postgres caused search to block ~64s, then return 200 when DB
 * recovered). Fail-fast timeouts let the global error handler return 500 with
 * { message: "Internal Server Error" } instead of tying up clients.
 *
 * connectionTimeoutMillis — max wait to OPEN a new connection (Postgres down/unreachable).
 * query_timeout           — max wait for a query to finish (stale/broken connection).
 * idleTimeoutMillis       — 30_000 ms; closes unused pooled connections after 30s idle
 *                           (pg-pool default is 10s). Reduces cold reconnects between
 *                           requests spaced 10–30s apart.
 *
 * Startup: index.ts calls verifyDatabaseConnection() before app.listen(). If Postgres
 * is down, the process logs a fatal error and exits(1) — the API does not start.
 *
 * Live curl tests (npm run dev + Postgres in Docker, timeouts 5s / 10s):
 *   1. Query failure — ALTER TABLE locations RENAME … → HTTP 500 in ~30ms, correct body.
 *   2. Postgres paused (warm pool) — was ~64s hang; now HTTP 500 in ~10s (query_timeout).
 *   3. Postgres stopped after 12s idle (pool empty) — HTTP 500 in ~50ms (connect refused).
 *   4. Recovery after table restore / unpause / restart — HTTP 200 on search again.
 *
 * min/max left at pg defaults (min: 0, max: 10) — sufficient for this single-instance API.
 */
