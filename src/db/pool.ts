import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function createPool(): pg.Pool {
  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  pool = new Pool({ connectionString: env.databaseUrl });
  return pool;
}

export function getPool(): pg.Pool {
  if (!pool) {
    throw new Error('Database pool is not initialized. Call createPool() first.');
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
