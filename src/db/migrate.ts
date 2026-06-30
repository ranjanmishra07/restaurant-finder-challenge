import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type pg from 'pg';
import { createPool, closePool } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function isDirectRun(): boolean {
  const entry = process.argv[1];
  return Boolean(entry && path.resolve(entry) === path.resolve(fileURLToPath(import.meta.url)));
}

export async function runMigrations(client: pg.Pool | pg.PoolClient): Promise<void> {
  const migrationPath = path.join(__dirname, 'migrations', '001_create_locations.sql');
  const sql = await readFile(migrationPath, 'utf-8');
  await client.query(sql);
}

async function main() {
  const pool = createPool();
  try {
    await runMigrations(pool);
    console.log('Migrations applied successfully');
  } finally {
    await closePool();
  }
}

if (isDirectRun()) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
